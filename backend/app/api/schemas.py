import datetime
from datetime import date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator

from ..domain.service import MAX_NTH_BUSINESS_DAY


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class UserConfig(BaseModel):
    closing_day: int = Field(ge=1, le=28)


class AccountDelete(BaseModel):
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: EmailStr
    closing_day: int


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class EntryBase(BaseModel):
    """O que todo lançamento tem, digitado ou importado."""

    type: Literal["gasto", "entrada"]
    # max_digits: o mesmo Numeric(12,2) da coluna; acima disso o Postgres recusaria com 500
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    description: str = Field(min_length=1, max_length=200)
    category: str = Field(min_length=1, max_length=50)
    date: date


class EntryCreate(EntryBase):
    method: Literal["avista", "credito"] = "avista"
    installments: int = Field(default=1, ge=1, le=48)


class EntryUpdate(BaseModel):
    """Alteração parcial: só os campos enviados mudam.

    Os limites de cada campo não se repetem aqui: o endpoint junta o que chegou com o
    lançamento atual e valida o resultado inteiro como `EntryCreate`. É isso que pega o
    PATCH que só troca `type` para entrada num lançamento que está no crédito.
    `import_id` fica de fora de propósito — é a origem da linha, e mudá-lo quebraria a
    deduplicação da importação.
    """

    type: Literal["gasto", "entrada"] | None = None
    amount: Decimal | None = None
    description: str | None = None
    category: str | None = None
    # `datetime.date`, não `date`: numa anotação com valor padrão o Python atribui o
    # valor antes de avaliar a anotação, e o campo `date` já sombreia o tipo.
    date: datetime.date | None = None
    method: Literal["avista", "credito"] | None = None
    installments: int | None = None


class EntryOut(EntryCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int


class InvoiceInstallment(BaseModel):
    entry_id: int
    description: str
    category: str
    purchase_date: date
    installment: int
    total_installments: int
    installment_amount: Decimal


class Invoice(BaseModel):
    month: str
    total: Decimal
    items: list[InvoiceInstallment]


class CategoryItem(BaseModel):
    """One line inside a category. `installment` is null for cash expenses."""

    description: str
    amount: Decimal
    installment: int | None = None
    total_installments: int | None = None


class CategoryBreakdown(BaseModel):
    category: str
    total: Decimal
    share: Decimal
    items: list[CategoryItem]


class IncomePayment(BaseModel):
    # `datetime.date`: o campo `date` sombreia o tipo (ver EntryUpdate)
    date: datetime.date | None = Field(
        description="Quando o dinheiro cai. Nulo para renda registrada antes de existir o dia."
    )
    amount: Decimal
    next_month: bool = Field(description="Pago no mês anterior, conta neste.")


class Summary(BaseModel):
    month: str
    monthly_income: Decimal = Field(description="A renda deste mês, pelo histórico de rendas.")
    extra_income: Decimal
    cash_expenses: Decimal
    invoice: Decimal
    total_spent: Decimal
    month_balance: Decimal = Field(description="Saldo só deste mês.")
    available_balance: Decimal = Field(
        description="Saldo acumulado: este mês somado a todos os anteriores."
    )
    income_payments: list[IncomePayment] = Field(
        description="Os pagamentos de renda fixa que contam neste mês; somam `monthly_income`."
    )


PaydayRule = Literal["dia_fixo", "ultimo_dia_util", "dia_util"]

# Os mesmos anos que a API aceita nos meses (ver MONTH em finance.py).
FIRST_DATE, LAST_DATE = datetime.date(1900, 1, 1), datetime.date(2199, 12, 31)


class IncomePartIn(BaseModel):
    # max_digits: o mesmo Numeric(12,2) da coluna; acima disso o Postgres recusaria com 500
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    rule: PaydayRule
    day: int | None = Field(
        default=None,
        description="1 a 31 para `dia_fixo`, 1 a 23 para `dia_util`, nulo para `ultimo_dia_util`.",
    )
    next_month: bool = Field(default=False, description="O pagamento conta no mês seguinte.")

    @model_validator(mode="after")
    def day_matches_rule(self):
        limit = {"dia_fixo": 31, "dia_util": MAX_NTH_BUSINESS_DAY}.get(self.rule)
        if limit is None and self.day is not None:
            raise ValueError("O último dia útil não leva dia.")
        if limit is not None and not (self.day and 1 <= self.day <= limit):
            raise ValueError(f"O dia vai de 1 a {limit}.")
        return self


class IncomeIn(BaseModel):
    start: date
    end: date | None = Field(default=None, description="Último dia em que a renda vale; nulo é sem fim.")
    parts: list[IncomePartIn] = Field(min_length=1, max_length=4)

    @model_validator(mode="after")
    def valid_period_and_parts(self):
        if any(d < FIRST_DATE or d > LAST_DATE for d in (self.start, self.end) if d):
            raise ValueError("As datas vão de 1900 a 2199.")
        if self.end and self.end < self.start:
            raise ValueError("O fim da renda vem antes do início.")
        rules = [(p.rule, p.day) for p in self.parts]
        if len(set(rules)) < len(rules):
            raise ValueError("Duas partes no mesmo dia: receber tudo num dia é uma parte só.")
        return self


class IncomePartOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    amount: Decimal
    rule: PaydayRule | None = Field(description="Nula: renda registrada antes de existir o dia.")
    day: int | None
    next_month: bool
    next_date: date | None = Field(
        description="Próxima data de pagamento a partir de hoje; nula sem regra ou com a renda encerrada."
    )


class IncomeOut(BaseModel):
    id: int
    start: date
    end: date | None
    parts: list[IncomePartOut]


class ImportPreviewItem(BaseModel):
    """Uma linha lida do extrato, antes de virar lançamento.

    Sem `category`: quem importa escolhe na revisão. `already_imported` marca o que já
    entrou numa importação anterior — a linha aparece na tela, riscada, em vez de sumir
    em silêncio.
    """

    type: Literal["gasto", "entrada"]
    amount: Decimal
    description: str
    date: date
    import_id: str
    already_imported: bool = Field(
        description="Já entrou numa importação anterior: aparece marcada, não some da lista."
    )


class EntryImport(EntryBase):
    """Linha revisada, voltando para gravação. `import_id` é o que impede duplicata.

    Sem `method` nem `installments`: linha de extrato é dinheiro que já saiu da conta,
    então é sempre à vista e em parcela única — o banco aplica os padrões da coluna.
    """

    import_id: str = Field(min_length=1, max_length=120)

    @model_validator(mode="before")
    @classmethod
    def reject_payment_fields(cls, data):
        # Recusa em vez de ignorar: sem isto o Pydantic descartaria os campos em silêncio,
        # e um cliente que manda crédito aqui nunca saberia que o pedido foi reescrito.
        if isinstance(data, dict) and {"method", "installments"} & data.keys():
            raise ValueError(
                "Lançamento importado é sempre à vista e em parcela única; "
                "não envie method nem installments."
            )
        return data


class ImportResult(BaseModel):
    """`skipped` conta o que o servidor recusou por já existir, não o que você desmarcou."""

    created: list[EntryOut]
    skipped: int = Field(
        description="Quantas o servidor recusou por já existirem — não o que você desmarcou."
    )
