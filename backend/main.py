from fastapi import FastAPI, Request
from contextlib import asynccontextmanager
from datetime import datetime, UTC

from fastapi.exceptions import (
    HTTPException,
    RequestValidationError
)
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.database.indexes import create_indexes
from app.database.mongodb import db

from app.core.exception_handler import (
    http_exception_handler,
    global_exception_handler,
    validation_exception_handler
)

from fastapi.middleware.cors import (
    CORSMiddleware
)
from fastapi.staticfiles import StaticFiles

from app.routes.product_routes import router as product_router
from app.routes.user_routes import router as user_router
from app.routes.auth_routes import router as auth_router
from app.routes.purchase_routes import router as purchase_router
from app.routes.manufacturing_routes import router as manufacturing_router
from app.routes.sale_routes import router as sale_router
from app.routes.invoice_routes import router as invoice_router
from app.routes.return_exchange_routes import (
    exchange_router,
    return_router,
)
from app.routes.stock_routes import router as stock_router
from app.routes.audit_routes import router as audit_router
from app.routes.dashboard_routes import router as dashboard_router
from app.routes.supplier_routes import router as supplier_router
from app.routes.notification_routes import router as notification_router
from app.routes.mailer_routes import router as mailer_router
from app.routes.api_logs import router as api_logs_router
from app.routes.company_routes import router as company_router
from app.routes.loyalty_routes import router as loyalty_router
from app.routes.maintenance_routes import router as maintenance_router
from app.routes.admin_access_routes import router as admin_access_router
from app.middleware.api_logger import ApiLoggingMiddleware
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.middleware.request_size import RequestSizeLimitMiddleware
from app.middleware.maintenance import MaintenanceModeMiddleware
from app.services.company_service import get_company_brand_name
from app.services.api_log_service import redact_sensitive_api_log_headers
from app.utils.settings import Settings
from app.utils.response import failure_response
from fastapi.responses import JSONResponse
from pathlib import Path

STARTED_AT = datetime.now(UTC)

Settings.validate_security_configuration()

# STARTUP EVENT


@asynccontextmanager
async def lifespan(app: FastAPI):
    brand_name = await get_company_brand_name()
    app.title = f"{brand_name} Inventory API"
    print(f"\n🚀 Starting up the {brand_name} Inventory API...\n")
    await create_indexes()
    await redact_sensitive_api_log_headers()
    yield
    brand_name = await get_company_brand_name()
    print(f"\n🛑 Shutting down the {brand_name} Inventory API...\n")


app = FastAPI(
    title=f"{Settings.DEFAULT_BRAND_NAME} Inventory API",
    lifespan=lifespan,
    docs_url="/docs" if Settings.API_DOCS_ENABLED else None,
    redoc_url="/redoc" if Settings.API_DOCS_ENABLED else None,
    openapi_url="/openapi.json" if Settings.API_DOCS_ENABLED else None,
)

app.add_middleware(MaintenanceModeMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=Settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Accept", "Content-Type", "X-CSRF-Token"],
)

app.add_middleware(ApiLoggingMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestSizeLimitMiddleware)

upload_dir = Path(Settings.UPLOAD_DIR)
upload_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(upload_dir)), name="uploads")

app.add_exception_handler(
    HTTPException,
    http_exception_handler
)

app.add_exception_handler(
    StarletteHTTPException,
    http_exception_handler
)

app.add_exception_handler(
    RequestValidationError,
    validation_exception_handler
)

app.add_exception_handler(
    Exception,
    global_exception_handler
)


# ROUTERS
app.include_router(dashboard_router)
app.include_router(product_router)
app.include_router(supplier_router)
app.include_router(stock_router)
app.include_router(purchase_router)
app.include_router(manufacturing_router)
app.include_router(sale_router)
app.include_router(invoice_router)
app.include_router(return_router)
app.include_router(exchange_router)
app.include_router(audit_router)
app.include_router(api_logs_router)
app.include_router(company_router)
app.include_router(loyalty_router)
app.include_router(user_router)
app.include_router(notification_router)
app.include_router(mailer_router)
app.include_router(auth_router)
app.include_router(maintenance_router)
app.include_router(admin_access_router)

# ROOT


@app.get("/")
async def root():
    brand_name = await get_company_brand_name()
    return {
        "message": f"Welcome to the {brand_name} Inventory API!",
        "documentation": "Use /docs for API documentation."
    }

# HEALTH CHECK


@app.get("/health")
async def health_check():
    now = datetime.now(UTC)
    checks = {
        "api": "ok",
        "database": "ok",
    }
    status_code = 200
    status = "ok"

    try:
        await db.command("ping")
    except Exception:
        checks["database"] = "down"
        status = "down"
        status_code = 503

    return JSONResponse(
        status_code=status_code,
        content={
            "status": status,
            "service": f"{await get_company_brand_name()} Inventory API",
            "environment": Settings.ENVIRONMENT,
            "timestamp": now.isoformat(),
            "uptime_seconds": int((now - STARTED_AT).total_seconds()),
            "checks": checks,
        },
    )


@app.api_route(
    "/{path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
)
async def route_not_found(request: Request, path: str):
    return failure_response(
        message="API endpoint not found",
        status_code=404,
        data={
            "method": request.method,
            "path": f"/{path}",
        },
    )
