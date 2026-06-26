from datetime import datetime, UTC, timedelta
from app.utils.helpers import format_datetime_iso
from app.database.mongodb import db

from app.utils.helpers import (
    round_final_amount
)

from app.models.auth import UserRole
from app.core.exceptions import forbidden

stocks_collection = db.stocks
purchase_collection = db.purchases
sales_collection = db.sales
products_collection = db.products


def calculate_percentage_change(current, previous):

    if previous == 0 and current == 0:
        return {
            "percentage": 0,
            "status": "NO_CHANGE"
        }

    if previous == 0:
        return {
            "percentage": 100,
            "status": "INCREASED"
        }

    percentage = ((current - previous) / previous) * 100

    if percentage > 0:
        status = "INCREASED"
    elif percentage < 0:
        status = "DECREASED"
    else:
        status = "NO_CHANGE"

    return {
        "percentage": round(abs(percentage), 2),
        "status": status
    }


async def get_dashboard_summary(auth_user: dict):

    if auth_user.get("role") not in [
        UserRole.SUPERADMIN,
        UserRole.ADMIN,
        UserRole.USER
    ]:
        forbidden()

    now = datetime.now(UTC)
    today_start = datetime(now.year, now.month, now.day, tzinfo=UTC)
    tomorrow_start = today_start + timedelta(days=1)
    current_month_start = datetime(now.year, now.month, 1, tzinfo=UTC)

    if now.month == 12:
        next_month_start = datetime(now.year + 1, 1, 1, tzinfo=UTC)
    else:
        next_month_start = datetime(now.year, now.month + 1, 1, tzinfo=UTC)

    if now.month == 1:
        last_month_start = datetime(now.year - 1, 12, 1, tzinfo=UTC)
    else:
        last_month_start = datetime(now.year, now.month - 1, 1, tzinfo=UTC)

    inventory_stats = await stocks_collection.aggregate([
        {
            "$group": {
                "_id": None,
                "total_products": {"$sum": 1},
                "total_inventory_value": {"$sum": {"$ifNull": ["$inventory_value", 0]}},
                "total_stock_quantity": {"$sum": {"$ifNull": ["$quantity", 0]}},
                "low_stock_products": {
                    "$sum": {
                        "$cond": [{"$eq": ["$stock_status", "LOW_QUANTITY"]}, 1, 0]
                    }
                },
                "out_of_stock_products": {
                    "$sum": {
                        "$cond": [{"$eq": ["$stock_status", "OUT_OF_STOCK"]}, 1, 0]
                    }
                }
            }
        }
    ]).to_list(length=1)

    inventory = inventory_stats[0] if inventory_stats else {}

    purchase_stats = await purchase_collection.aggregate([
        {
            "$group": {
                "_id": None,
                "total_purchase_amount": {"$sum": {"$ifNull": ["$final_total_amount", 0]}},
                "today_purchases": {
                    "$sum": {
                        "$cond": [
                            {
                                "$and": [
                                    {"$gte": ["$created_at", today_start]},
                                    {"$lt": ["$created_at", tomorrow_start]}
                                ]
                            },
                            {"$ifNull": ["$final_total_amount", 0]},
                            0
                        ]
                    }
                },
                "monthly_purchases": {
                    "$sum": {
                        "$cond": [
                            {
                                "$and": [
                                    {"$gte": ["$created_at", current_month_start]},
                                    {"$lt": ["$created_at", next_month_start]}
                                ]
                            },
                            {"$ifNull": ["$final_total_amount", 0]},
                            0
                        ]
                    }
                },
                "last_month_purchases": {
                    "$sum": {
                        "$cond": [
                            {
                                "$and": [
                                    {"$gte": ["$created_at", last_month_start]},
                                    {"$lt": ["$created_at", current_month_start]}
                                ]
                            },
                            {"$ifNull": ["$final_total_amount", 0]},
                            0
                        ]
                    }
                }
            }
        }
    ]).to_list(length=1)

    purchases = purchase_stats[0] if purchase_stats else {}

    sales_stats = await sales_collection.aggregate([
        {
            "$group": {
                "_id": None,
                "total_orders": {"$sum": 1},
                "total_sales_amount": {"$sum": {"$ifNull": ["$final_total_amount", 0]}},
                "today_sales": {
                    "$sum": {
                        "$cond": [
                            {
                                "$and": [
                                    {"$gte": ["$created_at", today_start]},
                                    {"$lt": ["$created_at", tomorrow_start]}
                                ]
                            },
                            {"$ifNull": ["$final_total_amount", 0]},
                            0
                        ]
                    }
                },
                "monthly_sales": {
                    "$sum": {
                        "$cond": [
                            {
                                "$and": [
                                    {"$gte": ["$created_at", current_month_start]},
                                    {"$lt": ["$created_at", next_month_start]}
                                ]
                            },
                            {"$ifNull": ["$final_total_amount", 0]},
                            0
                        ]
                    }
                },
                "last_month_sales": {
                    "$sum": {
                        "$cond": [
                            {
                                "$and": [
                                    {"$gte": ["$created_at", last_month_start]},
                                    {"$lt": ["$created_at", current_month_start]}
                                ]
                            },
                            {"$ifNull": ["$final_total_amount", 0]},
                            0
                        ]
                    }
                }
            }
        }
    ]).to_list(length=1)

    sales = sales_stats[0] if sales_stats else {}

    purchase_growth = calculate_percentage_change(
        purchases.get("monthly_purchases", 0),
        purchases.get("last_month_purchases", 0)
    )

    sales_growth = calculate_percentage_change(
        sales.get("monthly_sales", 0),
        sales.get("last_month_sales", 0)
    )

    recent_sales = await get_recent_sales(auth_user)
    most_sold_items = await get_most_sold_items(auth_user)
    low_quantity_products = await get_low_stock_products(auth_user)
    out_of_stock_products = await get_out_of_stock_products(auth_user)

    return {
        "inventory": {
            "total_products": inventory.get("total_products", 0),
            "total_inventory_value": round_final_amount(
                inventory.get("total_inventory_value", 0)
            ),
            "total_stock_quantity": inventory.get("total_stock_quantity", 0),
            "low_stock_products": inventory.get("low_stock_products", 0),
            "out_of_stock_products": inventory.get("out_of_stock_products", 0)
        },

        "purchases": {
            "total_purchase_amount": round_final_amount(
                purchases.get("total_purchase_amount", 0)
            ),
            "today_purchases": round_final_amount(purchases.get("today_purchases", 0)),
            "monthly_purchases": round_final_amount(purchases.get("monthly_purchases", 0)),
            "last_month_purchases": round_final_amount(
                purchases.get("last_month_purchases", 0)
            ),
            "purchase_percentage": purchase_growth
        },

        "sales": {
            "total_sales_amount": round_final_amount(sales.get("total_sales_amount", 0)),
            "today_sales": round_final_amount(sales.get("today_sales", 0)),
            "monthly_sales": round_final_amount(sales.get("monthly_sales", 0)),
            "last_month_sales": round_final_amount(sales.get("last_month_sales", 0)),
            "sales_percentage": sales_growth,
            "total_orders": sales.get("total_orders", 0)
        },
        "recent_sales": recent_sales,
        "most_sold_items": most_sold_items,
        "low_quantity_products": low_quantity_products,
        "out_of_stock_products": out_of_stock_products
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
    }).sort("quantity", 1).limit(5):

        products.append({
            "sku": stock.get("sku"),
            "name": stock.get("name"),
            "product": stock.get("name"),
            "quantity": stock.get("quantity"),
            "price": stock.get("avg_price"),
            "stock_status": stock.get("stock_status")
        })

    return products


async def get_out_of_stock_products(auth_user: dict):

    if auth_user.get("role") not in [
        UserRole.SUPERADMIN,
        UserRole.ADMIN,
        UserRole.USER
    ]:
        forbidden()

    stocks = []
    skus = []

    async for stock in stocks_collection.find({
        "stock_status": "OUT_OF_STOCK"
    }).limit(5):
        stocks.append(stock)
        skus.append(stock.get("sku"))

    product_by_sku = {}
    async for product in products_collection.find({"sku": {"$in": skus}}):
        product_by_sku[product.get("sku")] = product

    return [
        {
            "sku": stock.get("sku"),
            "name": stock.get("name"),
            "product": stock.get("name"),
            "category": product_by_sku.get(stock.get("sku"), {}).get("category", "-"),
            "price": stock.get("avg_price"),
            "stock_status": stock.get("stock_status")
        }
        for stock in stocks
    ]


async def get_most_sold_items(auth_user: dict):

    if auth_user.get("role") not in [
        UserRole.SUPERADMIN,
        UserRole.ADMIN,
        UserRole.USER
    ]:
        forbidden()

    sold_items = await sales_collection.aggregate([
        {"$unwind": "$items"},
        {
            "$group": {
                "_id": "$items.sku",
                "sku": {"$first": "$items.sku"},
                "product": {"$first": "$items.name"},
                "quantity": {"$sum": {"$ifNull": ["$items.quantity", 0]}}
            }
        },
        {"$sort": {"quantity": -1}},
        {"$limit": 5}
    ]).to_list(length=5)

    skus = [item.get("sku") for item in sold_items]

    stock_by_sku = {}
    async for stock in stocks_collection.find({"sku": {"$in": skus}}):
        stock_by_sku[stock.get("sku")] = stock

    product_by_sku = {}
    async for product in products_collection.find({"sku": {"$in": skus}}):
        product_by_sku[product.get("sku")] = product

    return [
        {
            "sku": item.get("sku"),
            "product": item.get("product") or item.get("sku"),
            "quantity": item.get("quantity", 0),
            "category": product_by_sku.get(item.get("sku"), {}).get("category", "-"),
            "stock": stock_by_sku.get(item.get("sku"), {}).get("quantity", 0),
            "status": stock_by_sku.get(item.get("sku"), {}).get(
                "stock_status",
                "UNKNOWN"
            )
        }
        for item in sold_items
    ]


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
        items = sale.get("items", [])
        first_item = items[0] if items else {}
        quantity = sum(item.get("quantity", 0) for item in items)
        product = first_item.get("name") or first_item.get("sku") or sale.get("invoice_id")

        if len(items) > 1:
            product = f"{product} +{len(items) - 1}"

        sales.append({
            "id": str(sale.get("_id")),
            "invoice_id": sale.get(
                "invoice_id"
            ),
            "product": product,
            "quantity": quantity,
            "total": sale.get(
                "final_total_amount"
            ),
            "final_total_amount": sale.get(
                "final_total_amount"
            ),
            "status": sale.get("sale_status"),
            "sale_status": sale.get("sale_status"),
            "created_at": format_datetime_iso(sale.get(
                "created_at"
            ))
        })
    return sales
