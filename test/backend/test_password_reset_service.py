import importlib.util
import unittest
from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, patch

from fastapi import HTTPException

import _setup  # noqa: F401
from fakes import FakeCollection


@unittest.skipIf(
    importlib.util.find_spec("motor") is None,
    "motor is not installed",
)
class PasswordResetServiceTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        from app.models.auth import UserRole

        self.UserRole = UserRole
        self.user = {
            "_id": "user-1",
            "username": "admin",
            "email": "admin@example.com",
            "password": "old-hash",
            "active": True,
            "role": UserRole.ADMIN,
            "created_at": datetime(2026, 1, 1, tzinfo=UTC),
            "updated_at": datetime(2026, 1, 1, tzinfo=UTC),
        }

    async def test_request_password_reset_creates_hashed_otp_and_sends_email(self):
        from app.services import password_reset_service

        original_users = password_reset_service.users_collection
        original_otps = password_reset_service.password_otps_collection
        fake_users = FakeCollection([self.user])
        fake_otps = FakeCollection([])
        password_reset_service.users_collection = fake_users
        password_reset_service.password_otps_collection = fake_otps

        try:
            with patch.object(
                password_reset_service,
                "send_password_reset_otp",
                new=AsyncMock(return_value={"sent": True}),
            ) as send_mock:
                result = await password_reset_service.request_password_reset_otp("admin@example.com")
        finally:
            password_reset_service.users_collection = original_users
            password_reset_service.password_otps_collection = original_otps

        self.assertTrue(result["sent"])
        self.assertEqual(len(fake_otps.inserted), 1)
        record = fake_otps.inserted[0]
        self.assertEqual(record["status"], "PENDING")
        self.assertNotIn("otp", record)
        self.assertEqual(len(record["otp_hash"]), 64)
        if "dev_otp" in result:
            self.assertEqual(
                password_reset_service._secret_hash(result["dev_otp"]),
                record["otp_hash"],
            )
        send_mock.assert_awaited_once()

    async def test_request_password_reset_is_generic_for_unknown_user(self):
        from app.services import password_reset_service

        original_users = password_reset_service.users_collection
        original_otps = password_reset_service.password_otps_collection
        fake_otps = FakeCollection([])
        password_reset_service.users_collection = FakeCollection([])
        password_reset_service.password_otps_collection = fake_otps

        try:
            with patch.object(
                password_reset_service,
                "send_password_reset_otp",
                new=AsyncMock(return_value={"sent": True}),
            ) as send_mock:
                result = await password_reset_service.request_password_reset_otp("missing@example.com")
        finally:
            password_reset_service.users_collection = original_users
            password_reset_service.password_otps_collection = original_otps

        self.assertEqual(result, {"sent": True})
        self.assertEqual(fake_otps.inserted, [])
        send_mock.assert_not_awaited()

    async def test_inactive_user_cannot_request_password_reset_otp(self):
        from app.services import password_reset_service

        original_users = password_reset_service.users_collection
        original_otps = password_reset_service.password_otps_collection
        inactive_user = {**self.user, "active": False}
        fake_otps = FakeCollection([])
        password_reset_service.users_collection = FakeCollection([inactive_user])
        password_reset_service.password_otps_collection = fake_otps

        try:
            with patch.object(
                password_reset_service,
                "send_password_reset_otp",
                new=AsyncMock(return_value={"sent": True}),
            ) as send_mock:
                result = await password_reset_service.request_password_reset_otp("admin")
        finally:
            password_reset_service.users_collection = original_users
            password_reset_service.password_otps_collection = original_otps

        self.assertEqual(result, {"sent": True})
        self.assertEqual(fake_otps.inserted, [])
        send_mock.assert_not_awaited()

    async def test_verify_otp_returns_reset_token_and_confirm_updates_password(self):
        from app.services import password_reset_service

        original_users = password_reset_service.users_collection
        original_otps = password_reset_service.password_otps_collection
        fake_users = FakeCollection([self.user])
        fake_otps = FakeCollection([])
        password_reset_service.users_collection = fake_users
        password_reset_service.password_otps_collection = fake_otps

        try:
            with patch.object(
                password_reset_service,
                "send_password_reset_otp",
                new=AsyncMock(return_value={"sent": True}),
            ):
                await password_reset_service.request_password_reset_otp("admin")

            otp_record = fake_otps.docs[0]
            otp_record["otp_hash"] = password_reset_service._secret_hash("123456")

            verify_result = await password_reset_service.verify_password_reset_otp("admin", "123456")
            self.assertIn("reset_token", verify_result)

            result = await password_reset_service.confirm_password_reset(
                verify_result["reset_token"],
                "new-password",
            )
        finally:
            password_reset_service.users_collection = original_users
            password_reset_service.password_otps_collection = original_otps

        self.assertEqual(result, {"updated": True})
        updated_user = fake_users.docs[0]
        self.assertNotEqual(updated_user["password"], "old-hash")
        self.assertEqual(fake_otps.docs[0]["status"], "USED")

    async def test_inactive_user_cannot_verify_password_reset_otp(self):
        from app.services import password_reset_service
        from app.utils.messages import Messages

        original_users = password_reset_service.users_collection
        original_otps = password_reset_service.password_otps_collection
        now = datetime.now(UTC).replace(tzinfo=None)
        inactive_user = {**self.user, "active": False}
        fake_otps = FakeCollection([
            {
                "_id": "otp-1",
                "user_id": "user-1",
                "username": "admin",
                "email": "admin@example.com",
                "purpose": password_reset_service.OTP_PURPOSE_PASSWORD_RESET,
                "otp_hash": password_reset_service._secret_hash("123456"),
                "status": password_reset_service.OTP_STATUS_PENDING,
                "expires_at": now + timedelta(minutes=5),
                "attempts": 0,
                "max_attempts": 5,
                "created_at": now,
                "updated_at": now,
            }
        ])
        password_reset_service.users_collection = FakeCollection([inactive_user])
        password_reset_service.password_otps_collection = fake_otps

        try:
            with self.assertRaises(HTTPException) as ctx:
                await password_reset_service.verify_password_reset_otp("admin", "123456")
        finally:
            password_reset_service.users_collection = original_users
            password_reset_service.password_otps_collection = original_otps

        self.assertEqual(ctx.exception.status_code, 400)
        self.assertEqual(ctx.exception.detail, Messages.INVALID_OTP)
        self.assertEqual(fake_otps.docs[0]["status"], password_reset_service.OTP_STATUS_PENDING)

    async def test_inactive_user_cannot_confirm_password_reset(self):
        from app.services import password_reset_service
        from app.utils.messages import Messages

        original_users = password_reset_service.users_collection
        original_otps = password_reset_service.password_otps_collection
        now = datetime.now(UTC).replace(tzinfo=None)
        reset_token = "reset-token-value"
        inactive_user = {**self.user, "active": False}
        fake_users = FakeCollection([inactive_user])
        fake_otps = FakeCollection([
            {
                "_id": "otp-1",
                "user_id": "user-1",
                "username": "admin",
                "email": "admin@example.com",
                "purpose": password_reset_service.OTP_PURPOSE_PASSWORD_RESET,
                "status": password_reset_service.OTP_STATUS_PENDING,
                "reset_token_hash": password_reset_service._secret_hash(reset_token),
                "reset_token_expires_at": now + timedelta(minutes=5),
                "created_at": now,
                "updated_at": now,
            }
        ])
        password_reset_service.users_collection = fake_users
        password_reset_service.password_otps_collection = fake_otps

        try:
            with self.assertRaises(HTTPException) as ctx:
                await password_reset_service.confirm_password_reset(reset_token, "new-password")
        finally:
            password_reset_service.users_collection = original_users
            password_reset_service.password_otps_collection = original_otps

        self.assertEqual(ctx.exception.status_code, 400)
        self.assertEqual(ctx.exception.detail, Messages.INVALID_RESET_TOKEN)
        self.assertEqual(fake_users.docs[0]["password"], "old-hash")
        self.assertEqual(fake_otps.docs[0]["status"], password_reset_service.OTP_STATUS_PENDING)

    async def test_invalid_otp_increments_attempts(self):
        from app.services import password_reset_service

        original_users = password_reset_service.users_collection
        original_otps = password_reset_service.password_otps_collection
        fake_otps = FakeCollection([])
        fake_users = FakeCollection([self.user])
        password_reset_service.users_collection = fake_users
        password_reset_service.password_otps_collection = fake_otps

        try:
            with patch.object(
                password_reset_service,
                "send_password_reset_otp",
                new=AsyncMock(return_value={"sent": True}),
            ):
                await password_reset_service.request_password_reset_otp("admin")

            with self.assertRaises(HTTPException) as ctx:
                await password_reset_service.verify_password_reset_otp("admin", "000000")
        finally:
            password_reset_service.users_collection = original_users
            password_reset_service.password_otps_collection = original_otps

        self.assertEqual(ctx.exception.status_code, 400)
        self.assertEqual(ctx.exception.detail, "Invalid OTP. 4 attempt(s) remaining.")
        self.assertTrue(fake_users.docs[0]["active"])
        self.assertEqual(fake_otps.docs[0]["attempts"], 1)

    async def test_invalid_otp_blocks_record_without_deactivating_user(self):
        from app.services import password_reset_service
        from app.utils.messages import Messages

        original_users = password_reset_service.users_collection
        original_otps = password_reset_service.password_otps_collection
        fake_otps = FakeCollection([])
        fake_users = FakeCollection([self.user])
        password_reset_service.users_collection = fake_users
        password_reset_service.password_otps_collection = fake_otps

        try:
            with patch.object(
                password_reset_service,
                "send_password_reset_otp",
                new=AsyncMock(return_value={"sent": True}),
            ):
                await password_reset_service.request_password_reset_otp("admin")

            fake_otps.docs[0]["attempts"] = 4

            with self.assertRaises(HTTPException) as ctx:
                await password_reset_service.verify_password_reset_otp("admin", "000000")
        finally:
            password_reset_service.users_collection = original_users
            password_reset_service.password_otps_collection = original_otps

        self.assertEqual(ctx.exception.status_code, 400)
        self.assertEqual(ctx.exception.detail, Messages.OTP_ATTEMPTS_EXCEEDED)
        self.assertTrue(fake_users.docs[0]["active"])
        self.assertEqual(fake_otps.docs[0]["attempts"], 5)
        self.assertEqual(fake_otps.docs[0]["status"], password_reset_service.OTP_STATUS_BLOCKED)

    async def test_verify_accepts_mongo_naive_expiry_datetime(self):
        from app.services import password_reset_service

        original_users = password_reset_service.users_collection
        original_otps = password_reset_service.password_otps_collection
        fake_otps = FakeCollection([])
        password_reset_service.users_collection = FakeCollection([self.user])
        password_reset_service.password_otps_collection = fake_otps

        try:
            with patch.object(
                password_reset_service,
                "send_password_reset_otp",
                new=AsyncMock(return_value={"sent": True}),
            ):
                await password_reset_service.request_password_reset_otp("admin")

            otp_record = fake_otps.docs[0]
            otp_record["otp_hash"] = password_reset_service._secret_hash("123456")
            otp_record["expires_at"] = datetime.now(UTC).replace(tzinfo=None) + timedelta(minutes=5)

            result = await password_reset_service.verify_password_reset_otp("admin", "123456")
        finally:
            password_reset_service.users_collection = original_users
            password_reset_service.password_otps_collection = original_otps

        self.assertIn("reset_token", result)


if __name__ == "__main__":
    unittest.main()
