"""initial empty schema

Revision ID: 2fb31339405c
Revises: 
Create Date: 2026-05-14 14:00:32.365880
"""
from collections.abc import Sequence

revision: str = '2fb31339405c'
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
