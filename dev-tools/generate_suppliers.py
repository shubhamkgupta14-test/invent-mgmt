import argparse
from pathlib import Path

from openpyxl import Workbook

HEADERS = ["Name", "Contact Person", "Email", "Phone", "Address", "GST Number"]
CITIES = ["Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Chennai", "Pune", "Ahmedabad", "Jaipur"]
SUPPLIER_NAMES = [
    "Aarav Textiles Pvt Ltd",
    "Kaveri Packaging Solutions",
    "BluePeak Electronics",
    "UrbanCraft Homeware",
    "Nexora Apparels",
    "Prism Stationery Mart",
    "Sundar Steel Traders",
    "GreenLeaf Organic Supplies",
    "Metro Footwear Distributors",
    "Lotus Ceramic House",
    "PrimeEdge Components",
    "Silverline Accessories",
    "Heritage Cotton Mills",
    "NovaTech Wholesale",
    "Crown Kitchenware",
    "Vertex Industrial Supply",
    "Amber Decor Studio",
    "Royal Leather Works",
    "FreshCart Agro Traders",
    "PixelPro Gadgets",
]
CONTACT_NAMES = [
    "Rahul Mehta",
    "Priya Nair",
    "Ankit Sharma",
    "Neha Iyer",
    "Vikram Rao",
    "Sana Khan",
    "Rohan Gupta",
    "Meera Shah",
    "Arjun Kapoor",
    "Pooja Verma",
    "Karan Malhotra",
    "Ayesha Siddiqui",
    "Nitin Joshi",
    "Sneha Kulkarni",
    "Manish Patel",
    "Divya Menon",
    "Harsh Agarwal",
    "Ritika Bansal",
    "Suresh Reddy",
    "Ishita Sen",
]


def supplier_row(index: int):
    city = CITIES[(index - 1) % len(CITIES)]
    supplier_name = SUPPLIER_NAMES[(index - 1) % len(SUPPLIER_NAMES)]
    contact_name = CONTACT_NAMES[(index - 1) % len(CONTACT_NAMES)]
    if index > len(SUPPLIER_NAMES):
        supplier_name = f"{supplier_name} Unit {((index - 1) // len(SUPPLIER_NAMES)) + 1}"
    return [
        supplier_name,
        contact_name,
        f"{supplier_name.lower().replace(' ', '.').replace('&', 'and')[:34]}@example.com",
        f"9{index:09d}"[-10:],
        f"{12 + index}, Industrial Estate, {city}",
        f"27ABCDE{index:04d}F1Z5"[:15],
    ]


def build_workbook(count: int):
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Suppliers"
    sheet.append(HEADERS)
    for index in range(1, count + 1):
        sheet.append(supplier_row(index))
    for column in sheet.columns:
        width = max(len(str(cell.value or "")) for cell in column) + 2
        sheet.column_dimensions[column[0].column_letter].width = min(max(width, 14), 32)
    return workbook


def main():
    parser = argparse.ArgumentParser(description="Generate supplier bulk upload Excel data.")
    parser.add_argument("count", type=int, nargs="?", default=20)
    parser.add_argument("--out", default=None)
    args = parser.parse_args()
    if args.count < 1:
        raise SystemExit("count must be at least 1")
    output_dir = Path("generated-data")
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = Path(args.out) if args.out else output_dir / f"suppliers-{args.count}.xlsx"
    build_workbook(args.count).save(output_path)
    print(output_path)


if __name__ == "__main__":
    main()
