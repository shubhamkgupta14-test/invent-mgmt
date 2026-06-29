import importlib.util
import unittest
from datetime import UTC, datetime

from fastapi import HTTPException

import _setup  # noqa: F401
from fakes import FakeCollection


@unittest.skipIf(
    importlib.util.find_spec("motor") is None,
    "motor is not installed",
)
class ApiLogServiceTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        from app.models.auth import UserRole

        self.UserRole = UserRole
        self.now = datetime(2026, 1, 1, tzinfo=UTC)

    async def test_only_superadmin_can_read_api_logs(self):
        from app.services.api_log_service import get_api_logs

        with self.assertRaises(HTTPException) as ctx:
            await get_api_logs(
                {"role": self.UserRole.ADMIN},
                filters={},
                pagination={"page": 1, "limit": 20},
            )

        self.assertEqual(ctx.exception.status_code, 403)

    async def test_get_api_logs_applies_filters_and_pagination_bounds(self):
        from app.services import api_log_service

        original_collection = api_log_service.api_logs_collection
        api_log_service.api_logs_collection = FakeCollection([
            {
                "_id": "1",
                "trace_id": "trace-ok",
                "method": "GET",
                "path": "/products",
                "status_code": 200,
                "duration_ms": 25,
                "created_at": self.now,
                "user": "admin",
                "role": self.UserRole.ADMIN,
            },
            {
                "_id": "2",
                "trace_id": "trace-error",
                "method": "POST",
                "path": "/products/add",
                "status_code": 500,
                "duration_ms": 120,
                "created_at": self.now,
                "user": "super",
                "role": self.UserRole.SUPERADMIN,
            },
        ])

        try:
            result = await api_log_service.get_api_logs(
                {"role": self.UserRole.SUPERADMIN},
                filters={"path": "products", "success": False},
                pagination={"page": 0, "limit": 200},
            )
        finally:
            api_log_service.api_logs_collection = original_collection

        self.assertEqual(result["pagination"]["page"], 1)
        self.assertEqual(result["pagination"]["limit"], 100)
        self.assertEqual(result["pagination"]["total"], 1)
        self.assertEqual(result["items"][0]["trace_id"], "trace-error")

    async def test_get_api_log_by_trace_id_includes_bodies(self):
        from app.services import api_log_service

        original_collection = api_log_service.api_logs_collection
        api_log_service.api_logs_collection = FakeCollection([
            {
                "_id": "1",
                "trace_id": "trace-1",
                "method": "POST",
                "path": "/auth/login",
                "query_params": {},
                "status_code": 200,
                "duration_ms": 12,
                "created_at": self.now,
                "request_headers": {"content-type": "application/json"},
                "request_body": {"username": "admin"},
                "response_body": {"ok": True},
            }
        ])

        try:
            result = await api_log_service.get_api_log_by_trace_id(
                {"role": self.UserRole.SUPERADMIN},
                "trace-1",
            )
        finally:
            api_log_service.api_logs_collection = original_collection

        self.assertEqual(result["request_body"], {"username": "admin"})
        self.assertEqual(result["response_body"], {"ok": True})


if __name__ == "__main__":
    unittest.main()
