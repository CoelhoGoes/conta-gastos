"""convencao de nomes

Revision ID: 2b7c4e9d1a30
Revises: 98844844bbad
Create Date: 2026-11-01 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2b7c4e9d1a30'
down_revision: Union[str, Sequence[str], None] = '98844844bbad'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# (tabela, nome antigo, nome novo) das constraints: o padrão de `naming_convention` em
# infra/database.py. As PKs e FKs tinham o nome que o Postgres dá; as únicas e os checks, um
# nome à mão.
CONSTRAINTS = [
    ('usuarios', 'usuarios_pkey', 'pk_usuarios'),
    ('lancamentos', 'lancamentos_pkey', 'pk_lancamentos'),
    ('rendas', 'rendas_pkey', 'pk_rendas'),
    ('partes_renda', 'partes_renda_pkey', 'pk_partes_renda'),
    ('categorias', 'categorias_pkey', 'pk_categorias'),
    ('lancamentos', 'lancamentos_usuario_id_fkey', 'fk_lancamentos_usuario_id_usuarios'),
    ('lancamentos', 'lancamentos_categoria_id_fkey', 'fk_lancamentos_categoria_id_categorias'),
    ('rendas', 'rendas_usuario_id_fkey', 'fk_rendas_usuario_id_usuarios'),
    ('partes_renda', 'partes_renda_renda_id_fkey', 'fk_partes_renda_renda_id_rendas'),
    ('lancamentos', 'uq_lancamento_importacao', 'uq_lancamentos_usuario_id_id_importacao'),
    ('categorias', 'uq_categoria_tipo_nome', 'uq_categorias_tipo_nome'),
    ('rendas', 'ck_renda_periodo', 'ck_rendas_periodo'),
    ('partes_renda', 'ck_parte_renda_valor', 'ck_partes_renda_valor'),
    ('partes_renda', 'ck_parte_renda_regra', 'ck_partes_renda_regra'),
]
# o índice único parcial do e-mail entre contas ativas
INDEXES = [('uq_usuarios_email_ativo', 'ix_usuarios_email')]


def _rename(constraints, indexes):
    """Confere que todo nome de origem existe antes de renomear: um banco mexido à mão para
    a migração inteira, em vez de sair com metade dos nomes trocados."""
    conn = op.get_bind()
    have = set(conn.execute(sa.text(
        "SELECT conname FROM pg_constraint WHERE connamespace = 'public'::regnamespace"
    )).scalars())
    have |= set(conn.execute(sa.text(
        "SELECT indexname FROM pg_indexes WHERE schemaname = 'public'"
    )).scalars())
    missing = sorted(({old for _, old, _ in constraints} | {old for old, _ in indexes}) - have)
    if missing:
        raise RuntimeError(
            f"Constraints ou índices não encontrados: {', '.join(missing)}. "
            "Confira os nomes no banco antes de aplicar esta migração."
        )
    for table, old, new in constraints:
        op.execute(f'ALTER TABLE {table} RENAME CONSTRAINT {old} TO {new}')
    for old, new in indexes:
        op.execute(f'ALTER INDEX {old} RENAME TO {new}')


def upgrade() -> None:
    """Upgrade schema."""
    _rename(CONSTRAINTS, INDEXES)


def downgrade() -> None:
    """Downgrade schema."""
    _rename([(t, new, old) for t, old, new in CONSTRAINTS], [(new, old) for old, new in INDEXES])
