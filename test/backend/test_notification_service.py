import importlib.util
import unittest
from datetime import UTC, datetime

from fastapi import HTTPException

import _setup  # noqa: F401
from fakes import FakeCollection


@unittest.skipIf(
    importlib.util.find_spec("bson") is None,
    "bson is not installed",
)
class NotificationServiceTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        from app.models.auth import UserRole
        from app.models.notification import NotificationAudience, NotificationType

        self.UserRole = UserRole
        self.NotificationAudience = NotificationAudience
        self.NotificationType = NotificationType
        self.now = datetime(2026, 1, 1, tzinfo=UTC)

    async def test_only_superadmin_can_create_notification(self):
        from app.services.notification_service import create_notification

        with self.assertRaises(HTTPException) as ctx:
            await create_notification(
                {"role": self.UserRole.ADMIN, "username": "admin"},
                {
                    "title": "stock alert",
                    "message": "Check stock",
                    "notification_type": self.NotificationType.INFO,
                    "audience": self.NotificationAudience.ALL,
                },
            )

        self.assertEqual(ctx.exception.status_code, 403)

    async def test_create_notification_normalizes_user_targets(self):
        from app.services import notification_service

        original_collection = notification_service.notifications_collection
        notification_service.notifications_collection = FakeCollection()

        try:
            result = await notification_service.create_notification(
                {"role": self.UserRole.SUPERADMIN, "username": "super"},
                {
                    "title": "  STOCK ALERT ",
                    "message": " Check stock ",
                    "notification_type": self.NotificationType.INFO,
                    "audience": self.NotificationAudience.USERS,
                    "usernames": [" Alice ", "BOB"],
                },
            )
        finally:
            notification_service.notifications_collection = original_collection

        self.assertEqual(result["title"], "Stock alert")
        self.assertEqual(result["message"], "Check stock")
        self.assertEqual(result["usernames"], ["alice", "bob"])
        self.assertFalse(result["read"])

    async def test_get_my_notifications_filters_targets_and_read_state(self):
        from bson import ObjectId
        from app.services import notification_service

        read_id = ObjectId()
        unread_id = ObjectId()
        hidden_id = ObjectId()
        original_notifications = notification_service.notifications_collection
        original_reads = notification_service.notification_reads_collection
        notification_service.notifications_collection = FakeCollection([
            {
                "_id": read_id,
                "title": "All",
                "message": "Everyone",
                "notification_type": "INFO",
                "audience": self.NotificationAudience.ALL.value,
                "roles": [],
                "usernames": [],
                "created_by": "super",
                "created_at": self.now,
            },
            {
                "_id": unread_id,
                "title": "Role",
                "message": "Admins",
                "notification_type": "INFO",
                "audience": self.NotificationAudience.ROLE.value,
                "roles": [self.UserRole.ADMIN],
                "usernames": [],
                "created_by": "super",
                "created_at": self.now,
            },
            {
                "_id": hidden_id,
                "title": "Hidden",
                "message": "Users",
                "notification_type": "INFO",
                "audience": self.NotificationAudience.USERS.value,
                "roles": [],
                "usernames": ["other"],
                "created_by": "super",
                "created_at": self.now,
            },
        ])
        notification_service.notification_reads_collection = FakeCollection([
            {"notification_id": str(read_id), "username": "admin"}
        ])

        try:
            result = await notification_service.get_my_notifications(
                {"role": self.UserRole.ADMIN, "username": " Admin "},
                limit=10,
            )
        finally:
            notification_service.notifications_collection = original_notifications
            notification_service.notification_reads_collection = original_reads

        ids = [item["notification_id"] for item in result["notifications"]]
        self.assertIn(str(read_id), ids)
        self.assertIn(str(unread_id), ids)
        self.assertNotIn(str(hidden_id), ids)
        self.assertEqual(result["unread_count"], 1)
        self.assertTrue(
            next(item for item in result["notifications"] if item["notification_id"] == str(read_id))["read"]
        )


if __name__ == "__main__":
    unittest.main()
