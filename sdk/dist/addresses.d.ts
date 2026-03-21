export type ChainAddresses = {
    stakeToken: `0x${string}`;
    stakeManager: `0x${string}`;
    capacityRegistry: `0x${string}`;
    bpeSuperToken: `0x${string}`;
    paymentToken: `0x${string}`;
    paymentSuperToken: `0x${string}`;
    backpressurePool: `0x${string}`;
    escrowBuffer: `0x${string}`;
    pipeline: `0x${string}`;
    pricingCurve: `0x${string}`;
    completionTracker: `0x${string}`;
    offchainAggregator: `0x${string}`;
    gdaV1: `0x${string}`;
    gdaV1Forwarder: `0x${string}`;
    superTokenFactory: `0x${string}`;
    demurrageToken: `0x${string}`;
    velocityMetrics: `0x${string}`;
    relayCapacityRegistry: `0x${string}`;
    relayPaymentPool: `0x${string}`;
    lightningCapacityOracle: `0x${string}`;
    lightningRoutingPool: `0x${string}`;
    crossProtocolRouter: `0x${string}`;
    universalCapacityAdapter: `0x${string}`;
    reputationLedger: `0x${string}`;
    openClawCapacityAdapter: `0x${string}`;
    openClawCompletionVerifier: `0x${string}`;
    openClawReputationBridge: `0x${string}`;
    nestedPool: `0x${string}`;
    economyFactory: `0x${string}`;
    qualityOracle: `0x${string}`;
    velocityToken: `0x${string}`;
    urgencyToken: `0x${string}`;
    merkleRootAnchor: `0x${string}`;
};
/**
 * Deployed contract addresses per chain.
 * Populated after running Deploy.s.sol and recording output.
 */
export declare const addresses: Record<number, ChainAddresses>;
export declare function getAddresses(chainId: number): ChainAddresses;
