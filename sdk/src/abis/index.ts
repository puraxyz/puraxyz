import type { Abi } from "viem";
import BackpressurePoolAbi from "./BackpressurePool.json";
import CapacityRegistryAbi from "./CapacityRegistry.json";
import StakeManagerAbi from "./StakeManager.json";
import EscrowBufferAbi from "./EscrowBuffer.json";
import PipelineAbi from "./Pipeline.json";
import GDAv1ForwarderAbi from "./GDAv1Forwarder.json";
import PricingCurveAbi from "./PricingCurve.json";
import CompletionTrackerAbi from "./CompletionTracker.json";
import OffchainAggregatorAbi from "./OffchainAggregator.json";
import DemurrageTokenAbi from "./DemurrageToken.json";
import VelocityMetricsAbi from "./VelocityMetrics.json";
import ReputationLedgerAbi from "./ReputationLedger.json";
import UniversalCapacityAdapterAbi from "./UniversalCapacityAdapter.json";
import RelayCapacityRegistryAbi from "./RelayCapacityRegistry.json";
import RelayPaymentPoolAbi from "./RelayPaymentPool.json";
import LightningCapacityOracleAbi from "./LightningCapacityOracle.json";
import LightningRoutingPoolAbi from "./LightningRoutingPool.json";
import CrossProtocolRouterAbi from "./CrossProtocolRouter.json";
import OpenClawCapacityAdapterAbi from "./OpenClawCapacityAdapter.json";
import OpenClawCompletionVerifierAbi from "./OpenClawCompletionVerifier.json";
import OpenClawReputationBridgeAbi from "./OpenClawReputationBridge.json";
import NestedPoolAbi from "./NestedPool.json";
import EconomyFactoryAbi from "./EconomyFactory.json";
import QualityOracleAbi from "./QualityOracle.json";
import VelocityTokenAbi from "./VelocityToken.json";
import UrgencyTokenAbi from "./UrgencyToken.json";
import MerkleRootAnchorAbi from "./MerkleRootAnchor.json";

export const abis = {
  BackpressurePool: BackpressurePoolAbi as unknown as Abi,
  CapacityRegistry: CapacityRegistryAbi as unknown as Abi,
  StakeManager: StakeManagerAbi as unknown as Abi,
  EscrowBuffer: EscrowBufferAbi as unknown as Abi,
  Pipeline: PipelineAbi as unknown as Abi,
  GDAv1Forwarder: GDAv1ForwarderAbi as unknown as Abi,
  PricingCurve: PricingCurveAbi as unknown as Abi,
  CompletionTracker: CompletionTrackerAbi as unknown as Abi,
  OffchainAggregator: OffchainAggregatorAbi as unknown as Abi,
  DemurrageToken: DemurrageTokenAbi as unknown as Abi,
  VelocityMetrics: VelocityMetricsAbi as unknown as Abi,
  ReputationLedger: ReputationLedgerAbi as unknown as Abi,
  UniversalCapacityAdapter: UniversalCapacityAdapterAbi as unknown as Abi,
  RelayCapacityRegistry: RelayCapacityRegistryAbi as unknown as Abi,
  RelayPaymentPool: RelayPaymentPoolAbi as unknown as Abi,
  LightningCapacityOracle: LightningCapacityOracleAbi as unknown as Abi,
  LightningRoutingPool: LightningRoutingPoolAbi as unknown as Abi,
  CrossProtocolRouter: CrossProtocolRouterAbi as unknown as Abi,
  OpenClawCapacityAdapter: OpenClawCapacityAdapterAbi as unknown as Abi,
  OpenClawCompletionVerifier: OpenClawCompletionVerifierAbi as unknown as Abi,
  OpenClawReputationBridge: OpenClawReputationBridgeAbi as unknown as Abi,
  NestedPool: NestedPoolAbi as unknown as Abi,
  EconomyFactory: EconomyFactoryAbi as unknown as Abi,
  QualityOracle: QualityOracleAbi as unknown as Abi,
  VelocityToken: VelocityTokenAbi as unknown as Abi,
  UrgencyToken: UrgencyTokenAbi as unknown as Abi,
  MerkleRootAnchor: MerkleRootAnchorAbi as unknown as Abi,
} as const;

