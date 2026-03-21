// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import { MerkleRootAnchor } from "../src/MerkleRootAnchor.sol";

/// @title DeployMerkleRootAnchor
/// @notice Deploy the shared vr.dev evidence anchoring contract.
///         Usage: forge script script/DeployMerkleRootAnchor.s.sol --rpc-url base_sepolia --broadcast --verify
contract DeployMerkleRootAnchor is Script {
    function run() external {
        vm.startBroadcast();
        MerkleRootAnchor anchor = new MerkleRootAnchor();
        vm.stopBroadcast();

        console.log("MerkleRootAnchor deployed at:", address(anchor));
    }
}
