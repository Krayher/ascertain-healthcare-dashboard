from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import health, notes, patients, stats, summary
from app.settings import get_settings


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Ascertain API",
        version="0.1.0",
        openapi_url="/api/v1/openapi.json",
        docs_url="/api/v1/docs",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(health.router, prefix="/api/v1")
    app.include_router(patients.router, prefix="/api/v1")
    app.include_router(notes.router, prefix="/api/v1")
    app.include_router(summary.router, prefix="/api/v1")
    app.include_router(stats.router, prefix="/api/v1")
    return app


app = create_app()
