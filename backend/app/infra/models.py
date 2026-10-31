from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class User(Base):
    __tablename__ = "usuarios"
    # e-mail único só entre contas ativas: uma conta excluída libera o e-mail para recadastro
    __table_args__ = (
        Index(
            "uq_usuarios_email_ativo",
            "email",
            unique=True,
            postgresql_where=text("excluido_em IS NULL"),
            sqlite_where=text("excluido_em IS NULL"),
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255))
    password_hash: Mapped[str] = mapped_column("senha_hash", String(255))
    closing_day: Mapped[int] = mapped_column("dia_fechamento", Integer, default=25)
    created_at: Mapped[datetime] = mapped_column(
        "criado_em", DateTime(timezone=True), server_default=func.now()
    )
    # Exclusão lógica: preenchida, a conta some para a API, mas usuário e lançamentos ficam
    # no banco. Desfazer é só por SQL (ver docs/dominio.md).
    deleted_at: Mapped[datetime | None] = mapped_column(
        "excluido_em", DateTime(timezone=True), nullable=True, default=None
    )

    entries: Mapped[list["Entry"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    incomes: Mapped[list["Income"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class Income(Base):
    """Renda fixa: vale de `start` até `end` (sem fim quando nulo), paga nas suas partes.
    Rendas podem se sobrepor — dois empregos somam."""

    __tablename__ = "rendas"
    __table_args__ = (CheckConstraint("fim IS NULL OR fim >= inicio", name="ck_renda_periodo"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        "usuario_id", ForeignKey("usuarios.id", ondelete="CASCADE"), index=True
    )
    start: Mapped[date] = mapped_column("inicio", Date)
    end: Mapped[date | None] = mapped_column("fim", Date, nullable=True)

    user: Mapped["User"] = relationship(back_populates="incomes")
    # selectin: todo uso da renda (resumo, tendência, lista) precisa das partes
    parts: Mapped[list["IncomePart"]] = relationship(
        back_populates="income", cascade="all, delete-orphan", order_by="IncomePart.id",
        lazy="selectin",
    )


class IncomePart(Base):
    """Um pagamento da renda: quanto, em que dia do mês e se conta no mês seguinte.
    `rule` nula é renda registrada antes de existir o dia: conta no próprio mês."""

    __tablename__ = "partes_renda"
    __table_args__ = (
        CheckConstraint("valor > 0", name="ck_parte_renda_valor"),
        CheckConstraint(
            "regra IN ('dia_fixo', 'ultimo_dia_util', 'dia_util')", name="ck_parte_renda_regra"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    income_id: Mapped[int] = mapped_column(
        "renda_id", ForeignKey("rendas.id", ondelete="CASCADE"), index=True
    )
    amount: Mapped[Decimal] = mapped_column("valor", Numeric(12, 2))
    rule: Mapped[str | None] = mapped_column("regra", String(20), nullable=True)
    day: Mapped[int | None] = mapped_column("dia", Integer, nullable=True)
    next_month: Mapped[bool] = mapped_column("mes_seguinte", Boolean, default=False)

    income: Mapped["Income"] = relationship(back_populates="parts")


class Entry(Base):
    __tablename__ = "lancamentos"
    # reimportar o mesmo extrato não pode duplicar; nulos não conflitam no Postgres
    __table_args__ = (UniqueConstraint("usuario_id", "id_importacao", name="uq_lancamento_importacao"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        "usuario_id", ForeignKey("usuarios.id", ondelete="CASCADE"), index=True
    )

    type: Mapped[str] = mapped_column("tipo", String(10))          # gasto | entrada
    amount: Mapped[float] = mapped_column("valor", Numeric(12, 2))
    description: Mapped[str] = mapped_column("descricao", String(200))
    category: Mapped[str] = mapped_column("categoria", String(50))
    date: Mapped[date] = mapped_column("data", Date, index=True)
    method: Mapped[str] = mapped_column("forma", String(10), default="avista")  # avista | credito
    installments: Mapped[int] = mapped_column("parcelas", Integer, default=1)
    # Origem quando veio de importação: "BANKID:ACCTID:FITID" do OFX. O FITID é único
    # por conta, não globalmente, por isso o prefixo. Nulo em lançamento digitado.
    import_id: Mapped[str | None] = mapped_column(
        "id_importacao", String(120), nullable=True, default=None
    )
    created_at: Mapped[datetime] = mapped_column(
        "criado_em", DateTime(timezone=True), server_default=func.now()
    )

    user: Mapped["User"] = relationship(back_populates="entries")
