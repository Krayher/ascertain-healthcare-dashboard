"""align with SPEC: merge name/contact, rename last_visit, drop author, add note.timestamp

Revision ID: 8a3c4f9d12e0
Revises: 461c2be277df
Create Date: 2026-05-15 09:00:00.000000
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "8a3c4f9d12e0"
down_revision: str | None = "461c2be277df"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # --- patients: merge first_name/last_name into name; phone/email into contact; rename last_visit_at ---
    op.drop_index("ix_patients_last_name_first_name", table_name="patients")

    op.add_column("patients", sa.Column("name", sa.String(length=160), nullable=True))
    op.add_column("patients", sa.Column("contact", sa.String(length=200), nullable=True))

    # Backfill: build "First Last" and "phone | email" (email may be NULL).
    op.execute(
        "UPDATE patients SET name = TRIM(first_name || ' ' || last_name)"
    )
    op.execute(
        "UPDATE patients SET contact = CASE "
        "WHEN email IS NULL OR email = '' THEN phone "
        "ELSE phone || ' | ' || email END"
    )

    op.alter_column("patients", "name", nullable=False)
    op.alter_column("patients", "contact", nullable=False)
    op.create_index("ix_patients_name", "patients", ["name"], unique=False)

    op.drop_column("patients", "first_name")
    op.drop_column("patients", "last_name")
    op.drop_column("patients", "phone")
    op.drop_column("patients", "email")

    op.alter_column("patients", "last_visit_at", new_column_name="last_visit")

    # --- notes: drop author; add timestamp (backfilled from created_at) ---
    op.add_column(
        "notes",
        sa.Column(
            "timestamp",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
    )
    op.execute("UPDATE notes SET timestamp = created_at")
    op.alter_column("notes", "timestamp", nullable=False)
    op.drop_column("notes", "author")


def downgrade() -> None:
    # Restore author column (best-effort: a single literal can't recover original values).
    op.add_column(
        "notes",
        sa.Column("author", sa.String(length=120), nullable=True),
    )
    op.execute("UPDATE notes SET author = 'unknown'")
    op.alter_column("notes", "author", nullable=False)
    op.drop_column("notes", "timestamp")

    op.alter_column("patients", "last_visit", new_column_name="last_visit_at")

    op.add_column("patients", sa.Column("first_name", sa.String(length=80), nullable=True))
    op.add_column("patients", sa.Column("last_name", sa.String(length=80), nullable=True))
    op.add_column("patients", sa.Column("phone", sa.String(length=40), nullable=True))
    op.add_column("patients", sa.Column("email", sa.String(length=160), nullable=True))

    # Best-effort split: everything before the first space → first_name, rest → last_name.
    op.execute(
        "UPDATE patients SET "
        "first_name = COALESCE(SPLIT_PART(name, ' ', 1), name), "
        "last_name  = COALESCE(NULLIF(SUBSTRING(name FROM POSITION(' ' IN name) + 1), ''), '')"
    )
    op.execute(
        "UPDATE patients SET "
        "phone = COALESCE(SPLIT_PART(contact, ' | ', 1), contact), "
        "email = NULLIF(SPLIT_PART(contact, ' | ', 2), '')"
    )

    op.alter_column("patients", "first_name", nullable=False)
    op.alter_column("patients", "last_name", nullable=False)
    op.alter_column("patients", "phone", nullable=False)

    op.drop_index("ix_patients_name", table_name="patients")
    op.drop_column("patients", "name")
    op.drop_column("patients", "contact")

    op.create_index(
        "ix_patients_last_name_first_name",
        "patients",
        ["last_name", "first_name"],
        unique=False,
    )
