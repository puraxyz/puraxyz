// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title MerkleRootAnchor — append-only evidence anchoring for vr.dev
/// @notice Stores Merkle roots on-chain for tamper-evident verification records.
///         Any address can anchor a root. Each root maps to the first anchor timestamp.
contract MerkleRootAnchor {
    /// @notice Timestamp of first anchor per root. Zero means not yet anchored.
    mapping(bytes32 root => uint256 timestamp) public anchored;

    event RootAnchored(bytes32 indexed root, address indexed submitter, uint256 timestamp);

    error RootAlreadyAnchored(bytes32 root);

    /// @notice Anchor a Merkle root. Reverts if the root was already anchored.
    /// @param root The Merkle root hash to anchor.
    function anchor(bytes32 root) external {
        if (anchored[root] != 0) revert RootAlreadyAnchored(root);
        anchored[root] = block.timestamp;
        emit RootAnchored(root, msg.sender, block.timestamp);
    }

    /// @notice Check whether a root has been anchored.
    function isAnchored(bytes32 root) external view returns (bool) {
        return anchored[root] != 0;
    }
}
