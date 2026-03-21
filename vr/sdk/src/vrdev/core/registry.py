"""Verifier registry - discovers and instantiates verifiers by ID.

Uses lazy imports to avoid loading all verifier modules at startup.
"""

from __future__ import annotations

import importlib
from typing import Any

from .base import BaseVerifier

# Maps verifier ID → "module.path:ClassName"
_VERIFIER_MAP: dict[str, str] = {
    "vr/filesystem.file_created": "vrdev.tasks.filesystem.file_created:FileCreatedVerifier",
    "vr/tau2.retail.order_cancelled": "vrdev.tasks.tau2.retail:OrderCancelledVerifier",
    "vr/tau2.policy.constraint_not_violated": "vrdev.tasks.tau2.policy:ConstraintNotViolatedVerifier",
    "vr/tau2.airline.rebooking_correct": "vrdev.tasks.tau2.airline:RebookingCorrectVerifier",
    "vr/aiv.email.sent_folder_confirmed": "vrdev.tasks.aiv.email:SentFolderConfirmedVerifier",
    "vr/rubric.email.tone_professional": "vrdev.tasks.rubric.email:ToneProfessionalVerifier",
    "vr/code.python.lint_ruff": "vrdev.tasks.code.lint_ruff:LintRuffVerifier",
    "vr/web.ecommerce.order_placed": "vrdev.tasks.web.ecommerce_order:OrderPlacedVerifier",
    "vr/aiv.calendar.event_created": "vrdev.tasks.aiv.calendar:EventCreatedVerifier",
    "vr/git.commit_present": "vrdev.tasks.code.git_commit:CommitPresentVerifier",
    "vr/rubric.code.logic_correct": "vrdev.tasks.rubric.code:LogicCorrectVerifier",
    "vr/tau2.telecom.plan_changed": "vrdev.tasks.tau2.telecom:PlanChangedVerifier",
    "vr/web.browser.element_visible": "vrdev.tasks.web.element_visible:ElementVisibleVerifier",
    "vr/code.python.tests_pass": "vrdev.tasks.code.tests_pass:TestsPassVerifier",
    "vr/tau2.retail.refund_processed": "vrdev.tasks.tau2.refund:RefundProcessedVerifier",
    # Phase 6
    "vr/rubric.summary.faithful": "vrdev.tasks.rubric.summary:SummaryFaithfulVerifier",
    "vr/web.browser.screenshot_match": "vrdev.tasks.web.screenshot_match:ScreenshotMatchVerifier",
    "vr/tau2.retail.inventory_updated": "vrdev.tasks.tau2.inventory:InventoryUpdatedVerifier",
    # Phase 7
    "vr/aiv.shell.state_probe": "vrdev.tasks.aiv.shell_state_probe:ShellStateProbeVerifier",
    # Phase 14 - document domain
    "vr/document.json.valid": "vrdev.tasks.document:JsonValidVerifier",
    "vr/document.csv.row_count": "vrdev.tasks.document:CsvRowCountVerifier",
    "vr/document.text.contains": "vrdev.tasks.document:TextContainsVerifier",
    "vr/document.yaml.valid": "vrdev.tasks.document:YamlValidVerifier",
    "vr/document.pdf.page_count": "vrdev.tasks.document:PdfPageCountVerifier",
    # Phase 14 - database domain
    "vr/database.row.exists": "vrdev.tasks.database:RowExistsVerifier",
    "vr/database.row.updated": "vrdev.tasks.database:RowUpdatedVerifier",
    "vr/database.table.row_count": "vrdev.tasks.database:TableRowCountVerifier",
    # Phase 14 - api domain
    "vr/api.http.status_ok": "vrdev.tasks.api:HttpStatusOkVerifier",
    "vr/api.http.response_matches": "vrdev.tasks.api:HttpResponseMatchesVerifier",
    "vr/api.http.header_present": "vrdev.tasks.api:HttpHeaderPresentVerifier",
    # Phase C - git enterprise
    "vr/git.pr.merged": "vrdev.tasks.git:PrMergedVerifier",
    "vr/git.ci.passed": "vrdev.tasks.git:CiPassedVerifier",
    "vr/ci.github.workflow_passed": "vrdev.tasks.git:WorkflowPassedVerifier",
    # Phase C - messaging
    "vr/messaging.slack.message_sent": "vrdev.tasks.messaging:SlackMessageSentVerifier",
    "vr/messaging.slack.reaction_added": "vrdev.tasks.messaging:SlackReactionAddedVerifier",
    # Phase C - payment
    "vr/payment.stripe.charge_succeeded": "vrdev.tasks.payment:ChargeSucceededVerifier",
    "vr/payment.stripe.refund_processed": "vrdev.tasks.payment:RefundProcessedVerifier",
    # Phase C - project management
    "vr/project.jira.ticket_transitioned": "vrdev.tasks.project:TicketTransitionedVerifier",
}


def get_verifier(verifier_id: str, **kwargs: Any) -> BaseVerifier:
    """Instantiate a verifier by its registry ID.

    Parameters
    ----------
    verifier_id : str
        The verifier ID (e.g., ``vr/filesystem.file_created``).
    **kwargs
        Additional keyword arguments passed to the verifier constructor.

    Returns
    -------
    BaseVerifier
        An instance of the requested verifier.

    Raises
    ------
    KeyError
        If the verifier ID is not registered.
    """
    if verifier_id not in _VERIFIER_MAP:
        available = ", ".join(sorted(_VERIFIER_MAP.keys()))
        raise KeyError(
            f"Unknown verifier: {verifier_id}. Available: {available}"
        )

    module_path, class_name = _VERIFIER_MAP[verifier_id].rsplit(":", 1)
    module = importlib.import_module(module_path)
    cls = getattr(module, class_name)
    return cls(**kwargs)


def list_verifiers() -> list[str]:
    """Return all registered verifier IDs."""
    return sorted(_VERIFIER_MAP.keys())
