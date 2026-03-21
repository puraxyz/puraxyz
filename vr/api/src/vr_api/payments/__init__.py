"""Payment abstraction layer for vr.dev API.

Supports dual auth: traditional API key (quota-limited) and x402 USDC
micropayments (pay-per-request). The PaymentProvider interface allows
pluggable payment backends - currently x402 via Coinbase CDP.

No native tokens. USDC only.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from decimal import Decimal
from enum import Enum

from fastapi import Request


class PaymentTier(str, Enum):
    """Per-verification USDC pricing by verifier tier."""

    HARD = "HARD"
    SOFT = "SOFT"
    AGENTIC = "AGENTIC"


# Pricing in USDC - reflects cost structure (deterministic < LLM < browser)
TIER_PRICES: dict[str, Decimal] = {
    PaymentTier.HARD: Decimal("0.005"),
    PaymentTier.SOFT: Decimal("0.05"),
    PaymentTier.AGENTIC: Decimal("0.15"),
}

# Surcharge for composition endpoints (on top of component prices)
COMPOSE_SURCHARGE = Decimal("0.002")


@dataclass
class PaymentResult:
    """Outcome of a successful payment verification."""

    payer_address: str  # Ethereum address or "api_key:{prefix}" for legacy
    amount_usdc: Decimal
    tx_hash: str | None  # on-chain tx hash for x402 payments
    provider: str  # "x402" or "api_key"


class PaymentProvider(ABC):
    """Abstract payment backend.

    Implementations handle payment verification, requirement generation,
    and charge recording for a specific payment protocol (e.g., x402).
    """

    @abstractmethod
    async def check_payment(self, request: Request) -> PaymentResult | None:
        """Check if the request includes a valid payment proof.

        Returns PaymentResult if payment is verified, None otherwise.
        """

    @abstractmethod
    def create_payment_requirement(
        self, endpoint: str, tier: str, amount: Decimal
    ) -> dict[str, str]:
        """Generate HTTP headers for a 402 Payment Required response.

        Returns a dict of headers to include in the 402 response.
        """

    @abstractmethod
    async def record_charge(
        self, payment: PaymentResult, verification_id: str | None
    ) -> None:
        """Record a successful charge for auditing and reconciliation."""


def get_price_for_tier(tier: str) -> Decimal:
    """Look up USDC price for a verifier tier string."""
    return TIER_PRICES.get(tier.upper(), TIER_PRICES[PaymentTier.HARD])


def get_price_for_compose(tiers: list[str]) -> Decimal:
    """Calculate total price for a composed verification pipeline."""
    total = sum(get_price_for_tier(t) for t in tiers)
    return total + COMPOSE_SURCHARGE


def get_price_for_ensemble(tier: str, num_instances: int) -> Decimal:
    """Calculate price for an ensemble verification."""
    return get_price_for_tier(tier) * num_instances
