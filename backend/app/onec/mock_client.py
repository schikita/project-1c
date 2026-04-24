from datetime import date
from typing import Any

from app.onec.client import OneCClient


class MockOneCClient(OneCClient):
    def check_connection(self) -> dict:
        return {"status": "ok", "message": "Mock connection available"}

    def get_organizations(self) -> list[dict]:
        return [{"id": "org-1", "name": "ООО Ромашка"}, {"id": "org-2", "name": "ООО Вектор"}]

    def get_account_turnovers(self, organization_id: str, period_start: date, period_end: date, accounts: list[str]) -> list[dict]:
        return [{"account": acc, "debit": 100000, "credit": 95000} for acc in accounts]

    def get_account_balance(self, organization_id: str, period_start: date, period_end: date, account: str) -> dict:
        balance = 12000 if account in {"20", "25"} else 0
        return {"account": account, "end_balance": balance}

    def get_documents(self, organization_id: str, period_start: date, period_end: date, filters: dict[str, Any]) -> list[dict]:
        return [{"ref": "doc-1", "name": "Поступление №123", "date": str(period_end), "missing_analytics": True}]

    def get_document_movements(self, document_ref: str) -> list[dict]:
        return [{"document_ref": document_ref, "account": "20", "amount": 12000}]

    def get_register_records(self, organization_id: str, period_start: date, period_end: date, register_name: str, filters: dict[str, Any]) -> list[dict]:
        return [{"register": register_name, "value": "mock"}]

    def get_accounting_policy(self, organization_id: str, period: date) -> dict:
        return {"exists": True, "inventory_method": "FIFO", "vat_method": "accrual"}

    def get_month_close_status(self, organization_id: str, period: date) -> dict:
        return {"is_closed": False}

    def get_month_close_operations(self, organization_id: str, period: date) -> list[dict]:
        return [{"name": "Распределение затрат", "status": "failed"}]

    def get_manual_operations(self, organization_id: str, period_start: date, period_end: date) -> list[dict]:
        return [{"ref": "op-1", "account": "20", "amount": 30000, "user": "demo"}]

    def get_vat_documents(self, organization_id: str, period_start: date, period_end: date) -> list[dict]:
        return [{"ref": "vat-1", "has_invoice": False, "amount": 5000}]

    def get_purchase_book_records(self, organization_id: str, period_start: date, period_end: date) -> list[dict]:
        return []

    def get_sales_book_records(self, organization_id: str, period_start: date, period_end: date) -> list[dict]:
        return []

    def get_fixed_assets(self, organization_id: str, period_start: date, period_end: date) -> list[dict]:
        return [{"ref": "fa-1", "name": "Станок", "should_depreciate": True}]

    def get_depreciation_records(self, organization_id: str, period_start: date, period_end: date) -> list[dict]:
        return []

    def get_advances(self, organization_id: str, period_start: date, period_end: date) -> list[dict]:
        return [{"counterparty": "ООО Контрагент", "open_amount": 9000}]

    def get_counterparty_reconciliation_data(self, organization_id: str, period_start: date, period_end: date, counterparty_id: str) -> dict:
        return {"counterparty_id": counterparty_id, "difference": 1000}

    def get_inventory_balances(self, organization_id: str, period_start: date, period_end: date) -> list[dict]:
        return [{"item": "Материал А", "balance": -2, "account": "10.01"}]

    def get_inventory_movements(self, organization_id: str, period_start: date, period_end: date, filters: dict[str, Any]) -> list[dict]:
        return [{"item": "Материал А", "amount": 10}]

    def get_payroll_summary(self, organization_id: str, period_start: date, period_end: date) -> dict:
        return {"records": 0}

    def get_usn_income_expense_records(self, organization_id: str, period_start: date, period_end: date) -> list[dict]:
        return []

    def get_reporting_indicators(self, organization_id: str, period_start: date, period_end: date, report_type: str) -> dict:
        return {"line_1150": 100000, "calc_01_02": 92000}

    def get_user_permissions(self, user_identifier: str) -> dict:
        return {"can_read": True, "can_post": False}

    def get_configuration_version(self) -> str:
        return "3.0.0-mock"

    def get_platform_version(self) -> str:
        return "8.3.25-mock"

    def get_extensions_info(self) -> list[dict]:
        return [{"name": "MockExtension", "compatible": True}]

    def get_last_update_info(self) -> dict:
        return {"date": "2026-04-01", "type": "configuration"}
