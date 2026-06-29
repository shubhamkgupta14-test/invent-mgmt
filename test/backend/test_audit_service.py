import importlib.util
import unittest

from fastapi import HTTPException

import _setup  # noqa: F401


@unittest.skipIf(importlib.util.find_spec("motor") is None, "motor is not installed")
class AuditServiceTests(unittest.IsolatedAsyncioTestCase):
    async def test_get_audit_logs_allows_only_superadmin(self):
        from app.models.auth import UserRole
        from app.services.audit_service import get_audit_logs

        with self.assertRaises(HTTPException) as ctx:
            await get_audit_logs({"role": UserRole.ADMIN})

        self.assertEqual(ctx.exception.status_code, 403)


if __name__ == "__main__":
    unittest.main()
