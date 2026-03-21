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
  // Backproto extensions
  demurrageToken: `0x${string}`;
  velocityMetrics: `0x${string}`;
  relayCapacityRegistry: `0x${string}`;
  relayPaymentPool: `0x${string}`;
  lightningCapacityOracle: `0x${string}`;
  lightningRoutingPool: `0x${string}`;
  crossProtocolRouter: `0x${string}`;
  universalCapacityAdapter: `0x${string}`;
  reputationLedger: `0x${string}`;
  // OpenClaw integration
  openClawCapacityAdapter: `0x${string}`;
  openClawCompletionVerifier: `0x${string}`;
  openClawReputationBridge: `0x${string}`;
  // V2: Recursive composition + quality + token mechanics
  nestedPool: `0x${string}`;
  economyFactory: `0x${string}`;
  qualityOracle: `0x${string}`;
  velocityToken: `0x${string}`;
  urgencyToken: `0x${string}`;
  // vr.dev evidence anchoring
  merkleRootAnchor: `0x${string}`;
};

/** Well-known Superfluid addresses on Base Sepolia */
const SUPERFLUID_BASE_SEPOLIA = {
  gdaV1: "0x53F4f44C813Dc380182d0b2b67fe5832A12B97f8" as `0x${string}`,
  gdaV1Forwarder: "0x6DA13Bde224A05a288748d857b9e7DDEffd1dE08" as `0x${string}`,
  superTokenFactory: "0x7447E94Dfe3d804a9f46Bf12838d467c912C8F6C" as `0x${string}`,
};

/** Well-known Superfluid addresses on Base Mainnet */
const SUPERFLUID_BASE_MAINNET = {
  gdaV1: "0xfE6c87BE05feDB2059d2EC41bA0A09826C9FD7aa" as `0x${string}`,
  gdaV1Forwarder: "0x6DA13Bde224A05a288748d857b9e7DDEffd1dE08" as `0x${string}`,
  superTokenFactory: "0xe20B9a38E0c96F61d1bA6b42a61512D56Fea1Eb3" as `0x${string}`,
};

/**
 * Deployed contract addresses per chain.
 * Populated after running Deploy.s.sol and recording output.
 */
export const addresses: Record<number, ChainAddresses> = {
  // Base Sepolia (chain ID 84532) - deployed 2026-03-16
  84532: {
    stakeToken: "0x129Cb89ED216637925871951cA6FFc5F01F7c9a2",
    stakeManager: "0x4936822CB9e316ee951Af2204916878acCDD564E",
    capacityRegistry: "0x4ED9386110051eC66b96e5d2e627048D57df5B64",
    bpeSuperToken: "0x9C1Ae19eB1BB106750D2a9Cb64742B99e4Dcf6e7",
    paymentToken: "0x11bbA4095f8a4b2C8DD9f2d61C8ae5B16d013f08",
    paymentSuperToken: "0xc6394CedA69Fec539900492735386A331eF4810a",
    backpressurePool: "0x8a1F99e32d6d3D79d8AaF275000D6cbb57A8AF6a",
    escrowBuffer: "0x31288aB9b12298Ff0C022ffD9F90797bB238d90a",
    pipeline: "0x1eebaB27BD472b5956D8335CDB69b940F079e6dE",
    pricingCurve: "0x37D65E1C233a13bDf6E48Bd4BD9B4103888dA866",
    completionTracker: "0x7Dd6d47AC3b0BbF3D99bd61D1f1B1F85350A90c4",
    offchainAggregator: "0x98c621051b5909f41d3d9A32b3b7DbB02615a179",
    ...SUPERFLUID_BASE_SEPOLIA,
    // Backproto extensions
    demurrageToken: "0x20C03C01Bd68d44DB89e3BA531009Cf0AA9074De",
    velocityMetrics: "0x1b7eBD1FB40dbDd624543807350b1Ffb19F96dfE",
    relayCapacityRegistry: "0x205457d92b5d92AD0F98cDC5FF37C61F5697565D",
    relayPaymentPool: "0x04815dA053F9d90875Ea61BAFcE7D4daD35E2fF5",
    lightningCapacityOracle: "0x31fEE06423FDA16733e25dBd8145AC0E56E4da42",
    lightningRoutingPool: "0x1CD5CE34a130e7953E56ae1949BeaC8B733e0247",
    crossProtocolRouter: "0x89df6EF70ef288f61003E392D3E5ddC8D9bD6e2d",
    universalCapacityAdapter: "0x66368dbFdf4de036efB4D37bC73B490903062421",
    reputationLedger: "0xdbCD358acEe7671D1ce7311CF9aC2a5B1C266B55",
    // OpenClaw integration (placeholder -- update after deployment)
    openClawCapacityAdapter: "0x0000000000000000000000000000000000000000",
    openClawCompletionVerifier: "0x0000000000000000000000000000000000000000",
    openClawReputationBridge: "0x0000000000000000000000000000000000000000",
    // V2 (placeholder -- update after deployment)
    nestedPool: "0x0000000000000000000000000000000000000000",
    economyFactory: "0x0000000000000000000000000000000000000000",
    qualityOracle: "0x0000000000000000000000000000000000000000",
    velocityToken: "0x0000000000000000000000000000000000000000",
    urgencyToken: "0x0000000000000000000000000000000000000000",
    // vr.dev evidence anchoring (placeholder -- update after deployment)
    merkleRootAnchor: "0x0000000000000000000000000000000000000000",
  },

  // Base Mainnet (chain ID 8453) — placeholder, populated after mainnet deploy
  8453: {
    stakeToken: "0x0000000000000000000000000000000000000000",
    stakeManager: "0x0000000000000000000000000000000000000000",
    capacityRegistry: "0x0000000000000000000000000000000000000000",
    bpeSuperToken: "0x0000000000000000000000000000000000000000",
    paymentToken: "0x0000000000000000000000000000000000000000",
    paymentSuperToken: "0x0000000000000000000000000000000000000000",
    backpressurePool: "0x0000000000000000000000000000000000000000",
    escrowBuffer: "0x0000000000000000000000000000000000000000",
    pipeline: "0x0000000000000000000000000000000000000000",
    pricingCurve: "0x0000000000000000000000000000000000000000",
    completionTracker: "0x0000000000000000000000000000000000000000",
    offchainAggregator: "0x0000000000000000000000000000000000000000",
    ...SUPERFLUID_BASE_MAINNET,
    demurrageToken: "0x0000000000000000000000000000000000000000",
    velocityMetrics: "0x0000000000000000000000000000000000000000",
    relayCapacityRegistry: "0x0000000000000000000000000000000000000000",
    relayPaymentPool: "0x0000000000000000000000000000000000000000",
    lightningCapacityOracle: "0x0000000000000000000000000000000000000000",
    lightningRoutingPool: "0x0000000000000000000000000000000000000000",
    crossProtocolRouter: "0x0000000000000000000000000000000000000000",
    universalCapacityAdapter: "0x0000000000000000000000000000000000000000",
    reputationLedger: "0x0000000000000000000000000000000000000000",
    openClawCapacityAdapter: "0x0000000000000000000000000000000000000000",
    openClawCompletionVerifier: "0x0000000000000000000000000000000000000000",
    openClawReputationBridge: "0x0000000000000000000000000000000000000000",
    nestedPool: "0x0000000000000000000000000000000000000000",
    economyFactory: "0x0000000000000000000000000000000000000000",
    qualityOracle: "0x0000000000000000000000000000000000000000",
    velocityToken: "0x0000000000000000000000000000000000000000",
    urgencyToken: "0x0000000000000000000000000000000000000000",
    merkleRootAnchor: "0x0000000000000000000000000000000000000000",
  },
};

export function getAddresses(chainId: number): ChainAddresses {
  const addrs = addresses[chainId];
  if (!addrs) {
    throw new Error(`No addresses configured for chain ${chainId}`);
  }
  return addrs;
}
