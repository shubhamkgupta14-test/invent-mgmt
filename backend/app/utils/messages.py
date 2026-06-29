class Messages:

    # COMMON
    SUCCESS = "Success"
    FAILURE = "Failure"
    ERROR = "Error"

    # SYSTEM
    SYSTEM = "system"

    # INTERNAL ERROR
    INTERNAL_SERVER_ERROR = "Internal server error"

    # GENERAL FAILURE
    VALIDATION_FAILED = "Validation failed"
    DATA_NOT_FOUND = "Data not found"
    INVALID_SORT_FIELD = "Invalid sort field"

    # AUTH
    INVALID_CREDENTIALS = "Invalid username or password"
    ACCESS_DENIED = "You don't have permission to access this resource"
    INVALID_OR_EXPIRED_TOKEN = "Token is missing, invalid, or expired"
    LOGIN_SUCCESS = "Login successful"
    LOGOUT_SUCCESS = "Logout successful"
    AUTHENTICATION_FAILED = "Authentication failed"

    # USER
    USER_NOT_FOUND = "User not found"
    USER_CREATED = "User created successfully"
    USER_ALREADY_PRESENT = "User already present"
    USER_DELETED_PERMANENTLY = "User permanently deleted successfully"
    USER_DELETED = "User deleted successfully"
    USER_ACTIVATED = "User activated successfully"
    USERS_FETCHED = "User(s) fetched successfully"
    USER_DETAILS_FETCHED = "User details fetched successfully"
    USER_ACCOUNT_DEACTIVATED = "User details fetched successfully"
    USER_INACTIVE = "User account is inactive"
    USER_NOT_FOUND_OR_INACTIVE = "User not found or inactive"
    USER_SELF_DELETE_NOT_ALLOWED = "Self account deletion is not allowed"
    SUPERADMIN_DELETE_NOT_ALLOWED = "SuperAdmin account cannot be deleted"
    USER_DEACTIVATION_REQUIRED = "Deactivate the user before permanent deletion"
    USER_PROMOTED_TO_ADMIN = "User promoted to admin successfully"
    USER_ALREADY_ADMIN = "User is already an admin"
    USER_ROLE_UPDATED = "User role updated successfully"
    DATABASE_CLEANED = "Database cleaned successfully"
    INVALID_COLLECTION = "Invalid collection selected"

    # PRODUCT
    PRODUCT_ADDED = "Product added successfully"
    PRODUCT_ALREADY_EXISTS = "Product already exists with same SKU"
    PRODUCTS_FETCHED = "Product(s) fetched successfully"
    NO_PRODUCTS_FOUND = "No products found"
    PRODUCT_DETAILS_FETCHED = "Product details fetched successfully"
    PRODUCT_NOT_FOUND = "Product not found"
    PRODUCT_UPDATED = "Product updated successfully"
    PRODUCT_DELETED = "Product deleted successfully"
    PRODUCT_DELETED_PERMANENTLY = "Product permanently deleted successfully"
    PRODUCT_PERMANENT_DELETE_NOT_ALLOWED = "Admin cannot permanently delete products"
    PRODUCT_DEACTIVATION_REQUIRED = "Deactivate the product before permanent deletion"
    INVALID_SKU = "Invalid SKU format"
    PRODUCT_INACTIVE = "Product is inactive"
    NO_UPDATE_FIELDS = "No update fields provided"

    # SUPPLIERS
    SUPPLIER_ADDED = "Supplier added successfully"
    SUPPLIER_ALREADY_EXISTS = "Supplier already exists"
    SUPPLIERS_FETCHED = "Supplier(s) fetched successfully"
    NO_SUPPLIERS_FOUND = "No suppliers found"
    SUPPLIER_DETAILS_FETCHED = "Supplier details fetched successfully"
    SUPPLIER_NOT_FOUND = "Supplier not found"
    SUPPLIER_UPDATED = "Supplier updated successfully"
    INVALID_SUPPLIER_ID = "Invalid supplier id"

    # PURCHASES
    PURCHASE_CREATED = "Purchase created successfully"
    PURCHASE_NOT_FOUND = "Purchase not found"
    PURCHASES_FETCHED = "Purchases fetched successfully"
    NO_PURCHASES_FOUND = "No purchases found"
    INVALID_PURCHASE_ID = "Invalid purchase Id"

    # SALES
    SALE_CREATED = "Sale created successfully"
    SALES_FETCHED = "Sales fetched successfully"
    SALE_DETAILS_FETCHED = "Sale details fetched successfully"
    SALE_NOT_FOUND = "Sale not found"
    NO_SALES_FOUND = "No sales found"
    INVALID_SALE_ID = "Invalid sale id"

    # RETURNS
    RETURN_CREATED = "Return created successfully"
    RETURNS_FETCHED = "Returns fetched successfully"
    NO_RETURNS_FOUND = "No returns found"
    INVALID_RETURN_ID = "Invalid return id"

    # EXCHANGES
    EXCHANGE_CREATED = "Exchange created successfully"
    EXCHANGES_FETCHED = "Exchanges fetched successfully"
    NO_EXCHANGES_FOUND = "No exchanges found"
    INVALID_EXCHANGE_ID = "Invalid exchange id"
    INVALID_ITEM_STATUS = "Invalid item status"

    # STOCKS
    INSUFFICIENT_STOCK = "Insufficient stock available"
    STOCKS_FETCHED = "Stocks fetched successfully"
    STOCK_DETAILS_FETCHED = "Stock details fetched successfully"
    STOCK_NOT_FOUND = "Stock not found"
    INVALID_STOCK_STATUS = "Invalid stock status"
    NO_STOCKS_FOUND = "No stocks found"

    # AUDIT_LOG
    AUDIT_LOGS_FETCHED = "Audit logs fetched successfully"

    # API_LOG
    API_LOGS_FETCHED = "API logs fetched successfully"
    API_LOG_FETCHED = "API log fetched successfully"

    # DASHBOARD
    DASHBOARD_SUMMARY_FETCHED = "Dashboard summary fetched successfully"
    LOW_STOCK_PRODUCTS_FETCHED = "Low stock products fetched successfully"
    RECENT_PURCHASES_FETCHED = "Recent purchases fetched successfully"
    RECENT_SALES_FETCHED = "Recent sales fetched successfully"
