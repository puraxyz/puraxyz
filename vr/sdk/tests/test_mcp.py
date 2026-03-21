"""Tests for MCP server adapter - tool registration and basic invocation.

These tests validate the server construction logic without requiring
the mcp package to be installed. They mock FastMCP to capture tool
registrations and verify the tool functions work correctly.
"""

from __future__ import annotations

import json
from typing import Any
from unittest.mock import MagicMock, patch

import pytest


class MockFastMCP:
    """Minimal FastMCP mock that captures tool registrations."""

    def __init__(self, name: str, **kwargs):
        self.name = name
        self.kwargs = kwargs
        self._tools: dict[str, Any] = {}

    def tool(self):
        """Decorator that captures the function."""
        def decorator(fn):
            self._tools[fn.__name__] = fn
            return fn
        return decorator

    def run(self, transport: str = "stdio"):
        pass

    def get_tool(self, name: str):
        return self._tools[name]


@pytest.fixture
def mock_mcp_module():
    """Patch mcp imports to use our mock."""
    mock_module = MagicMock()
    mock_module.server.fastmcp.FastMCP = MockFastMCP
    with patch.dict("sys.modules", {
        "mcp": mock_module,
        "mcp.server": mock_module.server,
        "mcp.server.fastmcp": mock_module.server.fastmcp,
    }):
        mock_module.server.fastmcp.FastMCP = MockFastMCP
        yield


class TestMCPServerCreation:
    def test_create_server_registers_tools(self, mock_mcp_module):
        from vrdev.adapters.mcp_server import create_mcp_server
        server = create_mcp_server()
        assert isinstance(server, MockFastMCP)
        expected_tools = {
            "list_verifiers",
            "run_verifier",
            "compose_chain",
            "explain_failure",
            "search_verifiers",
            "gem_reward",
        }
        assert set(server._tools.keys()) == expected_tools

    def test_server_metadata(self, mock_mcp_module):
        from vrdev.adapters.mcp_server import create_mcp_server
        server = create_mcp_server()
        assert server.name == "vr.dev"
        assert server.kwargs.get("version") == "1.0.0"


class TestListVerifiersTool:
    def test_returns_json_array(self, mock_mcp_module):
        from vrdev.adapters.mcp_server import create_mcp_server
        server = create_mcp_server()
        result = server.get_tool("list_verifiers")()
        ids = json.loads(result)
        assert isinstance(ids, list)
        assert len(ids) >= 38  # grows as registry expands
        assert "vr/filesystem.file_created" in ids
        assert "vr/code.python.lint_ruff" in ids


class TestSearchVerifiersTool:
    def test_search_returns_matches(self, mock_mcp_module):
        from vrdev.adapters.mcp_server import create_mcp_server
        server = create_mcp_server()
        result = server.get_tool("search_verifiers")("email")
        matches = json.loads(result)
        assert "vr/aiv.email.sent_folder_confirmed" in matches
        assert "vr/rubric.email.tone_professional" in matches or len(matches) > 0

    def test_search_no_results(self, mock_mcp_module):
        from vrdev.adapters.mcp_server import create_mcp_server
        server = create_mcp_server()
        result = server.get_tool("search_verifiers")("xyznonexistent")
        assert json.loads(result) == []


class TestRunVerifierTool:
    def test_run_filesystem_verifier(self, mock_mcp_module, tmp_path):
        from vrdev.adapters.mcp_server import create_mcp_server
        # Create the expected file
        target = tmp_path / "output.txt"
        target.write_text("hello")

        server = create_mcp_server()
        result = server.get_tool("run_verifier")(
            verifier_id="vr/filesystem.file_created",
            completions=["done"],
            ground_truth={"expected_path": str(target)},
        )
        data = json.loads(result)
        assert isinstance(data, list)
        assert len(data) == 1
        assert data[0]["verdict"] == "PASS"

    def test_run_unknown_verifier_raises(self, mock_mcp_module):
        from vrdev.adapters.mcp_server import create_mcp_server
        server = create_mcp_server()
        with pytest.raises(KeyError, match="Unknown verifier"):
            server.get_tool("run_verifier")(
                verifier_id="vr/nonexistent",
                completions=["x"],
            )


class TestExplainFailureTool:
    def test_explain_includes_markdown(self, mock_mcp_module, tmp_path):
        from vrdev.adapters.mcp_server import create_mcp_server
        server = create_mcp_server()
        # File doesn't exist → FAIL
        result = server.get_tool("explain_failure")(
            verifier_id="vr/filesystem.file_created",
            completions=["done"],
            ground_truth={"expected_path": str(tmp_path / "missing.txt")},
        )
        assert "## Verification:" in result
        assert "FAIL" in result
        assert "Breakdown" in result or "Why it failed" in result


class TestComposeChainTool:
    def test_compose_single_verifier(self, mock_mcp_module, tmp_path):
        from vrdev.adapters.mcp_server import create_mcp_server
        target = tmp_path / "output.txt"
        target.write_text("hello")

        server = create_mcp_server()
        result = server.get_tool("compose_chain")(
            verifier_ids=["vr/filesystem.file_created"],
            completions=["done"],
            ground_truth={"expected_path": str(target)},
        )
        data = json.loads(result)
        assert len(data) == 1
        assert data[0]["verdict"] == "PASS"
