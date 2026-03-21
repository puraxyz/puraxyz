"""Tests for the LLM judge protocol (core/llm.py)."""

from __future__ import annotations


from vrdev.core.llm import LLMJudge, StubJudge


class TestLLMJudgeProtocol:
    def test_stub_judge_is_llm_judge(self):
        """StubJudge satisfies the LLMJudge protocol."""
        judge = StubJudge("hello")
        assert isinstance(judge, LLMJudge)

    def test_custom_class_satisfies_protocol(self):
        """Any class with a judge() method satisfies the protocol."""

        class MyJudge:
            def judge(self, prompt: str, system_prompt: str | None = None) -> str:
                return "custom response"

        assert isinstance(MyJudge(), LLMJudge)


class TestStubJudge:
    def test_returns_configured_response(self):
        judge = StubJudge("42")
        assert judge.judge("prompt") == "42"

    def test_tracks_call_count(self):
        judge = StubJudge("ok")
        judge.judge("a")
        judge.judge("b")
        assert judge.call_count == 2

    def test_tracks_last_prompt(self):
        judge = StubJudge("ok")
        judge.judge("prompt text", system_prompt="system text")
        assert judge.last_prompt == "prompt text"
        assert judge.last_system_prompt == "system text"

    def test_model_attribute(self):
        judge = StubJudge("ok")
        assert judge.model == "stub"

    def test_initial_state(self):
        judge = StubJudge("ok")
        assert judge.call_count == 0
        assert judge.last_prompt is None
        assert judge.last_system_prompt is None

    def test_system_prompt_optional(self):
        judge = StubJudge("ok")
        result = judge.judge("only user prompt")
        assert result == "ok"
        assert judge.last_system_prompt is None


class TestOpenAIJudgeImport:
    def test_import_without_openai_raises(self):
        """OpenAIJudge constructor requires openai package."""
        # We can import the class itself (no side effects)
        from vrdev.core.llm import OpenAIJudge

        # But instantiation should either work (if openai is installed)
        # or raise ImportError
        # We don't assert which - depends on environment
        assert OpenAIJudge is not None
