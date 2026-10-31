from dataclasses import asdict
from datetime import UTC, date, datetime
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, Query, UploadFile, status
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..domain.ofx import OFXError, parse_statement
from ..domain.service import (
    calculate_category_breakdown,
    calculate_invoice,
    calculate_summaries,
    calculate_summary,
    is_income_on_credit,
    month_key,
    next_payment,
    shift_month,
)
from ..infra.database import get_session
from ..infra.models import Entry, Income, IncomePart, User
from .deps import current_user
from .schemas import (
    CategoryBreakdown,
    EntryCreate,
    EntryImport,
    EntryOut,
    EntryUpdate,
    ImportPreviewItem,
    ImportResult,
    IncomeIn,
    IncomeOut,
    IncomePartOut,
    Invoice,
    Summary,
)

router = APIRouter(tags=["finance"])

# Anos de 1900 a 2199: o acumulado percorre mês a mês desde a primeira renda ou lançamento,
# e um ano qualquer (0001, 9999) deixaria cada requisição segundos ocupada. O ano 0000
# nem existe para o Python.
MONTH = r"^(19\d{2}|2[01]\d{2})-(0[1-9]|1[0-2])$"

# Os ids são `integer` no Postgres: um id acima disso estoura a consulta e vira 500.
Id = Annotated[int, Path(le=2**31 - 1)]

# Um extrato OFX de um mês tem alguns KB. O limite existe para que um upload grande não
# vire memória do processo antes de qualquer validação, não porque 2 MB seja apertado.
MAX_UPLOAD_BYTES = 2 * 1024 * 1024


def _all(session: Session, user: User) -> list[Entry]:
    return list(session.scalars(select(Entry).where(Entry.user_id == user.id)))


def _incomes(session: Session, user: User) -> list[Income]:
    return list(session.scalars(select(Income).where(Income.user_id == user.id)))


def _owned_income(session: Session, user: User, income_id: int) -> Income:
    """A renda, se for deste usuário — 404 nos dois casos, como `_owned_entry`."""
    income = session.get(Income, income_id)
    if not income or income.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Renda não encontrada.")
    return income


def _income_out(income: Income, today: date) -> IncomeOut:
    return IncomeOut(
        id=income.id,
        start=income.start,
        end=income.end,
        parts=[
            IncomePartOut(
                amount=p.amount, rule=p.rule, day=p.day, next_month=p.next_month,
                next_date=next_payment(income, p, today),
            )
            for p in income.parts
        ],
    )


def _income_shape(start, end, parts) -> tuple:
    """O que torna duas rendas idênticas: o período e as partes, em qualquer ordem."""
    return start, end, sorted((Decimal(p.amount), p.rule or "", p.day or 0, p.next_month) for p in parts)


def _reject_duplicate_income(
    session: Session, user: User, data: IncomeIn, allow: bool, ignore_id: int | None = None
) -> None:
    """F10: com rendas sobrepostas permitidas, um reenvio criaria uma segunda renda igual. O
    409 deixa a tela perguntar; `allow_duplicate` é a resposta "registrar mesmo assim"."""
    if allow:
        return
    wanted = _income_shape(data.start, data.end, data.parts)
    for income in _incomes(session, user):
        if income.id != ignore_id and _income_shape(income.start, income.end, income.parts) == wanted:
            raise HTTPException(status.HTTP_409_CONFLICT, "Essa renda já foi registrada.")


def _today(today: date | None) -> date:
    # UTC pelo mesmo motivo do /trend: o servidor não conhece o fuso de quem pergunta
    today = today or datetime.now(UTC).date()
    if not 1900 <= today.year <= 2199:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "A data vai de 1900 a 2199.")
    return today


def _owned_entry(session: Session, user: User, entry_id: int) -> Entry:
    """O lançamento, se for deste usuário. Lançamento alheio responde igual a
    inexistente: 404 nos dois casos, para não confirmar que o id existe."""
    entry = session.get(Entry, entry_id)
    if not entry or entry.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lançamento não encontrado.")
    return entry


def _reject_income_on_credit(data: EntryCreate) -> None:
    """Traduz a regra do domínio em 422, para criação e edição. A importação não precisa:
    `EntryImport` nem tem `method`, então uma linha importada não chega ao crédito."""
    if is_income_on_credit(data.type, data.method):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Entrada não vai no crédito.")


def _parts(data: IncomeIn) -> list[IncomePart]:
    return [IncomePart(**p.model_dump()) for p in data.parts]


def _known_import_ids(session: Session, user: User, ids: list[str]) -> set[str]:
    """Quais desses `import_id` este usuário já importou antes."""
    if not ids:
        return set()
    return set(
        session.scalars(
            select(Entry.import_id).where(Entry.user_id == user.id, Entry.import_id.in_(ids))
        )
    )


@router.post("/entries", response_model=EntryOut, status_code=201)
def create(
    data: EntryCreate,
    user: User = Depends(current_user),
    session: Session = Depends(get_session),
):
    _reject_income_on_credit(data)

    entry = Entry(user_id=user.id, **data.model_dump())
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry


@router.get("/entries", response_model=list[EntryOut])
def list_entries(
    month: str | None = Query(None, pattern=MONTH),
    user: User = Depends(current_user),
    session: Session = Depends(get_session),
):
    query = select(Entry).where(Entry.user_id == user.id)
    if month:
        year, m = map(int, month.split("-"))
        start = date(year, m, 1)
        end = date(year + (m == 12), (m % 12) + 1, 1)
        query = query.where(Entry.date >= start, Entry.date < end)
    return list(session.scalars(query.order_by(Entry.date.desc(), Entry.id.desc())))


@router.patch("/entries/{entry_id}", response_model=EntryOut)
def update(
    entry_id: Id,
    data: EntryUpdate,
    user: User = Depends(current_user),
    session: Session = Depends(get_session),
):
    entry = _owned_entry(session, user, entry_id)

    # O lançamento resultante passa pela mesma validação de um novo. Validar só o que
    # chegou deixaria passar um PATCH que troca `type` para entrada num lançamento
    # que já está no crédito.
    current = {field: getattr(entry, field) for field in EntryCreate.model_fields}
    try:
        merged = EntryCreate.model_validate(current | data.model_dump(exclude_unset=True))
    except ValidationError as exc:
        raise RequestValidationError(exc.errors()) from exc
    _reject_income_on_credit(merged)

    for field, value in merged.model_dump().items():
        setattr(entry, field, value)
    session.commit()
    session.refresh(entry)
    return entry


@router.delete("/entries/{entry_id}", status_code=204)
def remove(
    entry_id: Id,
    user: User = Depends(current_user),
    session: Session = Depends(get_session),
):
    session.delete(_owned_entry(session, user, entry_id))
    session.commit()


@router.get("/summary/{month}", response_model=Summary)
def summary(
    month: str = Path(pattern=MONTH),
    user: User = Depends(current_user),
    session: Session = Depends(get_session),
):
    return calculate_summary(month, user, _all(session, user), _incomes(session, user))


@router.get("/summary/{month}/categories", response_model=list[CategoryBreakdown])
def category_breakdown(
    month: str,
    user: User = Depends(current_user),
    session: Session = Depends(get_session),
):
    return calculate_category_breakdown(month, user, _all(session, user))


@router.get("/invoices/{month}", response_model=Invoice)
def invoice(
    month: str,
    user: User = Depends(current_user),
    session: Session = Depends(get_session),
):
    return calculate_invoice(month, _all(session, user), user.closing_day)


@router.get("/trend", response_model=list[Summary])
def trend(
    months: int = Query(6, ge=1, le=24),
    until: str | None = Query(None, pattern=MONTH),
    user: User = Depends(current_user),
    session: Session = Depends(get_session),
):
    # UTC is declared rather than inherited from the container's clock: the fallback
    # must not change meaning if a deployment happens to set TZ. Clients that care
    # about their own region send `until` instead of relying on this.
    end = until or month_key(datetime.now(UTC).date())
    wanted = [shift_month(end, -i) for i in range(months - 1, -1, -1)]
    return calculate_summaries(wanted, user, _all(session, user), _incomes(session, user))


@router.get("/incomes", response_model=list[IncomeOut])
def list_incomes(
    today: date | None = Query(None, description="Hoje para quem pergunta; sem ele, hoje em UTC."),
    user: User = Depends(current_user),
    session: Session = Depends(get_session),
):
    today = _today(today)
    incomes = sorted(_incomes(session, user), key=lambda i: (i.start, i.id))
    return [_income_out(i, today) for i in incomes]


@router.post("/incomes", response_model=IncomeOut, status_code=201)
def create_income(
    data: IncomeIn,
    allow_duplicate: bool = False,
    user: User = Depends(current_user),
    session: Session = Depends(get_session),
):
    _reject_duplicate_income(session, user, data, allow_duplicate)
    income = Income(user_id=user.id, start=data.start, end=data.end, parts=_parts(data))
    session.add(income)
    session.commit()
    session.refresh(income)
    return _income_out(income, _today(None))


@router.put("/incomes/{income_id}", response_model=IncomeOut)
def update_income(
    income_id: Id,
    data: IncomeIn,
    allow_duplicate: bool = False,
    user: User = Depends(current_user),
    session: Session = Depends(get_session),
):
    """Substitui a renda inteira. As partes antigas saem no mesmo commit (delete-orphan), então
    a renda nunca fica com só parte das partes novas (F11)."""
    income = _owned_income(session, user, income_id)
    _reject_duplicate_income(session, user, data, allow_duplicate, ignore_id=income.id)
    income.start, income.end, income.parts = data.start, data.end, _parts(data)
    session.commit()
    session.refresh(income)
    return _income_out(income, _today(None))


@router.delete("/incomes/{income_id}", status_code=204)
def remove_income(
    income_id: Id,
    user: User = Depends(current_user),
    session: Session = Depends(get_session),
):
    session.delete(_owned_income(session, user, income_id))
    session.commit()


@router.post("/imports/preview", response_model=list[ImportPreviewItem])
def preview_import(
    file: UploadFile,
    user: User = Depends(current_user),
    session: Session = Depends(get_session),
):
    """Lê o extrato e devolve o que ele contém. Não grava nada."""
    # Um byte a mais que o limite já é recusa; assim o arquivo inteiro nunca é carregado
    # só para descobrir que era grande demais.
    content = file.file.read(MAX_UPLOAD_BYTES + 1)
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status.HTTP_413_CONTENT_TOO_LARGE,
            f"Arquivo maior que {MAX_UPLOAD_BYTES // 1024 // 1024} MB. Um extrato OFX não "
            "chega perto disso — confira se o arquivo é o certo.",
        )

    try:
        lines = parse_statement(content)
    except OFXError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from exc

    known = _known_import_ids(session, user, [line.import_id for line in lines])
    return [
        ImportPreviewItem(**asdict(line), already_imported=line.import_id in known)
        for line in lines
    ]


@router.post("/imports", response_model=ImportResult, status_code=201)
def confirm_import(
    data: list[EntryImport],
    user: User = Depends(current_user),
    session: Session = Depends(get_session),
):
    """Grava as linhas revisadas, pulando o que já existe."""
    known = _known_import_ids(session, user, [item.import_id for item in data])

    created: list[Entry] = []
    seen: set[str] = set()
    for item in data:
        # `seen` cobre o duplicado dentro do próprio lote; `known`, o de importação
        # anterior. Sem os dois, a restrição única estoura como erro 500.
        if item.import_id in known or item.import_id in seen:
            continue
        seen.add(item.import_id)
        entry = Entry(user_id=user.id, **item.model_dump())
        session.add(entry)
        created.append(entry)

    session.commit()
    for entry in created:
        session.refresh(entry)
    return ImportResult(created=created, skipped=len(data) - len(created))
