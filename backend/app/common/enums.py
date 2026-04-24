from enum import Enum


class UserRole(str, Enum):
    owner = "owner"
    admin = "admin"
    accountant = "accountant"
    auditor = "auditor"
    readonly = "readonly"
    onec_specialist = "onec_specialist"


class DiagnosticStatus(str, Enum):
    pending = "pending"
    running = "running"
    completed = "completed"
    failed = "failed"
    cancelled = "cancelled"
