"""Interactively create the initial database indexes and superadmin."""

import argparse
import asyncio
import getpass
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

LOCAL_MONGO_URL = "mongodb://localhost:27017"
DEFAULT_DATABASE_NAME = "inventory_management"


def prompt_value(
    label: str,
    default: str = "",
    *,
    required: bool = False,
    hide_default: bool = False,
) -> str:
    suffix = (
        " [configured value]"
        if default and hide_default
        else (f" [{default}]" if default else "")
    )
    while True:
        value = input(f"{label}{suffix}: ").strip() or default
        if value or not required:
            return value
        print(f"{label} is required.")


def prompt_password(default: str = "") -> str:
    if default:
        return default
    while True:
        value = getpass.getpass("Initial superadmin password: ")
        if value:
            return value
        print("Initial superadmin password is required.")


def parse_arguments(argv: list[str] | None = None):
    raw_args = list(sys.argv[1:] if argv is None else argv)
    # Also tolerate: npm run seed -- -- env prod
    raw_args = [argument for argument in raw_args if argument != "--"]
    if len(raw_args) >= 2 and raw_args[0] == "env":
        raw_args[0] = "--env"

    parser = argparse.ArgumentParser(description="Seed initial inventory data")
    parser.add_argument(
        "--env",
        dest="environment",
        help="Environment file suffix, for example local, test, or prod",
    )
    return parser.parse_args(raw_args)


def load_seed_environment(environment: str | None) -> Path | None:
    load_dotenv(BACKEND_DIR / ".env")
    if not environment:
        return None

    normalized = environment.strip().lower()
    if not normalized.replace("-", "").replace("_", "").isalnum():
        raise ValueError(
            "Environment name may contain only letters, numbers, '-' and '_'"
        )

    suffix = {
        "dev": "local",
        "development": "local",
        "production": "prod",
    }.get(normalized, normalized)
    environment_file = BACKEND_DIR / f".env.{suffix}"
    if not environment_file.is_file():
        raise FileNotFoundError(
            f"Environment file was not found: {environment_file}"
        )

    load_dotenv(environment_file, override=True)
    os.environ["ENVIRONMENT"] = suffix
    return environment_file


async def seed_database(environment: str | None = None) -> None:
    environment_file = load_seed_environment(environment)
    if environment_file:
        print(f"Using environment file: {environment_file.name}")

    configured_mongo_url = os.getenv("MONGO_URL") or LOCAL_MONGO_URL
    mongo_url = prompt_value(
        "MongoDB URL",
        configured_mongo_url,
        required=True,
        hide_default=configured_mongo_url != LOCAL_MONGO_URL,
    )
    database_name = prompt_value(
        "Database name",
        os.getenv("DB_NAME") or DEFAULT_DATABASE_NAME,
        required=True,
    )
    os.environ["MONGO_URL"] = mongo_url
    os.environ["DB_NAME"] = database_name

    from app.database.indexes import create_indexes
    from app.database.mongodb import client, db
    from app.seeds.superadmin_seed import create_default_superadmin

    try:
        await db.command("ping")
        existing_superadmin = await db.users.find_one({"role": "superadmin"})

        if existing_superadmin:
            print("An initial superadmin already exists; it will not be replaced.")
        else:
            os.environ["SUPERADMIN_USERNAME"] = prompt_value(
                "Initial superadmin username",
                os.getenv("SUPERADMIN_USERNAME") or "superadmin",
                required=True,
            )
            os.environ["SUPERADMIN_PASSWORD"] = prompt_password(
                os.getenv("SUPERADMIN_PASSWORD") or ""
            )
            os.environ["SUPERADMIN_EMAIL"] = prompt_value(
                "Initial superadmin email",
                os.getenv("SUPERADMIN_EMAIL") or "superadmin@example.com",
                required=True,
            )

        await create_indexes()
        await create_default_superadmin()
        print(f"Initial data is ready in MongoDB database '{database_name}'.")
    finally:
        client.close()


def main() -> None:
    try:
        arguments = parse_arguments()
        asyncio.run(seed_database(arguments.environment))
    except (KeyboardInterrupt, EOFError):
        print("\nSeeding cancelled.")
        raise SystemExit(1)
    except Exception as exc:
        print(f"Seeding failed: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc


if __name__ == "__main__":
    main()
