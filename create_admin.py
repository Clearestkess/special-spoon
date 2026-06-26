#!/usr/bin/env python3
"""
Standalone script to create or promote an admin user.
Works with both SQLite and PostgreSQL backends.

Usage:
    python create_admin.py --email admin@example.com --password MyPass123
    python create_admin.py --email admin@example.com --password MyPass123 --first Admin --last User
"""
import argparse
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from app import (
    DB_BACKEND, commit, ensure_user_bootstrap, execute,
    generate_password_hash, init_db, iso_now, query_one,
    app,
)


def main():
    parser = argparse.ArgumentParser(description="Create or promote an admin user")
    parser.add_argument("--email",    required=True,  help="Admin email address")
    parser.add_argument("--password", required=True,  help="Admin password")
    parser.add_argument("--first",    default="Admin", help="First name (default: Admin)")
    parser.add_argument("--last",     default="User",  help="Last name (default: User)")
    args = parser.parse_args()

    with app.app_context():
        init_db()

        existing = query_one("SELECT id, role FROM users WHERE email = ?", (args.email,))
        if existing:
            execute(
                "UPDATE users SET role = 'admin', password_hash = ? WHERE id = ?",
                (generate_password_hash(args.password), existing["id"]),
            )
            commit()
            print(f"✅ Updated existing user → role=admin  (id={existing['id']}, email={args.email})")
        else:
            execute(
                "INSERT INTO users (first_name, last_name, email, password_hash, country, phone, created_at, role)"
                " VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (args.first, args.last, args.email, generate_password_hash(args.password),
                 "Internal", "", iso_now(), "admin"),
            )
            commit()
            new_user = query_one("SELECT id FROM users WHERE email = ?", (args.email,))
            ensure_user_bootstrap(new_user["id"])
            print(f"✅ Created new admin user  (id={new_user['id']}, email={args.email})")

        print(f"   Backend: {DB_BACKEND}")
        print("   Done. You can now log in at /login.html")


if __name__ == "__main__":
    main()
