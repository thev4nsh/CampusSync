from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from app.config import settings
from app.routers import (
    auth,
    students,
    teachers,
    admin,
    attendance,
    devices,
    reports,
    learning,
    announcements,
    academics,
    registration,
)

# Instantiate the FastAPI Application
app = FastAPI(
    title="CampusSync API",
    description="Production-grade REST backend for Smart Multi-Modal Attendance & Campus Management System",
    version="1.0.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    openapi_url="/openapi.json" if settings.DEBUG else None,
)

# Configure Cross-Origin Resource Sharing (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    # Development also accepts loopback and private-LAN origins (phone testing on Wi-Fi)
    # without opening the API to every site on the internet.
    allow_origin_regex=(
        r"^https?://(localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|"
        r"192\.168\.\d{1,3}\.\d{1,3}|"
        r"172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|"
        r"[a-z0-9-]+\.local)(:\d+)?$"
        if settings.ENVIRONMENT == "development"
        else None
    ),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Accept", "Authorization", "Content-Type", "X-Device-ID", "X-Device-Key"],
)


# Global Exception Handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Format request validation errors into a clean user-friendly JSON shape."""
    formatted_errors = []
    for err in exc.errors():
        field = " -> ".join(str(loc) for loc in err["loc"] if loc != "body")
        formatted_errors.append({"field": field or "body", "message": err["msg"]})
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": formatted_errors, "message": "Validation error on request parameters."}
    )


# Root Health & Metadata Endpoint
@app.get("/", tags=["System"])
def root():
    return {
        "app": settings.APP_NAME,
        "status": "online",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT,
        "docs": "/docs",
        "redoc": "/redoc"
    }


# Include Routers under standard /api prefix
api_prefix = "/api"

app.include_router(auth.router, prefix=api_prefix)
app.include_router(students.router, prefix=api_prefix)
app.include_router(teachers.router, prefix=api_prefix)
app.include_router(admin.router, prefix=api_prefix)
app.include_router(attendance.router, prefix=api_prefix)
app.include_router(devices.router, prefix=api_prefix)
app.include_router(reports.router, prefix=api_prefix)
app.include_router(academics.router, prefix=api_prefix)
app.include_router(registration.router, prefix=api_prefix)

# Every router is mounted exactly once under /api. The browser client normalizes
# all request paths to this prefix, so the old root aliases only duplicated the
# OpenAPI document and widened the public surface.
app.include_router(learning.materials_router, prefix=api_prefix)
app.include_router(learning.ai_router, prefix=api_prefix)
app.include_router(announcements.router, prefix=api_prefix)
