# Roadmap

Fila de trabalho do projeto: o que vem, e em que ordem.

O **porquê** de cada dívida técnica vive em `docs/dominio.md` → Dívidas conhecidas. Aqui
está só *quando* pretendemos pagá-la — não duplique a explicação.

Concluídos não ficam nesta lista: quando um item termina, ele sai daqui e o efeito para o
usuário é registrado no `CHANGELOG.md`.

## Em andamento

- [ ] Reavaliar o `deptry` (dependências Python declaradas e nunca importadas) quando o
      `requirements.txt` crescer. Testado em 18/09/2026 com 8 dependências: 5 achados, 5 falsos
      positivos — `uvicorn` vem do `CMD` do Dockerfile, `psycopg` da string da `DATABASE_URL`,
      `python-multipart` é importado pelo próprio FastAPI, e `pyjwt` tem nome de pacote
      diferente do módulo (`jwt`). Daria para configurar em `backend/pyproject.toml` com
      `[tool.deptry.package_module_name_map]` e `[tool.deptry.per_rule_ignores]`, mas a lista de
      ignorados vira mais uma coisa a manter em sincronia, e hoje a lista inteira de
      dependências cabe na cabeça

## Próximo

Na ordem combinada em 02/10/2026: proteger o que já existe, produto, saúde do código.

- [ ] Anotar como `Mapped[Decimal]` a coluna de dinheiro `Entry.amount` em `models.py`, hoje
      `Mapped[float]` (a `IncomePart.amount`, de 31/10/2026, já nasceu `Decimal`). A coluna é
      `Numeric` e já devolve `Decimal`, então só a anotação está errada. Achado da revisão estrutural do saldo cumulativo, 30/10/2026

## Depois

- [ ] Filtrar lançamentos no SQL em `/summary` e `/trend`, se ficar lento
- [ ] Tirar o `overrides` de `deepmerge` (fixado em 4.1.2) do `frontend/package.json` quando
      sair versão corrigida do GHSA-gcqx-w48m-w2h4. Entra pelo CLI do `shadcn`, que pede
      `^4.3.1`. Motivo em `docs/features/2026-10-26-vulnerabilidades-do-frontend.md`
- [ ] Possível refatoração: os limites do formulário de renda (4 partes, dia até 23 ou 31) estão
      repetidos em `IncomeScreen.tsx` e em `api/schemas.py`. Hoje é o mesmo padrão do dia de
      fechamento (28); vale juntar se os limites passarem a mudar. Achado da revisão estrutural
      do dia em que a renda cai, 31/10/2026
- [ ] Avaliar se o próprio usuário pode criar categorias personalizadas, além das listas fechadas.
      Viabilidade ainda não avaliada. Ficou de fora da validação da categoria no servidor,
      01/11/2026 — que criou a tabela `categorias`, hoje global (sem `usuario_id`)
- [ ] Deploy: backend em Railway / Render / Fly.io; frontend na Vercel
- [ ] Limite de tamanho de corpo no servidor (uvicorn ou proxy) antes do deploy: o 413 do
      upload de OFX só dispara depois que o corpo inteiro chegou — limita a memória do
      processo, não o tráfego

## Manutenção

Ao concluir um item: remova a linha daqui, registre no `CHANGELOG.md` e promova o próximo
para **Em andamento**, atualizando a linha correspondente no `CLAUDE.md`.
