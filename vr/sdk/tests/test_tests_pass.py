"""Tests for code.python.tests_pass verifier."""

from __future__ import annotations


from vrdev.core.types import Verdict, VerifierInput
from vrdev.tasks.code.tests_pass import TestsPassVerifier


class TestTestsPassVerifier:
    """Unit tests for TestsPassVerifier."""

    def test_tier_is_hard(self):
        v = TestsPassVerifier()
        assert v.tier.value == "HARD"

    def test_version(self):
        v = TestsPassVerifier()
        assert v.version == "0.1.0"

    def test_all_tests_pass(self):
        """Agent code + tests that all pass."""
        code = (
            "def add(a, b):\n"
            "    return a + b\n"
            "\n"
            "def test_add_positive():\n"
            "    assert add(1, 2) == 3\n"
            "\n"
            "def test_add_zero():\n"
            "    assert add(0, 0) == 0\n"
            "\n"
            "def test_add_negative():\n"
            "    assert add(-1, -2) == -3\n"
        )
        v = TestsPassVerifier()
        inp = VerifierInput(
            completions=[code],
            ground_truth={},
        )
        results = v.verify(inp)
        assert len(results) == 1
        assert results[0].verdict == Verdict.PASS
        assert results[0].score >= 1.0
        assert results[0].evidence["tests_passed"] == 3

    def test_some_tests_fail(self):
        """Agent code with a failing test."""
        code = (
            "def add(a, b):\n"
            "    return a + b\n"
            "\n"
            "def test_add_correct():\n"
            "    assert add(1, 2) == 3\n"
            "\n"
            "def test_add_wrong():\n"
            "    assert add(1, 2) == 5  # deliberately wrong\n"
        )
        v = TestsPassVerifier()
        inp = VerifierInput(
            completions=[code],
            ground_truth={},
        )
        results = v.verify(inp)
        assert results[0].verdict == Verdict.FAIL
        assert results[0].evidence["tests_failed"] >= 1

    def test_separate_test_code(self):
        """Agent code in completion, tests in ground truth."""
        code = "def multiply(a, b):\n    return a * b\n"
        test_code = (
            "from solution import multiply\n"
            "\n"
            "def test_multiply():\n"
            "    assert multiply(3, 4) == 12\n"
            "\n"
            "def test_multiply_zero():\n"
            "    assert multiply(0, 5) == 0\n"
            "\n"
            "def test_multiply_negative():\n"
            "    assert multiply(-2, 3) == -6\n"
        )
        v = TestsPassVerifier()
        inp = VerifierInput(
            completions=[code],
            ground_truth={"test_code": test_code},
        )
        results = v.verify(inp)
        assert results[0].verdict == Verdict.PASS
        assert results[0].evidence["tests_passed"] == 3

    def test_min_pass_ratio(self):
        """With a lower threshold, partial pass is OK."""
        code = (
            "def add(a, b):\n"
            "    return a + b\n"
            "\n"
            "def test_pass1():\n"
            "    assert add(1, 1) == 2\n"
            "\n"
            "def test_pass2():\n"
            "    assert add(2, 2) == 4\n"
            "\n"
            "def test_fail():\n"
            "    assert add(1, 1) == 999\n"
        )
        v = TestsPassVerifier()
        inp = VerifierInput(
            completions=[code],
            ground_truth={"min_pass_ratio": 0.5},
        )
        results = v.verify(inp)
        # 2/3 = 0.667 >= 0.5 → PASS
        assert results[0].verdict == Verdict.PASS
        assert results[0].score >= 0.5

    def test_syntax_error_in_code(self):
        """Code with a syntax error → tests fail or error."""
        code = "def add(a, b)\n    return a + b\n"  # missing colon
        v = TestsPassVerifier()
        inp = VerifierInput(
            completions=[code],
            ground_truth={},
        )
        results = v.verify(inp)
        # Should either be FAIL or ERROR (no tests collected)
        assert results[0].verdict in (Verdict.FAIL, Verdict.ERROR)

    def test_no_tests_in_code(self):
        """Code with no test functions → FAIL (0 tests collected)."""
        code = "x = 42\nprint(x)\n"
        v = TestsPassVerifier()
        inp = VerifierInput(
            completions=[code],
            ground_truth={},
        )
        results = v.verify(inp)
        assert results[0].verdict == Verdict.FAIL

    def test_multiple_completions(self):
        """Each completion gets its own result."""
        good = "def test_ok():\n    assert True\n"
        bad = "def test_bad():\n    assert False\n"
        v = TestsPassVerifier()
        inp = VerifierInput(
            completions=[good, bad],
            ground_truth={},
        )
        results = v.verify(inp)
        assert len(results) == 2
        assert results[0].verdict == Verdict.PASS
        assert results[1].verdict == Verdict.FAIL

    def test_parse_pytest_output(self):
        v = TestsPassVerifier()
        assert v._parse_pytest_output("3 passed") == (3, 0, 0)
        assert v._parse_pytest_output("2 passed, 1 failed") == (2, 1, 0)
        assert v._parse_pytest_output("1 passed, 1 failed, 1 error") == (1, 1, 1)
        assert v._parse_pytest_output("") == (0, 0, 0)
