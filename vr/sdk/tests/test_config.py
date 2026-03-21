"""Tests for VrConfig - TOML loading, env-var overrides, caching, CLI."""

from __future__ import annotations

import textwrap
from pathlib import Path

import pytest

from vrdev.core.config import VrConfig, get_config, reset_config


# ── Fixture: always reset singleton between tests ───────────────────
@pytest.fixture(autouse=True)
def _reset():
    reset_config()
    yield
    reset_config()


# ── Defaults ─────────────────────────────────────────────────────────
class TestDefaults:
    def test_default_openai(self):
        cfg = VrConfig()
        assert cfg.openai.model == "gpt-4o-mini"
        assert cfg.openai.api_key == ""
        assert cfg.openai.temperature == 0.0
        assert cfg.openai.max_tokens == 1024

    def test_default_imap(self):
        cfg = VrConfig()
        assert cfg.imap.host == "localhost"
        assert cfg.imap.port == 993
        assert cfg.imap.username == ""
        assert cfg.imap.password == ""
        assert cfg.imap.use_ssl is True

    def test_default_http(self):
        cfg = VrConfig()
        assert cfg.http.timeout == 15.0


# ── TOML Loading ─────────────────────────────────────────────────────
class TestTomlLoading:
    def test_load_from_toml(self, tmp_path: Path):
        toml_file = tmp_path / "config.toml"
        toml_file.write_text(textwrap.dedent("""\
            [openai]
            model = "gpt-4o"
            api_key = "sk-test-key"
            temperature = 0.5
            max_tokens = 2048

            [imap]
            host = "imap.example.com"
            port = 143
            username = "user@example.com"
            password = "secret"

            [http]
            timeout = 30.0
        """))

        cfg = VrConfig.load(toml_file)
        assert cfg.openai.model == "gpt-4o"
        assert cfg.openai.api_key == "sk-test-key"
        assert cfg.openai.temperature == 0.5
        assert cfg.openai.max_tokens == 2048
        assert cfg.imap.host == "imap.example.com"
        assert cfg.imap.port == 143
        assert cfg.http.timeout == 30.0

    def test_load_partial_toml(self, tmp_path: Path):
        toml_file = tmp_path / "config.toml"
        toml_file.write_text(textwrap.dedent("""\
            [openai]
            model = "gpt-3.5-turbo"
        """))

        cfg = VrConfig.load(toml_file)
        assert cfg.openai.model == "gpt-3.5-turbo"
        assert cfg.openai.api_key == ""  # default preserved
        assert cfg.imap.host == "localhost"  # default preserved

    def test_load_missing_file_returns_defaults(self, tmp_path: Path):
        cfg = VrConfig.load(tmp_path / "nonexistent.toml")
        assert cfg.openai.model == "gpt-4o-mini"

    def test_load_empty_toml(self, tmp_path: Path):
        toml_file = tmp_path / "config.toml"
        toml_file.write_text("")
        cfg = VrConfig.load(toml_file)
        assert cfg.openai.model == "gpt-4o-mini"


# ── Env Var Overrides ────────────────────────────────────────────────
class TestEnvOverrides:
    def test_openai_env_vars(self, tmp_path: Path, monkeypatch):
        monkeypatch.setenv("VRDEV_OPENAI_API_KEY", "sk-from-env")
        monkeypatch.setenv("VRDEV_OPENAI_MODEL", "gpt-4-turbo")
        cfg = VrConfig.load(tmp_path / "none.toml")
        assert cfg.openai.api_key == "sk-from-env"
        assert cfg.openai.model == "gpt-4-turbo"

    def test_imap_env_vars(self, tmp_path: Path, monkeypatch):
        monkeypatch.setenv("VRDEV_IMAP_HOST", "imap.env.com")
        monkeypatch.setenv("VRDEV_IMAP_PORT", "587")
        cfg = VrConfig.load(tmp_path / "none.toml")
        assert cfg.imap.host == "imap.env.com"
        assert cfg.imap.port == 587

    def test_http_env_vars(self, tmp_path: Path, monkeypatch):
        monkeypatch.setenv("VRDEV_HTTP_TIMEOUT", "60.0")
        cfg = VrConfig.load(tmp_path / "none.toml")
        assert cfg.http.timeout == 60.0

    def test_env_overrides_toml(self, tmp_path: Path, monkeypatch):
        toml_file = tmp_path / "config.toml"
        toml_file.write_text(textwrap.dedent("""\
            [openai]
            model = "gpt-4o"
            api_key = "sk-toml-key"
        """))
        monkeypatch.setenv("VRDEV_OPENAI_API_KEY", "sk-env-wins")
        cfg = VrConfig.load(toml_file)
        assert cfg.openai.api_key == "sk-env-wins"
        assert cfg.openai.model == "gpt-4o"  # toml preserved


# ── Singleton Cache ──────────────────────────────────────────────────
class TestSingleton:
    def test_get_config_returns_same_instance(self):
        a = get_config()
        b = get_config()
        assert a is b

    def test_reset_clears_cache(self):
        a = get_config()
        reset_config()
        b = get_config()
        assert a is not b


# ── Serialization ────────────────────────────────────────────────────
class TestSerialization:
    def test_to_toml_roundtrip(self, tmp_path: Path):
        cfg = VrConfig()
        toml_str = cfg.to_toml()
        # Write and reload
        f = tmp_path / "out.toml"
        f.write_text(toml_str)
        reloaded = VrConfig.load(f)
        assert reloaded.openai.model == cfg.openai.model
        assert reloaded.imap.port == cfg.imap.port
        assert reloaded.http.timeout == cfg.http.timeout

    def test_to_toml_contains_sections(self):
        cfg = VrConfig()
        toml_str = cfg.to_toml()
        assert "[openai]" in toml_str
        assert "[imap]" in toml_str
        assert "[http]" in toml_str
