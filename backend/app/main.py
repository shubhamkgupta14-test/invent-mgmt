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

from app.routes.products import router as product_router
from app.routes.users import router as user_router
from app.routes.auth_route import router as auth_router
from app.routes.purchases import router as purchase_router
from app.routes.sales import router as sale_router
from app.routes.stocks import router as stock_router
from app.routes.audit_routes import router as audit_router

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
app.include_router(product_router)
app.include_router(stock_router)
app.include_router(purchase_router)
app.include_router(sale_router)
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
