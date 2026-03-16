// @backproto/sdk - TypeScript SDK for Backproto

export { abis } from "./abis/index.js";
export { addresses, getAddresses, type ChainAddresses } from "./addresses.js";
export { getContracts, type BPEContracts } from "./contracts.js";

// Action modules: Core BPE
export * as sink from "./actions/sink.js";
export * as source from "./actions/source.js";
export * as pool from "./actions/pool.js";
export * as stake from "./actions/stake.js";
export * as buffer from "./actions/buffer.js";
export * as pricing from "./actions/pricing.js";
export * as completion from "./actions/completion.js";
export * as aggregator from "./actions/aggregator.js";

// Action modules: Backproto extensions
export * as demurrage from "./actions/demurrage.js";
export * as relay from "./actions/relay.js";
export * as lightning from "./actions/lightning.js";
export * as platform from "./actions/platform.js";
export * as openclaw from "./actions/openclaw.js";

// Signing helpers
export * from "./signing.js";
