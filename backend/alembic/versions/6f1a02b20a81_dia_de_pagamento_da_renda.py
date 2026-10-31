"""dia de pagamento da renda

Revision ID: 6f1a02b20a81
Revises: 580bb2fb1f8d
Create Date: 2026-10-31 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6f1a02b20a81'
down_revision: Union[str, Sequence[str], None] = '580bb2fb1f8d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('partes_renda',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('renda_id', sa.Integer(), nullable=False),
    sa.Column('valor', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('regra', sa.String(length=20), nullable=True),
    sa.Column('dia', sa.Integer(), nullable=True),
    sa.Column('mes_seguinte', sa.Boolean(), nullable=False),
    sa.CheckConstraint('valor > 0', name='ck_parte_renda_valor'),
    sa.CheckConstraint("regra IN ('dia_fixo', 'ultimo_dia_util', 'dia_util')", name='ck_parte_renda_regra'),
    sa.ForeignKeyConstraint(['renda_id'], ['rendas.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_partes_renda_renda_id'), 'partes_renda', ['renda_id'], unique=False)
    op.add_column('rendas', sa.Column('inicio', sa.Date(), nullable=True))
    op.add_column('rendas', sa.Column('fim', sa.Date(), nullable=True))

    # Até aqui uma renda valia até começar a próxima. Esse fim implícito vira o fim explícito
    # de cada uma: sem ele, as rendas antigas passariam a se somar.
    op.execute("""
        UPDATE rendas r SET inicio = r.mes,
               fim = (SELECT MIN(p.mes) FROM rendas p
                      WHERE p.usuario_id = r.usuario_id AND p.mes > r.mes) - 1
    """)
    # Cada renda vira uma parte sem regra de dia: conta no próprio mês, como antes, até o
    # usuário escolher o dia. Renda 0 era "parei de receber" — o fim da anterior já diz isso.
    op.execute("""
        INSERT INTO partes_renda (renda_id, valor, regra, dia, mes_seguinte)
        SELECT id, valor, NULL, NULL, false FROM rendas WHERE valor > 0
    """)
    op.execute("DELETE FROM rendas WHERE valor = 0")

    op.alter_column('rendas', 'inicio', nullable=False)
    op.drop_constraint('uq_renda_mes', 'rendas', type_='unique')
    op.drop_column('rendas', 'mes')
    op.drop_column('rendas', 'valor')
    op.create_check_constraint('ck_renda_periodo', 'rendas', 'fim IS NULL OR fim >= inicio')


def downgrade() -> None:
    """Downgrade schema."""
    # Só aproxima: o fim, os dias e a sobreposição não cabem no modelo antigo. Volta o mês de
    # início com a soma das partes, e de duas rendas no mesmo mês fica a mais antiga.
    op.add_column('rendas', sa.Column('mes', sa.Date(), nullable=True))
    op.add_column('rendas', sa.Column('valor', sa.Numeric(precision=12, scale=2), nullable=True))
    op.execute("""
        UPDATE rendas r SET mes = date_trunc('month', r.inicio)::date,
               valor = COALESCE((SELECT SUM(p.valor) FROM partes_renda p WHERE p.renda_id = r.id), 0)
    """)
    op.execute("""
        DELETE FROM rendas r USING rendas o
        WHERE o.usuario_id = r.usuario_id AND o.mes = r.mes AND o.id < r.id
    """)
    op.alter_column('rendas', 'mes', nullable=False)
    op.alter_column('rendas', 'valor', nullable=False)
    op.drop_constraint('ck_renda_periodo', 'rendas', type_='check')
    op.drop_column('rendas', 'fim')
    op.drop_column('rendas', 'inicio')
    op.create_unique_constraint('uq_renda_mes', 'rendas', ['usuario_id', 'mes'])
    op.drop_index(op.f('ix_partes_renda_renda_id'), table_name='partes_renda')
    op.drop_table('partes_renda')
