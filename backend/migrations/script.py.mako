"""${message}"""

${imports if imports else ""}

revision: str = ${repr(up_revision)}
down_revision: str = ${repr(down_revision)}
branch_labels: str | None = ${repr(branch_labels)}
depends_on: str | None = ${repr(depends_on)}

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from app.models.base import uuid7


def upgrade() -> None:
    ${upgrades if upgrades else "pass"}


def downgrade() -> None:
    ${downgrades if downgrades else "pass"}
