from app.onec.client import OneCClient


class BaseOneCClient(OneCClient):
    def __init__(self, connection: dict):
        self.connection = connection

    def _not_implemented(self):
        raise NotImplementedError("This client is a scaffold for MVP and requires implementation.")

    def check_connection(self): self._not_implemented()
    def get_organizations(self): self._not_implemented()
    def get_account_turnovers(self, organization_id, period_start, period_end, accounts): self._not_implemented()
    def get_account_balance(self, organization_id, period_start, period_end, account): self._not_implemented()
    def get_documents(self, organization_id, period_start, period_end, filters): self._not_implemented()
    def get_document_movements(self, document_ref): self._not_implemented()
    def get_register_records(self, organization_id, period_start, period_end, register_name, filters): self._not_implemented()
    def get_accounting_policy(self, organization_id, period): self._not_implemented()
    def get_month_close_status(self, organization_id, period): self._not_implemented()
    def get_month_close_operations(self, organization_id, period): self._not_implemented()
    def get_manual_operations(self, organization_id, period_start, period_end): self._not_implemented()
    def get_vat_documents(self, organization_id, period_start, period_end): self._not_implemented()
    def get_purchase_book_records(self, organization_id, period_start, period_end): self._not_implemented()
    def get_sales_book_records(self, organization_id, period_start, period_end): self._not_implemented()
    def get_fixed_assets(self, organization_id, period_start, period_end): self._not_implemented()
    def get_depreciation_records(self, organization_id, period_start, period_end): self._not_implemented()
    def get_advances(self, organization_id, period_start, period_end): self._not_implemented()
    def get_counterparty_reconciliation_data(self, organization_id, period_start, period_end, counterparty_id): self._not_implemented()
    def get_inventory_balances(self, organization_id, period_start, period_end): self._not_implemented()
    def get_inventory_movements(self, organization_id, period_start, period_end, filters): self._not_implemented()
    def get_payroll_summary(self, organization_id, period_start, period_end): self._not_implemented()
    def get_usn_income_expense_records(self, organization_id, period_start, period_end): self._not_implemented()
    def get_reporting_indicators(self, organization_id, period_start, period_end, report_type): self._not_implemented()
    def get_user_permissions(self, user_identifier): self._not_implemented()
    def get_configuration_version(self): self._not_implemented()
    def get_platform_version(self): self._not_implemented()
    def get_extensions_info(self): self._not_implemented()
    def get_last_update_info(self): self._not_implemented()


class OneCHttpClient(BaseOneCClient):
    pass


class OneCODataClient(BaseOneCClient):
    pass
