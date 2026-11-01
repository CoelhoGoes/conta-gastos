# Categoria validada no servidor

- **Status:** concluído (reaberto na etapa 4, 01/11/2026: categorias numa tabela)
- **Início:** 2026-11-01
- **Item do roadmap:** validar a categoria contra a lista fechada também no servidor
- **Entrada no CHANGELOG:** em `[Não lançado]` → Alterado: "A categoria de um lançamento passa a
  ser conferida também pelo servidor: só entram as categorias da lista do tipo (gasto ou
  entrada), venha o lançamento da tela, da importação de extrato ou de outro cliente. Uma
  grafia aproximada, como "saude", é gravada como "Saúde". As listas passam a vir do servidor,
  iguais para todos os aparelhos"

## O que a feature entrega (1)

Hoje a lista fechada de categorias de `docs/dominio.md` só existe na tela: o seletor oferece as
categorias do tipo escolhido, mas a API aceita qualquer texto de 1 a 50 caracteres. Quem chama a
API direto — um script, um cliente futuro, o app nativo — pode gravar um gasto com categoria
"Salário", "mercadinho" ou um texto arbitrário, e ele aparece no resumo por categoria como uma
fatia nova.

Com esta feature, o servidor passa a conferir a categoria de todo lançamento criado, editado ou
importado contra a lista do tipo dele: gasto só aceita as categorias de gasto, entrada só as de
entrada. Uma grafia quase certa ("mercado", " Mercado ") é corrigida para a grafia da lista
antes de gravar; uma categoria que não está na lista é recusada com uma mensagem em português.

Para quem usa só a tela, nada muda no caminho feliz: o seletor já manda a grafia exata. O
ganho é que o resumo por categoria passa a ter a garantia de só mostrar categorias da lista,
seja qual for o cliente que gravou.

As listas passam a morar numa tabela do banco, e o lançamento aponta para a categoria por id.
A tela deixa de ter a sua cópia da lista e pede a lista à API — assim o app nativo, quando
existir, recebe exatamente as mesmas categorias.

## Motivação (1)

Achado da revisão de segurança de 29/10/2026, registrado no `docs/roadmap.md`: uma categoria
como `x:red}body{display:none}` chegou a injetar CSS na rosca do resumo. A injeção foi corrigida
no frontend, mas a causa — o servidor aceitar qualquer texto — continuou. Também vai na direção
do **Product context** do `CLAUDE.md`: o backend é a fonte única para a web e para o futuro app
nativo, então a regra não pode viver só no seletor da tela. Por que agora: foi a ordem combinada
no roadmap (proteger o que já existe antes de produto).

## Casos de uso (1)

- **UC1 — Criar lançamento com categoria da lista.** Quem: usuário logado. O quê: cria um gasto
  ou uma entrada com uma categoria da lista do tipo. Resultado: gravado como hoje (201), sem
  mudança visível.
- **UC2 — Grafia quase certa é normalizada.** Quem: usuário logado, por um cliente que não usa o
  seletor. O quê: cria ou edita um lançamento com a categoria em outra caixa ou com espaços nas
  pontas (`"mercado"`, `" Mercado "`). Resultado: gravado com a grafia da lista (`"Mercado"`), e
  a resposta já devolve a grafia corrigida.
- **UC3 — Editar um lançamento trocando a categoria.** Quem: usuário logado. O quê: `PATCH` com
  uma categoria nova da lista do tipo. Resultado: gravado.
- **UC4 — Trocar o tipo junto com a categoria.** Quem: usuário logado. O quê: `PATCH` que muda
  gasto → entrada (ou o inverso) e manda uma categoria da lista do novo tipo. Resultado: gravado.
- **UC5 — Importar extrato com categorias escolhidas na revisão.** Quem: usuário logado. O quê:
  confirma a importação com uma categoria da lista para cada linha. Resultado: gravado como hoje.
- **UC6 — "Outros" vale nos dois tipos.** Quem: usuário logado. O quê: grava gasto ou entrada
  com "Outros". Resultado: aceito nos dois — a categoria está nas duas listas.
- ~~**UC7 — Lançamento antigo fora da lista continua visível.**~~ Substituído na reabertura da
  etapa 2: com a chave estrangeira, não existe mais lançamento fora da lista — a migração liga
  cada um a uma categoria ou falha (F11).
- **UC8 — A tela pede a lista à API.** Quem: usuário logado. O quê: abre a tela de lançamentos
  ou a de importação. Resultado: o seletor mostra as categorias do tipo, na ordem da tabela,
  vindas de `GET /categories`; a lista é buscada uma vez por sessão.
- **UC9 — Migração liga os lançamentos existentes.** Quem: quem sobe a versão (o boot do
  container roda `alembic upgrade head`). O quê: aplica a migração num banco com lançamentos.
  Resultado: cada lançamento passa a apontar para a categoria de mesmo tipo e nome; a coluna
  de texto sai. Resumo, lista e fatura mostram o mesmo que antes.

## Casos de falha (1)

- **F1 — Categoria fora da lista.** Quando: criação, edição ou importação com uma categoria que
  não está em nenhuma das listas, mesmo depois de normalizar (`"Viagem"`,
  `"x:red}body{display:none}"`). Esperado: 422 com mensagem em português que a tela consiga
  mostrar; nada é gravado.
- **F2 — Categoria da lista do outro tipo.** Quando: gasto com `"Salário"` ou entrada com
  `"Mercado"`. Esperado: 422, mesma família de mensagem do F1; nada é gravado.
- **F3 — `PATCH` que troca só o tipo.** Quando: um gasto em "Mercado" recebe `PATCH` com
  `type: "entrada"` e sem `category`. Esperado: 422 — o lançamento resultante teria uma
  categoria fora da lista de entradas. (O `PATCH` já valida o lançamento inteiro depois de
  juntar com o atual; a tela já limpa a categoria ao trocar o tipo.)
- ~~**F4 — Editar um lançamento antigo sem trocar a categoria.**~~ Substituído na reabertura da
  etapa 2, junto com o UC7: não há mais lançamento antigo fora da lista.
- **F5 — Categoria vazia ou só espaços.** Quando: `""` ou `"   "`. Esperado: 422, como hoje para
  o vazio; só espaços não passa a valer depois de normalizar.
- **F6 — Importação com uma linha inválida.** Quando: o lote de confirmação tem uma linha com
  categoria fora da lista. Esperado: 422 para o lote inteiro, nada gravado — mesmo
  comportamento de hoje para qualquer campo inválido no lote. A mensagem precisa permitir achar
  a linha.
- **F7 — Sem sessão, conta excluída, lançamento de outro usuário ou inexistente.** Esperado:
  inalterado — 401 e 404 como hoje, antes de qualquer conferência de categoria. Não pode
  existir resposta que diga se uma categoria é válida para quem não está logado.
- **F8 — Duplo clique / reenvio.** Esperado: inalterado; a validação não muda a idempotência de
  nada (a criação já não é idempotente, a importação já pula `import_id` repetido).
- **F9 — API fora do ar.** Esperado: inalterado; a tela mostra o erro de rede que já mostra.
- **F10 — A lista de categorias não carrega.** Quando: `GET /categories` falha (rede, API fora).
  Esperado: o seletor fica só com "Selecione", a tela mostra o erro, e o `required` impede
  salvar; a próxima abertura da tela tenta de novo (falha não fica guardada no cache).
- **F11 — Migração encontra lançamento sem categoria correspondente.** Quando: um lançamento
  tem tipo e categoria que não casam com nenhuma linha da tabela. Esperado: a migração para
  com erro que lista os casos (tipo e categoria, sem dado do usuário além disso); nada é
  reescrito. No banco de desenvolvimento não há nenhum (conferido em 01/11/2026).
- **F12 — `GET /categories` sem sessão.** Esperado: 401, como toda rota protegida.

Pulados de propósito: celular (tela estreita, teclado, Safari) — a feature não muda tela no
caminho feliz; o único efeito visível é a mensagem do 422, que usa o `ErrorText` existente.

## Perguntas abertas (1)

Nenhuma. As duas que ficaram da etapa 1 (acento e tela do F4) foram respondidas na etapa 2 —
ver **Decisões**.

## Fora do escopo (1, revisado na 2)

- **Manter lançamentos fora da lista.** Decidido na etapa 1 que ficariam como estão; a
  reabertura da etapa 2 trocou isso pela chave estrangeira — a migração falha em vez de
  conviver com eles (F11). No banco de desenvolvimento não há nenhum e o app não tem deploy.
- **Categorias por usuário / personalizadas.** A tabela nasce global; a avaliação das
  personalizadas segue como item à parte no `docs/roadmap.md` (Depois).
- **Mudar a lista de categorias** — o `dominio.md` diz para não inventar categoria sem
  conversar. Mudar a lista passa a ser uma migração nova.
- **Rota para criar, renomear ou apagar categoria.** Nenhuma tela precisa disso hoje.

## Decisões (2)

Primeira rodada em 01/11/2026; reaberta no mesmo dia, durante a etapa 4, quando o usuário
decidiu unificar as listas numa tabela. As decisões da primeira rodada que a tabela substituiu
estão marcadas como tal.

### As categorias moram numa tabela global

**Escolhido:** tabela `categorias` (`id`, `tipo`, `nome`, `ordem`), única por (`tipo`, `nome`),
igual para todas as contas. "Outros" vira duas linhas, uma por tipo.
**Alternativas:** cópia por usuário semeada no cadastro — antecipa a avaliação das categorias
personalizadas, que o usuário quer fazer à parte. Na primeira rodada, a lista era constante em
`service.py`, espelhada à mão em `shared/categories.ts` e no `dominio.md`; a revisão estrutural
apontou as três cópias e o usuário escolheu unificar.
**Custo aceito:** se as personalizadas vierem, a tabela ganha `usuario_id` numa migração nova.

### O lançamento aponta para a categoria por id; a coluna de texto sai

**Escolhido:** `lancamentos.categoria_id` com chave estrangeira para `categorias.id`
(`ON DELETE RESTRICT`), não nula. A migração preenche pelo par (`tipo`, `categoria`) e apaga a
coluna `categoria`; o downgrade reconstrói o texto a partir do id.
**Alternativas:** manter texto validado só na API (o banco não garantiria nada); chave
estrangeira composta de texto (`tipo`, `categoria`) — garante sem mudar a coluna, mas renomear
exigiria `ON UPDATE CASCADE`; manter as duas colunas — duas fontes que podem divergir.
**Custo aceito:** é apagar uma coluna com dado; o caminho de volta depende do downgrade.

### Lançamento que não casa com a tabela faz a migração falhar

**Escolhido:** a migração confere antes de alterar; se algum lançamento não casa por (tipo,
nome), para com erro listando os pares que não casaram (F11). Substitui a decisão da etapa 1
("o legado fica como está").
**Alternativas:** jogar o que não casa para "Outros" — sempre passa, mas perde o texto em
silêncio.
**Custo aceito:** um banco com legado exige correção manual antes de subir.

### A API continua falando por nome

**Escolhido:** criação, edição e importação recebem `category` (nome), como hoje; o servidor
normaliza (caixa, espaço nas pontas, acento) e resolve para o id da categoria do tipo do
lançamento. As respostas mantêm `category` (nome) e o `EntryOut` ganha `category_id`.
**Alternativas:** receber `category_id` — contrato mais rígido, mas derruba a normalização
(UC2) e muda o payload de três rotas, do frontend e dos testes.
**Custo aceito:** o id existe no banco mas o cliente fala por nome; a resolução nome → id
custa uma consulta à tabela (dez linhas) por requisição que grava.

### A lista nasce numa migração de dados, e os testes importam dela

**Escolhido:** a migração que cria a tabela insere as listas a partir de uma constante
declarada nela mesma. O `conftest.py` importa essa constante (carregando o arquivo da
migração pelo caminho) para semear o sqlite, que é criado com `create_all` e não roda
migrações. Assim a lista existe num lugar só do código.
**Alternativas:** cópia da lista no `conftest.py` (convencional, mas duas fontes); a API semear
no boot a partir de uma constante no código (a tabela viraria espelho).
**Custo aceito:** importar de `alembic/versions/` é incomum; mudar a lista é sempre migração
nova, e o `conftest` precisa passar a ler a migração mais recente que mexer na lista.

### A regra mora no domínio e é aplicada no router, não no schema

**Escolhido:** `normalize_category(category, allowed)` em `domain/service.py` continua pura:
recebe os nomes válidos do tipo, carregados do banco pelo router, e devolve o nome da lista ou
`None`. As constantes `GASTO_CATEGORIES`/`ENTRADA_CATEGORIES` saem do `service.py`. Um helper em
`api/finance.py` (irmão do `_reject_income_on_credit`) carrega as categorias do tipo, aplica a
função e devolve o id, ou responde 422; é usado na criação, no `PATCH` (sobre o lançamento já
juntado) e em cada linha da importação, antes de gravar qualquer uma.
**Alternativas:** validador Pydantic — herdado pelo `EntryOut`, faria a resposta validar a
categoria (testado na pasta de rascunho: `ResponseValidationError`, 500); e o Pydantic não tem
acesso ao banco.
**Custo aceito:** todo endpoint novo que grave lançamento precisa chamar o helper.

### A normalização ignora maiúscula, espaço nas pontas e acento

**Escolhido:** compara sem caixa, sem espaço nas pontas e sem acento (`unicodedata`, biblioteca
padrão); grava sempre o nome da tabela. Nenhuma categoria colide sem acento.
**Alternativas:** só caixa e espaço.
**Custo aceito:** se um dia entrarem duas categorias que só diferem no acento, a regra muda.

### O frontend lê a lista da API, com cache por sessão

**Escolhido:** rota `GET /categories` (autenticada), devolvendo `[{id, type, name}]` na ordem
da tabela. `data/api.ts` guarda a promessa da resposta até o logout (e descarta quando falha,
para tentar de novo); o `CategorySelect` lê dela. `shared/categories.ts` é apagado.
**Alternativas:** um `CategoriesProvider` em `state/` buscando no login — arquivo e provider a
mais para um dado que duas telas usam.
**Custo aceito:** o seletor fica um instante só com "Selecione" na primeira carga, e precisa de
estado de erro (F10).

### `category_id` na entrada é recusado, não ignorado

**Escolhido:** criação, edição e importação respondem 422 quando o corpo traz `category_id`
(validador `mode="before"` no `EntryBase` e no `EntryUpdate`, que só dispara quando o modelo não
declara o campo — o `EntryOut` herda do `EntryCreate` e precisa continuar aceitando). Decidido na
revisão de segurança, 01/11/2026.
**Alternativas:** ignorar em silêncio (o comportamento padrão do Pydantic, que valia antes);
`extra="forbid"` nos schemas de entrada — recusaria qualquer campo a mais, inclusive o
`import_id` no `PATCH`, que o projeto ignora de propósito e tem teste para isso.
**Custo aceito:** quem reenvia o `EntryOut` inteiro num `PATCH` recebe 422 e precisa tirar o
`category_id`; a tela não faz isso (monta o corpo campo a campo).

### ~~Sem CHECK no banco~~ e ~~a tela de edição não ganha nada para o lançamento antigo~~

Decisões da primeira rodada, substituídas pela chave estrangeira: o banco passa a garantir a
regra, e não existe mais lançamento antigo fora da lista.

## Contratos alterados (2, confirmado na 6)

- **API:**
  - nova `GET /categories` → `200 [{id, type, name}]`, autenticada (401 sem sessão);
  - `POST /entries`, `PATCH /entries/{id}` e `POST /imports` respondem **422** com `detail` em
    texto (português) quando a categoria não está na lista do tipo; na importação a mensagem
    identifica a linha e nada do lote é gravado. A categoria devolvida pode diferir da enviada
    só na grafia;
  - `EntryOut` (respostas de `/entries` e `/imports`) ganha `category_id: int`. Na entrada,
    `category_id` é recusado com 422 em `POST /entries`, `PATCH /entries/{id}` e
    `POST /imports`. Demais
    respostas (`/summary/{mês}/categories`, `/invoices/{mês}`) não mudam.
- **Schema:** tabela nova `categorias` (`id`, `tipo`, `nome`, `ordem`; único em `tipo`+`nome`),
  semeada na migração; `lancamentos.categoria_id` (FK, não nula, `ON DELETE RESTRICT`, com
  índice); `lancamentos.categoria` removida. Uma migração, com downgrade.
- **Tipos do frontend:** `npm run gen:types` — entra o schema da categoria e o `category_id`
  em `EntryOut`.
- **Variáveis de ambiente:** nenhuma.

## Plano de implementação (2)

Arquivo novo aprovado: a migração em `backend/alembic/versions/`. Arquivo apagado aprovado:
`frontend/src/shared/categories.ts`. Nenhuma dependência nova.

- **infra** (`models.py`): modelo `Category` (`categorias`); `Entry.category_id` com
  relacionamento para a categoria carregado junto com o lançamento, e `Entry.category`
  passando a ser o nome vindo dele — assim `service.py`, os schemas de saída e as consultas de
  resumo e fatura continuam lendo `entry.category`.
- **migração:** cria a tabela, insere as listas (constante declarada na própria migração),
  confere que todo lançamento casa (F11), preenche `categoria_id`, torna não nula, apaga
  `categoria`. Downgrade faz o caminho inverso.
- **domain** (`service.py`): sai a lista; `normalize_category(category, allowed)`.
- **api** (`finance.py`, `schemas.py`): `GET /categories`; o helper passa a devolver o id; o
  `EntryOut` ganha `category_id`. Os testes da primeira rodada que gravavam categoria fora da
  lista direto no banco (UC7/F4) saem — o cenário deixou de existir.
- **tests** (`conftest.py`): semeia a tabela a partir da constante da migração.
- **frontend:** `api.categoryList()` com cache e descarte em falha e no logout; `CategorySelect`
  lê dela e mostra o erro do F10; `categories.ts` apagado; testes mockam `api.categoryList`. O
  teste de tela do F4 sai, pelo mesmo motivo.
- **verificação:** suíte contra Postgres temporário (inclui `test_migrations.py`) e
  `alembic upgrade` no banco de dev, que tem lançamentos reais.
- **docs (etapa 6):** listas do `dominio.md` passam a apontar a migração como fonte; rules
  de backend e frontend (com autorização).

Teste por caso:

| Caso | Teste |
| --- | --- |
| UC1 | API: criar gasto e entrada com categoria da lista → 201 |
| UC2 | service: `"mercado"`, `" Mercado "`, `"saude"`, `"ALIMENTACAO"` → nome da lista; API: criar com `" mercado"` devolve `"Mercado"` |
| UC3 | API: `PATCH` só com `category` válida → 200 (existente) |
| UC4 | API: `PATCH` gasto→entrada com `"Reembolso"` → 200, `category_id` muda |
| UC5 | API: importação com categoria da lista → 201 (existente) |
| UC6 | API: "Outros" aceito nos dois tipos, com ids diferentes |
| UC8 | API: `GET /categories` devolve as listas na ordem; frontend: o seletor mostra o que a API devolve e busca uma vez só |
| UC9 | migração: `test_migrations.py` (Postgres) sobe com lançamento existente e confere o `categoria_id`; e `upgrade` no banco de dev |
| F1 | service: `"Viagem"`, texto de injeção → `None`; API: 422, nada gravado |
| F2 | service/API: gasto `"Salário"`, entrada `"Mercado"` → 422 |
| F3 | API: `PATCH` só com `type: "entrada"` num gasto em "Mercado" → 422 |
| F5 | service: `""` e `"   "` → `None` |
| F6 | API: lote com uma linha inválida → 422 citando a linha, nada gravado |
| F7 | API: `PATCH` em lançamento de outro usuário → 404 antes da categoria |
| F10 | frontend: `api.categoryList` rejeitada → erro na tela, salvar barrado; nova montagem busca de novo |
| F11 | migração (Postgres): lançamento com categoria sem par faz o `upgrade` falhar citando o par |
| F12 | API: `GET /categories` sem token → 401 |
| F8, F9 | sem teste novo — comportamento inalterado |

## O que foi construído (6)

### Backend

- **Domínio:** `normalize_category(category, allowed)` em `service.py` — compara sem caixa,
  sem espaço nas pontas e sem acento, e devolve o nome como está na lista ou `None`. Não sabe
  de onde vêm os nomes.
- **API:** `GET /categories` devolve as listas na ordem do seletor. `_categories` carrega a
  tabela uma vez por requisição e `_category_id` resolve o nome enviado para o id da categoria
  do tipo do lançamento, ou responde 422. Criação, `PATCH` (sobre o lançamento já juntado) e
  importação (todas as linhas antes de gravar) passam por ele. Os schemas de entrada recusam
  `category_id`; o `EntryOut` o devolve.
- **Modelo:** `Category` (tabela `categorias`) e `Entry.category_id`; `Entry.category` é o
  nome, lido da categoria ligada.

### Frontend

- `api.categoryList()` busca a lista uma vez por sessão (descarta em falha e no logout).
- `CategorySelect` lê dela, filtra pelo tipo e mostra um erro quando não carrega; o
  `shared/categories.ts` saiu.
- O resumo do mês por categoria, que se chamava `api.categories(month)`, virou
  `api.categoryBreakdown(month)` — o nome antigo parecia a lista do seletor.

### Infra / dados

- Migração `98844844bbad_categorias_em_tabela.py`: cria e semeia `categorias`, para se algum
  lançamento não casar por (tipo, nome), liga os lançamentos e apaga a coluna de texto
  `lancamentos.categoria`. Tem downgrade. A lista semeada é a única cópia no código; o
  `conftest.py` a importa.

## Armadilhas (6)

### Validador no schema de entrada derruba a resposta com 500

**Causa:** o `EntryOut` herda do `EntryCreate`, e o FastAPI valida a resposta contra o
`response_model`. Um validador de categoria no schema de entrada roda também na saída.
**Como se manifesta:** `ResponseValidationError` (500) no `GET` de um lançamento que não passa
na regra — foi o que tirou a regra do schema na primeira rodada da etapa 2.
**O que fazer:** regra que olha o banco fica no router (`_category_id`). Validador de schema
que só vale para a entrada checa se o modelo declara o campo, como `_reject_category_id`.

### Os testes nascem com a tabela `categorias` vazia

**Causa:** o sqlite dos testes é criado com `create_all`, sem migração, e quem semeia a tabela
é a migração.
**Como se manifesta:** todo `POST /entries` dos testes responde 422 ("Categoria fora da
lista").
**O que fazer:** o `conftest.py` semeia a partir de `CATEGORIES` da migração
`98844844bbad_…`. Uma migração nova que mude as listas precisa mudar esse import, senão os
testes semeiam a lista antiga.

### `Entry.category` não aceita escrita

**Causa:** virou propriedade de leitura (o nome vem de `category_ref`).
**Como se manifesta:** `Entry(**data.model_dump())` ou `setattr(entry, "category", …)` —
o padrão que o router usava — falha com erro de atributo.
**O que fazer:** grave `category_id` (vindo de `_category_id`) e exclua `category` do
`model_dump()`.

### O autogenerate deixa a chave estrangeira sem nome

**Causa:** o `Base` não tem `naming_convention`, então o Alembic não sabe o nome que o
Postgres dá à FK.
**Como se manifesta:** o `downgrade()` gerado tem `drop_constraint(None, …)` e falha.
**O que fazer:** nomeie a FK na migração com o nome que o Postgres daria
(`<tabela>_<coluna>_fkey`); o `alembic check` continua limpo. A `naming_convention` que
resolve isso ficou como item do roadmap.

### Testar a importação na tela com extrato real

**Causa:** o Playwright só anexa arquivos de dentro do repositório, e grava snapshots da
página em `.playwright-mcp/`.
**Como se manifesta:** o upload de um OFX de fora é recusado; os snapshots guardam nomes e
CPFs do extrato.
**O que fazer:** copie o OFX para `.playwright-mcp/` (gitignorado) e apague a cópia e os
snapshots do dia ao terminar.

## Como verificar (6)

1. `cd backend && pytest` — 251 passam, 5 pulados (os de migração). Com Postgres (comando no
   `README.md`), 256 passam, incluindo UC9 e F11 em `test_migrations.py`.
2. `cd frontend && npm test` — 151 passam.
3. Com a API de pé, numa conta de teste:
   - `GET /categories` sem token → 401; com token → 16 categorias, "Outros" uma vez por tipo;
   - `POST /entries` com `"category": " alimentacao"` → 201 e `"category": "Alimentação"`;
   - entrada com `"category": "Mercado"` → 422 "Categoria fora da lista de entradas.";
   - qualquer corpo com `category_id` → 422;
   - `PATCH` só com `{"type": "entrada"}` num gasto → 422.
4. Na tela de lançamentos, o seletor de categoria troca de lista ao trocar gasto/entrada; na
   importação, cada linha mostra a lista do seu tipo com "Outros" escolhido.
5. Banco existente: antes, anotar `SELECT tipo, categoria, count(*) FROM lancamentos GROUP BY
   1, 2`; `docker compose restart api` aplica a migração; depois, a mesma contagem por
   `JOIN categorias c ON c.id = l.categoria_id` (agrupando por `c.tipo, c.nome`) tem que dar
   igual. Se algum lançamento não casar, a API não sobe e o log diz quais pares.
