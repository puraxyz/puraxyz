"""x402 USDC payment provider via Coinbase CDP facilitator.

Implements the HTTP 402 payment flow:
1. Client sends request without payment → server returns 402 with payment headers
2. Client signs USDC transfer on Base → retries with X-PAYMENT proof header
3. Server validates payment via CDP facilitator → processes request

Uses Coinbase CDP hosted facilitator initially. Self-hosted migration is a
configuration change, not a code change.

Environment variables:
    VR_X402_ENABLED: Set to "1" to enable x402 payments (default: disabled)
    VR_X402_WALLET_ADDRESS: USDC recipient wallet address on Base
    VR_X402_NETWORK: "base-sepolia" (testnet) or "base" (mainnet)
    VR_CDP_API_KEY: Coinbase CDP API key for payment verification
    VR_CDP_API_SECRET: Coinbase CDP API secret
"""

from __future__ import annotations

import json
import os
from decimal import Decimal

import structlog
from fastapi import Request

from . import PaymentProvider, PaymentResult

logger = structlog.get_logger(__name__)

# USDC contract addresses on Base networks
_USDC_CONTRACTS = {
    "base": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    "base-sepolia": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
}


def _is_x402_enabled() -> bool:
    """Check if x402 payments are enabled via environment."""
    return os.environ.get("VR_X402_ENABLED", "0") == "1"


def _get_network() -> str:
    return os.environ.get("VR_X402_NETWORK", "base-sepolia")


def _get_wallet_address() -> str:
    addr = os.environ.get("VR_X402_WALLET_ADDRESS", "")
    if not addr:
        raise RuntimeError("VR_X402_WALLET_ADDRESS is required for x402 payments")
    return addr


class X402PaymentProvider(PaymentProvider):  # pragma: no cover
    """Coinbase CDP-backed x402 payment verification.

    On Base Sepolia (testnet) by default. Switch to mainnet by setting
    VR_X402_NETWORK=base.
    """

    async def check_payment(self, request: Request) -> PaymentResult | None:
        """Validate x402 payment proof from request headers.

        Expected header: X-PAYMENT containing a JSON payment proof with:
        - tx_hash: the USDC transfer transaction hash
        - payer: the sender's Ethereum address
        - amount: USDC amount transferred (as string)
        - network: "base" or "base-sepolia"
        """
        if not _is_x402_enabled():
            return None

        payment_header = request.headers.get("X-PAYMENT")
        if not payment_header:
            return None

        try:
            proof = json.loads(payment_header)
        except (json.JSONDecodeError, TypeError):
            logger.warning("x402.invalid_proof", reason="malformed JSON")
            return None

        tx_hash = proof.get("tx_hash", "")
        payer = proof.get("payer", "")
        amount_str = proof.get("amount", "0")
        network = proof.get("network", "")

        # Basic validation
        if not tx_hash or not payer or not amount_str:
            logger.warning("x402.invalid_proof", reason="missing fields")
            return None

        if network != _get_network():
            logger.warning(
                "x402.network_mismatch",
                expected=_get_network(),
                received=network,
            )
            return None

        # Validate payer address format (0x + 40 hex chars)
        if not payer.startswith("0x") or len(payer) != 42:
            logger.warning("x402.invalid_address", payer=payer)
            return None

        try:
            amount = Decimal(amount_str)
        except Exception:
            logger.warning("x402.invalid_amount", amount=amount_str)
            return None

        if amount <= 0:
            return None

        # Verify the transaction on-chain via CDP or direct RPC
        verified = await self._verify_transaction(tx_hash, payer, amount, network)
        if not verified:
            logger.warning("x402.verification_failed", tx_hash=tx_hash)
            return None

        logger.info(
            "x402.payment_verified",
            payer=payer,
            amount_usdc=str(amount),
            tx_hash=tx_hash,
        )

        return PaymentResult(
            payer_address=payer,
            amount_usdc=amount,
            tx_hash=tx_hash,
            provider="x402",
        )

    def create_payment_requirement(
        self, endpoint: str, tier: str, amount: Decimal, *, network: str | None = None,
    ) -> dict[str, str]:
        """Generate x402 payment requirement headers for a 402 response.

        If *network* is provided (per-user tier), use it instead of the global default.
        """
        net = network or _get_network()
        wallet = _get_wallet_address()

        return {
            "X-PAYMENT-REQUIRED": "true",
            "X-PAYMENT-AMOUNT": str(amount),
            "X-PAYMENT-CURRENCY": "USDC",
            "X-PAYMENT-NETWORK": net,
            "X-PAYMENT-RECIPIENT": wallet,
            "X-PAYMENT-USDC-CONTRACT": _USDC_CONTRACTS.get(net, ""),
            "X-PAYMENT-ENDPOINT": endpoint,
            "X-PAYMENT-TIER": tier,
        }

    async def record_charge(
        self, payment: PaymentResult, verification_id: str | None
    ) -> None:
        """Record the x402 payment in the database."""
        from ..db import store_payment

        await store_payment(
            payer_address=payment.payer_address,
            amount_usdc=float(payment.amount_usdc),
            tx_hash=payment.tx_hash,
            verification_id=verification_id,
            endpoint="x402",
            tier="",
            provider="x402",
        )

    async def _verify_transaction(
        self, tx_hash: str, payer: str, amount: Decimal, network: str
    ) -> bool:
        """Verify a USDC transfer transaction on Base.

        Uses direct JSON-RPC to check the transaction receipt and verify
        it's a USDC transfer to our wallet for the expected amount.
        """
        rpc_url = os.environ.get("VR_BASE_RPC_URL", "")
        if not rpc_url:
            if network == "base-sepolia":
                rpc_url = "https://sepolia.base.org"
            else:
                rpc_url = "https://mainnet.base.org"

        try:
            import httpx

            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    rpc_url,
                    json={
                        "jsonrpc": "2.0",
                        "method": "eth_getTransactionReceipt",
                        "params": [tx_hash],
                        "id": 1,
                    },
                )
                data = resp.json()
                receipt = data.get("result")

                if not receipt:
                    return False

                # Check transaction succeeded
                if receipt.get("status") != "0x1":
                    return False

                # Verify it's a transfer to our wallet via USDC contract
                wallet = _get_wallet_address().lower()
                usdc_contract = _USDC_CONTRACTS.get(network, "").lower()

                if receipt.get("to", "").lower() != usdc_contract:
                    return False

                # Check logs for Transfer event to our wallet
                # Transfer(address,address,uint256) topic
                transfer_topic = (
                    "0xddf252ad1be2c89b69c2b068fc378daa"
                    "952ba7f163c4a11628f55a4df523b3ef"
                )

                for log_entry in receipt.get("logs", []):
                    topics = log_entry.get("topics", [])
                    if len(topics) >= 3 and topics[0] == transfer_topic:
                        # topics[1] = from (padded), topics[2] = to (padded)
                        to_addr = "0x" + topics[2][-40:]
                        if to_addr.lower() == wallet:
                            return True

                return False

        except ImportError:
            logger.error("x402.httpx_missing", msg="httpx required for tx verification")
            return False
        except Exception:
            logger.exception("x402.verify_error")
            return False


# Singleton provider instance
_provider: X402PaymentProvider | None = None


def get_x402_provider() -> X402PaymentProvider:  # pragma: no cover
    """Get or create the singleton x402 provider."""
    global _provider
    if _provider is None:
        _provider = X402PaymentProvider()
    return _provider
