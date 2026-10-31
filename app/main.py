"""Brightloop Subscription Management System — FastAPI entrypoint."""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

from app.config import settings
from app.database import Base, SessionLocal, engine
from app.routers import auth, billing, catalog, reports, subscriptions, web
from app.seed import seed

templates = Jinja2Templates(directory="app/templates")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables and seed a demo dataset on startup.
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed(db)
    finally:
        db.close()
    yield


app = FastAPI(title=settings.app_name, version="1.0.0", lifespan=lifespan)

app.include_router(auth.router)
app.include_router(catalog.router)
app.include_router(subscriptions.router)
app.include_router(billing.router)
app.include_router(reports.router)
app.include_router(web.router)


@app.get("/health", tags=["system"])
def health():
    return {"status": "ok", "app": settings.app_name}


@app.get("/", response_class=HTMLResponse, tags=["portal"])
def portal(request: Request):
    """Minimal portal landing page describing the system and quick links."""
    return templates.TemplateResponse(request, "index.html", {"app_name": settings.app_name})
