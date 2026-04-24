from datetime import datetime

from app.common.enums import DiagnosticStatus
from app.database import SessionLocal
from app.diagnostics.checks import DiagnosticContext
from app.diagnostics.engine import DiagnosticEngine
from app.models import DiagnosticIssue, DiagnosticRun
from app.onec.mock_client import MockOneCClient
from app.worker import celery_app


@celery_app.task(name="run_diagnostic_task")
def run_diagnostic_task(run_id: int):
    db = SessionLocal()
    try:
        run = db.query(DiagnosticRun).filter(DiagnosticRun.id == run_id).first()
        if not run:
            return

        run.status = DiagnosticStatus.running
        run.started_at = datetime.utcnow()
        run.progress_percent = 10
        db.commit()

        context = DiagnosticContext(
            onec_client=MockOneCClient(),
            organization_id=run.organization_id,
            period_start=run.period_start,
            period_end=run.period_end,
            user_id=run.user_id,
            diagnostic_type=run.diagnostic_type,
            settings={},
        )
        issues = DiagnosticEngine().run(context)
        run.progress_percent = 70
        db.commit()

        for issue in issues:
            db.add(DiagnosticIssue(run_id=run.id, **issue))

        run.status = DiagnosticStatus.completed
        run.progress_percent = 100
        run.finished_at = datetime.utcnow()
        run.summary_json = {"issues_count": len(issues)}
        db.commit()
    except Exception as exc:
        run = db.query(DiagnosticRun).filter(DiagnosticRun.id == run_id).first()
        if run:
            run.status = DiagnosticStatus.failed
            run.error_message = "Diagnostic task failed"
            run.finished_at = datetime.utcnow()
            db.commit()
        raise exc
    finally:
        db.close()
