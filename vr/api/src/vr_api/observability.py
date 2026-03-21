"""Observability setup - structured logging via structlog, optional OpenTelemetry.

Call :func:`configure_logging` at application startup to set up structlog
with JSON output.  If OpenTelemetry is installed and ``OTEL_ENABLED=1``,
:func:`configure_tracing` instruments FastAPI and exports traces.
"""

from __future__ import annotations

import logging
import os
from typing import Any

import structlog


def configure_logging(*, json_output: bool = True) -> None:
    """Set up structlog as the primary logging framework.

    In production (json_output=True) logs are JSON; in dev mode they are
    human-readable with colours.
    """
    shared_processors: list[Any] = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
    ]

    if json_output:
        renderer: Any = structlog.processors.JSONRenderer()
    else:
        renderer = structlog.dev.ConsoleRenderer()

    structlog.configure(
        processors=[
            *shared_processors,
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ],
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

    formatter = structlog.stdlib.ProcessorFormatter(
        processors=[*shared_processors, renderer],
    )

    handler = logging.StreamHandler()
    handler.setFormatter(formatter)

    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(logging.INFO)


def configure_tracing(app: Any) -> bool:  # pragma: no cover
    """Instrument *app* with OpenTelemetry if available and enabled.

    Returns True if instrumentation was applied.
    """
    if os.environ.get("OTEL_ENABLED", "").lower() not in ("1", "true", "yes"):
        return False

    try:
        from opentelemetry import trace
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
        from opentelemetry.sdk.resources import Resource
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import (
            ConsoleSpanExporter,
            SimpleSpanProcessor,
        )
    except ImportError:
        logging.getLogger(__name__).warning(
            "OTEL_ENABLED=1 but opentelemetry packages not installed - skipping"
        )
        return False

    resource = Resource.create({"service.name": "vr-api", "service.version": "1.0.0"})
    provider = TracerProvider(resource=resource)

    exporter_type = os.environ.get("OTEL_EXPORTER", "console")
    if exporter_type == "otlp" or exporter_type == "otlp-grpc":
        try:
            from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import (
                OTLPSpanExporter as GrpcExporter,
            )

            provider.add_span_processor(SimpleSpanProcessor(GrpcExporter()))
        except ImportError:
            logging.getLogger(__name__).warning(
                "OTEL_EXPORTER=otlp-grpc but grpc exporter not installed - "
                "pip install opentelemetry-exporter-otlp-proto-grpc"
            )
            return False
    elif exporter_type == "otlp-http":
        try:
            from opentelemetry.exporter.otlp.proto.http.trace_exporter import (
                OTLPSpanExporter as HttpExporter,
            )

            provider.add_span_processor(SimpleSpanProcessor(HttpExporter()))
        except ImportError:
            logging.getLogger(__name__).warning(
                "OTEL_EXPORTER=otlp-http but http exporter not installed - "
                "pip install opentelemetry-exporter-otlp-proto-http"
            )
            return False
    else:
        # Default: console exporter for local development
        provider.add_span_processor(SimpleSpanProcessor(ConsoleSpanExporter()))

    trace.set_tracer_provider(provider)
    FastAPIInstrumentor.instrument_app(app)
    return True


def get_tracer(name: str = "vr-api") -> Any:
    """Return an OTel tracer if tracing is active, else a no-op stub."""
    try:
        from opentelemetry import trace

        return trace.get_tracer(name)
    except ImportError:
        return None
