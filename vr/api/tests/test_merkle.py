"""Tests for the Merkle tree module."""

import hashlib

from vr_api.merkle import build_merkle_tree, get_inclusion_proof, verify_inclusion


def _sha256(data: str) -> str:
    return hashlib.sha256(data.encode()).hexdigest()


class TestBuildTree:
    def test_empty(self):
        tree = build_merkle_tree([])
        assert tree.root == b""
        assert tree.root_hex == ""
        assert tree.leaves == []

    def test_single_leaf(self):
        h = _sha256("hello")
        tree = build_merkle_tree([h])
        assert tree.root_hex == h
        assert len(tree.layers) == 1
        assert len(tree.leaves) == 1

    def test_two_leaves(self):
        h1, h2 = _sha256("a"), _sha256("b")
        tree = build_merkle_tree([h1, h2])
        assert len(tree.layers) == 2
        assert len(tree.layers[0]) == 2
        assert len(tree.layers[1]) == 1
        assert tree.root_hex != h1
        assert tree.root_hex != h2

    def test_four_leaves(self):
        hashes = [_sha256(str(i)) for i in range(4)]
        tree = build_merkle_tree(hashes)
        assert len(tree.layers) == 3  # leaves, pair, root
        assert len(tree.layers[-1]) == 1

    def test_odd_leaves(self):
        hashes = [_sha256(str(i)) for i in range(7)]
        tree = build_merkle_tree(hashes)
        assert len(tree.layers[-1]) == 1
        assert tree.root_hex

    def test_deterministic(self):
        hashes = [_sha256(str(i)) for i in range(10)]
        t1 = build_merkle_tree(hashes)
        t2 = build_merkle_tree(hashes)
        assert t1.root_hex == t2.root_hex


class TestInclusionProof:
    def test_two_leaves(self):
        h1, h2 = _sha256("a"), _sha256("b")
        tree = build_merkle_tree([h1, h2])
        proof = get_inclusion_proof(tree, h1)
        assert len(proof) == 1
        assert proof[0][0] == h2

    def test_four_leaves_all(self):
        hashes = [_sha256(str(i)) for i in range(4)]
        tree = build_merkle_tree(hashes)
        for h in hashes:
            proof = get_inclusion_proof(tree, h)
            assert len(proof) == 2  # log2(4) = 2

    def test_missing_leaf_raises(self):
        hashes = [_sha256(str(i)) for i in range(4)]
        tree = build_merkle_tree(hashes)
        try:
            get_inclusion_proof(tree, _sha256("missing"))
            assert False, "Should have raised ValueError"
        except ValueError:
            pass

    def test_single_leaf_proof(self):
        h = _sha256("only")
        tree = build_merkle_tree([h])
        proof = get_inclusion_proof(tree, h)
        assert proof == []


class TestVerifyInclusion:
    def test_valid_proof(self):
        hashes = [_sha256(str(i)) for i in range(8)]
        tree = build_merkle_tree(hashes)
        for h in hashes:
            proof = get_inclusion_proof(tree, h)
            assert verify_inclusion(tree.root_hex, h, proof)

    def test_invalid_root(self):
        hashes = [_sha256(str(i)) for i in range(4)]
        tree = build_merkle_tree(hashes)
        proof = get_inclusion_proof(tree, hashes[0])
        assert not verify_inclusion(_sha256("fake_root"), hashes[0], proof)

    def test_wrong_leaf(self):
        hashes = [_sha256(str(i)) for i in range(4)]
        tree = build_merkle_tree(hashes)
        proof = get_inclusion_proof(tree, hashes[0])
        assert not verify_inclusion(tree.root_hex, hashes[1], proof)

    def test_single_leaf(self):
        h = _sha256("solo")
        tree = build_merkle_tree([h])
        proof = get_inclusion_proof(tree, h)
        assert verify_inclusion(tree.root_hex, h, proof)

    def test_odd_leaf_count(self):
        hashes = [_sha256(str(i)) for i in range(5)]
        tree = build_merkle_tree(hashes)
        for h in hashes:
            proof = get_inclusion_proof(tree, h)
            assert verify_inclusion(tree.root_hex, h, proof)

    def test_large_tree(self):
        hashes = [_sha256(str(i)) for i in range(100)]
        tree = build_merkle_tree(hashes)
        # Spot-check a few
        for h in [hashes[0], hashes[49], hashes[99]]:
            proof = get_inclusion_proof(tree, h)
            assert verify_inclusion(tree.root_hex, h, proof)
