"""Business rules: invoice, balance and trend.

Live on the server on purpose — so the website and a future native app
compute exactly the same thing.
"""
from __future__ import annotations

import calendar
import unicodedata
from collections import defaultdict
from collections.abc import Iterable
from dataclasses import dataclass, field
from datetime import date, timedelta
from decimal import Decimal
from functools import cache
from typing import TYPE_CHECKING

import holidays
from holidays.constants import OPTIONAL

if TYPE_CHECKING:  # avoids depending on the DB: the rules below are testable on their own
    from ..infra.models import Entry, Income, IncomePart, User


# Results of the rules below. Plain dataclasses, not Pydantic: the domain does not know
# the API exists. The routers return them as-is and `response_model` turns them into the
# matching schemas in `api/schemas.py`, which keep the same field names.


@dataclass
class InvoiceInstallment:
    entry_id: int
    description: str
    category: str
    purchase_date: date
    installment: int
    total_installments: int
    installment_amount: Decimal


@dataclass
class Invoice:
    month: str
    total: Decimal
    items: list[InvoiceInstallment]


@dataclass
class CategoryItem:
    """One line inside a category. `installment` is None for cash expenses."""

    description: str
    amount: Decimal
    installment: int | None = None
    total_installments: int | None = None


@dataclass
class CategoryBreakdown:
    category: str
    total: Decimal
    share: Decimal
    items: list[CategoryItem]


@dataclass
class IncomePayment:
    """One payment of a fixed income that counts in a month. `date` is when the money arrives
    (None for an income registered before payment days existed); `next_month` says it was paid
    in the month before and counts in this one."""

    date: date | None
    amount: Decimal
    next_month: bool


@dataclass
class Summary:
    """`month_balance` is the month on its own; `available_balance` carries every month
    before it too (the accumulated balance)."""

    month: str
    monthly_income: Decimal
    extra_income: Decimal
    cash_expenses: Decimal
    invoice: Decimal
    total_spent: Decimal
    month_balance: Decimal
    available_balance: Decimal
    income_payments: list[IncomePayment] = field(default_factory=list)

CENT = Decimal("0.01")
SHARE = Decimal("0.0001")


def month_key(d: date) -> str:
    return f"{d.year:04d}-{d.month:02d}"


def month_start(key: str) -> date:
    year, month = map(int, key.split("-"))
    return date(year, month, 1)


def shift_month(key: str, n: int) -> str:
    year, month = map(int, key.split("-"))
    total = year * 12 + (month - 1) + n
    return f"{total // 12:04d}-{total % 12 + 1:02d}"


def is_income_on_credit(entry_type: str, method: str | None) -> bool:
    """An entrada never goes on the credit card — receiving money on it makes no sense here."""
    return entry_type == "entrada" and method == "credito"


def _fold(text: str) -> str:
    """Ignores case, accents and surrounding spaces: "  saude" and "Saúde" compare equal."""
    decomposed = unicodedata.normalize("NFD", text.strip().casefold())
    return "".join(c for c in decomposed if not unicodedata.combining(c))


def normalize_category(category: str, allowed: Iterable[str]) -> str | None:
    """The category as spelled in `allowed` (the names of its type, read from the database by
    the caller), or None when it is not one of them."""
    return next((c for c in allowed if _fold(c) == _fold(category)), None)


def invoice_for_purchase(d: date, closing_day: int) -> str:
    """A purchase before the closing day lands on next month's invoice;
    on/after that day it skips to the month after."""
    return shift_month(month_key(d), 1 if d.day < closing_day else 2)


def split_installments(amount: Decimal, n: int) -> list[Decimal]:
    """Splits without losing a cent: the last installment absorbs the remainder."""
    base = (amount / n).quantize(CENT)
    installments = [base] * (n - 1)
    installments.append(amount - base * (n - 1))
    return installments


def build_invoices(entries: list[Entry], closing_day: int) -> dict[str, list[InvoiceInstallment]]:
    by_month: dict[str, list[InvoiceInstallment]] = defaultdict(list)
    for e in entries:
        if e.method != "credito":
            continue
        start = invoice_for_purchase(e.date, closing_day)
        for i, amount in enumerate(split_installments(Decimal(e.amount), e.installments)):
            by_month[shift_month(start, i)].append(
                InvoiceInstallment(
                    entry_id=e.id,
                    description=e.description,
                    category=e.category,
                    purchase_date=e.date,
                    installment=i + 1,
                    total_installments=e.installments,
                    installment_amount=amount,
                )
            )
    return by_month


def calculate_invoice(month: str, entries: list[Entry], closing_day: int) -> Invoice:
    items = build_invoices(entries, closing_day).get(month, [])
    return Invoice(month=month, total=sum((i.installment_amount for i in items), Decimal(0)), items=items)


# The highest N for "the Nth business day": the fewest business days any month between 1900
# and 2199 has under the CLT count (February 1900). Any N up to it exists in every month.
MAX_NTH_BUSINESS_DAY = 23


@cache
def _calendar(year: int) -> tuple[frozenset[date], frozenset[date]]:
    """(legal national holidays, days without banks) for a year.

    Carnival Monday and Tuesday and Corpus Christi are not holidays by law, so the CLT count
    treats them as business days, but banks do not credit on them."""
    legal = frozenset(holidays.Brazil(years=year))
    optional = holidays.Brazil(years=year, categories=(OPTIONAL,), language="en_US")
    no_bank = legal | frozenset(optional.get_named("Carnival") + optional.get_named("Corpus Christi"))
    return legal, no_bank


def _is_business_day(d: date) -> bool:
    """The CLT count (IN MTP 2/2021, art. 14): Saturday counts, Sunday and holidays do not."""
    return d.weekday() != 6 and d not in _calendar(d.year)[0]


def _bank_day_on_or_before(d: date) -> date:
    """Money arrives on a weekday with banks open; anything else is paid the bank day before."""
    while d.weekday() >= 5 or d in _calendar(d.year)[1]:
        d -= timedelta(days=1)
    return d


def payment_date(rule: str, day: int | None, year: int, month: int) -> date:
    """When a part paid in `year`/`month` arrives.

    `dia_fixo` is that day of the month (the last one when the month is shorter); `dia_util`
    is the Nth business day by the CLT count; `ultimo_dia_util` is the last one. Whatever
    the rule gives is then moved back to the nearest day the bank credits — a Saturday 5th
    business day is paid on Friday, and so is a fixed day falling on a weekend."""
    last = calendar.monthrange(year, month)[1]
    if rule == "dia_fixo":
        target = date(year, month, min(day, last))
    elif rule == "dia_util":
        days = (date(year, month, n) for n in range(1, last + 1))
        target = [d for d in days if _is_business_day(d)][day - 1]
    else:  # ultimo_dia_util
        target = date(year, month, last)
    return _bank_day_on_or_before(target)


def _paid_on(part: IncomePart, paid_in: str) -> date | None:
    year, month = map(int, paid_in.split("-"))
    return payment_date(part.rule, part.day, year, month) if part.rule else None


def _within(income: Income, d: date) -> bool:
    return income.start <= d and (income.end is None or d <= income.end)


def income_payments(month: str, incomes: list[Income]) -> list[IncomePayment]:
    """The payments that count in `month`: those paid in it, and those paid in the month before
    by a part marked `next_month`. A payment counts when its date falls inside its income's
    period. A part without a rule (registered before payment days existed) is taken as paid on
    the 1st and counted in its own month, which is how incomes worked until then."""
    payments = []
    for income in incomes:
        for part in income.parts:
            paid_in = shift_month(month, -1) if part.next_month else month
            paid_on = _paid_on(part, paid_in)
            if _within(income, paid_on or month_start(paid_in)):
                payments.append(IncomePayment(paid_on, Decimal(part.amount), part.next_month))
    return sorted(payments, key=lambda p: p.date or date.min)


def next_payment(income: Income, part: IncomePart, today: date) -> date | None:
    """The first date on or after `today` this part pays, inside its income's period.
    None when the income has ended or the part has no rule."""
    if not part.rule:
        return None
    paid_in = max(month_key(today), month_key(income.start))
    # the date may move back into the month before, so the first month asked can fall short
    for _ in range(3):
        paid_on = _paid_on(part, paid_in)
        if income.end is not None and paid_on > income.end:
            return None
        if paid_on >= today and _within(income, paid_on):
            return paid_on
        paid_in = shift_month(paid_in, 1)
    return None


def calculate_summaries(
    months: list[str], user: User, entries: list[Entry], incomes: list[Income]
) -> list[Summary]:
    """One summary per month in `months`, each with the balance accumulated up to it."""
    invoices = build_invoices(entries, user.closing_day)
    by_month: dict[str, list[Entry]] = defaultdict(list)
    for e in entries:
        by_month[month_key(e.date)].append(e)

    def month_summary(month: str) -> Summary:
        this_month = by_month.get(month, [])
        payments = income_payments(month, incomes)
        income = sum((p.amount for p in payments), Decimal(0))
        extra_income = sum(
            (Decimal(e.amount) for e in this_month if e.type == "entrada"), Decimal(0)
        )
        cash_expenses = sum(
            (Decimal(e.amount) for e in this_month if e.type == "gasto" and e.method == "avista"),
            Decimal(0),
        )
        invoice = sum((i.installment_amount for i in invoices.get(month, [])), Decimal(0))
        balance = income + extra_income - cash_expenses - invoice
        return Summary(
            month=month,
            monthly_income=income,
            extra_income=extra_income,
            cash_expenses=cash_expenses,
            invoice=invoice,
            total_spent=cash_expenses + invoice,
            month_balance=balance,
            available_balance=balance,
            income_payments=payments,
        )

    # Before the first entry and the first income start every month adds zero (an installment
    # falls after its purchase, and a payment never before its income starts — at most in the
    # month after), so the running sum may start there without changing the result.
    computed: dict[str, Summary] = {}
    starts = [*by_month, *(month_key(i.start) for i in incomes)]
    if starts and months:
        current, total = min(starts), Decimal(0)
        while current <= max(months):
            summary = month_summary(current)
            total += summary.month_balance
            summary.available_balance = total
            computed[current] = summary
            current = shift_month(current, 1)

    # a month before every start accumulates zero, and month_summary already says so
    return [computed.get(month) or month_summary(month) for month in months]


def calculate_summary(
    month: str, user: User, entries: list[Entry], incomes: list[Income]
) -> Summary:
    return calculate_summaries([month], user, entries, incomes)[0]


def calculate_category_breakdown(
    month: str, user: User, entries: list[Entry]
) -> list[CategoryBreakdown]:
    """Spending of the month grouped by category, one line per item.

    Uses the same split as `calculate_summary`: cash expenses made in the month, plus
    the installments of the invoice that falls due in it — which is why a purchase from
    another month shows up here. The totals add up to that month's `total_spent`.
    """
    grouped: dict[str, list[CategoryItem]] = defaultdict(list)

    for e in entries:
        if month_key(e.date) == month and e.type == "gasto" and e.method == "avista":
            grouped[e.category].append(
                CategoryItem(description=e.description, amount=Decimal(e.amount))
            )

    for item in calculate_invoice(month, entries, user.closing_day).items:
        grouped[item.category].append(
            CategoryItem(
                description=item.description,
                amount=item.installment_amount,
                installment=item.installment,
                total_installments=item.total_installments,
            )
        )

    spent = sum((i.amount for items in grouped.values() for i in items), Decimal(0))

    breakdown = []
    for category, items in grouped.items():
        total = sum((i.amount for i in items), Decimal(0))
        breakdown.append(
            CategoryBreakdown(
                category=category,
                total=total,
                share=(total / spent).quantize(SHARE) if spent else Decimal(0),
                items=sorted(items, key=lambda i: i.amount, reverse=True),
            )
        )
    return sorted(breakdown, key=lambda c: c.total, reverse=True)
