import argparse
from pathlib import Path

from openpyxl import Workbook

HEADERS = [
    "SKU", "Product Name", "Category", "Description", "Unit of measure", "Tax Rate",
    "Reorder Level", "Supplier", "In-house", "Color", "Material", "Weight", "Size", "Dimension",
]
PRODUCTS = [
    ("TSH", "Cotton T-Shirt", "Apparel", "Cotton", "Blue", "M", "30 x 20 x 2 cm"),
    ("JNS", "Denim Jeans", "Apparel", "Denim", "Indigo", "32", "35 x 25 x 4 cm"),
    ("MUG", "Ceramic Mug", "Home", "Ceramic", "White", "350 ml", "10 x 8 x 9 cm"),
    ("BAG", "Canvas Tote Bag", "Accessories", "Canvas", "Natural", "Standard", "38 x 34 x 8 cm"),
    ("BTL", "Steel Water Bottle", "Home", "Steel", "Silver", "750 ml", "8 x 8 x 28 cm"),
    ("CAP", "Baseball Cap", "Accessories", "Cotton", "Black", "Free", "22 x 18 x 12 cm"),
    ("KBD", "Wireless Keyboard", "Electronics", "ABS Plastic", "Grey", "One Size", "44 x 14 x 3 cm"),
    ("MSE", "Wireless Mouse", "Electronics", "ABS Plastic", "Black", "One Size", "11 x 6 x 4 cm"),
]


def product_row(index: int, supplier_count: int):
    code, name, category, material, color, size, dimension = PRODUCTS[(index - 1) % len(PRODUCTS)]
    supplier_index = ((index - 1) % supplier_count) + 1
    return [
        f"{code}-{index:04d}", f"{name} {index:03d}", category,
        f"{name} for demo inventory upload", "pcs", 5 if category in ["Apparel", "Home"] else 18,
        5 + (index % 10), f"SUP-{supplier_index:04d}", "No", color, material,
        f"{100 + index * 5}g", size, dimension,
    ]


def build_workbook(count: int, supplier_count: int):
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Products"
    sheet.append(HEADERS)
    for index in range(1, count + 1):
        sheet.append(product_row(index, supplier_count))
    for column in sheet.columns:
        width = max(len(str(cell.value or "")) for cell in column) + 2
        sheet.column_dimensions[column[0].column_letter].width = min(max(width, 14), 36)
    return workbook


def main():
    parser = argparse.ArgumentParser(description="Generate product bulk upload Excel data.")
    parser.add_argument("count", type=int, nargs="?", default=20)
    parser.add_argument("--suppliers", type=int, default=20)
    parser.add_argument("--out", default=None)
    args = parser.parse_args()
    if args.count < 1:
        raise SystemExit("count must be at least 1")
    if args.suppliers < 1:
        raise SystemExit("suppliers must be at least 1")
    output_dir = Path("generated-data")
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = Path(args.out) if args.out else output_dir / f"products-{args.count}.xlsx"
    build_workbook(args.count, args.suppliers).save(output_path)
    print(output_path)


if __name__ == "__main__":
    main()
