"""Backproto adapter — submit vr.dev verification results on-chain.

Bridges the Python verification pipeline to Backproto's EVM contracts
via JSON-RPC.  Requires an Ethereum JSON-RPC endpoint and a funded
account (private key) on Base / Base Sepolia.

Typical usage::

    from vrdev.adapters.backproto import BackprotoAdapter

    adapter = BackprotoAdapter(
        rpc_url="https://sepolia.base.org",
        private_key="0x...",
        chain_id=84532,
    )
    tx_hash = adapter.submit_verified_outcome(
        operator="0x...",
        skill_type_id="0x0001...",
        passed=True,
    )
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

import httpx

from ..core.types import VerificationResult, Verdict

# Base Sepolia contract addresses (match sdk/src/addresses.ts)
_DEFAULT_ADDRESSES: dict[int, dict[str, str]] = {
    84532: {
        "completionTracker": "0x7Dd6d47AC3b0BbF3D99bd61D1f1B1F85350A90c4",
        "openClawReputationBridge": "0x0000000000000000000000000000000000000000",
    },
}

_HEX64_RE = re.compile(r"^(0x)?[0-9a-fA-F]{64}$")


def _to_bytes32(evidence_hash: str) -> str:
    """Normalize a 64-char hex string to 0x-prefixed bytes32."""
    bare = evidence_hash[2:] if evidence_hash.startswith("0x") else evidence_hash
    if not _HEX64_RE.match(evidence_hash):
        raise ValueError(f"Expected 64 hex chars, got: {evidence_hash!r}")
    return f"0x{bare}"


@dataclass
class BackprotoAdapter:
    """Submit verified outcomes to Backproto contracts via JSON-RPC.

    This adapter deliberately does *not* embed private-key signing logic.
    Instead it constructs unsigned transaction payloads and sends them via
    ``eth_sendTransaction`` to a local node / wallet RPC that holds the key
    (e.g. Foundry's ``anvil``, Frame, or a hardware-wallet proxy).

    For production use with a raw private key, callers should sign the
    transaction externally (e.g. via ``eth_account``) and submit via
    ``eth_sendRawTransaction``.
    """

    rpc_url: str
    sender: str
    chain_id: int = 84532
    addresses: dict[str, str] | None = None

    def _addrs(self) -> dict[str, str]:
        return self.addresses or _DEFAULT_ADDRESSES.get(self.chain_id, {})

    def _rpc_call(self, method: str, params: list[Any]) -> Any:
        """Synchronous JSON-RPC call."""
        payload = {"jsonrpc": "2.0", "id": 1, "method": method, "params": params}
        resp = httpx.post(self.rpc_url, json=payload, timeout=30)
        resp.raise_for_status()
        body = resp.json()
        if "error" in body:
            raise RuntimeError(f"RPC error: {body['error']}")
        return body.get("result")

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def submit_verified_outcome(
        self,
        operator: str,
        skill_type_id: str,
        passed: bool,
    ) -> str:
        """Report PASS/FAIL to OpenClawReputationBridge.

        Returns the transaction hash.
        """
        addrs = self._addrs()
        bridge = addrs["openClawReputationBridge"]
        # reportCompletion(address,bytes32) or reportFailure(address,bytes32)
        sig = "0x" + (
            "a3c573eb"  # reportCompletion(address,bytes32)
            if passed
            else "d6e3a158"  # reportFailure(address,bytes32)
        )
        data = (
            sig
            + operator.lower().replace("0x", "").zfill(64)
            + skill_type_id.replace("0x", "").zfill(64)
        )
        tx = {
            "from": self.sender,
            "to": bridge,
            "data": data,
            "chainId": hex(self.chain_id),
        }
        return self._rpc_call("eth_sendTransaction", [tx])

    def submit_from_result(
        self,
        result: VerificationResult,
        operator: str,
        skill_type_id: str,
    ) -> str:
        """Convenience: extract verdict from a VerificationResult and submit."""
        passed = result.verdict == Verdict.PASS
        return self.submit_verified_outcome(operator, skill_type_id, passed)
