import os
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
BACKEND = ROOT / "backend"

os.environ.setdefault("MONGO_URL", "mongodb://127.0.0.1:27017/")
os.environ.setdefault("DB_NAME", "inventory_test_db")
os.environ.setdefault("SECRET_KEY", "test-secret-key")

if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))
