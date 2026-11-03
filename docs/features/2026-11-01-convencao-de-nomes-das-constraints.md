# Convenção de nomes das constraints

- **Status:** concluído
- **Início:** 2026-11-01
- **Item do roadmap:** dar ao `Base` uma `naming_convention` no padrão do SQLAlchemy, com a
  migração que renomeia as PKs e FKs atuais
- **Entrada no CHANGELOG:** nenhuma — sem efeito para quem usa o app

## O que a feature entrega (1)

Nada muda para quem usa o app: telas, valores e API ficam iguais. A mudança é para quem
mexe no banco. Toda constraint passa a ter um nome previsível, que o código conhece de
antemão, e uma migração gerada pelo Alembic sai com esses nomes já preenchidos, tanto na
ida quanto na volta.

Hoje as chaves primárias e estrangeiras têm o nome que o Postgres inventa
(`lancamentos_pkey`, `rendas_usuario_id_fkey`). O código não sabe esses nomes, então a
migração gerada para uma FK nova sai com `drop_constraint(None, …)` no downgrade, e alguém
precisa corrigir à mão. Depois da feature, isso deixa de acontecer, e os bancos que já
existem são migrados para os nomes novos sem perder dado.

## Motivação (1)

Armadilha encontrada na validação da categoria no servidor
(`2026-11-01-categoria-validada-no-servidor.md` → Armadilhas, "O autogenerate deixa a
chave estrangeira sem nome"): a FK `lancamentos_categoria_id_fkey` precisou ser nomeada à
mão. Na mesma rodada o usuário escolheu o padrão do SQLAlchemy em vez de imitar os nomes
do Postgres, sabendo que isso exige renomear o que existe. O item foi priorizado em
01/11/2026, à frente do filtro no SQL, que não tem sinal de lentidão (o banco de dev tem
até 98 lançamentos por usuário).

## Estado atual (1)

Conferido no banco de dev e no código em 01/11/2026:

- **Chaves primárias:** nome do Postgres, `<tabela>_pkey`, nas cinco tabelas do app. A
  `alembic_version` tem `alembic_version_pkc`, criada pelo próprio Alembic.
- **Chaves estrangeiras:** nome do Postgres, `<tabela>_<coluna>_fkey`. São quatro:
  `lancamentos.usuario_id`, `lancamentos.categoria_id`, `rendas.usuario_id` e
  `partes_renda.renda_id`.
- **Únicas e checks:** já nomeados à mão em `models.py`. São `uq_lancamento_importacao`,
  `uq_categoria_tipo_nome`, `ck_renda_periodo`, `ck_parte_renda_valor` e
  `ck_parte_renda_regra`.
- **Índices:** `ix_<tabela>_<coluna>`, que já é o padrão do SQLAlchemy. O índice parcial
  `uq_usuarios_email_ativo` tem nome à mão.
- O `alembic check` não compara nomes de PK e FK, então um banco com nomes diferentes dos
  do código passa limpo.

## Casos de uso (1)

- **UC1 — Gerar migração com constraint nova.** Quem: quem desenvolve. O quê: muda
  `models.py` (uma FK, uma única, um check) e roda o autogenerate. Resultado: a migração
  sai com o nome da constraint na ida e na volta, e o downgrade funciona sem edição.
- **UC2 — Migrar um banco que já existe.** Quem: o container da API, no boot, ou quem
  roda `alembic upgrade head`. O quê: aplica a migração nova num banco com dados.
  Resultado: as constraints passam a ter os nomes do padrão. Lançamentos, rendas,
  categorias e usuários ficam intactos, e o app funciona igual. Entram no padrão todas as
  constraints: as 5 PKs e 4 FKs com nome do Postgres e também as 2 únicas e 3 checks que já
  tinham nome à mão.
- **UC3 — Montar um banco do zero.** Quem: `test_migrations.py`, ou quem sobe um ambiente
  novo. O quê: aplica todas as migrações num banco vazio. Resultado: o banco termina com os
  mesmos nomes de um banco migrado pelo UC2, e o `alembic check` fica limpo.
- **UC4 — Voltar a migração.** Quem: quem desenvolve. O quê: roda o downgrade da migração
  de renomear. Resultado: os nomes voltam a ser os de antes e os dados ficam intactos.
- **UC5 — Constraint criada fora do padrão é notada.** Quem: quem desenvolve. O quê: o
  banco fica com um nome diferente do que o código espera, por exemplo porque uma migração
  nomeou a constraint à mão de outro jeito. Resultado: um teste automático compara os nomes
  do banco com os que o código produz e falha apontando a diferença — o `alembic check` não
  faz isso para PK e FK.

## Casos de falha (1)

- **F1 — Banco com nome inesperado.** Quando: um banco tem uma constraint com nome
  diferente do que a migração espera renomear, por exemplo criado antes do Alembic ou
  mexido à mão. Esperado: a migração falha inteira, com mensagem que diz qual constraint
  não achou, e nada fica renomeado pela metade (o Postgres faz DDL em transação).
- **F2 — Migração aplicada de novo.** Quando: `upgrade head` roda num banco que já está
  na versão nova. Esperado: nada acontece, porque o Alembic registra a versão.
- **F3 — Downgrade parcial.** Quando: o downgrade falha no meio. Esperado: mesma garantia
  do F1, tudo ou nada.
- **F4 — Suíte em sqlite.** Quando: os testes do dia a dia criam as tabelas com
  `create_all`, sem migrações. Esperado: os nomes novos valem lá também, e nenhum teste
  depende do nome de uma constraint.
- **F5 — API de pé durante a migração.** Quando: o container migra no boot, antes do
  uvicorn. Esperado: renomear pega um lock rápido nas tabelas; como a API só sobe depois da
  migração, nenhuma requisição concorre com ela.

Não se aplicam, de propósito: sessão, conta excluída, recurso de outro usuário,
reenvio, rede e celular. A feature não tem tela nem endpoint.

## Perguntas abertas (1)

Nenhuma.

Respondidas em 01/11/2026:

- As únicas e os checks já nomeados à mão **entram no padrão** — a etapa 2 precisa evitar
  o nome dobrado (`ck_rendas_ck_renda_periodo`).
- O UC5 **tem guarda automática**.
- O índice único parcial `uq_usuarios_email_ativo` **também entra no padrão**, embora seja
  índice e não constraint.

## Fora do escopo (1, revisado na 2)

- **Renomear índices:** já seguem o padrão do SQLAlchemy.
- **Mudar o que as migrações antigas fazem:** já rodaram em bancos que existem. A
  renomeação é uma migração nova. As antigas só ganharam nomes fixos — ver Decisões.
- **Entrada no CHANGELOG:** a mudança não tem efeito para quem usa o app, e o
  `CHANGELOG.md` registra só efeito para o usuário.
- **`alembic_version_pkc`:** é a PK da tabela do próprio Alembic, que não está nos modelos.

## Decisões (2)

Verificado no rascunho, importando os modelos reais com a convenção aplicada por fora: a
convenção pura gera `ck_rendas_ck_renda_periodo` e mantém `uq_categoria_tipo_nome`,
`uq_lancamento_importacao` e `uq_usuarios_email_ativo` como estão, porque nome dado à mão
só passa pela convenção quando ela usa `%(constraint_name)s`.

### A convenção é a do SQLAlchemy, no `MetaData` do `Base`

**Escolhido:** `pk_%(table_name)s`, `fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s`,
`uq_%(table_name)s_%(column_0_N_name)s`, `ck_%(table_name)s_%(constraint_name)s`,
`ix_%(column_0_label)s`.
**Alternativas:** imitar os nomes do Postgres (`<tabela>_pkey`, `<tabela>_<coluna>_fkey`),
que dispensaria migração — descartado na feature anterior, a favor do padrão da biblioteca.
**Custo aceito:** uma migração que renomeia o que existe, e uma guarda para o que o
`alembic check` não vê.

### Checks ganham nome curto no modelo

**Escolhido:** `name="periodo"`, `"valor"`, `"regra"`; a convenção completa:
`ck_rendas_periodo`, `ck_partes_renda_valor`, `ck_partes_renda_regra`.
**Alternativas:** convenção `ck_%(constraint_name)s` com o nome inteiro no modelo — muda
menos, mas nada impede o próximo check de fugir do padrão.
**Custo aceito:** o nome no modelo, sozinho, não é o nome no banco.

### Únicas perdem o nome no modelo

**Escolhido:** a convenção gera `uq_categorias_tipo_nome` e
`uq_lancamentos_usuario_id_id_importacao`.
**Alternativas:** escrever esses nomes à mão — o tipo de nome que a convenção existe para
evitar.
**Custo aceito:** o segundo nome é longo (39 caracteres; o limite do Postgres é 63).

### O índice parcial vira `ix_usuarios_email`

**Escolhido:** `Index(None, "email", unique=True, …)`; a convenção de índice dá o nome.
**Alternativas:** `uq_usuarios_email` à mão — diz que é único, mas fica fora de qualquer
convenção.
**Custo aceito:** o nome não diz que é único nem que vale só para contas ativas; o
comentário no modelo continua dizendo. É o mesmo nome do índice único antigo, que a
migração `327f8230f60a` apagou — não colide, porque a renomeação vem depois dela.

### A guarda do UC5 é um teste em `test_migrations.py`

**Escolhido:** depois do `upgrade head` num banco vazio, um teste compara os nomes de PK,
FK, únicas, checks e índices do banco com os do `Base.metadata`.
**Alternativas:** comparador próprio no `alembic/env.py`, para o `alembic check` apontar a
divergência — pegaria também o banco de dev a cada `./dev.sh`, ao custo de código de
extensão do Alembic.
**Custo aceito:** só roda com `TEST_DATABASE_URL` (Postgres) e não olha o banco de dev.

### A migração renomeia por uma lista fixa (decidido na implementação, contrato acordado)

A migração carrega a lista nome antigo → nome novo e, antes de renomear, confere que todo
nome antigo existe; se faltar algum, falha citando quais (F1), como a migração das
categorias. Renomear tudo o que estiver no banco por introspecção esconderia o F1.

### As migrações antigas ganham nomes fixos (decidido na etapa 3)

Descoberto na implementação: o Alembic aplica a `naming_convention` do `target_metadata` às
operações de **toda** migração, inclusive as antigas. Com a convenção ligada, um banco
montado do zero saía de `98844844bbad` com `pk_rendas` e `ck_rendas_ck_renda_periodo`,
enquanto o banco de dev tinha `rendas_pkey` e `ck_renda_periodo` — e a lista fixa da
migração nova não servia para os dois.

**Escolhido:** nas 6 migrações antigas, toda constraint ganha o nome que já tinha no banco,
marcado com `op.f()` para a convenção não mexer (PKs e FKs recebem o nome que o Postgres
dava). Banco novo e banco existente chegam a `98844844bbad` com os mesmos nomes — conferido
nome a nome contra o banco de dev.
**Alternativas:** a migração nova descobrir cada nome no banco (bem mais código, F1 mais
fraco, downgrade de banco novo volta a nomes que ele nunca teve); aceitar dois nomes de
origem por constraint (lista dobrada, mesmo problema no downgrade).
**Custo aceito:** editar migrações já aplicadas — só nos nomes, que bancos existentes já têm.

**Por que `op.f()` em todo nome (revisão estrutural, 03/11/2026):** testado no rascunho com
a convenção do projeto, o `op.f()` só muda o resultado nos checks — é a única convenção que
usa `%(constraint_name)s`, e sem ele `ck_renda_periodo` vira `ck_rendas_ck_renda_periodo`.
Em PK, FK, única e índice o nome dado já sai como está. Fica em todo nome mesmo assim, por
decisão do usuário: é o que o autogenerate escreve (as migrações antigas já o usavam nos
índices), a regra é uma só, e nada quebra se a convenção de PK ou FK passar a usar o nome
dado. O que é obrigatório é dar nome: PK e FK sem nome recebem o da convenção.

## Contratos alterados (2, confirmado na 6)

- **API:** nenhuma mudança.
- **Schema:** só nomes. 5 PKs (`<tabela>_pkey` → `pk_<tabela>`), 4 FKs
  (`<tabela>_<coluna>_fkey` → `fk_<tabela>_<coluna>_<referida>`), 2 únicas, 3 checks e o
  índice `uq_usuarios_email_ativo` → `ix_usuarios_email`. Nenhuma coluna, tipo ou regra muda.
  Migração nova, com downgrade.
- **Tipos do frontend:** nenhuma mudança.
- **Variáveis de ambiente:** nenhuma.

## Plano de implementação (2)

- **infra** (`database.py`): o `Base` ganha `metadata = MetaData(naming_convention=…)`.
- **infra** (`models.py`): checks com nome curto; únicas sem nome; o índice parcial com
  `Index(None, …)`.
- **migrações antigas:** nomes fixos com `op.f()` (decisão da etapa 3).
- **migração nova** (arquivo novo, aprovado com o item): lista fixa de renomeações,
  conferência prévia (F1), `ALTER TABLE … RENAME CONSTRAINT` e `ALTER INDEX … RENAME`;
  downgrade com a lista invertida. Depois dela, `alembic check` limpo.
- **testes** (`test_migrations.py`, Postgres): a guarda e os testes da migração.
- **docs (etapa 6):** `rules-backend.md` (com autorização), a armadilha da FK sem nome no
  documento da categoria passa a apontar para cá.

Teste por caso:

| Caso | Teste |
| --- | --- |
| UC1 | guarda: toda constraint do `Base.metadata` tem nome. Na mão, na etapa 3: gerar uma revisão descartável com uma FK nova e ver o nome no `drop_constraint` |
| UC2 | migração: banco na revisão anterior, com dados → `upgrade head` → dados intactos e nomes novos; e `upgrade` no banco de dev, com contagem antes e depois |
| UC3 | guarda depois do `upgrade head` num banco vazio, e o `alembic check` que já existe |
| UC4 | migração: `downgrade -1` devolve os nomes antigos, dados intactos |
| UC5 | guarda: falha quando um nome do banco difere do modelo (conferido contra o código antigo, onde deve falhar) |
| F1 | migração: com uma constraint renomeada antes, o `upgrade` falha citando-a e nenhum nome muda |
| F2 | sem teste novo — é o controle de versão do Alembic |
| F3 | sem teste próprio — mesma transação do F1 |
| F4 | a suíte em sqlite inteira passando com a convenção |
| F5 | sem teste — o `CMD` do Dockerfile já migra antes do uvicorn |

## O que foi construído (6)

### Backend

- **`infra/database.py`:** o `Base` tem `metadata` com a `naming_convention` do SQLAlchemy.
  Todo nome de constraint e índice sai dela.
- **`infra/models.py`:** as constraints ficam sem nome, menos os checks, que levam um nome
  curto (`periodo`, `valor`, `regra`) que a convenção completa.

### Infra / dados

- **Migração `2b7c4e9d1a30_convencao_de_nomes.py`:** renomeia 14 constraints e 1 índice por
  uma lista fixa. Antes, confere que todo nome de origem existe e, se faltar algum, para
  citando-os (F1). O downgrade usa a mesma lista invertida.
- **As 6 migrações anteriores:** cada constraint ganhou o nome que já tinha, com `op.f()`.
  O que elas fazem não mudou; só ficou fixo o nome, para um banco novo chegar a cada revisão
  com os mesmos nomes de um banco que já existe.
- **`tests/test_migrations.py`:** a guarda que compara os nomes do banco com os do modelo,
  os testes da renomeação com dados e da volta, e o do nome inesperado. A preparação de
  banco dos 8 testes virou uma função só, `_migrated_to`.

## Armadilhas (6)

### Ligar a `naming_convention` muda o que as migrações antigas criam

**Causa:** o Alembic aplica a convenção do `target_metadata` às operações de toda migração,
não só das geradas depois dela.
**Como se manifesta:** um banco montado do zero fica com nomes diferentes de um banco que já
existia na mesma revisão (`pk_rendas` contra `rendas_pkey`), e uma migração que renomeia ou
apaga pelo nome antigo falha só num dos dois.
**O que fazer:** nas migrações antigas, todo nome é explícito e passa por `op.f()`. Foi o que
mudou o plano desta feature na etapa 3.

### Check com nome no modelo sai com o nome dobrado

**Causa:** a convenção de check é a única que usa o nome dado (`%(constraint_name)s`).
**Como se manifesta:** `name="ck_renda_periodo"` vira `ck_rendas_ck_renda_periodo`, no
modelo e em migração sem `op.f()`.
**O que fazer:** no modelo, nome curto (`name="periodo"`); em migração, `op.f("…")`.

### O `alembic check` não vê nome de PK nem de FK

**Causa:** o autogenerate não compara nomes dessas constraints.
**Como se manifesta:** um banco com nomes diferentes dos do modelo passa limpo no check e no
`./dev.sh`.
**O que fazer:** a guarda é `test_nomes_no_banco_sao_os_do_modelo`, em
`test_migrations.py` — só roda com `TEST_DATABASE_URL`. O banco de dev não é conferido
(dívida em `docs/dominio.md`).

## Como verificar (6)

1. Suíte contra um Postgres temporário (comando no `README.md`, seção Testes): os testes de
   `test_migrations.py` passam, incluindo a guarda e os da renomeação.
2. Banco de dev: antes de subir a API, conte as linhas de `usuarios`, `lancamentos`,
   `rendas`, `partes_renda` e `categorias`; rode `docker compose restart api`, que aplica a
   migração; conte de novo — tem de dar o mesmo.
3. No banco de dev, os nomes:
   `SELECT conrelid::regclass, conname FROM pg_constraint WHERE connamespace = 'public'::regnamespace;`
   — PKs `pk_…`, FKs `fk_…`, únicas `uq_…`, checks `ck_…`; e `ix_usuarios_email` em
   `pg_indexes`.
4. `docker compose exec api alembic check` termina em "No new upgrade operations detected."
5. Uma migração gerada por autogenerate para uma FK nova traz `op.f('fk_…')` tanto no
   `create_foreign_key` quanto no `drop_constraint`.
