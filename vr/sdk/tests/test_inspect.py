"""Tests for ``vr inspect`` CLI command."""

from __future__ import annotations

import json

from click.testing import CliRunner

from vrdev.cli.main import cli


class TestInspectCommand:
    """Test the vr inspect command."""

    def test_inspect_known_verifier(self):
        runner = CliRunner()
        result = runner.invoke(cli, ["inspect", "vr/filesystem.file_created"])
        assert result.exit_code == 0
        assert "filesystem.file_created" in result.output
        assert "Tier" in result.output
        assert "Scorecard" in result.output

    def test_inspect_unknown_verifier(self):
        runner = CliRunner()
        result = runner.invoke(cli, ["inspect", "vr/nonexistent.verifier"])
        assert result.exit_code != 0
        assert "Unknown verifier" in result.output

    def test_inspect_json_output(self):
        runner = CliRunner()
        result = runner.invoke(
            cli, ["inspect", "vr/filesystem.file_created", "--json-output"]
        )
        assert result.exit_code == 0
        data = json.loads(result.output)
        assert data["id"] == "vr/filesystem.file_created"
        assert "fixture_summary" in data
        assert data["fixture_summary"]["positive"] >= 3
        assert data["fixture_summary"]["negative"] >= 3
        assert data["fixture_summary"]["adversarial"] >= 3

    def test_inspect_shows_tier_and_domain(self):
        runner = CliRunner()
        result = runner.invoke(cli, ["inspect", "vr/tau2.retail.order_cancelled"])
        assert result.exit_code == 0
        assert "HARD" in result.output
        assert "retail" in result.output

    def test_inspect_shows_fixture_counts(self):
        runner = CliRunner()
        result = runner.invoke(cli, ["inspect", "vr/aiv.calendar.event_created"])
        assert result.exit_code == 0
        assert "Fixtures" in result.output
        assert "positive" in result.output
        assert "negative" in result.output
        assert "adversarial" in result.output

    def test_inspect_shows_permissions(self):
        runner = CliRunner()
        result = runner.invoke(cli, ["inspect", "vr/aiv.shell.state_probe"])
        assert result.exit_code == 0
        assert "subprocess:readonly" in result.output

    def test_inspect_all_registered_verifiers(self):
        """Every registered verifier should be inspectable."""
        from vrdev.core.registry import list_verifiers

        runner = CliRunner()
        for vid in list_verifiers():
            result = runner.invoke(cli, ["inspect", vid, "--json-output"])
            assert result.exit_code == 0, f"inspect failed for {vid}: {result.output}"
            data = json.loads(result.output)
            assert data["id"] == vid
