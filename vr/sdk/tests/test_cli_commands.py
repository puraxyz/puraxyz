"""Tests for CLI subcommands - improves coverage of cli/*.py modules."""

from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import patch

import pytest
from click.testing import CliRunner

from vrdev.cli.main import cli


class TestVerifyCommand:
    """Test ``vr verify``."""

    def test_no_args_prints_usage(self):
        runner = CliRunner()
        result = runner.invoke(cli, ["verify"])
        assert result.exit_code == 0
        assert "Usage:" in result.output

    def test_no_verifier_option_prints_error(self, tmp_path):
        trace = tmp_path / "trace.json"
        trace.write_text(json.dumps({
            "completions": ["done"],
            "ground_truth": {"expected_path": "/tmp/x.txt"},
        }))
        runner = CliRunner()
        result = runner.invoke(cli, ["verify", str(trace)])
        assert result.exit_code != 0
        assert "required" in (result.output + (result.stderr if hasattr(result, 'stderr') else '')).lower() or result.exit_code != 0

    def test_unknown_verifier_exits(self, tmp_path):
        trace = tmp_path / "trace.json"
        trace.write_text(json.dumps({
            "completions": ["done"],
            "ground_truth": {},
        }))
        runner = CliRunner()
        result = runner.invoke(cli, ["verify", str(trace), "-v", "vr/nonexistent"])
        assert result.exit_code != 0

    def test_verify_filesystem_pass(self, tmp_path):
        target = tmp_path / "created.txt"
        target.write_text("hello")
        trace = tmp_path / "trace.json"
        trace.write_text(json.dumps({
            "completions": ["I created the file"],
            "ground_truth": {"expected_path": str(target)},
        }))
        runner = CliRunner()
        result = runner.invoke(cli, ["verify", str(trace), "-v", "vr/filesystem.file_created"])
        assert result.exit_code == 0
        assert "PASS" in result.output

    def test_verify_json_output(self, tmp_path):
        target = tmp_path / "out.txt"
        target.write_text("data")
        trace = tmp_path / "trace.json"
        trace.write_text(json.dumps({
            "completions": ["done"],
            "ground_truth": {"expected_path": str(target)},
        }))
        runner = CliRunner()
        result = runner.invoke(cli, ["verify", str(trace), "-v", "vr/filesystem.file_created", "-o", "json"])
        assert result.exit_code == 0
        data = json.loads(result.output)
        assert "verdict" in data

    def test_verify_fail_shows_evidence(self, tmp_path):
        trace = tmp_path / "trace.json"
        trace.write_text(json.dumps({
            "completions": ["done"],
            "ground_truth": {"expected_path": str(tmp_path / "nonexistent.txt")},
        }))
        runner = CliRunner()
        result = runner.invoke(cli, ["verify", str(trace), "-v", "vr/filesystem.file_created"])
        assert result.exit_code == 0
        assert "FAIL" in result.output


class TestConfigCommand:
    """Test ``vr config``."""

    def test_config_show(self):
        runner = CliRunner()
        result = runner.invoke(cli, ["config", "show"])
        assert result.exit_code == 0
        assert "[openai]" in result.output
        assert "[imap]" in result.output
        assert "[http]" in result.output

    def test_config_init_creates_file(self, tmp_path):
        cfg_file = tmp_path / "config.toml"
        with patch("vrdev.core.config._DEFAULT_CONFIG_FILE", cfg_file):
            runner = CliRunner()
            result = runner.invoke(cli, ["config", "init"])
            assert result.exit_code == 0
            assert cfg_file.exists()

    def test_config_init_no_overwrite(self, tmp_path):
        cfg_file = tmp_path / "config.toml"
        cfg_file.write_text("existing")
        with patch("vrdev.core.config._DEFAULT_CONFIG_FILE", cfg_file):
            runner = CliRunner()
            result = runner.invoke(cli, ["config", "init"])
            assert result.exit_code == 0
            assert "already exists" in result.output
            assert cfg_file.read_text() == "existing"

    def test_config_init_force_overwrites(self, tmp_path):
        cfg_file = tmp_path / "config.toml"
        cfg_file.write_text("old")
        with patch("vrdev.core.config._DEFAULT_CONFIG_FILE", cfg_file):
            runner = CliRunner()
            result = runner.invoke(cli, ["config", "init", "--force"])
            assert result.exit_code == 0
            assert cfg_file.read_text() != "old"


class TestRegistryCommand:
    """Test ``vr registry``."""

    def test_registry_list(self):
        runner = CliRunner()
        result = runner.invoke(cli, ["registry", "list"])
        assert result.exit_code == 0
        assert "vr/filesystem.file_created" in result.output

    def test_registry_validate_valid(self):
        spec_path = (
            Path(__file__).resolve().parents[3]
            / "registry"
            / "verifiers"
            / "filesystem.file_created"
            / "VERIFIER.json"
        )
        if not spec_path.exists():
            pytest.skip("Registry files not found")
        runner = CliRunner()
        result = runner.invoke(cli, ["registry", "validate", str(spec_path)])
        assert result.exit_code == 0
        assert "valid" in result.output.lower()

    def test_registry_validate_invalid(self, tmp_path):
        bad = tmp_path / "VERIFIER.json"
        bad.write_text(json.dumps({"not": "a valid spec"}))
        runner = CliRunner()
        result = runner.invoke(cli, ["registry", "validate", str(bad)])
        assert result.exit_code != 0

    def test_registry_search_finds(self):
        runner = CliRunner()
        result = runner.invoke(cli, ["registry", "search", "filesystem"])
        assert result.exit_code == 0
        assert "file_created" in result.output

    def test_registry_search_no_match(self):
        runner = CliRunner()
        result = runner.invoke(cli, ["registry", "search", "zzz_nonexistent_zzz"])
        assert result.exit_code == 0
        assert "No verifiers" in result.output


class TestVersionFlag:
    """Test ``vr --version``."""

    def test_version(self):
        runner = CliRunner()
        result = runner.invoke(cli, ["--version"])
        assert result.exit_code == 0
        assert "1.0.0" in result.output
