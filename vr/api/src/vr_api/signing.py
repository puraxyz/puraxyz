"""Ed25519 evidence signing for tamper-evident verification results.

Signs artifact hashes with Ed25519 private keys. Supports key rotation
by tracking key IDs (derived from public key fingerprint).
"""

from __future__ import annotations

import base64
import hashlib
import os
from dataclasses import dataclass

from cryptography.hazmat.primitives.asymmetric.ed25519 import (
    Ed25519PrivateKey,
    Ed25519PublicKey,
)
from cryptography.hazmat.primitives import serialization


@dataclass
class SigningKeyInfo:
    """Metadata about a signing key."""
    key_id: str
    public_key: Ed25519PublicKey
    private_key: Ed25519PrivateKey | None = None
    active: bool = True


def generate_signing_key() -> tuple[Ed25519PrivateKey, str]:
    """Generate a new Ed25519 signing key pair.

    Returns
    -------
    tuple[Ed25519PrivateKey, str]
        The private key and its key ID (first 16 hex chars of SHA-256
        of the public key bytes).
    """
    private_key = Ed25519PrivateKey.generate()
    key_id = _compute_key_id(private_key.public_key())
    return private_key, key_id


def sign_evidence(artifact_hash: str, private_key: Ed25519PrivateKey) -> str:
    """Sign an artifact hash with Ed25519.

    Parameters
    ----------
    artifact_hash : str
        The hex-encoded SHA-256 artifact hash to sign.
    private_key : Ed25519PrivateKey
        The signing key.

    Returns
    -------
    str
        Base64-encoded Ed25519 signature.
    """
    signature_bytes = private_key.sign(artifact_hash.encode("utf-8"))
    return base64.b64encode(signature_bytes).decode("ascii")


def verify_signature(
    artifact_hash: str,
    signature_b64: str,
    public_key: Ed25519PublicKey,
) -> bool:
    """Verify an Ed25519 signature on an artifact hash.

    Parameters
    ----------
    artifact_hash : str
        The hex-encoded SHA-256 artifact hash.
    signature_b64 : str
        Base64-encoded signature.
    public_key : Ed25519PublicKey
        The public key to verify against.

    Returns
    -------
    bool
        True if the signature is valid.
    """
    try:
        signature_bytes = base64.b64decode(signature_b64)
        public_key.verify(signature_bytes, artifact_hash.encode("utf-8"))
        return True
    except Exception:
        return False


def load_signing_key(env_var: str = "VR_SIGNING_KEY") -> Ed25519PrivateKey | None:
    """Load an Ed25519 private key from environment or file.

    The env var can contain:
    - A PEM-encoded private key string
    - A file path to a PEM file

    Returns None if the env var is not set (signing disabled).
    """
    value = os.environ.get(env_var)
    if not value:
        return None

    # Try as file path first
    if os.path.isfile(value):
        with open(value, "rb") as f:
            return serialization.load_pem_private_key(f.read(), password=None)  # type: ignore[return-value]

    # Treat as inline PEM
    pem_bytes = value.encode("utf-8")
    return serialization.load_pem_private_key(pem_bytes, password=None)  # type: ignore[return-value]


def public_key_pem(key: Ed25519PrivateKey | Ed25519PublicKey) -> str:
    """Export the public key as PEM string."""
    pub = key.public_key() if isinstance(key, Ed25519PrivateKey) else key
    return pub.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    ).decode("ascii")


def _compute_key_id(public_key: Ed25519PublicKey) -> str:
    """Compute key ID: first 16 hex chars of SHA-256 of public key bytes."""
    raw = public_key.public_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PublicFormat.Raw,
    )
    return hashlib.sha256(raw).hexdigest()[:16]
