import os
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
BACKEND = ROOT / "backend"

os.environ.setdefault("MONGO_URL", "mongodb://127.0.0.1:27017/")
os.environ.setdefault("DB_NAME", "inventory")
os.environ.setdefault(
    "SECRET_KEY", "W5BZVI87pgyEcAUww4mMBQUanO_DWCwY5uUd4YkPnOaszHeF4T-r6r-mAtkn9s6_iZJ-6G0dgTi4HrJZchW4Iw")

if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))
