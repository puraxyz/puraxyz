"""Configuration system for vr.dev.

Loads settings from ``~/.vrdev/config.toml`` with ``VRDEV_*`` environment
variable overrides. Provides typed access to OpenAI, IMAP, and HTTP settings.

Precedence (highest → lowest):
  1. Explicit constructor kwargs
  2. ``VRDEV_*`` environment variables
  3. ``~/.vrdev/config.toml`` file
  4. Built-in defaults
"""

from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field


# ── TOML loader (stdlib in 3.11+, tomli backport for 3.10) ──────────────────

def _load_toml(path: Path) -> dict[str, Any]:
    """Load a TOML file, returning empty dict if missing or unparseable."""
    if not path.is_file():
        return {}
    try:
        if sys.version_info >= (3, 11):
            import tomllib
        else:
            try:
                import tomli as tomllib  # type: ignore[no-redef]
            except ImportError:
                # No TOML parser available - silently skip config file
                return {}
        with open(path, "rb") as f:
            return tomllib.load(f)
    except Exception:
        return {}


# ── Config sections ──────────────────────────────────────────────────────────

class OpenAIConfig(BaseModel):
    """OpenAI / LLM judge settings."""
    api_key: str = ""
    model: str = "gpt-4o-mini"
    temperature: float = 0.0
    max_tokens: int = 1024


class IMAPConfig(BaseModel):
    """IMAP settings for agentic email verification."""
    host: str = "localhost"
    port: int = 993
    username: str = ""
    password: str = ""
    use_ssl: bool = True


class HTTPConfig(BaseModel):
    """HTTP runner settings."""
    timeout: float = 15.0


# ── Top-level config ─────────────────────────────────────────────────────────

_DEFAULT_CONFIG_DIR = Path.home() / ".vrdev"
_DEFAULT_CONFIG_FILE = _DEFAULT_CONFIG_DIR / "config.toml"


class VrConfig(BaseModel):
    """Top-level vr.dev configuration.

    Loads from ``~/.vrdev/config.toml`` merged with ``VRDEV_*`` env vars.
    """
    openai: OpenAIConfig = Field(default_factory=OpenAIConfig)
    imap: IMAPConfig = Field(default_factory=IMAPConfig)
    http: HTTPConfig = Field(default_factory=HTTPConfig)

    @classmethod
    def load(cls, config_path: Path | str | None = None) -> VrConfig:
        """Load configuration from TOML file + env vars.

        Parameters
        ----------
        config_path : Path | str | None
            Override config file path. Defaults to ``~/.vrdev/config.toml``.
        """
        path = Path(config_path) if config_path else _DEFAULT_CONFIG_FILE
        raw = _load_toml(path)

        # Build sections from TOML
        openai_data = raw.get("openai", {})
        imap_data = raw.get("imap", {})
        http_data = raw.get("http", {})

        # Env var overrides (VRDEV_OPENAI_API_KEY, VRDEV_IMAP_HOST, etc.)
        _env_override(openai_data, "VRDEV_OPENAI_API_KEY", "api_key")
        _env_override(openai_data, "VRDEV_OPENAI_MODEL", "model")
        _env_override(openai_data, "VRDEV_OPENAI_TEMPERATURE", "temperature", float)
        _env_override(openai_data, "VRDEV_OPENAI_MAX_TOKENS", "max_tokens", int)
        _env_override(imap_data, "VRDEV_IMAP_HOST", "host")
        _env_override(imap_data, "VRDEV_IMAP_PORT", "port", int)
        _env_override(imap_data, "VRDEV_IMAP_USERNAME", "username")
        _env_override(imap_data, "VRDEV_IMAP_PASSWORD", "password")
        _env_override(imap_data, "VRDEV_IMAP_USE_SSL", "use_ssl", _parse_bool)
        _env_override(http_data, "VRDEV_HTTP_TIMEOUT", "timeout", float)

        return cls(
            openai=OpenAIConfig(**openai_data),
            imap=IMAPConfig(**imap_data),
            http=HTTPConfig(**http_data),
        )

    def to_toml(self) -> str:
        """Serialize config to TOML format (for ``vr config init``)."""
        lines = [
            "# vr.dev configuration",
            "# See: https://github.com/vrDotDev/vr-dev",
            "",
            "[openai]",
            f'api_key = "{self.openai.api_key}"',
            f'model = "{self.openai.model}"',
            f"temperature = {self.openai.temperature}",
            f"max_tokens = {self.openai.max_tokens}",
            "",
            "[imap]",
            f'host = "{self.imap.host}"',
            f"port = {self.imap.port}",
            f'username = "{self.imap.username}"',
            f'password = "{self.imap.password}"',
            f"use_ssl = {str(self.imap.use_ssl).lower()}",
            "",
            "[http]",
            f"timeout = {self.http.timeout}",
            "",
        ]
        return "\n".join(lines)


def _env_override(
    data: dict,
    env_key: str,
    field: str,
    cast: type | Any = str,
) -> None:
    """Override a dict field from an environment variable if set."""
    val = os.environ.get(env_key)
    if val is not None:
        try:
            data[field] = cast(val)
        except (ValueError, TypeError):
            pass  # Keep existing value on cast failure


def _parse_bool(val: str) -> bool:
    """Parse a boolean from an env var string."""
    return val.lower() in ("1", "true", "yes", "on")


# ── Singleton-ish loader ─────────────────────────────────────────────────────

_cached_config: VrConfig | None = None


def get_config(config_path: Path | str | None = None) -> VrConfig:
    """Get the global config, loading on first call.

    Call with a path to force reload from a specific file.
    """
    global _cached_config
    if config_path is not None or _cached_config is None:
        _cached_config = VrConfig.load(config_path)
    return _cached_config


def reset_config() -> None:
    """Clear the cached config (useful in tests)."""
    global _cached_config
    _cached_config = None
