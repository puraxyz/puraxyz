"""AI-powered verifier synthesis using LLM generation.

Generates complete verifier packages (verify.py, VERIFIER.json, fixtures)
from natural language task descriptions, optionally grounded in OpenAPI specs
or SQL schemas.

Requires the ``openai`` optional dependency: ``pip install vrdev[llm]``
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


@dataclass
class GeneratedVerifier:
    """Container for all generated verifier artifacts."""

    name: str
    tier: str
    description: str
    verify_py: str
    verifier_json: dict[str, Any]
    positive_fixtures: dict[str, Any]
    negative_fixtures: dict[str, Any]
    adversarial_fixtures: dict[str, Any]
    warnings: list[str] = field(default_factory=list)


def _require_openai():
    """Import openai, raising a clear error if missing."""
    try:
        import openai
        return openai
    except ImportError:
        raise ImportError(
            "AI verifier synthesis requires the 'openai' package.\n"
            "Install with: pip install vrdev[llm]"
        ) from None


def _read_spec_file(path: str) -> str:
    """Read an OpenAPI or SQL schema file and return its content (truncated if huge)."""
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(f"Spec file not found: {path}")
    content = p.read_text()
    # Truncate very large specs to stay within context window
    if len(content) > 30_000:
        content = content[:30_000] + "\n\n... [truncated - file too large] ..."
    return content


def _infer_tier(task: str) -> str:
    """Heuristic tier inference from task description."""
    task_lower = task.lower()
    # AGENTIC: browser, screenshot, UI, navigation
    if any(kw in task_lower for kw in ("browser", "screenshot", "navigate", "click", "page load", "dom")):
        return "AGENTIC"
    # SOFT: rubric, quality, tone, style, summary
    if any(kw in task_lower for kw in ("rubric", "quality", "tone", "style", "summary", "evaluate", "judge")):
        return "SOFT"
    # Default: HARD
    return "HARD"


def _build_system_prompt() -> str:
    return """\
You are an expert verifier author for the vr.dev platform. You generate complete \
Python verifier implementations that check whether an AI agent actually completed \
a real-world task.

## Architecture

Every verifier is a Python class that extends `BaseVerifier`:

```python
from vrdev.core.base import BaseVerifier
from vrdev.core.types import Tier, Verdict, VerifierInput, VerificationResult
import time
from typing import Any

class MyVerifier(BaseVerifier):
    name = "domain.task_name"
    tier = Tier.HARD  # or Tier.SOFT or Tier.AGENTIC
    version = "0.1.0"

    def verify(self, input_data: VerifierInput) -> list[VerificationResult]:
        gt = input_data.ground_truth
        results = []
        for completion in input_data.completions:
            start = time.monotonic_ns()
            result = self._verify_single(gt, completion, input_data)
            result.metadata.execution_ms = (time.monotonic_ns() - start) // 1_000_000
            results.append(result)
        return results

    def _verify_single(self, gt: dict[str, Any], completion: str, input_data: VerifierInput) -> VerificationResult:
        evidence = {}
        breakdown = {}
        # Check actual state, populate evidence and breakdown
        verdict = Verdict.PASS
        score = 1.0
        return self._make_result(verdict, score, breakdown, evidence, input_data, permissions=[])
```

## Key types

- `VerifierInput`: has `.completions` (list[str]), `.ground_truth` (dict), `.context` (dict|None)
- `VerificationResult`: returned by `_make_result(verdict, score, breakdown, evidence, input_data, permissions=[])`
- `Verdict`: PASS, FAIL, UNVERIFIABLE, ERROR
- `Tier`: HARD (deterministic checks), SOFT (LLM-judged), AGENTIC (browser/live system)

## Tiers

- HARD: Deterministic. Check database state, file existence, API responses, parsed output. \
No LLM calls. Must be reproducible. Fast (<50ms).
- SOFT: Uses LLM-as-judge for rubric evaluation. Score between 0.0-1.0. \
Should include clear rubric in the prompt.
- AGENTIC: Interacts with live systems (browser, APIs). Slower (5-30s). \
Captures evidence like screenshots or API responses.

## Fixtures

Each fixture file has the format:
```json
{
  "fixtures": [
    {
      "input": {
        "completions": ["agent output text"],
        "ground_truth": {"key": "value"},
        "context": {}
      },
      "expected_verdict": "PASS",
      "expected_score_min": 0.8
    }
  ]
}
```

Adversarial fixtures test cheat attempts: injection attacks, format gaming, \
claiming success without doing the work.

## Rules

1. The verify.py must be self-contained (no imports beyond vrdev.core.* and stdlib)
2. HARD verifiers must NOT call any LLM - only deterministic checks
3. Fixtures must have 3+ examples each (positive, negative, adversarial)
4. Adversarial fixtures should test prompt injection and claim-without-evidence attacks
5. The ground_truth_schema in VERIFIER.json must match what verify.py expects
6. All evidence should capture what was actually checked (the "proof")
"""


def _build_user_prompt(
    task: str,
    tier: str,
    spec_content: str | None = None,
    spec_type: str | None = None,
    error_feedback: str | None = None,
) -> str:
    parts = [f"Generate a complete vr.dev verifier for this task:\n\n**Task:** {task}\n**Tier:** {tier}"]

    if spec_content and spec_type:
        parts.append(f"\n**{spec_type} Spec (for grounding):**\n```\n{spec_content[:15000]}\n```")

    if error_feedback:
        parts.append(
            f"\n**Previous attempt had errors. Fix these issues:**\n```\n{error_feedback}\n```"
        )

    parts.append("""
Respond with EXACTLY this JSON structure (no markdown fences around the top-level object):

{
  "name": "domain.specific_name",
  "description": "What this verifier checks",
  "verify_py": "... full Python source code ...",
  "verifier_json": { ... full VERIFIER.json content ... },
  "positive_fixtures": { "fixtures": [ ... 3+ passing examples ... ] },
  "negative_fixtures": { "fixtures": [ ... 3+ failing examples ... ] },
  "adversarial_fixtures": { "fixtures": [ ... 3+ adversarial examples ... ] }
}""")

    return "\n".join(parts)


def _parse_response(content: str) -> dict[str, Any]:
    """Parse LLM response, handling potential markdown fencing."""
    text = content.strip()
    # Strip markdown code fences if present
    if text.startswith("```"):
        # Remove opening fence (```json or ```)
        text = re.sub(r"^```\w*\n?", "", text)
        text = re.sub(r"\n?```$", "", text)
    return json.loads(text)


def _validate_generated(result: dict[str, Any], tier: str) -> list[str]:
    """Basic validation of generated artifacts. Returns list of error messages."""
    errors = []

    if "verify_py" not in result or not result["verify_py"].strip():
        errors.append("Missing or empty verify_py")

    if "verifier_json" not in result:
        errors.append("Missing verifier_json")

    if "positive_fixtures" not in result:
        errors.append("Missing positive_fixtures")
    elif len(result.get("positive_fixtures", {}).get("fixtures", [])) < 3:
        errors.append("Need at least 3 positive fixtures")

    if "negative_fixtures" not in result:
        errors.append("Missing negative_fixtures")
    elif len(result.get("negative_fixtures", {}).get("fixtures", [])) < 3:
        errors.append("Need at least 3 negative fixtures")

    if "adversarial_fixtures" not in result:
        errors.append("Missing adversarial_fixtures")
    elif len(result.get("adversarial_fixtures", {}).get("fixtures", [])) < 3:
        errors.append("Need at least 3 adversarial fixtures")

    # Check verify.py compiles
    if "verify_py" in result and result["verify_py"].strip():
        try:
            compile(result["verify_py"], "<generated>", "exec")
        except SyntaxError as e:
            errors.append(f"verify.py has syntax error: {e}")

    return errors


def synthesize_verifier(  # pragma: no cover
    task: str,
    tier: str | None = None,
    spec_path: str | None = None,
    spec_type: str | None = None,
    max_attempts: int = 3,
    model: str = "gpt-4o",
    verbose: bool = True,
) -> GeneratedVerifier:
    """Generate a complete verifier package using an LLM.

    Parameters
    ----------
    task : str
        Natural language description of what to verify.
    tier : str | None
        HARD, SOFT, or AGENTIC. Auto-inferred if None.
    spec_path : str | None
        Path to OpenAPI or SQL schema file for grounding.
    spec_type : str | None
        "OpenAPI" or "SQL Schema".
    max_attempts : int
        Max LLM refinement iterations.
    model : str
        OpenAI model to use.
    verbose : bool
        Print progress messages.

    Returns
    -------
    GeneratedVerifier
        Complete verifier artifacts ready to write to disk.
    """
    openai = _require_openai()
    client = openai.OpenAI()

    if tier is None:
        tier = _infer_tier(task)

    spec_content = None
    if spec_path:
        spec_content = _read_spec_file(spec_path)

    error_feedback = None
    best_result = None

    for attempt in range(1, max_attempts + 1):
        if verbose:
            if attempt == 1:
                print(f"  Generating verifier (attempt {attempt}/{max_attempts})...")
            else:
                print(f"  Refining (attempt {attempt}/{max_attempts})...")

        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": _build_system_prompt()},
                {
                    "role": "user",
                    "content": _build_user_prompt(
                        task, tier, spec_content, spec_type, error_feedback
                    ),
                },
            ],
            temperature=0.3,
            response_format={"type": "json_object"},
        )

        raw = response.choices[0].message.content or "{}"
        try:
            parsed = _parse_response(raw)
        except json.JSONDecodeError as e:
            error_feedback = f"Response was not valid JSON: {e}"
            continue

        errors = _validate_generated(parsed, tier)
        best_result = parsed

        if not errors:
            if verbose:
                print("  ✓ Generated and validated successfully")
            break

        error_feedback = "\n".join(errors)
        if verbose:
            print(f"  ⚠ Validation issues: {error_feedback}")
    else:
        if verbose:
            print(f"  ⚠ Could not fully resolve all issues after {max_attempts} attempts")

    if best_result is None:
        raise RuntimeError("LLM returned no usable output after all attempts")

    name = best_result.get("name", "generated.verifier")
    description = best_result.get("description", task)
    warnings = _validate_generated(best_result, tier)

    return GeneratedVerifier(
        name=name,
        tier=tier.upper(),
        description=description,
        verify_py=best_result.get("verify_py", ""),
        verifier_json=best_result.get("verifier_json", {}),
        positive_fixtures=best_result.get("positive_fixtures", {"fixtures": []}),
        negative_fixtures=best_result.get("negative_fixtures", {"fixtures": []}),
        adversarial_fixtures=best_result.get("adversarial_fixtures", {"fixtures": []}),
        warnings=warnings,
    )
