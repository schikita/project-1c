from dataclasses import dataclass
from datetime import date


@dataclass
class DiagnosticContext:
    onec_client: object
    organization_id: str
    period_start: date
    period_end: date
    user_id: int
    diagnostic_type: str
    settings: dict


class BaseDiagnosticCheck:
    code = "base_check"
    title = "Base Check"
    category = "technical"
    severity = "info"

    def run(self, context: DiagnosticContext) -> list[dict]:
        raise NotImplementedError

    def build_issue(self, *, title: str, description: str, detected_reason: str, **kwargs) -> dict:
        return {
            "check_code": self.code,
            "category": self.category,
            "severity": self.severity,
            "title": title,
            "description": description,
            "detected_reason": detected_reason,
            "evidence_json": kwargs.get("evidence", {}),
            "impact_map_json": kwargs.get("impact_map", {}),
            "fix_steps_json": kwargs.get("fix_steps", []),
            "affected_amount": kwargs.get("affected_amount"),
            "account_code": kwargs.get("account_code"),
        }


class MonthCloseCostAccountsCheck(BaseDiagnosticCheck):
    code = "month_close_cost_accounts"
    title = "Счета затрат не закрыты"
    category = "month_close"
    severity = "high"

    def run(self, context: DiagnosticContext) -> list[dict]:
        issues = []
        for account in ["20", "23", "25", "26", "44"]:
            bal = context.onec_client.get_account_balance(context.organization_id, context.period_start, context.period_end, account)
            amount = float(bal.get("end_balance", 0) or 0)
            if amount > 0:
                issues.append(
                    self.build_issue(
                        title=f"Счет {account} не закрыт за период",
                        description=f"На конец периода обнаружен остаток по счету {account}.",
                        detected_reason="Не найдена база распределения, ручные операции или отсутствует аналитика.",
                        affected_amount=amount,
                        account_code=account,
                        impact_map={"nodes": ["Незаполненная аналитика", f"Счет {account} не закрыт", "Искажение себестоимости"]},
                        fix_steps=["Проверить статьи затрат и аналитику.", "Перепровести документы.", "Повторить закрытие месяца."],
                    )
                )
        return issues


class ManualOperationsImpactCheck(BaseDiagnosticCheck):
    code = "manual_operations_impact"
    title = "Ручные операции с риском искажения учета"
    category = "month_close"
    severity = "medium"

    def run(self, context: DiagnosticContext) -> list[dict]:
        operations = context.onec_client.get_manual_operations(context.organization_id, context.period_start, context.period_end)
        return [
            self.build_issue(
                title="Обнаружены ручные операции",
                description="Ручные операции могут повлиять на закрытие месяца и отчетность.",
                detected_reason="Найдены операции по чувствительным счетам.",
                evidence={"operations": operations},
                fix_steps=["Проверить обоснование ручной операции.", "Сверить проводки с первичными документами."],
            )
        ] if operations else []


class FixedAssetsDepreciationCheck(BaseDiagnosticCheck):
    code = "fixed_assets_depreciation"
    title = "Не начислена амортизация ОС"
    category = "fixed_assets"
    severity = "high"

    def run(self, context: DiagnosticContext) -> list[dict]:
        assets = context.onec_client.get_fixed_assets(context.organization_id, context.period_start, context.period_end)
        dep = context.onec_client.get_depreciation_records(context.organization_id, context.period_start, context.period_end)
        if assets and not dep:
            return [
                self.build_issue(
                    title="По основным средствам не найдены проводки амортизации",
                    description="Есть ОС, требующие амортизации, но проводки отсутствуют.",
                    detected_reason="Не выполнена регламентная операция или некорректно настроены параметры ОС.",
                    evidence={"assets": assets},
                    fix_steps=["Проверить параметры амортизации ОС.", "Выполнить регламентную операцию начисления амортизации."],
                )
            ]
        return []


class InputVatPurchaseBookCheck(BaseDiagnosticCheck):
    code = "input_vat_purchase_book"
    title = "Входной НДС не отражен в книге покупок"
    category = "vat"
    severity = "high"

    def run(self, context: DiagnosticContext) -> list[dict]:
        vat_docs = context.onec_client.get_vat_documents(context.organization_id, context.period_start, context.period_end)
        purchase_book = context.onec_client.get_purchase_book_records(context.organization_id, context.period_start, context.period_end)
        if vat_docs and not purchase_book:
            return [self.build_issue(
                title=self.title,
                description="Есть документы поступления с НДС, но записи книги покупок не найдены.",
                detected_reason="Не заполнен счет-фактура, документ не проведен или записи книги покупок не сформированы.",
                evidence={"vat_documents": vat_docs},
                fix_steps=["Проверить счет-фактуру.", "Проверить проведение документа.", "Сформировать записи книги покупок."],
            )]
        return []


class AdvancesClosingCheck(BaseDiagnosticCheck):
    code = "advances_closing"
    title = "Незакрытые авансы"
    category = "reconciliations"
    severity = "medium"

    def run(self, context: DiagnosticContext) -> list[dict]:
        advances = context.onec_client.get_advances(context.organization_id, context.period_start, context.period_end)
        return [self.build_issue(
            title=self.title,
            description="Обнаружены авансы, которые не закрылись автоматически.",
            detected_reason="Несовпадение договоров, счетов расчетов или частичные зачеты.",
            evidence={"advances": advances},
            fix_steps=["Проверить договоры и счета расчетов.", "Проверить документы корректировки долга."],
        )] if advances else []


class InventoryNegativeBalanceCheck(BaseDiagnosticCheck):
    code = "inventory_negative_balance"
    title = "Отрицательные остатки ТМЦ"
    category = "inventory"
    severity = "high"

    def run(self, context: DiagnosticContext) -> list[dict]:
        balances = context.onec_client.get_inventory_balances(context.organization_id, context.period_start, context.period_end)
        negatives = [x for x in balances if float(x.get("balance", 0)) < 0]
        return [self.build_issue(
            title=self.title,
            description="По номенклатуре обнаружены отрицательные остатки.",
            detected_reason="Документы задним числом, ошибки партийного учета или неверная последовательность проведения.",
            evidence={"negative_items": negatives},
            fix_steps=["Проверить движения по складу.", "Проверить последовательность проведения документов."],
        )] if negatives else []


class MissingAnalyticsCheck(BaseDiagnosticCheck):
    code = "missing_analytics"
    title = "Документы без обязательной аналитики"
    category = "month_close"
    severity = "high"

    def run(self, context: DiagnosticContext) -> list[dict]:
        docs = context.onec_client.get_documents(context.organization_id, context.period_start, context.period_end, {})
        bad_docs = [d for d in docs if d.get("missing_analytics")]
        return [self.build_issue(
            title=self.title,
            description="Найдены документы с незаполненной аналитикой.",
            detected_reason="Не заполнены обязательные аналитические разрезы.",
            evidence={"documents": bad_docs},
            impact_map={"nodes": ["Документ с неполной аналитикой", "Некорректное распределение затрат", "Риск незакрытия месяца"]},
            fix_steps=["Открыть документ в 1С.", "Заполнить аналитику.", "Перепровести документ."],
        )] if bad_docs else []


class AccountingPolicyCheck(BaseDiagnosticCheck):
    code = "accounting_policy"
    title = "Проблемы учетной политики"
    category = "month_close"
    severity = "medium"

    def run(self, context: DiagnosticContext) -> list[dict]:
        policy = context.onec_client.get_accounting_policy(context.organization_id, context.period_end)
        if not policy or not policy.get("exists"):
            return [self.build_issue(
                title="Не найдена учетная политика на период",
                description="Для выбранной организации и периода отсутствует учетная политика.",
                detected_reason="Учетная политика не создана или не действует на период.",
                evidence={"policy": policy},
                fix_steps=["Создать или актуализировать учетную политику.", "Проверить применимость к организации."],
            )]
        return []


class ReportingBalanceLineCheck(BaseDiagnosticCheck):
    code = "reporting_balance_line_1150"
    title = "Расхождение строки 1150"
    category = "reporting"
    severity = "high"

    def run(self, context: DiagnosticContext) -> list[dict]:
        indicators = context.onec_client.get_reporting_indicators(
            context.organization_id, context.period_start, context.period_end, "balance"
        )
        line_1150 = float(indicators.get("line_1150", 0))
        calc = float(indicators.get("calc_01_02", 0))
        diff = line_1150 - calc
        if abs(diff) > 0.01:
            return [self.build_issue(
                title=self.title,
                description="Строка 1150 не сопоставима с расчетом 01 минус 02.",
                detected_reason="Есть расхождения между отчетными показателями и данными учета.",
                affected_amount=diff,
                evidence={"line_1150": line_1150, "calc_01_02": calc, "difference": diff},
                fix_steps=["Проверить документы по ОС.", "Проверить корректность начисления амортизации.", "Сформировать отчет повторно."],
            )]
        return []
