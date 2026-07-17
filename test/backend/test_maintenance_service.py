import importlib.util
import unittest
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException

import _setup  # noqa: F401
from fakes import FakeCollection


@unittest.skipIf(
    importlib.util.find_spec("motor") is None,
    "motor is not installed",
)
class MaintenanceServiceTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        from app.services import maintenance_service

        self.service = maintenance_service
        self.original_collection = maintenance_service.maintenance_collection
        maintenance_service.maintenance_collection = FakeCollection()
        maintenance_service._cached_config = None
        maintenance_service._cache_loaded_at = 0.0

    async def asyncTearDown(self):
        self.service.maintenance_collection = self.original_collection
        self.service._cached_config = None
        self.service._cache_loaded_at = 0.0

    async def test_missing_configuration_defaults_to_inactive(self):
        config = await self.service.get_maintenance_config(use_cache=False)

        self.assertFalse(config["enabled"])
        self.assertFalse(config["active"])
        self.assertTrue(config["message"])

    async def test_only_superadmin_can_update_configuration(self):
        from app.models.maintenance import MaintenanceConfigRequest

        with self.assertRaises(HTTPException) as ctx:
            await self.service.set_maintenance_config(
                {"role": "admin"},
                MaintenanceConfigRequest(enabled=True, message="Planned work"),
            )

        self.assertEqual(ctx.exception.status_code, 403)

    async def test_enabled_configuration_is_active_inside_schedule(self):
        from app.models.maintenance import MaintenanceConfigRequest

        now = datetime.now(UTC)
        result = await self.service.set_maintenance_config(
            {"role": "superadmin", "username": "root"},
            MaintenanceConfigRequest(
                enabled=True,
                message="Database upgrade",
                starts_at=now - timedelta(minutes=1),
                ends_at=now + timedelta(hours=1),
            ),
        )

        self.assertTrue(result["enabled"])
        self.assertTrue(result["active"])
        self.assertEqual(result["message"], "Database upgrade")

    async def test_end_must_be_after_start(self):
        from app.models.maintenance import MaintenanceConfigRequest

        now = datetime.now(UTC)
        with self.assertRaises(HTTPException) as ctx:
            await self.service.set_maintenance_config(
                {"role": "superadmin"},
                MaintenanceConfigRequest(
                    enabled=True,
                    message="Invalid window",
                    starts_at=now,
                    ends_at=now - timedelta(minutes=1),
                ),
            )

        self.assertEqual(ctx.exception.status_code, 400)


if __name__ == "__main__":
    unittest.main()
