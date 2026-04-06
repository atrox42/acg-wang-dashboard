from __future__ import annotations

import hashlib
import hmac
from datetime import datetime
from typing import Annotated
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Header, HTTPException, Query, Request, UploadFile
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.database import get_db
from app.schemas.dashboard import DashboardOut, RecommendationActionInput, SeedInput
from app.services.csv_import import parse_snapshot_csv
from app.services.dashboard import build_dashboard_payload
from app.services.live_dashboard import (
    import_snapshot_rows,
    save_recommendation_action_live,
    save_seed_values,
)
from app.tasks.recalculate import recalculate_daily_scores

router = APIRouter(prefix="/api")


@router.get("/health")
def healthcheck():
    return {"status": "ok", "mock_mode": settings.mock_data_mode}


@router.get("/dashboard", response_model=DashboardOut)
def get_dashboard(
    days: Annotated[int, Query(ge=7, le=90)] = 30,
    username: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    return build_dashboard_payload(days, username=username, db=db)


@router.post("/cleanup/import-snapshot")
async def import_snapshot(
    snapshot_type: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if snapshot_type not in {"followers", "following"}:
        raise HTTPException(status_code=400, detail="snapshot_type must be followers or following")

    try:
        rows = parse_snapshot_csv(await file.read())
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    if not settings.mock_data_mode:
        return import_snapshot_rows(db, snapshot_type, file.filename or f"{snapshot_type}.csv", rows)

    return {
        "snapshot_id": f"snap_{uuid4().hex[:12]}",
        "snapshot_type": snapshot_type,
        "imported_rows": len(rows),
        "filename": file.filename,
        "mock_mode": settings.mock_data_mode,
    }


@router.get("/cleanup/export/unfollow-candidates", response_class=PlainTextResponse)
def export_unfollow_candidates(days: Annotated[int, Query(ge=7, le=90)] = 30, db: Session = Depends(get_db)):
    payload = build_dashboard_payload(days, db=db)
    rows = [item for item in payload["cleanup_accounts"] if item["bucket"] == "unfollow"]
    lines = [
        "account_id,username,full_name,interaction_score,last_interaction_at,comments_last_30_days,repeated_comments"
    ]
    for row in rows:
        last_interaction = row["last_interaction_at"]
        lines.append(
            ",".join(
                [
                    row["account_id"],
                    row["username"],
                    row["full_name"],
                    str(row["interaction_score"]),
                    last_interaction.isoformat()
                    if hasattr(last_interaction, "isoformat")
                    else str(last_interaction),
                    str(row["comments_last_30_days"]),
                    str(row["repeated_comments"]),
                ]
            )
        )
    return "\n".join(lines)


@router.post("/recommendations/seeds")
def save_seeds(payload: SeedInput, db: Session = Depends(get_db)):
    if not settings.mock_data_mode:
        return save_seed_values(db, payload.seed_accounts, payload.hashtags)

    return {
        "saved_seed_accounts": len(payload.seed_accounts),
        "saved_hashtags": len(payload.hashtags),
        "mock_mode": settings.mock_data_mode,
    }


@router.get("/recommendations/daily-top")
def get_daily_top(
    limit: Annotated[int, Query(ge=1, le=50)] = 50,
    username: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    dashboard = build_dashboard_payload(30, username=username, db=db)
    return {"items": dashboard["recommendations"][:limit], "generated_at": datetime.utcnow().isoformat()}


@router.post("/recommendations/actions")
def save_recommendation_action(payload: RecommendationActionInput, db: Session = Depends(get_db)):
    if not settings.mock_data_mode:
        try:
            return save_recommendation_action_live(db, payload.recommendation_id, payload.action)
        except ValueError as error:
            raise HTTPException(status_code=404, detail=str(error)) from error

    return {
        "recommendation_id": payload.recommendation_id,
        "action": payload.action,
        "saved": True,
    }


@router.get("/webhooks/instagram/comments")
def verify_instagram_webhook(
    hub_mode: str = Query(alias="hub.mode"),
    hub_verify_token: str = Query(alias="hub.verify_token"),
    hub_challenge: str = Query(alias="hub.challenge"),
):
    if hub_mode != "subscribe" or hub_verify_token != settings.instagram_verify_token:
        raise HTTPException(status_code=403, detail="Webhook verification failed")
    return PlainTextResponse(content=hub_challenge)


def _verify_signature(signature: str | None, body: bytes) -> None:
    if settings.mock_data_mode:
        return
    if not signature or not settings.instagram_app_secret:
        raise HTTPException(status_code=401, detail="Missing signature")

    expected = "sha256=" + hmac.new(
        settings.instagram_app_secret.encode("utf-8"),
        msg=body,
        digestmod=hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(signature, expected):
        raise HTTPException(status_code=401, detail="Invalid signature")


@router.post("/webhooks/instagram/comments")
async def ingest_instagram_comments_webhook(
    request: Request,
    x_hub_signature_256: Annotated[str | None, Header()] = None,
    db: Session = Depends(get_db),
):
    body = await request.body()
    _verify_signature(x_hub_signature_256, body)
    payload = await request.json()

    return {
        "received": True,
        "mock_mode": settings.mock_data_mode,
        "entries": len(payload.get("entry", [])),
    }


@router.post("/jobs/recalculate")
def run_recalculation():
    return recalculate_daily_scores()
