"""categorias em tabela

Revision ID: 98844844bbad
Revises: 6f1a02b20a81
Create Date: 2026-11-01 14:41:55.033329

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '98844844bbad'
down_revision: Union[str, Sequence[str], None] = '6f1a02b20a81'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# As listas fechadas de docs/dominio.md, na ordem do seletor. É a única cópia no código: o
# tests/conftest.py importa daqui para semear o sqlite, que não roda migrações. Mudar a lista é
# uma migração nova, não uma edição desta.
CATEGORIES = {
    "gasto": [
        "Mercado", "Alimentação", "Transporte", "Moradia", "Contas",
        "Lazer", "Saúde", "Educação", "Assinaturas", "Outros",
    ],
    "entrada": ["Salário", "Freela", "Reembolso", "Presente", "Venda", "Outros"],
}

FK = "lancamentos_categoria_id_fkey"


def upgrade() -> None:
    """Upgrade schema."""
    categorias = op.create_table('categorias',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('tipo', sa.String(length=10), nullable=False),
    sa.Column('nome', sa.String(length=50), nullable=False),
    sa.Column('ordem', sa.Integer(), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('tipo', 'nome', name='uq_categoria_tipo_nome')
    )
    op.bulk_insert(categorias, [
        {"tipo": tipo, "nome": nome, "ordem": ordem}
        for tipo, nomes in CATEGORIES.items()
        for ordem, nome in enumerate(nomes, start=1)
    ])

    # Lançamento sem categoria correspondente para tudo: nada é reescrito em silêncio. Só o par
    # (tipo, categoria) vai na mensagem, nenhum outro dado do lançamento.
    sem_par = op.get_bind().execute(sa.text("""
        SELECT DISTINCT l.tipo, l.categoria FROM lancamentos l
        LEFT JOIN categorias c ON c.tipo = l.tipo AND c.nome = l.categoria
        WHERE c.id IS NULL ORDER BY 1, 2
    """)).all()
    if sem_par:
        pares = ", ".join(f"{tipo}/{categoria}" for tipo, categoria in sem_par)
        raise RuntimeError(
            f"Lançamentos com categoria fora da lista: {pares}. "
            "Corrija-os no banco antes de aplicar esta migração."
        )

    op.add_column('lancamentos', sa.Column('categoria_id', sa.Integer(), nullable=True))
    op.execute("""
        UPDATE lancamentos l SET categoria_id = c.id
        FROM categorias c WHERE c.tipo = l.tipo AND c.nome = l.categoria
    """)
    op.alter_column('lancamentos', 'categoria_id', nullable=False)
    op.create_index(op.f('ix_lancamentos_categoria_id'), 'lancamentos', ['categoria_id'], unique=False)
    op.create_foreign_key(FK, 'lancamentos', 'categorias', ['categoria_id'], ['id'], ondelete='RESTRICT')
    op.drop_column('lancamentos', 'categoria')


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column('lancamentos', sa.Column('categoria', sa.VARCHAR(length=50), autoincrement=False, nullable=True))
    op.execute("""
        UPDATE lancamentos l SET categoria = c.nome
        FROM categorias c WHERE c.id = l.categoria_id
    """)
    op.alter_column('lancamentos', 'categoria', nullable=False)
    op.drop_constraint(FK, 'lancamentos', type_='foreignkey')
    op.drop_index(op.f('ix_lancamentos_categoria_id'), table_name='lancamentos')
    op.drop_column('lancamentos', 'categoria_id')
    op.drop_table('categorias')
