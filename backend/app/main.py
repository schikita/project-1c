from datetime import date
import asyncio
from typing import Annotated

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.database import Base, engine, get_db
from app.ai_assistant.service import ALLOWED_ACTION_TYPES, generate_correction_plan
from app.common.enums import DiagnosticStatus, UserRole
from app.diagnostics.tasks import run_diagnostic_task
from app.models import (
    AIAssistantRun,
    AuditLog,
    CorrectionAction,
    CorrectionPlan,
    DiagnosticIssue,
    DiagnosticRun,
    KnowledgeArticle,
    OneCConnection,
    OneCIntegrationLog,
    User,
)
from app.onec.mock_client import MockOneCClient
from app.security import create_token, decode_token, hash_password, verify_password

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Diagnostic Assistant 1C")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://185.244.50.22:15173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class ConnectionRequest(BaseModel):
    name: str
    connection_type: str = "mock"
    base_url: str = "mock://local"
    username: str = "mock"
    password: str = "mock"
    database_name: str = "mock_db"


class ConnectionPatchRequest(BaseModel):
    name: str | None = None
    base_url: str | None = None
    username: str | None = None
    password: str | None = None
    database_name: str | None = None
    is_active: bool | None = None


class DiagnosticRunRequest(BaseModel):
    connection_id: int
    organization_id: str
    period_start: date
    period_end: date
    diagnostic_type: str = "pre_month_close"


class UserPatchRequest(BaseModel):
    full_name: str | None = None
    role: UserRole | None = None
    is_active: bool | None = None


class KnowledgeArticleRequest(BaseModel):
    title: str
    slug: str
    category: str
    symptoms: str
    causes: str
    checks: str
    fix_steps: str
    tags: list[str] = []


class KnowledgeArticlePatchRequest(BaseModel):
    title: str | None = None
    slug: str | None = None
    category: str | None = None
    symptoms: str | None = None
    causes: str | None = None
    checks: str | None = None
    fix_steps: str | None = None
    tags: list[str] | None = None


class AIAssistantCreateRequest(BaseModel):
    issue_id: int
    model_name: str | None = None


def add_audit_log(db: Session, user_id: int | None, action: str, payload: dict | None = None):
    db.add(AuditLog(user_id=user_id, action=action, payload_json=payload or {}))
    db.commit()


def add_integration_log(db: Session, connection_id: int | None, method: str, status: str, request: dict | None = None):
    db.add(
        OneCIntegrationLog(
            connection_id=connection_id,
            method=method,
            status=status,
            request_json=request or {},
            response_json={},
        )
    )
    db.commit()


def get_token_payload(authorization: Annotated[str | None, Header()] = None) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.split(" ", 1)[1]
    try:
        return decode_token(token)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid token")


def get_current_user(
    payload: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
) -> User:
    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid token type")
    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def require_roles(*roles: UserRole):
    def checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user

    return checker


@app.post("/api/auth/register")
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    exists = db.query(User).filter(User.email == payload.email).first()
    if exists:
        raise HTTPException(status_code=400, detail="User already exists")
    user = User(email=payload.email, password_hash=hash_password(payload.password), full_name=payload.full_name)
    db.add(user)
    db.commit()
    db.refresh(user)
    add_audit_log(db, user.id, "auth.register", {"email": user.email})
    return {"id": user.id, "email": user.email}


@app.post("/api/auth/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    tokens = {
        "access_token": create_token(str(user.id), "access", 30),
        "refresh_token": create_token(str(user.id), "refresh", 7 * 24 * 60),
    }
    add_audit_log(db, user.id, "auth.login")
    return tokens


@app.post("/api/auth/refresh")
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)):
    try:
        token_payload = decode_token(payload.refresh_token)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    if token_payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token type")
    user = db.query(User).filter(User.id == int(token_payload["sub"])).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    add_audit_log(db, user.id, "auth.refresh")
    return {"access_token": create_token(str(user.id), "access", 30)}


@app.post("/api/auth/logout")
def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    add_audit_log(db, current_user.id, "auth.logout")
    return {"status": "ok"}


@app.get("/api/auth/me")
def me(current_user: User = Depends(get_current_user)):
    return {"id": current_user.id, "email": current_user.email, "full_name": current_user.full_name, "role": current_user.role}


@app.get("/api/users")
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.owner, UserRole.admin)),
):
    users = db.query(User).order_by(User.id.desc()).all()
    return [{"id": u.id, "email": u.email, "full_name": u.full_name, "role": u.role, "is_active": u.is_active} for u in users]


@app.get("/api/users/{user_id}")
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.owner, UserRole.admin)),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"id": user.id, "email": user.email, "full_name": user.full_name, "role": user.role, "is_active": user.is_active}


@app.patch("/api/users/{user_id}")
def patch_user(
    user_id: int,
    payload: UserPatchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.owner, UserRole.admin)),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if payload.full_name is not None:
        user.full_name = payload.full_name
    if payload.role is not None:
        user.role = payload.role
    if payload.is_active is not None:
        user.is_active = payload.is_active
    db.commit()
    add_audit_log(db, current_user.id, "users.patch", {"user_id": user_id})
    return {"id": user.id, "role": user.role, "is_active": user.is_active}


@app.delete("/api/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.owner, UserRole.admin)),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    add_audit_log(db, current_user.id, "users.delete", {"user_id": user_id})
    return {"status": "deleted"}


@app.post("/api/onec/connections")
def create_connection(
    payload: ConnectionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.owner, UserRole.admin)),
):
    connection = OneCConnection(
        name=payload.name,
        connection_type=payload.connection_type,
        base_url=payload.base_url,
        username=payload.username,
        encrypted_password=hash_password(payload.password),
        database_name=payload.database_name,
    )
    db.add(connection)
    db.commit()
    db.refresh(connection)
    add_audit_log(db, current_user.id, "onec.connection.create", {"connection_id": connection.id})
    return {"id": connection.id, "name": connection.name}


@app.get("/api/onec/connections")
def list_connections(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    data = db.query(OneCConnection).all()
    return [{"id": c.id, "name": c.name, "type": c.connection_type} for c in data]


@app.get("/api/onec/connections/{connection_id}")
def get_connection(
    connection_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    connection = db.query(OneCConnection).filter(OneCConnection.id == connection_id).first()
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")
    return {
        "id": connection.id,
        "name": connection.name,
        "connection_type": connection.connection_type,
        "base_url": connection.base_url,
        "username": connection.username,
        "database_name": connection.database_name,
        "is_active": connection.is_active,
        "last_check_at": connection.last_check_at,
        "last_check_status": connection.last_check_status,
    }


@app.patch("/api/onec/connections/{connection_id}")
def patch_connection(
    connection_id: int,
    payload: ConnectionPatchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.owner, UserRole.admin)),
):
    connection = db.query(OneCConnection).filter(OneCConnection.id == connection_id).first()
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")
    if payload.name is not None:
        connection.name = payload.name
    if payload.base_url is not None:
        connection.base_url = payload.base_url
    if payload.username is not None:
        connection.username = payload.username
    if payload.password is not None:
        connection.encrypted_password = hash_password(payload.password)
    if payload.database_name is not None:
        connection.database_name = payload.database_name
    if payload.is_active is not None:
        connection.is_active = payload.is_active
    db.commit()
    add_audit_log(db, current_user.id, "onec.connection.patch", {"connection_id": connection_id})
    return {"id": connection.id, "name": connection.name, "is_active": connection.is_active}


@app.delete("/api/onec/connections/{connection_id}")
def delete_connection(
    connection_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.owner, UserRole.admin)),
):
    connection = db.query(OneCConnection).filter(OneCConnection.id == connection_id).first()
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")
    db.delete(connection)
    db.commit()
    add_audit_log(db, current_user.id, "onec.connection.delete", {"connection_id": connection_id})
    return {"status": "deleted"}


@app.post("/api/onec/connections/{connection_id}/check")
def check_connection(
    connection_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    connection = db.query(OneCConnection).filter(OneCConnection.id == connection_id).first()
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")
    result = MockOneCClient().check_connection()
    connection.last_check_status = result.get("status", "unknown")
    add_integration_log(db, connection_id, "check_connection", "success", {"connection_id": connection_id})
    add_audit_log(db, current_user.id, "onec.connection.check", {"connection_id": connection_id})
    db.commit()
    return result


@app.get("/api/onec/connections/{connection_id}/organizations")
def get_organizations(
    connection_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    connection = db.query(OneCConnection).filter(OneCConnection.id == connection_id).first()
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")
    orgs = MockOneCClient().get_organizations()
    add_integration_log(db, connection_id, "get_organizations", "success", {"connection_id": connection_id})
    add_audit_log(db, current_user.id, "onec.organizations.list", {"connection_id": connection_id})
    return orgs


@app.post("/api/diagnostics/runs")
def create_run(
    payload: DiagnosticRunRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.owner, UserRole.admin, UserRole.accountant)),
):
    run = DiagnosticRun(
        user_id=current_user.id,
        connection_id=payload.connection_id,
        organization_id=payload.organization_id,
        period_start=payload.period_start,
        period_end=payload.period_end,
        diagnostic_type=payload.diagnostic_type,
        status=DiagnosticStatus.pending.value,
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    run_diagnostic_task.delay(run.id)
    add_audit_log(db, current_user.id, "diagnostics.run.create", {"run_id": run.id})
    return {"run_id": run.id, "status": run.status}


@app.get("/api/diagnostics/runs")
def list_runs(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    runs = db.query(DiagnosticRun).order_by(DiagnosticRun.id.desc()).all()
    return [{"id": r.id, "status": r.status, "diagnostic_type": r.diagnostic_type, "progress_percent": r.progress_percent} for r in runs]


@app.get("/api/diagnostics/runs/{run_id}")
def get_run(run_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    run = db.query(DiagnosticRun).filter(DiagnosticRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return {
        "id": run.id,
        "status": run.status,
        "progress_percent": run.progress_percent,
        "summary": run.summary_json,
    }


@app.get("/api/diagnostics/runs/{run_id}/issues")
def get_run_issues(run_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    issues = db.query(DiagnosticIssue).filter(DiagnosticIssue.run_id == run_id).all()
    return [
        {
            "id": i.id,
            "title": i.title,
            "category": i.category,
            "severity": i.severity,
            "description": i.description,
            "detected_reason": i.detected_reason,
            "impact_map": i.impact_map_json,
            "fix_steps": i.fix_steps_json,
        }
        for i in issues
    ]


@app.get("/api/diagnostics/issues/{issue_id}")
def get_issue(issue_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    issue = db.query(DiagnosticIssue).filter(DiagnosticIssue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    return {
        "id": issue.id,
        "run_id": issue.run_id,
        "title": issue.title,
        "category": issue.category,
        "severity": issue.severity,
        "description": issue.description,
        "detected_reason": issue.detected_reason,
        "evidence": issue.evidence_json,
        "impact_map": issue.impact_map_json,
        "fix_steps": issue.fix_steps_json,
        "status": issue.status,
    }


def update_issue_status(issue_id: int, status: str, db: Session, current_user: User):
    issue = db.query(DiagnosticIssue).filter(DiagnosticIssue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    issue.status = status
    db.commit()
    add_audit_log(db, current_user.id, "diagnostics.issue.status", {"issue_id": issue_id, "status": status})
    return {"id": issue.id, "status": issue.status}


@app.post("/api/diagnostics/issues/{issue_id}/mark-fixed")
def mark_fixed(issue_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return update_issue_status(issue_id, "fixed", db, current_user)


@app.post("/api/diagnostics/issues/{issue_id}/ignore")
def ignore_issue(issue_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return update_issue_status(issue_id, "ignored", db, current_user)


@app.post("/api/diagnostics/issues/{issue_id}/false-positive")
def false_positive(issue_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return update_issue_status(issue_id, "false_positive", db, current_user)


@app.post("/api/diagnostics/runs/{run_id}/rerun")
def rerun(run_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    run = db.query(DiagnosticRun).filter(DiagnosticRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    new_run = DiagnosticRun(
        user_id=current_user.id,
        connection_id=run.connection_id,
        organization_id=run.organization_id,
        period_start=run.period_start,
        period_end=run.period_end,
        diagnostic_type=run.diagnostic_type,
        status=DiagnosticStatus.pending.value,
    )
    db.add(new_run)
    db.commit()
    db.refresh(new_run)
    run_diagnostic_task.delay(new_run.id)
    add_audit_log(db, current_user.id, "diagnostics.run.rerun", {"source_run_id": run.id, "new_run_id": new_run.id})
    return {"run_id": new_run.id, "status": new_run.status}


@app.post("/api/ai-assistant/runs")
def create_ai_assistant_run(
    payload: AIAssistantCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.owner, UserRole.admin, UserRole.accountant)),
):
    issue = db.query(DiagnosticIssue).filter(DiagnosticIssue.id == payload.issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    context = {
        "issue": {
            "id": issue.id,
            "title": issue.title,
            "description": issue.description,
            "detected_reason": issue.detected_reason,
            "category": issue.category,
            "severity": issue.severity,
            "account_code": issue.account_code,
            "evidence": issue.evidence_json,
        }
    }
    model_name, plan = asyncio.run(generate_correction_plan(context=context, model_name=payload.model_name))
    ai_run = AIAssistantRun(
        issue_id=issue.id,
        user_id=current_user.id,
        input_context_json=context,
        model_name=model_name,
        output_plan_json=plan,
        status="completed",
    )
    db.add(ai_run)
    db.commit()
    db.refresh(ai_run)
    plan_row = CorrectionPlan(
        issue_id=issue.id,
        title=plan.get("title", "Correction plan"),
        description=plan.get("description", ""),
        risk_level=plan.get("risk_level", "medium"),
        requires_confirmation=bool(plan.get("requires_confirmation", True)),
        requires_backup=bool(plan.get("requires_backup", False)),
        actions_json=plan.get("actions", []),
        status="draft",
    )
    db.add(plan_row)
    db.commit()
    db.refresh(plan_row)

    for action in plan.get("actions", []):
        action_type = action.get("action_type")
        if action_type in ALLOWED_ACTION_TYPES:
            db.add(CorrectionAction(plan_id=plan_row.id, action_type=action_type, payload_json=action.get("payload_json", {})))
    db.commit()
    add_audit_log(db, current_user.id, "ai_assistant.run.create", {"issue_id": issue.id, "run_id": ai_run.id, "plan_id": plan_row.id})
    return {"run_id": ai_run.id, "plan_id": plan_row.id, "model_name": ai_run.model_name, "status": ai_run.status}


@app.get("/api/ai-assistant/runs/{run_id}")
def get_ai_assistant_run(run_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    run = db.query(AIAssistantRun).filter(AIAssistantRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="AI run not found")
    return {
        "id": run.id,
        "issue_id": run.issue_id,
        "user_id": run.user_id,
        "model_name": run.model_name,
        "output_plan": run.output_plan_json,
        "status": run.status,
        "created_at": run.created_at,
    }


@app.get("/api/correction-plans/{plan_id}")
def get_correction_plan(plan_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    plan = db.query(CorrectionPlan).filter(CorrectionPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    actions = db.query(CorrectionAction).filter(CorrectionAction.plan_id == plan.id).all()
    return {
        "id": plan.id,
        "issue_id": plan.issue_id,
        "title": plan.title,
        "description": plan.description,
        "risk_level": plan.risk_level,
        "requires_confirmation": plan.requires_confirmation,
        "requires_backup": plan.requires_backup,
        "status": plan.status,
        "actions": [{"id": a.id, "action_type": a.action_type, "payload_json": a.payload_json, "status": a.status} for a in actions],
    }


@app.post("/api/correction-plans/{plan_id}/confirm")
def confirm_correction_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.owner, UserRole.admin, UserRole.accountant)),
):
    plan = db.query(CorrectionPlan).filter(CorrectionPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    plan.status = "confirmed"
    actions = db.query(CorrectionAction).filter(CorrectionAction.plan_id == plan.id).all()
    for action in actions:
        action.status = "prepared"
    db.commit()
    add_audit_log(db, current_user.id, "correction_plan.confirm", {"plan_id": plan_id})
    return {"id": plan.id, "status": plan.status}


@app.post("/api/correction-plans/{plan_id}/reject")
def reject_correction_plan(plan_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    plan = db.query(CorrectionPlan).filter(CorrectionPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    plan.status = "rejected"
    db.commit()
    add_audit_log(db, current_user.id, "correction_plan.reject", {"plan_id": plan_id})
    return {"id": plan.id, "status": plan.status}


@app.post("/api/diagnostics/pre-month-close")
def pre_month_close(payload: DiagnosticRunRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    payload.diagnostic_type = "pre_month_close"
    return create_run(payload, db, current_user)


@app.post("/api/diagnostics/post-month-close")
def post_month_close(payload: DiagnosticRunRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    payload.diagnostic_type = "post_month_close"
    return create_run(payload, db, current_user)


@app.get("/api/manual-operations")
def manual_operations(
    connection_id: int,
    organization_id: str,
    period_start: date,
    period_end: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    add_integration_log(db, connection_id, "get_manual_operations", "success")
    return MockOneCClient().get_manual_operations(organization_id, period_start, period_end)


@app.get("/api/missing-analytics")
def missing_analytics(
    connection_id: int,
    organization_id: str,
    period_start: date,
    period_end: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    add_integration_log(db, connection_id, "get_documents", "success")
    docs = MockOneCClient().get_documents(organization_id, period_start, period_end, {})
    return [d for d in docs if d.get("missing_analytics")]


@app.get("/api/accounting-policy")
def accounting_policy(
    connection_id: int,
    organization_id: str,
    period: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    add_integration_log(db, connection_id, "get_accounting_policy", "success")
    return MockOneCClient().get_accounting_policy(organization_id, period)


@app.get("/api/reports/diagnostic-runs/{run_id}/html", response_class=HTMLResponse)
def report_html(
    run_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    run = db.query(DiagnosticRun).filter(DiagnosticRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    issues = db.query(DiagnosticIssue).filter(DiagnosticIssue.run_id == run_id).all()
    rows = "".join(
        [
            f"<tr><td>{i.severity}</td><td>{i.category}</td><td>{i.title}</td><td>{i.detected_reason}</td><td>{i.status}</td></tr>"
            for i in issues
        ]
    )
    html = f"""
    <html>
      <head><meta charset="utf-8"><title>Diagnostic report #{run.id}</title></head>
      <body>
        <h1>Отчет диагностики #{run.id}</h1>
        <p>Организация: {run.organization_id}</p>
        <p>Период: {run.period_start} - {run.period_end}</p>
        <p>Статус: {run.status}</p>
        <h2>Проблемы</h2>
        <table border="1" cellspacing="0" cellpadding="6">
          <thead><tr><th>Критичность</th><th>Категория</th><th>Проблема</th><th>Причина</th><th>Статус</th></tr></thead>
          <tbody>{rows}</tbody>
        </table>
      </body>
    </html>
    """
    add_audit_log(db, current_user.id, "reports.run.html", {"run_id": run_id})
    return HTMLResponse(content=html)


@app.get("/api/knowledge")
def knowledge_list(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rows = db.query(KnowledgeArticle).order_by(KnowledgeArticle.id.desc()).all()
    return [{"id": x.id, "title": x.title, "slug": x.slug, "category": x.category, "tags": x.tags} for x in rows]


@app.get("/api/knowledge/{slug}")
def knowledge_get(slug: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    row = db.query(KnowledgeArticle).filter(KnowledgeArticle.slug == slug).first()
    if not row:
        raise HTTPException(status_code=404, detail="Article not found")
    return {
        "id": row.id,
        "title": row.title,
        "slug": row.slug,
        "category": row.category,
        "symptoms": row.symptoms,
        "causes": row.causes,
        "checks": row.checks,
        "fix_steps": row.fix_steps,
        "tags": row.tags,
    }


@app.post("/api/knowledge")
def knowledge_create(
    payload: KnowledgeArticleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.owner, UserRole.admin, UserRole.onec_specialist)),
):
    exists = db.query(KnowledgeArticle).filter(KnowledgeArticle.slug == payload.slug).first()
    if exists:
        raise HTTPException(status_code=400, detail="Article slug already exists")
    row = KnowledgeArticle(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    add_audit_log(db, current_user.id, "knowledge.create", {"article_id": row.id})
    return {"id": row.id, "slug": row.slug}


@app.patch("/api/knowledge/{article_id}")
def knowledge_patch(
    article_id: int,
    payload: KnowledgeArticlePatchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.owner, UserRole.admin, UserRole.onec_specialist)),
):
    row = db.query(KnowledgeArticle).filter(KnowledgeArticle.id == article_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Article not found")
    data = payload.model_dump(exclude_none=True)
    for key, value in data.items():
        setattr(row, key, value)
    db.commit()
    add_audit_log(db, current_user.id, "knowledge.patch", {"article_id": article_id})
    return {"id": row.id, "slug": row.slug}


@app.delete("/api/knowledge/{article_id}")
def knowledge_delete(
    article_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.owner, UserRole.admin)),
):
    row = db.query(KnowledgeArticle).filter(KnowledgeArticle.id == article_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Article not found")
    db.delete(row)
    db.commit()
    add_audit_log(db, current_user.id, "knowledge.delete", {"article_id": article_id})
    return {"status": "deleted"}


@app.get("/api/audit/logs")
def audit_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.owner, UserRole.admin, UserRole.auditor)),
):
    logs = db.query(AuditLog).order_by(AuditLog.id.desc()).limit(500).all()
    return [{"id": l.id, "user_id": l.user_id, "action": l.action, "payload": l.payload_json, "created_at": l.created_at} for l in logs]


@app.get("/api/integration/logs")
def integration_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.owner, UserRole.admin, UserRole.onec_specialist)),
):
    logs = db.query(OneCIntegrationLog).order_by(OneCIntegrationLog.id.desc()).limit(500).all()
    return [{"id": l.id, "connection_id": l.connection_id, "method": l.method, "status": l.status, "created_at": l.created_at} for l in logs]
