---
paths:
  - "backend/**"
---

# Backend

`app/` is layered — `api/` → `domain/` → `infra/`, never upwards. The dependency rule and the
mapping to the frontend layers are in `CLAUDE.md` → **Architecture**.

- **`infra/database.py`** — SQLAlchemy engine/session (`DATABASE_URL` env var, defaults to local
  Postgres). `get_session()` is the FastAPI dependency that yields a session per request.
  `Base.metadata` carries the `naming_convention` (`pk_`, `fk_`, `uq_`, `ck_`, `ix_`, the
  SQLAlchemy pattern), so every constraint and index gets a predictable name: leave them
  unnamed in `models.py`, except a check, which takes a short name the convention completes
  (`name="periodo"` → `ck_rendas_periodo`).
- **`infra/models.py`** — five tables: `User` (email, bcrypt hash, `closing_day`), `Entry`
  (`type` gasto/entrada, `amount`, `method` avista/credito, `installments`, `category_id`),
  `Category` (`categorias`: `type`, `name`, `order`, unique on type+name — the closed lists,
  global, seeded by a migration), `Income` (the
  fixed-income history: `start`, and `end` or null for open-ended; incomes may overlap and
  sum, `ck_rendas_periodo` keeps `end >= start`) and `IncomePart` (`partes_renda`: 1 to 4 per
  income, each with `amount`, `rule` — `dia_fixo`/`dia_util`/`ultimo_dia_util`, or null for an
  income from before the payday existed — `day` and `next_month`; cascade-deleted with the
  income, loaded with it by `selectin`). `Entry.category` is a read-only property returning
  the name of `category_ref` (loaded `joined`), so the domain and the response schemas keep
  reading a name; writes go through `category_id` — `Entry(category=...)` or
  `setattr(entry, "category", ...)` fails. Attribute names are English but map explicitly onto
  the existing Portuguese DB columns (e.g. `usuarios`, `lancamentos`, `rendas`, `valor` — see **Language
  conventions**). Money columns are always
  `Numeric(12,2)`, never float. `Entry.import_id` (`id_importacao`) holds the origin of an imported
  line (`BANKID:ACCTID:FITID`) and is null for a typed entry; the `uq_lancamentos_usuario_id_id_importacao`
  constraint on (`usuario_id`, `id_importacao`) is what stops a re-imported statement from
  duplicating rows — nulls don't collide in Postgres. `User.deleted_at` (`excluido_em`) is the
  soft delete: filled in, the account is gone for the API but the row and its entries stay.
  That is why `email` has no plain `unique`: the partial unique index `ix_usuarios_email`
  (`WHERE excluido_em IS NULL`) keeps it unique only among active accounts, so a deleted
  account's email can register again. Any lookup by email must filter `deleted_at IS NULL` —
  there can be more than one row with it (`_active_user` in `api/auth.py`).
- **`api/schemas.py`** — Pydantic request/response contracts, using `Decimal` for all money fields
  (mirrors the DB `Numeric` columns — never switch these to `float`). `Summary`, `Invoice`,
  `InvoiceInstallment`, `CategoryBreakdown`, `CategoryItem` and `IncomePayment` have a twin dataclass in
  `domain/service.py` with the same field names: the router returns the dataclass and
  `response_model` converts it. Rename a field and you rename it in both, then regenerate the frontend types.
- **`infra/security.py`** — bcrypt password hashing and JWT issuance/verification (`JWT_SECRET` env
  var, `HS256`, 7-day expiry). No FastAPI import: `user_id_from_token` returns `None` for a bad
  token and lets the caller decide the HTTP answer. The module **refuses to import** when
  `JWT_SECRET` is missing or shorter than `MIN_SECRET_BYTES` (32, the RFC 7518 floor for HS256), so
  the app cannot start signing tokens with a predictable value.
- **`api/deps.py`** — the FastAPI dependencies built on top of it. `current_user` resolves the
  current user from the bearer token (401 otherwise, also for a deleted account); every
  protected endpoint depends on it.
  It also holds the login attempt limiter (`ensure_login_allowed` / `record_failed_login` /
  `clear_failed_logins`): 5 failures per origin+account inside a 15-minute window, counted in
  memory — one process only, resets on restart. It lives here, not in `infra/`, because it
  answers 429. `DELETE /auth/me` checks the password again and feeds the same key, so a wrong
  password there counts against login too (and answers 403, not 401, which would make the
  frontend drop the session).
- **`domain/service.py`** — the business rules, written as pure functions with no DB import
  (`Entry`/`Income`/`IncomePart`/`User` are only imported under `TYPE_CHECKING`) and no API import (results are its own
  dataclasses, not Pydantic), so they're unit-testable without a running Postgres.
  `invoice_for_purchase`, `split_installments`, `build_invoices` / `calculate_invoice`,
  `payment_date` / `income_payments` / `next_payment`, `calculate_summaries` /
  `calculate_summary`, `calculate_category_breakdown`, `normalize_category` (matches a name
  against the names of its type, ignoring case, surrounding spaces and accents; the caller
  passes the names, read from the database).
  `calculate_summaries` is where the accumulated balance lives: one running sum from the
  oldest entry or income up to the latest month asked, so `/trend` computes the series once;
  `calculate_summary` is the one-month call of it. `payment_date` is the credit date of a
  payday rule in a month: it counts business days the CLT way and moves the result back to the
  previous day with banks open — which can land in the month before. `_calendar(year)`
  (cached) builds both calendars from the `holidays` lib: legal national holidays (they stop a
  business day) and, on top, Carnival Monday/Tuesday and Corpus Christi (`OPTIONAL` category,
  looked up by their English name — only banks close). `income_payments` is the income that
  counts in a month, `next_payment` the next date of one part, for the Renda screen. See
  `docs/dominio.md` for what each rule means. `calculate_category_breakdown` is the only place that groups spending by category —
  `calculate_summary` used to do it too and no longer does. `tests/test_service.py` exercises all of
  them with dataclass stubs and no database at all; add the test in the same commit as the rule.
- **`domain/ofx.py`** — reads a bank statement in OFX and returns proposed entries
  (`parse_statement(bytes) -> list[ImportedEntry]`). Pure like `service.py`: no DB, no
  category (whoever imports picks it on review). Two things that look arbitrary and aren't:
  the date is converted to `America/Sao_Paulo` before `.date()` because `ofxtools` normalizes
  `DTPOSTED` to UTC and throws the declared offset away (a 30/09 22:00 purchase would land in
  October); and gasto/entrada comes from the sign of `TRNAMT`, not from `TRNTYPE`, which is
  descriptive and varies between banks. A file carrying a **credit-card** statement is refused
  whole, even alongside an account statement — the fatura is already derived from
  `method == "credito"` entries, so importing it would count the same expense twice, and
  importing only the account part would drop the card part in silence. Investment statements
  are refused the same way. Imported lines are always à vista: `EntryImport` has no `method`
  or `installments`, and `POST /imports` answers 422 if they are sent.
- **`tests/`** — `pytest` from `backend/` (config in `pyproject.toml`). `test_service.py` needs
  nothing and `test_ofx.py` needs nothing either — its OFX fixtures are strings inside the
  test file, not `.ofx` on disk, because `*.ofx` is gitignored (a statement is bank data and
  never enters the repository). `test_api.py` does need a database: it boots the app against
  sqlite, or against Postgres when `TEST_DATABASE_URL` is set. `test_migrations.py` runs only
  on Postgres (skipped on sqlite) — see the `alembic/` item. Each test builds its own engine, and `conftest.py`
  disposes of it after the `TestClient`: left open, the pools ran the Postgres suite out of
  connections ("too many clients already") — a new fixture that creates an engine does the
  same. `conftest.py` also seeds the `categorias` table after `create_all`, importing the
  `CATEGORIES` constant from the migration that created it — sqlite runs no migrations, so
  the table would be empty and every entry write a 422. A migration that changes the lists
  must update that import. Install with
  `pip install -r requirements-dev.txt` — dev dependencies live there and never reach the
  image.
- **`api/auth.py` / `api/finance.py`** — mounted at `/auth` and root respectively.
  `finance.py` loads *all* of a user's `Entry` rows into memory (`_all`) and then
  filters/aggregates in Python via `service.py`, rather than doing month filtering in SQL for
  `/summary` and `/trend` — only `/entries` filters by month at the query level. Fine at
  single-user scale; the first thing to revisit if it gets slow. Three helpers hold invariants
  that every new endpoint must reuse rather than repeat: `_owned_entry` (an `Entry` that
  belongs to the JWT user, 404 otherwise — used by `PATCH` and `DELETE`) and
  `_reject_income_on_credit` (used by create and by `PATCH`, which validates the merged
  entry, not just the fields sent). `_categories` + `_category_id` are the third: they turn the
  category name sent by the client into the id of the category of the entry's type, or answer
  422 — create, `PATCH` (on the merged entry) and every import line before any is written.
  `GET /categories` returns the lists. The client never sends `category_id`: the input schemas
  refuse it with 422 (`_reject_category_id` in `schemas.py`, skipped for `EntryOut`, which
  inherits from `EntryCreate` and does carry it). `_owned_income` is the income twin of `_owned_entry`, and
  `_reject_duplicate_income` answers 409 for an income equal to another (period and parts)
  unless `allow_duplicate=true`. Every month in a path or query goes through the `MONTH`
  pattern, and every date (`today`, an income's `start`/`end`) is held to the same years:
  1900–2199, because the accumulated balance walks month by month, and year 0001 or 9999 kept
  a request busy for seconds. Every id in a path is typed `Id` (`le=2**31 - 1`): ids are
  Postgres `integer`, and a bigger one used to blow up the query as a 500.
- **`main.py`** — app entrypoint; wires CORS from `ALLOWED_ORIGINS`, includes both routers,
  exposes `/health`. It creates **no** schema: `create_all` was removed on purpose, because
  running it alongside migrations lets the code's schema drift from the database in silence.
- **`alembic/`** — owns the schema. `alembic upgrade head` runs from the Dockerfile `CMD`
  before uvicorn, so the container migrates itself on boot. Changing `models.py` means
  generating a migration in the same commit (`alembic revision --autogenerate -m "..."`), and
  `alembic check` fails when a model change has no migration. The everyday sqlite suite builds
  its schema from the models and would not notice, so two guards run that check: `./dev.sh`,
  against the dev Postgres on every start (warns in red, does not block), and
  `tests/test_migrations.py`, which applies the migrations to an empty database — Postgres
  only, since the migrations do not run on sqlite. `alembic check` does not compare PK or FK
  names, so `test_migrations.py` also compares every constraint and index name in the
  database with the models. Alembic applies the `naming_convention` to the operations of
  **every** migration, old ones included: a name in a migration goes through `op.f(...)`, as
  autogenerate writes it. It only changes the result for a check (the one convention that
  uses the given name — without it `ck_renda_periodo` came out `ck_rendas_ck_renda_periodo`),
  but the old migrations carry it on every name so a fresh database and an existing one get
  the same names at every revision. `backend/alembic` is mounted into the API
  container, so a new migration needs only `docker compose restart api`; a new dependency in
  `requirements.txt` still needs `--build`. `alembic/versions/` is excluded from ruff
  (generated from a template) but `alembic/env.py` is linted; `env.py` imports `DATABASE_URL`
  from `infra/database.py` rather than repeating the connection string.

## Reminders that apply here

- Money stays `Decimal` / `Numeric(12,2)` end to end. Never `float`.
- New business rules go in `domain/service.py` as pure functions, never inline in a router.
- Nothing in `domain/` or `infra/` imports FastAPI or `api/`. An `HTTPException` or a `Depends`
  belongs in `api/`.
- Every `Entry` read/write scopes by `user.id` from the JWT.
- Changing `infra/models.py` means generating the Alembic migration in the same commit. Nothing
  creates schema at boot any more, so a model without a migration breaks the deploy —
  `./dev.sh` warns about it on start, the sqlite test suite does not.
- Changing a Pydantic schema means regenerating `frontend/src/shared/api-schema.d.ts` in the same
  commit: `docker compose restart api` (the container runs without `--reload`, so it still
  serves the old OpenAPI), then `cd frontend && npm run gen:types`. A note about a field goes in
  `Field(description=...)` — it reaches `/docs` and the generated type.
- Read `docs/dominio.md` before touching `service.py`.
