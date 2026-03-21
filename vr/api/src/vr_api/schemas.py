"""Pydantic request / response schemas for the verification API."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel


# ── Requests ─────────────────────────────────────────────────────────────────


class VerifyRequest(BaseModel):
    verifier_id: str
    completions: list[str]
    ground_truth: dict[str, Any]
    context: dict[str, Any] | None = None


class ComposeRequest(BaseModel):
    verifier_ids: list[str]
    completions: list[str]
    ground_truth: dict[str, Any]
    context: dict[str, Any] | None = None
    require_hard: bool = True
    policy_mode: str = "fail_closed"
    budget_limit_usd: float | None = None


class ExportRequest(BaseModel):
    verifier_id: str
    completions: list[str]
    ground_truth: dict[str, Any]
    context: dict[str, Any] | None = None
    extra: dict[str, Any] | None = None


# ── Responses ────────────────────────────────────────────────────────────────


class ResultItem(BaseModel):
    verdict: str
    score: float
    tier: str
    breakdown: dict[str, float]
    evidence: dict[str, Any]
    artifact_hash: str
    passed: bool
    repair_hints: list[str] = []
    retryable: bool = False
    suggested_action: str | None = None
    step_rewards: list[float] | None = None
    cost_usd: float | None = None
    signature: str | None = None
    signing_key_id: str | None = None


class VerifyResponse(BaseModel):
    results: list[ResultItem]


class ComposeResponse(BaseModel):
    results: list[ResultItem]


class VerifiersResponse(BaseModel):
    verifiers: list[str]


class ExportResponse(BaseModel):
    lines: list[str]
    count: int


class HealthResponse(BaseModel):
    status: str
    version: str


class EvidenceResponse(BaseModel):
    artifact_hash: str
    verifier_id: str
    verdict: str
    score: float
    evidence: dict[str, Any]
    created_at: str


class UsageSummaryItem(BaseModel):
    api_key: str
    request_count: int
    avg_latency_ms: float


class UsageResponse(BaseModel):
    usage: list[UsageSummaryItem]


# ── Batch ────────────────────────────────────────────────────────────────────


class BatchVerifyRequest(BaseModel):
    items: list[VerifyRequest]


class BatchResultItem(BaseModel):
    verifier_id: str
    results: list[ResultItem]
    error: str | None = None


class BatchVerifyResponse(BaseModel):
    items: list[BatchResultItem]


# ── Evidence list ────────────────────────────────────────────────────────────


class EvidenceListResponse(BaseModel):
    evidence: list[EvidenceResponse]
    count: int


# ── Ensemble (C4) ───────────────────────────────────────────────────────────


class EnsembleRequest(BaseModel):
    verifier_id: str
    completions: list[str]
    ground_truth: dict[str, Any]
    context: dict[str, Any] | None = None
    num_instances: int = 3
    consensus_threshold: float = 0.66
    strategy: str = "majority"


class EnsembleResponse(BaseModel):
    results: list[ResultItem]
    ensemble_metadata: dict[str, Any] = {}


# ── Quota ────────────────────────────────────────────────────────────────────


class QuotaItem(BaseModel):
    api_key: str
    daily_limit: int
    monthly_limit: int


class QuotaResponse(BaseModel):
    quota: QuotaItem


class SetQuotaRequest(BaseModel):
    daily_limit: int = 1000
    monthly_limit: int = 10000


# ── Step / Stream ────────────────────────────────────────────────────────────


class StepInputItem(BaseModel):
    step_index: int
    completions: list[str]
    ground_truth: dict[str, Any] = {}
    context: dict[str, Any] | None = None
    is_terminal: bool = False


class StreamVerifyRequest(BaseModel):
    verifier_ids: list[str]
    steps: list[StepInputItem]
    require_hard: bool = True
    policy_mode: str = "fail_closed"


class StepVerifyRequest(BaseModel):
    """Submit a single step for progressive verification."""
    verifier_ids: list[str]
    step: StepInputItem
    require_hard: bool = True
    policy_mode: str = "fail_closed"
    budget_limit_usd: float | None = None


class StepVerifyResponse(BaseModel):
    """Response for a single-step verification."""
    results: list[ResultItem]
    step_index: int
    is_terminal: bool
    trajectory_halted: bool = False
    steps_completed: int = 0


# ── Proof / Anchor ───────────────────────────────────────────────────────────


class ProofResponse(BaseModel):
    artifact_hash: str
    merkle_root: str
    proof: list[dict[str, str]]
    batch_id: int
    tx_hash: str | None = None
    chain: str
    verified: bool


# ── Keys ─────────────────────────────────────────────────────────────────────


class KeyItem(BaseModel):
    key_id: str
    public_key_pem: str
    algorithm: str = "Ed25519"
    active: bool = True


class KeysResponse(BaseModel):
    keys: list[KeyItem]


# ── Payments ─────────────────────────────────────────────────────────────────


class PaymentItem(BaseModel):
    payer_address: str
    amount_usdc: float
    tx_hash: str | None = None
    verification_id: str | None = None
    endpoint: str
    tier: str
    provider: str
    created_at: str


class PaymentsResponse(BaseModel):
    payments: list[PaymentItem]
    count: int


class RevenueItem(BaseModel):
    provider: str
    tier: str
    tx_count: int
    total_usdc: float


class RevenueResponse(BaseModel):
    revenue: list[RevenueItem]


class PricingTierItem(BaseModel):
    tier: str
    price_usdc: float


class PricingResponse(BaseModel):
    tiers: list[PricingTierItem]
    compose_surcharge_usdc: float
    x402_enabled: bool


class EstimateResponse(BaseModel):
    estimated_cost_usd: float
    tiers_included: list[str]
    tiers_skipped: list[str]
    verifier_count: int
    policy_mode: str
