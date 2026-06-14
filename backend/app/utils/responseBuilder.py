from app.utils.helpers import format_datetime_ist


def build_user_response(user: dict):
    return {
        "id": str(user["_id"]),
        "username": user["username"],
        "role": user["role"],
        "active": user["active"],
        "created_at": format_datetime_ist(user["created_at"]),
        "updated_at": format_datetime_ist(user["updated_at"])
    }


def build_product_response(product: dict):
    return {
        "id": str(product["_id"]),
        "sku": product["sku"],
        "name": product["name"],
        "description": product["description"],
        "category": product["category"],
        "unit_of_measure": product["unit_of_measure"],
        "tax_rate": product["tax_rate"],
        "reorder_level": product["reorder_level"],
        "attributes": {
            "color": product["attributes"].get("color"),
            "material": product["attributes"].get('material'),
            "weight": product["attributes"].get("weight"),
            "size": product["attributes"].get("size"),
            "dimension": product["attributes"].get("dimension")
        },
        "supplier_id": product["supplier_id"],
        "is_active": product["is_active"],
        "created_at": format_datetime_ist(product["created_at"]),
        "updated_at": format_datetime_ist(product["updated_at"])
    }


def build_purchase_response(purchase: dict):
    return {
        "purchase_id": str(purchase["_id"]),
        "invoice_id": purchase.get("invoice_id"),
        "supplier_id": purchase.get("supplier_id"),
        "items": purchase.get("items"),
        "total_quantity": purchase.get("total_quantity"),
        "subtotal": purchase.get("subtotal"),
        "total_tax": purchase.get("total_tax"),
        "additional_discount": purchase.get("additional_discount"),
        "total_discount": purchase.get("total_discount"),
        "final_total_amount": purchase.get("final_total_amount"),
        "total_paid": purchase.get("total_paid"),
        "remaining_amount": purchase.get("remaining_amount"),
        "payment_status": purchase.get("payment_status"),
        "payment_details": purchase.get("payment_details"),
        "purchase_status": purchase.get("purchase_status"),
        "notes": purchase.get("notes"),
        "shipping_charges": purchase.get("shipping_charges"),
        "other_charges": purchase.get("other_charges"),
        "additional_charge_per_unit": purchase.get("additional_charge_per_unit"),
        "created_by": purchase.get("created_by"),
        "created_at": format_datetime_ist(purchase.get("created_at")),
        "updated_at": format_datetime_ist(purchase.get("updated_at"))
    }


def build_sales_response(sale: dict):
    return {
        "sale_id": str(sale.get("_id", "")),
        "invoice_id": sale.get("invoice_id"),
        "user_info": sale.get("user_info"),
        "items": sale.get("items", []),
        "subtotal": sale.get("subtotal", 0),
        "total_tax": sale.get("total_tax", 0),
        "total_discount": sale.get("total_discount", 0),
        "final_total_amount": sale.get("final_total_amount", 0),
        "payment_details": sale.get("payment_details", []),
        "sale_status": sale.get("sale_status", "SOLD"),
        "notes": sale.get("notes"),
        "created_at": format_datetime_ist(sale.get("created_at")),
        "updated_at": format_datetime_ist(sale.get("updated_at"))
    }


def build_stock_response(stock: dict):
    return {
        "stock_id": str(stock.get("_id")),
        "sku": stock.get("sku"),
        "name": stock.get("name"),
        "quantity": stock.get("quantity"),
        "avg_price": stock.get("avg_price"),
        "inventory_value": stock.get("inventory_value"),
        "stock_status": stock.get("stock_status"),
        "created_at": format_datetime_ist(stock.get("created_at")),
        "updated_at": format_datetime_ist(stock.get("updated_at"))
    }


def build_audit_response(audit: dict):

    return {
        "audit_id": str(audit.get("_id")),
        "module_name": audit.get("module_name"),
        "event_type": audit.get("event_type"),
        "reference_id": audit.get("reference_id"),
        "sku": audit.get("sku"),
        "old_data": audit.get("old_data"),
        "new_data": audit.get("new_data"),
        "performed_by": audit.get("performed_by"),
        "created_at": format_datetime_ist(audit.get("created_at"))
    }
