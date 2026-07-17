import importlib.util
import unittest
from datetime import datetime, timedelta

from fastapi import HTTPException

import _setup  # noqa: F401
from fakes import FakeCollection


@unittest.skipIf(
    importlib.util.find_spec("motor") is None,
    "motor is not installed",
)
class EmailVerificationServiceTests(unittest.IsolatedAsyncioTestCase):
    async def test_invalid_otp_shows_remaining_attempts_before_block(self):
        from app.models.auth import UserRole
        from app.services import user_service

        now = datetime.now()
        user = {
            "_id": "user-1",
            "username": "admin",
            "firstname": "Admin",
            "lastname": "User",
            "email": "admin@example.com",
            "password": "hash",
            "active": True,
            "role": UserRole.ADMIN,
            "created_at": now,
            "updated_at": now,
        }
        otp_record = {
            "_id": "otp-1",
            "user_id": "user-1",
            "username": "admin",
            "email": "admin@example.com",
            "purpose": user_service.EMAIL_VERIFICATION_PURPOSE,
            "otp_hash": user_service._secret_hash("123456"),
            "status": "PENDING",
            "expires_at": now + timedelta(minutes=10),
            "attempts": 0,
            "max_attempts": 5,
            "created_at": now,
            "updated_at": now,
        }

        original_users = user_service.user_collection
        original_otps = user_service.password_otps_collection
        fake_users = FakeCollection([user])
        fake_otps = FakeCollection([otp_record])
        user_service.user_collection = fake_users
        user_service.password_otps_collection = fake_otps

        try:
            with self.assertRaises(HTTPException) as ctx:
                await user_service.verify_email({"username": "admin"}, "000000")
        finally:
            user_service.user_collection = original_users
            user_service.password_otps_collection = original_otps

        self.assertEqual(ctx.exception.status_code, 400)
        self.assertEqual(ctx.exception.detail, "Invalid OTP. 4 attempt(s) remaining.")
        self.assertTrue(fake_users.docs[0]["active"])
        self.assertEqual(fake_otps.docs[0]["attempts"], 1)
        self.assertEqual(fake_otps.docs[0]["status"], "PENDING")

    async def test_invalid_otp_blocks_record_without_deactivating_user(self):
        from app.models.auth import UserRole
        from app.services import user_service
        from app.utils.messages import Messages

        now = datetime.now()
        user = {
            "_id": "user-1",
            "username": "admin",
            "firstname": "Admin",
            "lastname": "User",
            "email": "admin@example.com",
            "password": "hash",
            "active": True,
            "role": UserRole.ADMIN,
            "created_at": now,
            "updated_at": now,
        }
        otp_record = {
            "_id": "otp-1",
            "user_id": "user-1",
            "username": "admin",
            "email": "admin@example.com",
            "purpose": user_service.EMAIL_VERIFICATION_PURPOSE,
            "otp_hash": user_service._secret_hash("123456"),
            "status": "PENDING",
            "expires_at": now + timedelta(minutes=10),
            "attempts": 4,
            "max_attempts": 5,
            "created_at": now,
            "updated_at": now,
        }

        original_users = user_service.user_collection
        original_otps = user_service.password_otps_collection
        fake_users = FakeCollection([user])
        fake_otps = FakeCollection([otp_record])
        user_service.user_collection = fake_users
        user_service.password_otps_collection = fake_otps

        try:
            with self.assertRaises(HTTPException) as ctx:
                await user_service.verify_email({"username": "admin"}, "000000")
        finally:
            user_service.user_collection = original_users
            user_service.password_otps_collection = original_otps

        self.assertEqual(ctx.exception.status_code, 400)
        self.assertEqual(ctx.exception.detail, Messages.OTP_USER_BLOCKED)
        self.assertTrue(fake_users.docs[0]["active"])
        self.assertEqual(fake_otps.docs[0]["attempts"], 5)
        self.assertEqual(fake_otps.docs[0]["status"], "BLOCKED")


if __name__ == "__main__":
    unittest.main()
