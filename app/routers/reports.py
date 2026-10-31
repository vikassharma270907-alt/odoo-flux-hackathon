"""Finance reporting endpoints for the finance lead's dashboard."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_staff
from app.services.reporting import finance_summary

router = APIRouter(prefix="/api/v1/reports", tags=["reports"])


@router.get("/summary")
def summary(db: Session = Depends(get_db), _=Depends(require_staff)):
    return {"data": finance_summary(db)}
