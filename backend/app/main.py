"""FastAPI application entry point."""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.storage import initialize_default_policies
from app.api.routes import webhooks, rooms, moderation, policies, audit
from app.api.websocket import router as websocket_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup
    await initialize_default_policies()
    print("Initialized default policies")
    yield
    # Shutdown
    print("Shutting down...")


settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    description="AI-driven moderation console for LiveKit rooms",
    version="0.1.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(webhooks.router, prefix="/api/webhooks", tags=["webhooks"])
app.include_router(rooms.router, prefix="/api/rooms", tags=["rooms"])
app.include_router(moderation.router, prefix="/api/moderation", tags=["moderation"])
app.include_router(policies.router, prefix="/api/policies", tags=["policies"])
app.include_router(audit.router, prefix="/api/audit", tags=["audit"])
app.include_router(websocket_router, tags=["websocket"])


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": settings.app_name,
        "version": "0.1.0",
        "status": "running",
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )
