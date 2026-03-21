"""Training-data export - write VerificationResults as JSONL.

Each line is a self-contained JSON object suitable for GRPO / DPO
training pipelines:

    {"completion": "...", "score": 0.85, "verdict": "PASS", "verifier_id": "...", ...}

Usage::

    from vrdev.core.export import export_jsonl

    with open("train.jsonl", "w") as f:
        export_jsonl(results, input_data, verifier_id="vr/filesystem.file_created", fp=f)

    # Or get lines as strings
    lines = export_jsonl_lines(results, input_data, verifier_id="...")
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import IO, Any

from .types import VerificationResult, VerifierInput


def _build_record(
    result: VerificationResult,
    completion: str,
    verifier_id: str,
    input_data: VerifierInput,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Build a single JSONL record from a result + completion."""
    record: dict[str, Any] = {
        "completion": completion,
        "score": result.score,
        "verdict": result.verdict.value,
        "tier": result.tier.value,
        "verifier_id": verifier_id,
        "breakdown": result.breakdown,
        "passed": result.passed,
        "artifact_hash": result.artifact_hash,
        "input_hash": result.input_hash,
        "provenance": {
            "verifier_pkg": result.provenance.verifier_pkg,
            "source_benchmark": result.provenance.source_benchmark,
            "timestamp_utc": result.provenance.timestamp_utc,
        },
        "ground_truth": input_data.ground_truth,
        "exported_at": datetime.now(timezone.utc).isoformat(),
    }
    if extra:
        record.update(extra)
    return record


def export_jsonl_lines(
    results: list[VerificationResult],
    input_data: VerifierInput,
    verifier_id: str,
    *,
    extra: dict[str, Any] | None = None,
) -> list[str]:
    """Convert results to a list of JSONL strings (one per completion).

    Parameters
    ----------
    results : list[VerificationResult]
        The verification results (one per completion).
    input_data : VerifierInput
        The original input (completions + ground truth).
    verifier_id : str
        The verifier registry ID (e.g. ``vr/filesystem.file_created``).
    extra : dict | None
        Additional key-value pairs to merge into each record.

    Returns
    -------
    list[str]
        One JSON string per completion (no trailing newlines).
    """
    lines: list[str] = []
    for i, result in enumerate(results):
        completion = (
            input_data.completions[i]
            if i < len(input_data.completions)
            else ""
        )
        record = _build_record(result, completion, verifier_id, input_data, extra)
        lines.append(json.dumps(record, ensure_ascii=False, sort_keys=False))
    return lines


def export_jsonl(
    results: list[VerificationResult],
    input_data: VerifierInput,
    verifier_id: str,
    fp: IO[str],
    *,
    extra: dict[str, Any] | None = None,
) -> int:
    """Write results as JSONL to a file-like object.

    Parameters
    ----------
    results : list[VerificationResult]
        The verification results.
    input_data : VerifierInput
        The original input.
    verifier_id : str
        The verifier registry ID.
    fp : IO[str]
        Writable file-like object.
    extra : dict | None
        Additional fields per record.

    Returns
    -------
    int
        Number of lines written.
    """
    lines = export_jsonl_lines(results, input_data, verifier_id, extra=extra)
    for line in lines:
        fp.write(line + "\n")
    return len(lines)
