"""Tests for the Ed25519 evidence signing module."""

from vr_api.signing import (
    generate_signing_key,
    public_key_pem,
    sign_evidence,
    verify_signature,
    _compute_key_id,
)


class TestSigningRoundTrip:
    def test_sign_and_verify(self):
        private_key, key_id = generate_signing_key()
        artifact_hash = "a" * 64
        sig = sign_evidence(artifact_hash, private_key)
        assert verify_signature(artifact_hash, sig, private_key.public_key())

    def test_key_id_is_hex(self):
        _, key_id = generate_signing_key()
        assert len(key_id) == 16
        int(key_id, 16)  # should not raise

    def test_different_keys_produce_different_ids(self):
        _, id1 = generate_signing_key()
        _, id2 = generate_signing_key()
        assert id1 != id2

    def test_deterministic_key_id(self):
        private_key, key_id = generate_signing_key()
        assert _compute_key_id(private_key.public_key()) == key_id


class TestInvalidSignatures:
    def test_wrong_hash(self):
        private_key, _ = generate_signing_key()
        sig = sign_evidence("a" * 64, private_key)
        assert not verify_signature("b" * 64, sig, private_key.public_key())

    def test_wrong_key(self):
        key1, _ = generate_signing_key()
        key2, _ = generate_signing_key()
        sig = sign_evidence("a" * 64, key1)
        assert not verify_signature("a" * 64, sig, key2.public_key())

    def test_corrupted_signature(self):
        private_key, _ = generate_signing_key()
        sig = sign_evidence("a" * 64, private_key)
        corrupted = sig[:-4] + "XXXX"
        assert not verify_signature("a" * 64, corrupted, private_key.public_key())


class TestKeyRotation:
    def test_old_key_still_verifies(self):
        """After rotation, old evidence signed with old key should still verify."""
        old_key, old_id = generate_signing_key()
        new_key, new_id = generate_signing_key()

        old_sig = sign_evidence("old_hash_" + "a" * 55, old_key)
        new_sig = sign_evidence("new_hash_" + "b" * 55, new_key)

        # Old key verifies old evidence
        assert verify_signature("old_hash_" + "a" * 55, old_sig, old_key.public_key())
        # New key verifies new evidence
        assert verify_signature("new_hash_" + "b" * 55, new_sig, new_key.public_key())
        # Keys don't cross-verify
        assert not verify_signature("old_hash_" + "a" * 55, old_sig, new_key.public_key())


class TestPublicKeyExport:
    def test_pem_format(self):
        private_key, _ = generate_signing_key()
        pem = public_key_pem(private_key)
        assert pem.startswith("-----BEGIN PUBLIC KEY-----")
        assert pem.strip().endswith("-----END PUBLIC KEY-----")

    def test_pem_from_public_key(self):
        private_key, _ = generate_signing_key()
        pem1 = public_key_pem(private_key)
        pem2 = public_key_pem(private_key.public_key())
        assert pem1 == pem2
