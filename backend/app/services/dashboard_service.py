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
returns_collection = db.returns
exchanges_collection = db.exchanges


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


def _date_match(start=None, end=None):
    if not start or not end:
        return {}
    return {
        "created_at": {
            "$gte": start,
            "$lt": end
        }
    }


async def _sum_collection_amount(collection, field, start=None, end=None):
    result = await collection.aggregate([
        {"$match": _date_match(start, end)},
        {
            "$group": {
                "_id": None,
                "amount": {"$sum": {"$ifNull": [f"${field}", 0]}}
            }
        }
    ]).to_list(length=1)

    return result[0].get("amount", 0) if result else 0


async def _net_sales_amount(gross_amount, start=None, end=None):
    return_amount = await _sum_collection_amount(
        returns_collection,
        "refund_amount",
        start,
        end
    )
    exchange_adjustment = await _sum_collection_amount(
        exchanges_collection,
        "adjustment_amount",
        start,
        end
    )

    return gross_amount - return_amount + exchange_adjustment


def _add_net_item(movements, item, quantity_delta, count_delta=0, invoice_id=None):
    sku = item.get("sku")
    if not sku:
        return

    if sku not in movements:
        movements[sku] = {
            "sku": sku,
            "product": item.get("name") or sku,
            "quantity": 0,
            "sold_count": 0,
            "invoice_ids": set()
        }

    movements[sku]["quantity"] += quantity_delta
    movements[sku]["sold_count"] += count_delta

    if invoice_id:
        movements[sku]["invoice_ids"].add(invoice_id)


async def _get_net_sold_items(start=None, end=None, limit=5):
    movements = {}
    date_filter = _date_match(start, end)

    async for sale in sales_collection.find(date_filter):
        for item in sale.get("items", []):
            quantity = item.get("quantity", 0)
            _add_net_item(
                movements,
                item,
                quantity_delta=quantity,
                count_delta=1,
                invoice_id=sale.get("invoice_id")
            )

    async for return_record in returns_collection.find(date_filter):
        for item in return_record.get("items", []):
            quantity = item.get("quantity", 0)
            _add_net_item(
                movements,
                item,
                quantity_delta=-quantity,
                count_delta=-1,
                invoice_id=return_record.get("invoice_id")
            )

    async for exchange in exchanges_collection.find(date_filter):
        for item in exchange.get("returned_items", []):
            quantity = item.get("quantity", 0)
            _add_net_item(
                movements,
                item,
                quantity_delta=-quantity,
                count_delta=-1,
                invoice_id=exchange.get("invoice_id")
            )
        for item in exchange.get("replacement_items", []):
            quantity = item.get("quantity", 0)
            _add_net_item(
                movements,
                item,
                quantity_delta=quantity,
                count_delta=1,
                invoice_id=exchange.get("invoice_id")
            )

    sold_items = sorted(
        [
            item
            for item in movements.values()
            if item.get("quantity", 0) > 0
        ],
        key=lambda item: item.get("quantity", 0),
        reverse=True
    )[:limit]

    skus = [item.get("sku") for item in sold_items]

    product_by_sku = {}
    async for product in products_collection.find({"sku": {"$in": skus}}):
        product_by_sku[product.get("sku")] = product

    stock_by_sku = {}
    async for stock in stocks_collection.find({"sku": {"$in": skus}}):
        stock_by_sku[stock.get("sku")] = stock

    items = []
    for item in sold_items:
        invoice_ids = list(item.get("invoice_ids", []))
        invoice_summary = "-"
        if len(invoice_ids) == 1:
            invoice_summary = invoice_ids[0]
        elif len(invoice_ids) > 1:
            invoice_summary = f"{invoice_ids[0]} +{len(invoice_ids) - 1}"

        sku = item.get("sku")
        items.append({
            "sku": sku,
            "invoice_id": invoice_summary,
            "product": item.get("product") or sku,
            "quantity": item.get("quantity", 0),
            "sold_count": max(item.get("sold_count", 0), 0),
            "supplier_id": product_by_sku.get(sku, {}).get("supplier_id", "-"),
            "category": product_by_sku.get(sku, {}).get("category", "-"),
            "stock": stock_by_sku.get(sku, {}).get("quantity", 0),
            "status": stock_by_sku.get(sku, {}).get("stock_status", "UNKNOWN")
        })

    return items


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
                "damaged_items": {"$sum": {"$ifNull": ["$damaged_quantity", 0]}},
                "lost_items": {"$sum": {"$ifNull": ["$lost_quantity", 0]}},
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

    net_total_sales_amount = await _net_sales_amount(
        sales.get("total_sales_amount", 0)
    )
    net_today_sales = await _net_sales_amount(
        sales.get("today_sales", 0),
        today_start,
        tomorrow_start
    )
    net_monthly_sales = await _net_sales_amount(
        sales.get("monthly_sales", 0),
        current_month_start,
        next_month_start
    )
    net_last_month_sales = await _net_sales_amount(
        sales.get("last_month_sales", 0),
        last_month_start,
        current_month_start
    )

    purchase_growth = calculate_percentage_change(
        purchases.get("monthly_purchases", 0),
        purchases.get("last_month_purchases", 0)
    )

    sales_growth = calculate_percentage_change(
        net_monthly_sales,
        net_last_month_sales
    )

    recent_sales = await get_recent_sales(auth_user)
    recent_purchases = await get_recent_purchases(auth_user)
    todays_sold_items = await get_todays_sold_items(auth_user, today_start, tomorrow_start)
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
            "damaged_items": inventory.get("damaged_items", 0),
            "lost_items": inventory.get("lost_items", 0),
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
            "total_sales_amount": round_final_amount(net_total_sales_amount),
            "gross_sales_amount": round_final_amount(sales.get("total_sales_amount", 0)),
            "today_sales": round_final_amount(net_today_sales),
            "monthly_sales": round_final_amount(net_monthly_sales),
            "last_month_sales": round_final_amount(net_last_month_sales),
            "sales_percentage": sales_growth,
            "total_orders": sales.get("total_orders", 0)
        },
        "recent_sales": recent_sales,
        "recent_purchases": recent_purchases,
        "todays_sold_items": todays_sold_items,
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

    stocks = []
    skus = []

    async for stock in stocks_collection.find({
        "stock_status": "LOW_QUANTITY"
    }).sort("quantity", 1).limit(5):
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
            "supplier_id": product_by_sku.get(stock.get("sku"), {}).get("supplier_id") or stock.get("supplier_id") or "-",
            "quantity": stock.get("quantity"),
            "price": stock.get("avg_price"),
            "stock_status": stock.get("stock_status")
        }
        for stock in stocks
    ]


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
            "supplier_id": product_by_sku.get(stock.get("sku"), {}).get("supplier_id") or stock.get("supplier_id") or "-",
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

    return await _get_net_sold_items(limit=5)


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

        sales.append({
            "id": str(sale.get("_id")),
            "sale_id": str(sale.get("_id")),
            "invoice_id": sale.get(
                "invoice_id"
            ),
            "sku": first_item.get("sku"),
            "name": first_item.get("name"),
            "product": product,
            "extra_count": max(len(items) - 1, 0),
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
        items = purchase.get("items", [])
        first_item = items[0] if items else {}
        quantity = sum(item.get("quantity", 0) for item in items)
        product = first_item.get("name") or first_item.get("sku") or purchase.get("invoice_id")

        purchases.append({
            "id": str(purchase.get("_id")),
            "purchase_id": str(purchase.get("_id")),
            "invoice_id": purchase.get("invoice_id"),
            "supplier_id": purchase.get("supplier_id"),
            "sku": first_item.get("sku"),
            "name": first_item.get("name"),
            "product": product,
            "extra_count": max(len(items) - 1, 0),
            "quantity": quantity,
            "total": purchase.get("final_total_amount"),
            "final_total_amount": purchase.get("final_total_amount"),
            "status": purchase.get("purchase_status"),
            "purchase_status": purchase.get("purchase_status"),
            "payment_status": purchase.get("payment_status"),
            "created_at": format_datetime_iso(purchase.get("created_at"))
        })
    return purchases


async def get_todays_sold_items(auth_user: dict, today_start, tomorrow_start):

    if auth_user.get("role") not in [
        UserRole.SUPERADMIN,
        UserRole.ADMIN,
        UserRole.USER
    ]:
        forbidden()

    return await _get_net_sold_items(today_start, tomorrow_start, limit=5)
