import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.middleware.logging import RequestLoggingMiddleware
from app.routers import health, notes, patients, stats, summary
from app.settings import get_settings


def create_app() -> FastAPI:
    settings = get_settings()
    logging.basicConfig(
        level=settings.log_level,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    app = FastAPI(
        title="Ascertain API",
        version="0.1.0",
    )
    app.add_middleware(RequestLoggingMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(health.router)
    app.include_router(patients.router)
    app.include_router(notes.router)
    app.include_router(summary.router)
    app.include_router(stats.router)
    return app


app = create_app()
