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
export * as verify from "./actions/verify.js";

// Action modules: V2 — recursive composition, quality, token mechanics
export * as nestedPool from "./actions/nestedPool.js";
export * as economy from "./actions/economy.js";
export * as quality from "./actions/quality.js";
export * as velocityToken from "./actions/velocityToken.js";
export * as urgencyToken from "./actions/urgencyToken.js";

// Signing helpers
export * from "./signing.js";
