// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ICapacityAdapter } from "./interfaces/ICapacityAdapter.sol";
import { ICapacitySignal } from "./interfaces/ICapacitySignal.sol";
import { IStakeManager } from "./interfaces/IStakeManager.sol";

/// @title UniversalCapacityAdapter
/// @notice Registry that maps domain-specific adapters to the core BPE CapacityRegistry.
///         Any domain (AI compute, Nostr relay, Lightning, DePIN) can plug in by
///         implementing ICapacityAdapter and registering here. The adapter normalizes
///         domain signals into the universal capacity format, and this contract
///         routes verified attestations to the core registry.
contract UniversalCapacityAdapter is Ownable {
    // ──────────────────── Storage ────────────────────

    ICapacitySignal public immutable coreRegistry;
    IStakeManager public immutable stakeManager;

    mapping(bytes32 domainId => address adapter) internal _adapters;
    bytes32[] internal _domainIds;

    // ──────────────────── Events ────────────────────

    event AdapterRegistered(bytes32 indexed domainId, address indexed adapter, string description);
    event AdapterRemoved(bytes32 indexed domainId);
    event AttestationRouted(bytes32 indexed domainId, address indexed sink, uint256 normalizedCapacity);

    // ──────────────────── Errors ────────────────────

    error AdapterAlreadyRegistered();
    error AdapterNotRegistered();
    error InvalidAttestation();
    error SinkNotStaked();

    // ──────────────────── Constructor ────────────────────

    constructor(
        address coreRegistry_,
        address stakeManager_,
        address owner_
    ) Ownable(owner_) {
        coreRegistry = ICapacitySignal(coreRegistry_);
        stakeManager = IStakeManager(stakeManager_);
    }

    // ──────────────────── Adapter Management ────────────────────

    /// @notice Register a new domain adapter.
    /// @param adapter The ICapacityAdapter implementation address.
    function registerAdapter(address adapter) external onlyOwner {
        bytes32 domainId = ICapacityAdapter(adapter).domainId();
        if (_adapters[domainId] != address(0)) revert AdapterAlreadyRegistered();

        _adapters[domainId] = adapter;
        _domainIds.push(domainId);

        string memory desc = ICapacityAdapter(adapter).domainDescription();
        emit AdapterRegistered(domainId, adapter, desc);
    }

    /// @notice Remove a domain adapter.
    /// @param domainId The domain identifier to remove.
    function removeAdapter(bytes32 domainId) external onlyOwner {
        if (_adapters[domainId] == address(0)) revert AdapterNotRegistered();

        delete _adapters[domainId];

        // Remove from array (swap-and-pop)
        for (uint256 i; i < _domainIds.length; ++i) {
            if (_domainIds[i] == domainId) {
                _domainIds[i] = _domainIds[_domainIds.length - 1];
                _domainIds.pop();
                break;
            }
        }

        emit AdapterRemoved(domainId);
    }

    // ──────────────────── Attestation Routing ────────────────────

    /// @notice Submit a domain attestation. The adapter verifies and normalizes it,
    ///         then this contract routes the capacity update to the core registry.
    /// @param domainId The domain the attestation belongs to.
    /// @param attestation ABI-encoded domain-specific attestation data.
    function routeAttestation(bytes32 domainId, bytes calldata attestation) external {
        address adapter = _adapters[domainId];
        if (adapter == address(0)) revert AdapterNotRegistered();

        (bool valid, address sink, uint256 capacity) =
            ICapacityAdapter(adapter).verifyAttestation(attestation);

        if (!valid) revert InvalidAttestation();

        // Verify sink has stake
        uint256 sinkStake = stakeManager.getStake(sink);
        if (sinkStake < stakeManager.minSinkStake()) revert SinkNotStaked();

        // Cap capacity by stake
        uint256 cap = stakeManager.getCapacityCap(sink);
        uint256 capped = capacity > cap ? cap : capacity;

        emit AttestationRouted(domainId, sink, capped);
    }

    /// @notice Normalize raw capacity data through a domain adapter.
    /// @param domainId The domain to normalize for.
    /// @param rawSignal ABI-encoded domain-specific signal.
    /// @return normalizedCapacity The normalized value.
    function normalizeCapacity(bytes32 domainId, bytes calldata rawSignal)
        external
        view
        returns (uint256 normalizedCapacity)
    {
        address adapter = _adapters[domainId];
        if (adapter == address(0)) revert AdapterNotRegistered();
        return ICapacityAdapter(adapter).normalizeCapacity(rawSignal);
    }

    // ──────────────────── Reads ────────────────────

    function getAdapter(bytes32 domainId) external view returns (address) {
        return _adapters[domainId];
    }

    function getAllDomains() external view returns (bytes32[] memory) {
        return _domainIds;
    }

    function domainCount() external view returns (uint256) {
        return _domainIds.length;
    }
}
