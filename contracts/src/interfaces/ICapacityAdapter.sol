// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title ICapacityAdapter
/// @notice Abstract adapter interface for normalizing capacity signals across domains.
///         Each domain (AI compute, Nostr relay, Lightning, DePIN) implements this interface
///         to translate domain-specific signals into the universal BPE capacity format.
interface ICapacityAdapter {
    /// @notice Get the unique domain identifier for this adapter.
    /// @return domainId A unique bytes32 identifying the domain (e.g., keccak256("NOSTR_RELAY")).
    function domainId() external view returns (bytes32);

    /// @notice Normalize a domain-specific capacity signal into a single uint256 value.
    /// @param rawSignal ABI-encoded domain-specific capacity data.
    /// @return normalizedCapacity The normalized capacity value for BPE allocation.
    function normalizeCapacity(bytes calldata rawSignal) external view returns (uint256 normalizedCapacity);

    /// @notice Verify a domain-specific capacity attestation.
    /// @param attestation ABI-encoded attestation with signature.
    /// @return valid Whether the attestation signature and data are valid.
    /// @return sink The Ethereum address of the capacity provider.
    /// @return capacity The normalized capacity value.
    function verifyAttestation(bytes calldata attestation)
        external
        view
        returns (bool valid, address sink, uint256 capacity);

    /// @notice Get a human-readable description of the domain and its capacity units.
    function domainDescription() external pure returns (string memory);
}
