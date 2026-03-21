"""Tests for the AI verifier synthesis module."""

from __future__ import annotations

import json

import pytest

from vrdev.cli.synth import (
    _build_system_prompt,
    _build_user_prompt,
    _infer_tier,
    _parse_response,
    _validate_generated,
)


class TestInferTier:
    def test_browser_task(self):
        assert _infer_tier("Navigate to checkout page and screenshot") == "AGENTIC"

    def test_rubric_task(self):
        assert _infer_tier("Evaluate the quality of the summary") == "SOFT"

    def test_deterministic_task(self):
        assert _infer_tier("Check if file exists at /tmp/output.txt") == "HARD"

    def test_database_task(self):
        assert _infer_tier("Verify row was inserted into users table") == "HARD"

    def test_tone_task(self):
        assert _infer_tier("Judge the tone of the email response") == "SOFT"


class TestParseResponse:
    def test_plain_json(self):
        data = {"name": "test.verifier", "verify_py": "code"}
        result = _parse_response(json.dumps(data))
        assert result == data

    def test_fenced_json(self):
        data = {"name": "test.verifier"}
        raw = f"```json\n{json.dumps(data)}\n```"
        result = _parse_response(raw)
        assert result == data

    def test_invalid_json(self):
        with pytest.raises(json.JSONDecodeError):
            _parse_response("not json at all")


class TestValidateGenerated:
    def test_valid_result(self):
        result = {
            "verify_py": "x = 1",
            "verifier_json": {"id": "vr/test"},
            "positive_fixtures": {"fixtures": [1, 2, 3]},
            "negative_fixtures": {"fixtures": [1, 2, 3]},
            "adversarial_fixtures": {"fixtures": [1, 2, 3]},
        }
        errors = _validate_generated(result, "HARD")
        assert errors == []

    def test_missing_verify_py(self):
        result = {
            "verifier_json": {},
            "positive_fixtures": {"fixtures": [1, 2, 3]},
            "negative_fixtures": {"fixtures": [1, 2, 3]},
            "adversarial_fixtures": {"fixtures": [1, 2, 3]},
        }
        errors = _validate_generated(result, "HARD")
        assert any("verify_py" in e for e in errors)

    def test_too_few_fixtures(self):
        result = {
            "verify_py": "x = 1",
            "verifier_json": {},
            "positive_fixtures": {"fixtures": [1]},
            "negative_fixtures": {"fixtures": [1, 2, 3]},
            "adversarial_fixtures": {"fixtures": [1, 2, 3]},
        }
        errors = _validate_generated(result, "HARD")
        assert any("positive" in e for e in errors)

    def test_syntax_error_in_code(self):
        result = {
            "verify_py": "def broken(:\n  pass",
            "verifier_json": {},
            "positive_fixtures": {"fixtures": [1, 2, 3]},
            "negative_fixtures": {"fixtures": [1, 2, 3]},
            "adversarial_fixtures": {"fixtures": [1, 2, 3]},
        }
        errors = _validate_generated(result, "HARD")
        assert any("syntax" in e.lower() for e in errors)


class TestBuildPrompts:
    def test_system_prompt_has_key_content(self):
        prompt = _build_system_prompt()
        assert "BaseVerifier" in prompt
        assert "VerificationResult" in prompt
        assert "Verdict" in prompt

    def test_user_prompt_includes_task(self):
        prompt = _build_user_prompt("Check file exists", "HARD")
        assert "Check file exists" in prompt
        assert "HARD" in prompt

    def test_user_prompt_includes_spec(self):
        prompt = _build_user_prompt("Check API", "HARD", "openapi: 3.0", "OpenAPI")
        assert "openapi: 3.0" in prompt
        assert "OpenAPI" in prompt

    def test_user_prompt_includes_error_feedback(self):
        prompt = _build_user_prompt("Check X", "HARD", error_feedback="syntax error on line 5")
        assert "syntax error on line 5" in prompt
