// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title EvidenceAnchor — Append-only Merkle root bulletin board
/// @notice Anchors daily Merkle roots of vr.dev verification evidence.
///         No tokens, no tokenomics. Pure infrastructure.
contract EvidenceAnchor {
    event RootAnchored(uint256 indexed batchId, bytes32 root, uint256 timestamp);

    mapping(uint256 => bytes32) public roots;
    uint256 public nextBatchId;
    address public immutable operator;

    constructor() {
        operator = msg.sender;
    }

    modifier onlyOperator() {
        require(msg.sender == operator, "EvidenceAnchor: not operator");
        _;
    }

    /// @notice Anchor a new Merkle root. Only callable by the operator.
    /// @param root The SHA-256 Merkle root of the evidence batch.
    function anchorRoot(bytes32 root) external onlyOperator {
        roots[nextBatchId] = root;
        emit RootAnchored(nextBatchId, root, block.timestamp);
        nextBatchId++;
    }

    /// @notice Read a previously anchored root by batch ID.
    function getRoot(uint256 batchId) external view returns (bytes32) {
        return roots[batchId];
    }
}
