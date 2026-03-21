"""Evidence persistence - append-only storage for verification results.

Uses SQLAlchemy async with PostgreSQL (production) or SQLite (testing).
Connection string is read from ``DATABASE_URL`` env var.
"""

from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import Column, DateTime, Float, Integer, Numeric, String, Text, TypeDecorator, delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase


# ── Dialect-adaptive UUID column ─────────────────────────────────────────────


class KeyIdType(TypeDecorator):
    """UUID on PostgreSQL, plain String on SQLite (for tests)."""

    impl = String
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            from sqlalchemy.dialects.postgresql import UUID as PgUUID

            return dialect.type_descriptor(PgUUID(as_uuid=False))
        return dialect.type_descriptor(String(128))

# ── ORM model ────────────────────────────────────────────────────────────────


class Base(DeclarativeBase):
    pass


class EvidenceRecord(Base):
    """Append-only evidence row.

    Primary key is the SHA-256 artifact hash produced by the verifier.
    """

    __tablename__ = "evidence_records"

    artifact_hash = Column(String(71), primary_key=True)  # "sha256:" + 64 hex
    verifier_id = Column(String(128), nullable=False, index=True)
    verdict = Column(String(16), nullable=False)
    score = Column(Float, nullable=False)
    evidence_json = Column(Text, nullable=False)  # serialised JSON
    signature = Column(String(128), nullable=True)
    signing_key_id = Column(String(32), nullable=True)
    batch_id = Column(Integer, nullable=True, index=True)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )


class AnchorRecord(Base):
    """Merkle root anchor submitted to L2."""

    __tablename__ = "anchor_records"

    batch_id = Column(Integer, primary_key=True, autoincrement=True)
    merkle_root = Column(String(71), nullable=False)
    leaf_count = Column(Integer, nullable=False)
    tx_hash = Column(String(66), nullable=True)
    chain = Column(String(32), nullable=False, default="base-sepolia")
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )


class UsageRecord(Base):
    """Per-request usage tracking row."""

    __tablename__ = "usage_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    api_key_id = Column(KeyIdType(), nullable=False, index=True)
    endpoint = Column(String(256), nullable=False)
    method = Column(String(8), nullable=False)
    status_code = Column(Integer, nullable=False)
    latency_ms = Column(Integer, nullable=False, default=0)
    created_at = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
    )


class QuotaRecord(Base):
    """Per-key quota limits.

    When a key has no QuotaRecord, it is unrestricted.
    """

    __tablename__ = "quota_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    api_key_id = Column(KeyIdType(), unique=True, nullable=False)
    daily_limit = Column(Integer, nullable=False, default=1000)
    monthly_limit = Column(Integer, nullable=False, default=10000)
    created_at = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
    )
    updated_at = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
        onupdate=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
    )


class PaymentRecord(Base):
    """Per-verification payment record for x402 USDC and legacy API key charges."""

    __tablename__ = "payment_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    payer_address = Column(String(42), nullable=False, index=True)  # 0x... or "api_key:prefix"
    amount_usdc = Column(Numeric(10, 6), nullable=False)
    tx_hash = Column(String(66), nullable=True, index=True)  # on-chain tx hash
    verification_id = Column(String(71), nullable=True)  # linked artifact_hash
    endpoint = Column(String(256), nullable=False)
    tier = Column(String(16), nullable=False, default="HARD")
    provider = Column(String(16), nullable=False, default="api_key")  # "x402" or "api_key"
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )


# ── Engine / session factory ─────────────────────────────────────────────────

_engine = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


def _default_url() -> str:
    return os.environ.get(
        "VR_DATABASE_URL",
        os.environ.get("DATABASE_URL", "sqlite+aiosqlite:///:memory:"),
    )


async def init_db(url: str | None = None) -> None:
    """Create the engine, session factory, and tables."""
    global _engine, _session_factory
    db_url = url or _default_url()
    # Normalise postgresql:// → postgresql+asyncpg:// for async engine
    if db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)
    # asyncpg doesn't accept sslmode - translate to the ssl connect_arg
    connect_args: dict[str, Any] = {}
    if "sslmode=" in db_url:
        from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

        parsed = urlparse(db_url)
        qs = parse_qs(parsed.query)
        if qs.pop("sslmode", None):
            import ssl as _ssl
            connect_args["ssl"] = _ssl.create_default_context()
        new_query = urlencode(qs, doseq=True)
        db_url = urlunparse(parsed._replace(query=new_query))
    engine_kwargs: dict[str, Any] = {"echo": False}
    if db_url.startswith("postgresql"):
        engine_kwargs.update(pool_size=5, max_overflow=10)
    _engine = create_async_engine(db_url, connect_args=connect_args, **engine_kwargs)
    _session_factory = async_sessionmaker(_engine, expire_on_commit=False)
    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def close_db() -> None:
    """Dispose of the engine."""
    global _engine, _session_factory
    if _engine:
        await _engine.dispose()
    _engine = None
    _session_factory = None


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    if _session_factory is None:
        raise RuntimeError("Database not initialised - call init_db() first")
    return _session_factory


# ── CRUD helpers ─────────────────────────────────────────────────────────────


async def store_evidence(
    artifact_hash: str,
    verifier_id: str,
    verdict: str,
    score: float,
    evidence_json: str,
    *,
    signature: str | None = None,
    signing_key_id: str | None = None,
) -> EvidenceRecord:
    """Insert a new evidence record (append-only, ignore duplicates)."""
    MAX_EVIDENCE_BYTES = 1_048_576  # 1 MB
    if len(evidence_json) > MAX_EVIDENCE_BYTES:
        evidence_json = evidence_json[:MAX_EVIDENCE_BYTES]
    factory = get_session_factory()
    async with factory() as session:
        existing = await session.get(EvidenceRecord, artifact_hash)
        if existing is not None:
            return existing
        record = EvidenceRecord(
            artifact_hash=artifact_hash,
            verifier_id=verifier_id,
            verdict=verdict,
            score=score,
            evidence_json=evidence_json,
            signature=signature,
            signing_key_id=signing_key_id,
        )
        session.add(record)
        await session.commit()
        await session.refresh(record)
        return record


async def get_evidence(artifact_hash: str) -> EvidenceRecord | None:
    """Retrieve an evidence record by its artifact hash."""
    factory = get_session_factory()
    async with factory() as session:
        return await session.get(EvidenceRecord, artifact_hash)


async def list_evidence(
    verifier_id: str | None = None,
    limit: int = 100,
) -> list[EvidenceRecord]:
    """List evidence records, optionally filtered by verifier ID."""
    factory = get_session_factory()
    async with factory() as session:
        stmt = select(EvidenceRecord).order_by(
            EvidenceRecord.created_at.desc()
        )
        if verifier_id:
            stmt = stmt.where(EvidenceRecord.verifier_id == verifier_id)
        stmt = stmt.limit(limit)
        result = await session.execute(stmt)
        return list(result.scalars().all())


# ── Evidence TTL cleanup ─────────────────────────────────────────────────────


async def cleanup_expired(ttl_days: int) -> int:
    """Delete evidence records older than *ttl_days*.

    Returns the number of deleted rows.
    """
    if ttl_days <= 0:
        return 0
    factory = get_session_factory()
    cutoff = datetime.now(timezone.utc) - timedelta(days=ttl_days)
    async with factory() as session:
        stmt = delete(EvidenceRecord).where(EvidenceRecord.created_at < cutoff)
        result = await session.execute(stmt)
        await session.commit()
        return result.rowcount  # type: ignore[return-value]


# ── Usage tracking ───────────────────────────────────────────────────────────


async def record_usage(
    api_key: str,
    endpoint: str,
    method: str,
    status_code: int,
    latency_ms: int,
) -> UsageRecord:
    """Insert a usage record for a single API request."""
    factory = get_session_factory()
    async with factory() as session:
        record = UsageRecord(
            api_key_id=api_key,
            endpoint=endpoint,
            method=method,
            status_code=status_code,
            latency_ms=latency_ms,
        )
        session.add(record)
        await session.commit()
        await session.refresh(record)
        return record


async def get_usage(
    api_key: str | None = None,
    limit: int = 100,
) -> list[dict]:
    """Return per-key usage summary (count + avg latency).

    If *api_key* is given, filter to that key; otherwise return all keys.
    """
    factory = get_session_factory()
    async with factory() as session:
        stmt = (
            select(
                UsageRecord.api_key_id,
                func.count(UsageRecord.id).label("request_count"),
                func.avg(UsageRecord.latency_ms).label("avg_latency_ms"),
            )
            .group_by(UsageRecord.api_key_id)
            .order_by(func.count(UsageRecord.id).desc())
            .limit(limit)
        )
        if api_key:
            stmt = stmt.where(UsageRecord.api_key_id == api_key)
        result = await session.execute(stmt)
        return [
            {
                "api_key": row.api_key_id,
                "request_count": row.request_count,
                "avg_latency_ms": round(float(row.avg_latency_ms or 0), 1),
            }
            for row in result.all()
        ]


# ── Quota management ─────────────────────────────────────────────────────────


async def get_quota(api_key: str) -> QuotaRecord | None:
    """Retrieve the quota record for an API key (or ``None``)."""
    factory = get_session_factory()
    async with factory() as session:
        stmt = select(QuotaRecord).where(QuotaRecord.api_key_id == api_key).limit(1)
        result = await session.execute(stmt)
        return result.scalar_one_or_none()


async def set_quota(api_key: str, daily_limit: int, monthly_limit: int) -> QuotaRecord:
    """Create or update the quota for an API key."""
    factory = get_session_factory()
    async with factory() as session:
        stmt = select(QuotaRecord).where(QuotaRecord.api_key_id == api_key).limit(1)
        result = await session.execute(stmt)
        existing = result.scalar_one_or_none()
        if existing is not None:
            existing.daily_limit = daily_limit
            existing.monthly_limit = monthly_limit
            existing.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
            await session.commit()
            await session.refresh(existing)
            return existing
        record = QuotaRecord(
            api_key_id=api_key,
            daily_limit=daily_limit,
            monthly_limit=monthly_limit,
        )
        session.add(record)
        await session.commit()
        await session.refresh(record)
        return record


async def get_usage_count(api_key: str, since: datetime) -> int:
    """Count requests by *api_key* since the given timestamp."""
    factory = get_session_factory()
    async with factory() as session:
        stmt = (
            select(func.count(UsageRecord.id))
            .where(UsageRecord.api_key_id == api_key)
            .where(UsageRecord.created_at >= since)
        )
        result = await session.execute(stmt)
        return result.scalar_one()


# ── Anchor CRUD ──────────────────────────────────────────────────────────────


async def store_anchor(
    merkle_root: str,
    leaf_count: int,
    tx_hash: str | None = None,
    chain: str = "base-sepolia",
) -> AnchorRecord:
    """Insert an anchor record and return it with the auto-generated batch_id."""
    factory = get_session_factory()
    async with factory() as session:
        record = AnchorRecord(
            merkle_root=merkle_root,
            leaf_count=leaf_count,
            tx_hash=tx_hash,
            chain=chain,
        )
        session.add(record)
        await session.commit()
        await session.refresh(record)
        return record


async def get_anchor(batch_id: int) -> AnchorRecord | None:
    """Retrieve an anchor record by batch_id."""
    factory = get_session_factory()
    async with factory() as session:
        return await session.get(AnchorRecord, batch_id)


async def get_latest_anchor() -> AnchorRecord | None:
    """Retrieve the most recent anchor record."""
    factory = get_session_factory()
    async with factory() as session:
        stmt = (
            select(AnchorRecord)
            .order_by(AnchorRecord.created_at.desc())
            .limit(1)
        )
        result = await session.execute(stmt)
        return result.scalar_one_or_none()


async def list_evidence_since(since: datetime) -> list[EvidenceRecord]:
    """Return evidence records created after *since* that have no batch_id."""
    factory = get_session_factory()
    async with factory() as session:
        stmt = (
            select(EvidenceRecord)
            .where(EvidenceRecord.created_at >= since)
            .where(EvidenceRecord.batch_id.is_(None))
            .order_by(EvidenceRecord.created_at.asc())
        )
        result = await session.execute(stmt)
        return list(result.scalars().all())


async def update_evidence_batch_id(
    artifact_hashes: list[str],
    batch_id: int,
) -> int:
    """Set batch_id on evidence records. Returns number of rows updated."""
    if not artifact_hashes:
        return 0
    factory = get_session_factory()
    async with factory() as session:
        from sqlalchemy import update
        stmt = (
            update(EvidenceRecord)
            .where(EvidenceRecord.artifact_hash.in_(artifact_hashes))
            .values(batch_id=batch_id)
        )
        result = await session.execute(stmt)
        await session.commit()
        return result.rowcount  # type: ignore[return-value]


async def list_evidence_by_batch(batch_id: int) -> list[EvidenceRecord]:
    """Return all evidence records belonging to a given anchor batch."""
    factory = get_session_factory()
    async with factory() as session:
        stmt = (
            select(EvidenceRecord)
            .where(EvidenceRecord.batch_id == batch_id)
            .order_by(EvidenceRecord.created_at.asc())
        )
        result = await session.execute(stmt)
        return list(result.scalars().all())


# ── Payment CRUD ─────────────────────────────────────────────────────────────


async def store_payment(
    payer_address: str,
    amount_usdc: float,
    tx_hash: str | None = None,
    verification_id: str | None = None,
    endpoint: str = "",
    tier: str = "HARD",
    provider: str = "api_key",
) -> PaymentRecord:
    """Insert a payment record."""
    factory = get_session_factory()
    async with factory() as session:
        record = PaymentRecord(
            payer_address=payer_address,
            amount_usdc=amount_usdc,
            tx_hash=tx_hash,
            verification_id=verification_id,
            endpoint=endpoint,
            tier=tier,
            provider=provider,
        )
        session.add(record)
        await session.commit()
        await session.refresh(record)
        return record


async def get_payments_by_address(
    payer_address: str,
    limit: int = 100,
) -> list[PaymentRecord]:
    """List payments for a given payer address."""
    factory = get_session_factory()
    async with factory() as session:
        stmt = (
            select(PaymentRecord)
            .where(PaymentRecord.payer_address == payer_address)
            .order_by(PaymentRecord.created_at.desc())
            .limit(limit)
        )
        result = await session.execute(stmt)
        return list(result.scalars().all())


async def get_revenue_summary() -> list[dict]:
    """Return revenue summary grouped by provider and tier."""
    factory = get_session_factory()
    async with factory() as session:
        stmt = (
            select(
                PaymentRecord.provider,
                PaymentRecord.tier,
                func.count(PaymentRecord.id).label("tx_count"),
                func.sum(PaymentRecord.amount_usdc).label("total_usdc"),
            )
            .group_by(PaymentRecord.provider, PaymentRecord.tier)
            .order_by(func.sum(PaymentRecord.amount_usdc).desc())
        )
        result = await session.execute(stmt)
        return [
            {
                "provider": row.provider,
                "tier": row.tier,
                "tx_count": row.tx_count,
                "total_usdc": float(row.total_usdc or 0),
            }
            for row in result.all()
        ]
