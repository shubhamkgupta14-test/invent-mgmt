from datetime import datetime, UTC
from app.utils.helpers import format_datetime_ist
from app.database.mongodb import db

from app.utils.helpers import (
    round_final_amount
)

from app.models.auth import UserRole
from app.core.exceptions import forbidden

stocks_collection = db.stocks
purchase_collection = db.purchases
sales_collection = db.sales


async def get_dashboard_summary(auth_user: dict):

    if auth_user.get("role") not in [
        UserRole.SUPERADMIN,
        UserRole.ADMIN,
        UserRole.USER
    ]:
        forbidden()

    # INVENTORY
    total_products = await stocks_collection.count_documents({})

    low_stock_products = await stocks_collection.count_documents({
        "stock_status": "LOW_QUANTITY"
    })

    out_of_stock_products = await stocks_collection.count_documents({
        "stock_status": "OUT_OF_STOCK"
    })

    total_inventory_value = 0
    total_stock_quantity = 0

    async for stock in stocks_collection.find():

        total_inventory_value += stock.get(
            "inventory_value",
            0
        )

        total_stock_quantity += stock.get(
            "quantity",
            0
        )

    # PURCHASES
    total_purchase_amount = 0
    today_purchase_amount = 0
    monthly_purchase_amount = 0

    # SALES
    total_sales_amount = 0
    today_sales_amount = 0
    monthly_sales_amount = 0

    total_orders = await sales_collection.count_documents({})

    now = datetime.now(UTC)
    current_year = now.year
    current_month = now.month
    current_day = now.date()

    # PURCHASE CALCULATIONS
    async for purchase in purchase_collection.find():

        amount = purchase.get(
            "final_total_amount",
            0
        )

        total_purchase_amount += amount

        created_at = purchase.get(
            "created_at"
        )

        if created_at:

            if created_at.date() == current_day:
                today_purchase_amount += amount

            if (
                created_at.year == current_year
                and created_at.month == current_month
            ):
                monthly_purchase_amount += amount

    # SALES CALCULATIONS
    async for sale in sales_collection.find():

        amount = sale.get(
            "final_total_amount",
            0
        )

        total_sales_amount += amount

        created_at = sale.get(
            "created_at"
        )

        if created_at:
            if created_at.date() == current_day:
                today_sales_amount += amount

            if (
                created_at.year == current_year
                and created_at.month == current_month
            ):
                monthly_sales_amount += amount

    return {
        "inventory": {
            "total_products": total_products,
            "total_inventory_value": round_final_amount(
                total_inventory_value
            ),
            "total_stock_quantity": total_stock_quantity,
            "low_stock_products": low_stock_products,
            "out_of_stock_products": out_of_stock_products
        },

        "purchases": {
            "total_purchase_amount": round_final_amount(
                total_purchase_amount
            ),
            "today_purchases": round_final_amount(
                today_purchase_amount
            ),
            "monthly_purchases": round_final_amount(
                monthly_purchase_amount
            )
        },

        "sales": {
            "total_sales_amount": round_final_amount(
                total_sales_amount
            ),
            "today_sales": round_final_amount(
                today_sales_amount
            ),
            "monthly_sales": round_final_amount(
                monthly_sales_amount
            ),
            "total_orders": total_orders
        }
    }


async def get_low_stock_products(auth_user: dict):

    if auth_user.get("role") not in [
        UserRole.SUPERADMIN,
        UserRole.ADMIN,
        UserRole.USER
    ]:
        forbidden()

    products = []

    async for stock in stocks_collection.find({
        "stock_status": "LOW_QUANTITY"
    }):

        products.append({
            "sku": stock.get("sku"),
            "name": stock.get("name"),
            "quantity": stock.get("quantity"),
            "stock_status": stock.get(
                "stock_status"
            )
        })

    return products


async def get_recent_purchases(auth_user: dict):

    if auth_user.get("role") not in [
        UserRole.SUPERADMIN,
        UserRole.ADMIN,
        UserRole.USER
    ]:
        forbidden()

    purchases = []

    async for purchase in purchase_collection.find().sort(
        "created_at",
        -1
    ).limit(5):

        purchases.append({
            "invoice_id": purchase.get(
                "invoice_id"
            ),
            "supplier_id": purchase.get(
                "supplier_id"
            ),
            "final_total_amount": purchase.get(
                "final_total_amount"
            ),
            "created_at": format_datetime_ist(purchase.get(
                "created_at"
            ))
        })
    return purchases


async def get_recent_sales(auth_user: dict):

    if auth_user.get("role") not in [
        UserRole.SUPERADMIN,
        UserRole.ADMIN,
        UserRole.USER
    ]:
        forbidden()

    sales = []

    async for sale in sales_collection.find().sort(
        "created_at",
        -1
    ).limit(5):
        sales.append({
            "invoice_id": sale.get(
                "invoice_id"
            ),
            "final_total_amount": sale.get(
                "final_total_amount"
            ),
            "created_at": format_datetime_ist(sale.get(
                "created_at"
            ))
        })
    return sales
