from app.diagnostics.checks import (
    AccountingPolicyCheck,
    AdvancesClosingCheck,
    DiagnosticContext,
    FixedAssetsDepreciationCheck,
    InputVatPurchaseBookCheck,
    InventoryNegativeBalanceCheck,
    ManualOperationsImpactCheck,
    MissingAnalyticsCheck,
    MonthCloseCostAccountsCheck,
    ReportingBalanceLineCheck,
)


class DiagnosticEngine:
    def __init__(self):
        self.checks = [
            MonthCloseCostAccountsCheck(),
            ManualOperationsImpactCheck(),
            FixedAssetsDepreciationCheck(),
            InputVatPurchaseBookCheck(),
            AdvancesClosingCheck(),
            InventoryNegativeBalanceCheck(),
            MissingAnalyticsCheck(),
            AccountingPolicyCheck(),
            ReportingBalanceLineCheck(),
        ]

    def run(self, context: DiagnosticContext) -> list[dict]:
        issues: list[dict] = []
        for check in self.checks:
            issues.extend(check.run(context))
        return issues
