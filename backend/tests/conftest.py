"""Fixtures compartilhadas.

`service.py` não importa nada do banco — `Entry` e `User` só existem lá sob
TYPE_CHECKING. Por isso os testes de regra de negócio usam dublês simples, sem
SQLAlchemy, sem Postgres e sem sqlite.
"""
import os
from dataclasses import dataclass
from datetime import date
from decimal import Decimal

import pytest


@dataclass
class FakeEntry:
    date: date
    amount: Decimal
    type: str = "gasto"
    method: str = "avista"
    category: str = "Outros"
    description: str = "lançamento"
    installments: int = 1
    id: int = 0


@dataclass
class FakeUser:
    closing_day: int = 25


@dataclass
class FakeIncomePart:
    amount: Decimal
    rule: str | None = None
    day: int | None = None
    next_month: bool = False


@dataclass
class FakeIncome:
    start: date
    parts: list[FakeIncomePart]
    end: date | None = None


@pytest.fixture
def user():
    return FakeUser(closing_day=10)


@pytest.fixture
def renda():
    """Uma renda de uma parte só. Sem `parts`, a parte não tem regra de dia: conta no próprio
    mês, como as rendas registradas antes do dia de pagamento existir."""
    def make(month: str, amount: str = "0", end: str | None = None, parts=None):
        return FakeIncome(
            start=date.fromisoformat(f"{month}-01"),
            parts=parts or [FakeIncomePart(Decimal(amount))],
            end=date.fromisoformat(end) if end else None,
        )
    return make


@pytest.fixture
def parte():
    def make(amount: str, rule: str | None = None, day: int | None = None, next_month=False):
        return FakeIncomePart(Decimal(amount), rule, day, next_month)
    return make


@pytest.fixture
def gasto():
    def make(day: str, amount: str, **kw):
        return FakeEntry(date=date.fromisoformat(day), amount=Decimal(amount), **kw)
    return make


# --- camada de API: precisa de banco ---------------------------------------
# Cada teste recebe um sqlite novo em arquivo temporário. Ver a ressalva sobre
# sqlite vs Postgres no README da suíte.

@pytest.fixture
def client(monkeypatch, tmp_path):
    import importlib
    import sys

    # Padrão é sqlite: rápido e sem container. Apontando TEST_DATABASE_URL para um
    # Postgres, a mesma suíte roda contra o banco de verdade — é o que fecha a
    # diferença registrada em docs/dominio.md.
    url = os.getenv("TEST_DATABASE_URL", f"sqlite+pysqlite:///{tmp_path/'test.db'}")
    monkeypatch.setenv("DATABASE_URL", url)
    monkeypatch.setenv("JWT_SECRET", "0" * 64)
    for mod in [m for m in sys.modules if m.startswith("app.")]:
        del sys.modules[mod]

    from fastapi.testclient import TestClient
    main = importlib.import_module("app.main")

    # Schema limpo a cada teste. No sqlite o `tmp_path` já daria isolamento, mas
    # contra um Postgres compartilhado as linhas se acumulariam entre os testes —
    # e o isolamento passaria a depender de qual banco está em uso.
    from app.infra.database import Base, engine
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    with TestClient(main.app) as c:
        yield c
    # Cada teste reimporta o app e cria um engine novo. Sem o dispose, as conexões do pool
    # ficam abertas até o coletor de lixo, e no Postgres a suíte esgota o limite de clientes.
    engine.dispose()


@pytest.fixture
def auth(client):
    """Cria uma conta e devolve o header pronto. Aceita e-mail para testar isolamento."""
    def make(email="a@b.co", password="senha12345", **config):
        client.post("/auth/register", json={"email": email, "password": password})
        token = client.post(
            "/auth/token", data={"username": email, "password": password}
        ).json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        if config:
            client.put("/auth/me", headers=headers, json=config)
        return headers
    return make


@pytest.fixture(autouse=True)
def bcrypt_rapido(monkeypatch):
    """bcrypt é lento de propósito — é o que protege a senha. Em teste isso vira
    ~1s por login e domina a suíte inteira. Baixar o custo aqui não muda o código
    de produção: só o sal gerado durante os testes."""
    import bcrypt
    original = bcrypt.gensalt
    monkeypatch.setattr(bcrypt, "gensalt", lambda rounds=4: original(rounds=4))
