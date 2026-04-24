import json
from typing import Any

import httpx

from app.config import settings

ALLOWED_ACTION_TYPES = {
    "create_accountant_task",
    "create_onec_specialist_task",
    "prepare_repost_documents",
    "prepare_invoice_renumbering",
    "prepare_debt_adjustment_draft",
    "prepare_missing_analytics_report",
    "prepare_vat_purchase_book_rebuild",
    "prepare_month_close_rerun",
    "mark_issue_as_false_positive",
    "request_manual_review",
}

FORBIDDEN_ACTION_TYPES = {
    "direct_sql_write",
    "direct_register_edit",
    "delete_documents",
    "change_accounting_policy",
    "mass_repost_without_confirmation",
    "change_user_permissions",
    "run_infobase_repair",
    "arbitrary_1c_code_execution",
}


def _fallback_plan(context: dict[str, Any]) -> dict[str, Any]:
    issue = context.get("issue", {})
    category = issue.get("category", "technical")
    base_action = "request_manual_review"
    if category == "month_close":
        base_action = "prepare_month_close_rerun"
    elif category == "vat":
        base_action = "prepare_vat_purchase_book_rebuild"
    elif category == "reconciliations":
        base_action = "prepare_debt_adjustment_draft"

    return {
        "title": f"План исправления: {issue.get('title', 'Проблема')}",
        "description": "Сформирован безопасный план исправления без изменения данных 1С в MVP.",
        "risk_level": "medium",
        "requires_confirmation": True,
        "requires_backup": False,
        "can_execute_automatically": False,
        "verification_steps": ["Повторно запустить диагностику после выполнения шагов."],
        "actions": [
            {
                "action_type": base_action,
                "payload_json": {
                    "issue_id": issue.get("id"),
                    "issue_title": issue.get("title"),
                    "account_code": issue.get("account_code"),
                },
            },
            {
                "action_type": "create_accountant_task",
                "payload_json": {"title": issue.get("title"), "description": issue.get("detected_reason")},
            },
        ],
    }


def _validate_plan(plan: dict[str, Any]) -> dict[str, Any]:
    actions = plan.get("actions", [])
    valid_actions = []
    for action in actions:
        action_type = action.get("action_type")
        if action_type in FORBIDDEN_ACTION_TYPES:
            continue
        if action_type not in ALLOWED_ACTION_TYPES:
            continue
        valid_actions.append({"action_type": action_type, "payload_json": action.get("payload_json", {})})
    plan["actions"] = valid_actions
    if not valid_actions:
        plan["actions"] = [{"action_type": "request_manual_review", "payload_json": {"reason": "No safe actions generated"}}]
    return plan


async def generate_correction_plan(context: dict[str, Any], model_name: str | None = None) -> tuple[str, dict[str, Any]]:
    if settings.llm_provider == "openrouter" and settings.openrouter_api_key:
        try:
            model = model_name or settings.openrouter_model
            prompt = (
                "Return ONLY valid JSON with fields: title, description, risk_level, requires_confirmation, "
                "requires_backup, can_execute_automatically, verification_steps (array), actions (array of "
                "{action_type,payload_json}). Use only safe action types."
            )
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(
                    f"{settings.openrouter_base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {settings.openrouter_api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": model,
                        "messages": [
                            {"role": "system", "content": prompt},
                            {"role": "user", "content": json.dumps(context, ensure_ascii=False)},
                        ],
                        "temperature": 0,
                    },
                )
            response.raise_for_status()
            content = response.json()["choices"][0]["message"]["content"]
            plan = json.loads(content)
            return model, _validate_plan(plan)
        except Exception:
            pass
    return "mock-safe-planner", _validate_plan(_fallback_plan(context))
