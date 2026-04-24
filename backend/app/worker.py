from celery import Celery

from app.config import settings

celery_app = Celery("onec_diagnostic", broker=settings.redis_url, backend=settings.redis_url)
celery_app.conf.update(task_track_started=True, imports=("app.diagnostics.tasks",))
