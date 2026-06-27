from fastapi import FastAPI
from contextlib import asynccontextmanager

from app.seeds.superadmin_seed import create_default_superadmin
from fastapi.exceptions import (
    HTTPException,
    RequestValidationError
)

from app.database.indexes import create_indexes

from app.core.exception_handler import (
    http_exception_handler,
    global_exception_handler,
    validation_exception_handler
)

from fastapi.middleware.cors import (
    CORSMiddleware
)

from app.routes.product_routes import router as product_router
from app.routes.user_routes import router as user_router
from app.routes.auth_routes import router as auth_router
from app.routes.purchase_routes import router as purchase_router
from app.routes.sale_routes import router as sale_router
from app.routes.return_exchange_routes import (
    exchange_router,
    return_router,
)
from app.routes.stock_routes import router as stock_router
from app.routes.audit_routes import router as audit_router
from app.routes.dashboard_routes import router as dashboard_router
from app.routes.supplier_routes import router as supplier_router

# STARTUP EVENT


@asynccontextmanager
async def lifespan(app: FastAPI):
    # create_default_superadmin()
    print("Starting up the Inventory Management API...")
    await create_indexes()
    await create_default_superadmin()
    yield
    print("Shutting down the Inventory Management API...")


app = FastAPI(
    title="Inventory Management API",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://your-frontend.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(
    HTTPException,
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
app.include_router(sale_router)
app.include_router(return_router)
app.include_router(exchange_router)
app.include_router(audit_router)
app.include_router(user_router)
app.include_router(auth_router)

# ROOT


@app.get("/")
async def root():
    return {
        "message": "Welcome to the Inventory Management API!",
        "documentation": "Use /docs for API documentation."
    }

# HEALTH CHECK


@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "message": "API is healthy and running."
    }
