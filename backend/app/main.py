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
    reports
)

# Instantiate the FastAPI Application
app = FastAPI(
    title="CampusSync API",
    description="Production-grade REST backend for Smart Multi-Modal Attendance & Campus Management System",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# Configure Cross-Origin Resource Sharing (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_origin_regex=r"^https?://.*$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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

# Also mount direct root aliases for seamless client routing compatibility
app.include_router(auth.router)
app.include_router(attendance.router)
app.include_router(devices.router)
app.include_router(students.router)
app.include_router(teachers.router)
app.include_router(admin.router)
app.include_router(reports.router)
