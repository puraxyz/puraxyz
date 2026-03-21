"""Abstract LLM judge protocol with OpenAI default implementation.

The ``LLMJudge`` protocol allows SOFT (rubric) verifiers to work with any
LLM backend. Users can implement their own judge or use the provided
``OpenAIJudge``. A ``StubJudge`` is included for testing.
"""

from __future__ import annotations

from typing import Protocol, runtime_checkable


@runtime_checkable
class LLMJudge(Protocol):
    """Protocol for LLM-based judging.

    Any class implementing this protocol can be used as the judge backend
    for SOFT (rubric) verifiers.
    """

    def judge(self, prompt: str, system_prompt: str | None = None) -> str:
        """Send a prompt to the LLM and return the raw response text.

        Parameters
        ----------
        prompt : str
            The user prompt to send.
        system_prompt : str | None
            Optional system prompt for instruction.

        Returns
        -------
        str
            The raw LLM response text.
        """
        ...


class OpenAIJudge:
    """Default LLM judge using the OpenAI API.

    Requires: ``pip install vrdev[llm]``
    """

    def __init__(
        self,
        model: str | None = None,
        api_key: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ):
        try:
            import openai  # noqa: F811
        except ImportError:
            raise ImportError(
                "OpenAI is required for OpenAIJudge. "
                "Install with: pip install vrdev[llm]"
            ) from None

        # Fall back to config for unset params
        from .config import get_config
        cfg = get_config().openai
        self.model = model or cfg.model
        self.temperature = temperature if temperature is not None else cfg.temperature
        self.max_tokens = max_tokens if max_tokens is not None else cfg.max_tokens
        resolved_key = api_key or cfg.api_key or None
        self._client = openai.OpenAI(api_key=resolved_key)

    def judge(self, prompt: str, system_prompt: str | None = None) -> str:
        messages: list[dict[str, str]] = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        response = self._client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=self.temperature,
            max_tokens=self.max_tokens,
        )
        return response.choices[0].message.content or ""


class StubJudge:
    """A test judge that returns a preconfigured response.

    Use in tests to avoid calling real LLM APIs.
    """

    def __init__(self, response: str):
        self._response = response
        self.model = "stub"
        self.last_prompt: str | None = None
        self.last_system_prompt: str | None = None
        self.call_count: int = 0

    def judge(self, prompt: str, system_prompt: str | None = None) -> str:
        self.last_prompt = prompt
        self.last_system_prompt = system_prompt
        self.call_count += 1
        return self._response
