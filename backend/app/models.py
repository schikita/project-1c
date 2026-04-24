from datetime import datetime

from sqlalchemy import JSON, Boolean, Date, DateTime, Enum, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.common.enums import DiagnosticStatus, UserRole
from app.database import Base


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(255))
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.accountant)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class OneCConnection(Base):
    __tablename__ = "onec_connections"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    connection_type: Mapped[str] = mapped_column(String(32))
    base_url: Mapped[str] = mapped_column(String(500))
    username: Mapped[str] = mapped_column(String(255))
    encrypted_password: Mapped[str] = mapped_column(String(500))
    database_name: Mapped[str] = mapped_column(String(255), default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_check_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_check_status: Mapped[str | None] = mapped_column(String(64), nullable=True)


class DiagnosticRun(Base):
    __tablename__ = "diagnostic_runs"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    connection_id: Mapped[int] = mapped_column(ForeignKey("onec_connections.id"))
    organization_id: Mapped[str] = mapped_column(String(128))
    period_start: Mapped[Date] = mapped_column(Date)
    period_end: Mapped[Date] = mapped_column(Date)
    diagnostic_type: Mapped[str] = mapped_column(String(64))
    status: Mapped[DiagnosticStatus] = mapped_column(Enum(DiagnosticStatus), default=DiagnosticStatus.pending)
    progress_percent: Mapped[int] = mapped_column(Integer, default=0)
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    summary_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    issues: Mapped[list["DiagnosticIssue"]] = relationship(back_populates="run")


class DiagnosticIssue(Base):
    __tablename__ = "diagnostic_issues"
    id: Mapped[int] = mapped_column(primary_key=True)
    run_id: Mapped[int] = mapped_column(ForeignKey("diagnostic_runs.id"))
    check_code: Mapped[str] = mapped_column(String(100))
    category: Mapped[str] = mapped_column(String(64))
    severity: Mapped[str] = mapped_column(String(16))
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text)
    detected_reason: Mapped[str] = mapped_column(Text)
    affected_amount: Mapped[float | None] = mapped_column(Numeric(18, 2), nullable=True)
    account_code: Mapped[str | None] = mapped_column(String(32), nullable=True)
    one_c_object_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    one_c_object_ref: Mapped[str | None] = mapped_column(String(128), nullable=True)
    evidence_json: Mapped[dict] = mapped_column(JSON, default=dict)
    impact_map_json: Mapped[dict] = mapped_column(JSON, default=dict)
    fix_steps_json: Mapped[list] = mapped_column(JSON, default=list)
    can_auto_fix: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(32), default="open")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    run: Mapped["DiagnosticRun"] = relationship(back_populates="issues")


class KnowledgeArticle(Base):
    __tablename__ = "knowledge_articles"
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(255))
    slug: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    category: Mapped[str] = mapped_column(String(64))
    symptoms: Mapped[str] = mapped_column(Text)
    causes: Mapped[str] = mapped_column(Text)
    checks: Mapped[str] = mapped_column(Text)
    fix_steps: Mapped[str] = mapped_column(Text)
    tags: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    action: Mapped[str] = mapped_column(String(255))
    payload_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class OneCIntegrationLog(Base):
    __tablename__ = "onec_integration_logs"
    id: Mapped[int] = mapped_column(primary_key=True)
    connection_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    method: Mapped[str] = mapped_column(String(100))
    status: Mapped[str] = mapped_column(String(32))
    request_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    response_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AIAssistantRun(Base):
    __tablename__ = "ai_assistant_runs"
    id: Mapped[int] = mapped_column(primary_key=True)
    issue_id: Mapped[int] = mapped_column(ForeignKey("diagnostic_issues.id"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    input_context_json: Mapped[dict] = mapped_column(JSON, default=dict)
    model_name: Mapped[str] = mapped_column(String(128), default="mock")
    output_plan_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="completed")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CorrectionPlan(Base):
    __tablename__ = "correction_plans"
    id: Mapped[int] = mapped_column(primary_key=True)
    issue_id: Mapped[int] = mapped_column(ForeignKey("diagnostic_issues.id"))
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text)
    risk_level: Mapped[str] = mapped_column(String(16), default="medium")
    requires_confirmation: Mapped[bool] = mapped_column(Boolean, default=True)
    requires_backup: Mapped[bool] = mapped_column(Boolean, default=False)
    actions_json: Mapped[list] = mapped_column(JSON, default=list)
    status: Mapped[str] = mapped_column(String(32), default="draft")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CorrectionAction(Base):
    __tablename__ = "correction_actions"
    id: Mapped[int] = mapped_column(primary_key=True)
    plan_id: Mapped[int] = mapped_column(ForeignKey("correction_plans.id"))
    action_type: Mapped[str] = mapped_column(String(128))
    payload_json: Mapped[dict] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(String(32), default="pending")
    executed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    result_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
