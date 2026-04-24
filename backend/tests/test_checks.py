from datetime import date

from app.diagnostics.checks import DiagnosticContext, MonthCloseCostAccountsCheck
from app.onec.mock_client import MockOneCClient


def test_month_close_check_returns_issues_on_nonzero_balance():
    context = DiagnosticContext(
        onec_client=MockOneCClient(),
        organization_id="org-1",
        period_start=date(2026, 3, 1),
        period_end=date(2026, 3, 31),
        user_id=1,
        diagnostic_type="pre_month_close",
        settings={},
    )
    issues = MonthCloseCostAccountsCheck().run(context)
    assert len(issues) >= 1
    assert issues[0]["category"] == "month_close"
