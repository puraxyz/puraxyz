# Skill: openclaw.vrdev_self_test

> Use vr.dev to verify vr.dev. If the verification infrastructure can't verify itself, it shouldn't be trusted to verify anything else.

## What This Skill Does

This skill runs a four-step verification pipeline against the vr.dev codebase and infrastructure:

1. **Run SDK tests** - Execute `pytest` on the vrdev Python SDK. Verifier: `vr/code.python.tests_pass` (HARD). Checks exit code, parses test count, confirms zero failures.

2. **Lint check** - Run `ruff check` on the vrdev package source. Verifier: `vr/code.python.lint_ruff` (HARD). Confirms zero lint errors across all source files.

3. **Frontend health** - Load the vr.dev landing page in a browser and verify the hero section renders. Verifier: `vr/web.browser.element_visible` (AGENTIC). Confirms the page loads without error and the expected content is visible.

4. **Report artifact** - Verify that a JSON test report was written to disk. Verifier: `vr/filesystem.file_created` (HARD). Checks that the report file exists and contains valid JSON with the expected fields.

All four verifiers are composed with `require_hard=true` and `policy_mode=fail_closed`. If any HARD verifier fails, the entire pipeline scores 0.0.

## When to Trigger

- **Cron**: Nightly at 02:00 UTC (recommended for continuous health monitoring)
- **Webhook**: On push to `main` branch of the vr-dev repository
- **Manual**: When asked to "test vr.dev" or "check vr.dev health"

## Required Context

The OpenClaw agent needs:

| Key | Description | Example |
|-----|-------------|---------|
| `repo_path` | Local path to the vr-dev repository clone | `/home/claw/repos/vr-dev` |
| `python_executable` | Path to Python with vrdev installed | `/home/claw/.venv/bin/python` |
| `frontend_url` | URL of the vr.dev frontend to check | `https://vr.dev` or `http://localhost:3000` |
| `report_output_path` | Where to write the JSON report | `/home/claw/reports/vrdev-self-test.json` |

## Agent Instructions

```
You are running vr.dev's self-test skill. Execute these steps in order:

1. cd to {repo_path}/packages/vrdev
2. Run: {python_executable} -m pytest tests/ --tb=short -q 2>&1
   - Capture stdout/stderr and exit code
   - If exit code != 0, note which tests failed

3. Run: ruff check src/ 2>&1
   - Capture output and exit code
   - If exit code != 0, note which files have errors

4. Open {frontend_url} in the browser
   - Wait for the page to load (max 10 seconds)
   - Check that the hero heading is visible
   - Take a screenshot for evidence

5. Write a JSON report to {report_output_path}:
   {
     "timestamp": "<ISO 8601>",
     "skill": "openclaw.vrdev_self_test@0.1.0",
     "results": {
       "tests": {"passed": <n>, "failed": <n>, "exit_code": <n>},
       "lint": {"errors": <n>, "exit_code": <n>},
       "frontend": {"loaded": <bool>, "hero_visible": <bool>},
     },
     "overall": "PASS" | "FAIL"
   }

6. Run each verifier in the chain to produce the formal verification result.

If any step fails, continue running the remaining steps (for completeness),
but set overall to "FAIL".
```

## The Recursive Loop

This skill is a proof-of-concept for the agent-as-consumer thesis. The pipeline is:

1. **OpenClaw agent** executes the skill (runs tests, checks frontend)
2. **vr.dev verifiers** verify the results (did the tests actually pass? does the report exist?)
3. **Evidence** is collected and stored (verification results with provenance)
4. **The agent** reads the evidence and can act on failures (open a GitHub issue, notify the developer, attempt a fix)

If vr.dev's verifiers catch a regression in vr.dev's own codebase, that's the product working as intended. If they miss a regression, that's a verifier quality issue that needs to be addressed - and the adversarial fixtures exist precisely to prevent that scenario.

This is not just dogfooding. It's a demonstration that autonomous agents can be the primary consumer of verification infrastructure - running continuously, without human intervention, improving the systems they depend on.
