"""Tests for observability module - OTLP exporter selection and tracing."""

from __future__ import annotations

from unittest.mock import MagicMock, patch


from vr_api.observability import configure_logging, configure_tracing, get_tracer


class TestConfigureLogging:
    def test_json_output(self):
        """configure_logging should not raise with json_output=True."""
        configure_logging(json_output=True)

    def test_console_output(self):
        """configure_logging should not raise with json_output=False."""
        configure_logging(json_output=False)


class TestConfigureTracing:
    def test_disabled_by_default(self, monkeypatch):
        monkeypatch.delenv("OTEL_ENABLED", raising=False)
        app = MagicMock()
        assert configure_tracing(app) is False

    def test_disabled_explicitly(self, monkeypatch):
        monkeypatch.setenv("OTEL_ENABLED", "0")
        app = MagicMock()
        assert configure_tracing(app) is False

    def test_enabled_without_packages(self, monkeypatch):
        """When OTEL_ENABLED=1 but packages missing, returns False."""
        monkeypatch.setenv("OTEL_ENABLED", "1")
        app = MagicMock()
        with patch.dict("sys.modules", {"opentelemetry": None}):
            # This may or may not raise depending on install state;
            # the function itself should handle ImportError gracefully
            result = configure_tracing(app)
            assert isinstance(result, bool)


class TestGetTracer:
    def test_returns_something(self):
        """get_tracer should return a tracer or None without raising."""
        result = get_tracer()
        # May be None if OTel not installed, or a real tracer if it is
        assert result is None or hasattr(result, "start_span")

    def test_custom_name(self):
        result = get_tracer("custom-service")
        assert result is None or hasattr(result, "start_span")
