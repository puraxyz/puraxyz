"""Evidence anchoring - Merkle root submission to Base L2.

Collects un-anchored evidence hashes, builds a Merkle tree, and submits
the root to the EvidenceAnchor smart contract on Base (Sepolia or mainnet).

Can run as:
  - Background task inside the FastAPI app lifespan
  - Standalone: ``python -m vr_api.anchor``
"""

from __future__ import annotations

import asyncio
import os
from datetime import datetime, timezone

import structlog

from .db import store_anchor, list_evidence_since, update_evidence_batch_id
from .merkle import build_merkle_tree

logger = structlog.get_logger(__name__)

# Default Base Sepolia public RPC
_DEFAULT_RPC = "https://sepolia.base.org"


async def anchor_batch() -> dict | None:
    """Build a Merkle tree from un-anchored evidence and submit to Base L2.

    Returns
    -------
    dict | None
        Anchor record info if successful, None if nothing to anchor.
    """
    from .db import get_latest_anchor

    latest = await get_latest_anchor()
    since = latest.created_at if latest else datetime.min.replace(tzinfo=timezone.utc)
    records = await list_evidence_since(since)

    if not records:
        logger.info("anchor.skip", reason="no new evidence")
        return None

    hashes = [r.artifact_hash.removeprefix("sha256:") for r in records]
    tree = build_merkle_tree(hashes)
    root_hex = tree.root_hex
    logger.info("anchor.tree_built", leaf_count=len(hashes), root=root_hex)

    # Submit on-chain if private key is configured
    tx_hash = None
    chain = "base-sepolia"

    private_key = os.environ.get("VR_ANCHOR_PRIVATE_KEY")
    rpc_url = os.environ.get("VR_BASE_RPC_URL", _DEFAULT_RPC)

    if private_key:
        tx_hash = await _submit_anchor(root_hex, private_key, rpc_url)
        logger.info("anchor.submitted", tx_hash=tx_hash)
    else:
        logger.info("anchor.local_only", reason="VR_ANCHOR_PRIVATE_KEY not set")

    # Store anchor record
    anchor = await store_anchor(
        merkle_root=root_hex,
        leaf_count=len(hashes),
        tx_hash=tx_hash,
        chain=chain,
    )

    # Update evidence records with batch_id (use full artifact_hash keys)
    artifact_hashes = [r.artifact_hash for r in records]
    await update_evidence_batch_id(artifact_hashes, anchor.batch_id)

    return {
        "batch_id": anchor.batch_id,
        "merkle_root": root_hex,
        "leaf_count": len(hashes),
        "tx_hash": tx_hash,
        "chain": chain,
    }


async def _submit_anchor(root_hex: str, private_key: str, rpc_url: str) -> str:  # pragma: no cover
    """Submit anchorRoot(bytes32) transaction to the EvidenceAnchor contract.

    Returns the transaction hash as a hex string.
    """
    try:
        from web3 import Web3
        from web3.middleware import ExtraDataToPOAMiddleware
    except ImportError:
        raise RuntimeError(
            "web3 is required for on-chain anchoring. "
            "Install with: pip install vr-api[anchor]"
        )

    contract_address = os.environ.get("VR_ANCHOR_CONTRACT")
    if not contract_address:
        raise RuntimeError("VR_ANCHOR_CONTRACT env var required for on-chain anchoring")

    w3 = Web3(Web3.HTTPProvider(rpc_url))
    w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)

    # Minimal ABI for anchorRoot(bytes32)
    abi = [
        {
            "inputs": [{"name": "root", "type": "bytes32"}],
            "name": "anchorRoot",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function",
        }
    ]

    contract = w3.eth.contract(
        address=Web3.to_checksum_address(contract_address), abi=abi,
    )
    account = w3.eth.account.from_key(private_key)

    root_bytes = bytes.fromhex(root_hex)
    tx = contract.functions.anchorRoot(root_bytes).build_transaction({
        "from": account.address,
        "nonce": w3.eth.get_transaction_count(account.address),
        "gas": 100_000,
        "gasPrice": w3.eth.gas_price,
    })

    signed = account.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)

    # Wait for receipt (with timeout)
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)
    if receipt["status"] != 1:
        raise RuntimeError(f"Anchor transaction reverted: {tx_hash.hex()}")

    return tx_hash.hex()


async def anchor_loop(interval_hours: float = 24.0) -> None:  # pragma: no cover
    """Run anchoring on a periodic schedule."""
    interval_s = interval_hours * 3600
    while True:
        try:
            result = await anchor_batch()
            if result:
                logger.info("anchor.complete", **result)
        except Exception:
            logger.exception("anchor.error")
        await asyncio.sleep(interval_s)


if __name__ == "__main__":
    asyncio.run(anchor_batch())
