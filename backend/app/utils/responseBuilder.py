from app.utils.helpers import format_datetime_ist, format_datetime_iso


def build_user_response(user: dict):
    return {
        "id": str(user["_id"]),
        "username": user["username"],
        "firstname": user.get("firstname", ""),
        "lastname": user.get("lastname", ""),
        "email": user.get("email", ""),
        "email_verified": user.get("email_verified", False),
        "profile_image_url": user.get("profile_image_url", ""),
        "role": user["role"],
        "active": user["active"],
        "created_at": format_datetime_iso(user["created_at"]),
        "updated_at": format_datetime_iso(user["updated_at"])
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
        "is_manufactured": product.get("is_manufactured", False),
        "created_at": format_datetime_iso(product["created_at"]),
        "updated_at": format_datetime_iso(product["updated_at"])
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
        "created_at": format_datetime_iso(purchase.get("created_at")),
        "updated_at": format_datetime_iso(purchase.get("updated_at"))
    }


def build_manufacturing_response(manufacturing: dict):
    return {
        "manufacturing_id": str(manufacturing.get("_id")),
        "batch_no": manufacturing.get("batch_no"),
        "sku": manufacturing.get("sku"),
        "name": manufacturing.get("name"),
        "quantity": manufacturing.get("quantity", 0),
        "unit_cost": manufacturing.get("unit_cost", 0),
        "other_charges": manufacturing.get("other_charges", 0),
        "effective_unit_cost": manufacturing.get("effective_unit_cost", 0),
        "total_cost": manufacturing.get("total_cost", 0),
        "status": manufacturing.get("status"),
        "notes": manufacturing.get("notes"),
        "created_by": manufacturing.get("created_by"),
        "created_at": format_datetime_iso(manufacturing.get("created_at")),
        "updated_at": format_datetime_iso(manufacturing.get("updated_at"))
    }


def build_sales_response(sale: dict):
    return {
        "sale_id": str(sale.get("_id", "")),
        "invoice_id": sale.get("invoice_id"),
        "platform": sale.get("platform", "Self Store"),
        "user_info": sale.get("user_info"),
        "items": sale.get("items", []),
        "subtotal": sale.get("subtotal", 0),
        "total_tax": sale.get("total_tax", 0),
        "total_discount": sale.get("total_discount", 0),
        "final_total_amount": sale.get("final_total_amount", 0),
        "total_paid": sale.get("total_paid", sum(
            payment.get("amount_paid", 0)
            for payment in sale.get("payment_details", [])
        )),
        "payment_details": sale.get("payment_details", []),
        "sale_status": sale.get("sale_status", ""),
        "notes": sale.get("notes"),
        "created_at": format_datetime_iso(sale.get("created_at")),
        "updated_at": format_datetime_iso(sale.get("updated_at"))
    }


def build_invoice_response(invoice: dict):
    return {
        "invoice_record_id": str(invoice.get("_id", "")),
        "invoice_id": invoice.get("invoice_id"),
        "invoice_sequence": invoice.get("invoice_sequence"),
        "invoice_date": format_datetime_iso(invoice.get("invoice_date")),
        "company": invoice.get("company", {}),
        "buyer": invoice.get("buyer", {}),
        "items": invoice.get("items", []),
        "sold_offline": invoice.get("sold_offline", False),
        "actual_subtotal": invoice.get("actual_subtotal", 0),
        "mrp_discount_amount": invoice.get("mrp_discount_amount", 0),
        "subtotal": invoice.get("subtotal", 0),
        "offline_discount_percentage": invoice.get("offline_discount_percentage", 0),
        "offline_discount_amount": invoice.get("offline_discount_amount", 0),
        "additional_discount": invoice.get("additional_discount", 0),
        "total_discount": invoice.get("total_discount", 0),
        "total_tax": invoice.get("total_tax", 0),
        "final_total_amount": invoice.get("final_total_amount", 0),
        "payment_method": invoice.get("payment_method"),
        "payment_status": invoice.get("payment_status"),
        "notes": invoice.get("notes"),
        "created_by": invoice.get("created_by"),
        "created_at": format_datetime_iso(invoice.get("created_at")),
        "updated_at": format_datetime_iso(invoice.get("updated_at")),
    }


def build_return_response(return_record: dict):
    return {
        "return_id": return_record.get("return_id") or str(return_record.get("_id", "")),
        "sale_id": return_record.get("sale_id"),
        "invoice_id": return_record.get("invoice_id"),
        "items": return_record.get("items", []),
        "total_quantity": return_record.get("total_quantity", 0),
        "total_amount": return_record.get("total_amount", 0),
        "refund_amount": return_record.get("refund_amount", 0),
        "notes": return_record.get("notes"),
        "created_by": return_record.get("created_by"),
        "created_at": format_datetime_iso(return_record.get("created_at")),
        "updated_at": format_datetime_iso(return_record.get("updated_at"))
    }


def build_exchange_response(exchange: dict):
    return {
        "exchange_id": exchange.get("exchange_id") or str(exchange.get("_id", "")),
        "sale_id": exchange.get("sale_id"),
        "invoice_id": exchange.get("invoice_id"),
        "returned_items": exchange.get("returned_items", []),
        "replacement_items": exchange.get("replacement_items", []),
        "returned_quantity": exchange.get("returned_quantity", 0),
        "replacement_quantity": exchange.get("replacement_quantity", 0),
        "returned_amount": exchange.get("returned_amount", 0),
        "replacement_amount": exchange.get("replacement_amount", 0),
        "adjustment_amount": exchange.get("adjustment_amount", 0),
        "notes": exchange.get("notes"),
        "created_by": exchange.get("created_by"),
        "created_at": format_datetime_iso(exchange.get("created_at")),
        "updated_at": format_datetime_iso(exchange.get("updated_at"))
    }


def build_loyalty_response(loyalty: dict):
    orders = []
    for order in loyalty.get("orders", []):
        orders.append({
            **order,
            "added_at": format_datetime_iso(order.get("added_at")) if order.get("added_at") else None,
        })

    notes = []
    for note in loyalty.get("notes", []):
        notes.append({
            **note,
            "created_at": format_datetime_iso(note.get("created_at")) if note.get("created_at") else None,
        })

    return {
        "loyalty_id": str(loyalty.get("_id", "")),
        "ref_no": loyalty.get("ref_no"),
        "email": loyalty.get("email"),
        "orders": orders,
        "qualified_order_count": loyalty.get("qualified_order_count", 0),
        "disqualified_order_count": loyalty.get("disqualified_order_count", 0),
        "required_order_count": loyalty.get("required_order_count", 0),
        "max_disqualified_orders": loyalty.get("max_disqualified_orders", 0),
        "discount_type": loyalty.get("discount_type"),
        "discount_value": loyalty.get("discount_value", 0),
        "max_redeem_amount": loyalty.get("max_redeem_amount", 150),
        "status": getattr(loyalty.get("status"), "value", loyalty.get("status")),
        "redeemed_order_id": loyalty.get("redeemed_order_id"),
        "redeemed_amount": loyalty.get("redeemed_amount"),
        "redeemed_sale_amount": loyalty.get("redeemed_sale_amount"),
        "redeemed_at": format_datetime_iso(loyalty.get("redeemed_at")) if loyalty.get("redeemed_at") else None,
        "cancel_reason": loyalty.get("cancel_reason"),
        "notes": notes,
        "created_by": loyalty.get("created_by"),
        "created_at": format_datetime_iso(loyalty.get("created_at")),
        "updated_at": format_datetime_iso(loyalty.get("updated_at")),
    }


def build_stock_response(stock: dict):
    return {
        "stock_id": str(stock.get("_id")),
        "sku": stock.get("sku"),
        "name": stock.get("name"),
        "supplier_id": stock.get("supplier_id"),
        "barcode": stock.get("barcode", ""),
        "quantity": stock.get("quantity"),
        "damaged_quantity": stock.get("damaged_quantity", 0),
        "lost_quantity": stock.get("lost_quantity", 0),
        "tax_rate": stock.get("tax_rate", 0),
        "avg_price": stock.get("avg_price"),
        "actual_price": stock.get("actual_price", 0),
        "min_selling_price": stock.get("min_selling_price"),
        "inventory_value": stock.get("inventory_value"),
        "stock_status": stock.get("stock_status"),
        "created_at": format_datetime_iso(stock.get("created_at")),
        "updated_at": format_datetime_iso(stock.get("updated_at"))
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
        "actor_role": audit.get("actor_role") or audit.get("performed_by_role"),
        "created_at": format_datetime_iso(audit.get("created_at"))
    }


def build_supplier_response(supplier: dict):
    return {
        "id": str(supplier.get("_id")),
        "supplier_id": supplier.get("supplier_id"),
        "name": supplier.get("name"),
        "email": supplier.get("email"),
        "phone": supplier.get("phone"),
        "address": supplier.get("address"),
        "gst_number": supplier.get("gst_number"),
        "contact_person": supplier.get("contact_person"),
        "is_active": supplier.get("is_active", True),
        "is_own_company": supplier.get("is_own_company", False),
        "created_at": format_datetime_iso(supplier.get("created_at")),
        "updated_at": format_datetime_iso(supplier.get("updated_at"))
    }
