"""Binary SHA-256 Merkle tree for evidence anchoring.

Builds a tree from a list of hex-encoded SHA-256 hashes, produces
inclusion proofs, and verifies proofs against a root - pure Python,
no external dependencies.
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass, field


@dataclass
class MerkleTree:
    """A binary Merkle tree built from SHA-256 leaf hashes."""

    leaves: list[bytes] = field(default_factory=list)
    layers: list[list[bytes]] = field(default_factory=list)

    @property
    def root(self) -> bytes:
        """Return the Merkle root (top hash). Empty bytes if no leaves."""
        if not self.layers:
            return b""
        return self.layers[-1][0]

    @property
    def root_hex(self) -> str:
        """Return hex-encoded Merkle root."""
        return self.root.hex()


def _hash_pair(left: bytes, right: bytes) -> bytes:
    """Hash two 32-byte nodes together (sorted to ensure determinism)."""
    if left > right:
        left, right = right, left
    return hashlib.sha256(left + right).digest()


def build_merkle_tree(hashes: list[str]) -> MerkleTree:
    """Build a Merkle tree from hex-encoded hash strings.

    Parameters
    ----------
    hashes : list[str]
        Hex-encoded SHA-256 hashes (64 chars each).

    Returns
    -------
    MerkleTree
        Tree with layers[0] = leaves, layers[-1] = [root].
    """
    if not hashes:
        return MerkleTree()

    leaves = [bytes.fromhex(h) for h in hashes]
    tree = MerkleTree(leaves=leaves, layers=[leaves])

    current = leaves
    while len(current) > 1:
        next_layer: list[bytes] = []
        for i in range(0, len(current), 2):
            if i + 1 < len(current):
                next_layer.append(_hash_pair(current[i], current[i + 1]))
            else:
                # Odd leaf: promote to next layer
                next_layer.append(current[i])
        tree.layers.append(next_layer)
        current = next_layer

    return tree


def get_inclusion_proof(tree: MerkleTree, leaf_hash: str) -> list[tuple[str, str]]:
    """Get an inclusion proof for a leaf.

    Parameters
    ----------
    tree : MerkleTree
        A built Merkle tree.
    leaf_hash : str
        Hex-encoded hash of the leaf to prove.

    Returns
    -------
    list[tuple[str, str]]
        List of (sibling_hex, direction) pairs. Direction is 'left' or 'right'.

    Raises
    ------
    ValueError
        If the leaf is not in the tree.
    """
    target = bytes.fromhex(leaf_hash)
    if target not in tree.leaves:
        raise ValueError(f"Leaf {leaf_hash} not found in tree")

    proof: list[tuple[str, str]] = []
    idx = tree.leaves.index(target)

    for layer in tree.layers[:-1]:  # skip root layer
        if len(layer) == 1:
            break
        if idx % 2 == 0:
            # Current node is left child; sibling is right
            if idx + 1 < len(layer):
                proof.append((layer[idx + 1].hex(), "right"))
            # else: odd node promoted, no sibling needed
        else:
            # Current node is right child; sibling is left
            proof.append((layer[idx - 1].hex(), "left"))
        idx //= 2

    return proof


def verify_inclusion(root_hex: str, leaf_hex: str, proof: list[tuple[str, str]]) -> bool:
    """Verify a Merkle inclusion proof.

    Parameters
    ----------
    root_hex : str
        Expected hex-encoded Merkle root.
    leaf_hex : str
        Hex-encoded hash of the leaf being proved.
    proof : list[tuple[str, str]]
        Proof pairs from :func:`get_inclusion_proof`.

    Returns
    -------
    bool
        True if the proof is valid for the given root and leaf.
    """
    current = bytes.fromhex(leaf_hex)
    for sibling_hex, direction in proof:
        sibling = bytes.fromhex(sibling_hex)
        if direction == "left":
            current = _hash_pair(sibling, current)
        else:
            current = _hash_pair(current, sibling)
    return current.hex() == root_hex
