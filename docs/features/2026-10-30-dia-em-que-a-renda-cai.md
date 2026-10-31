# Dia em que a renda cai

- **Status:** concluído
- **Início:** 2026-10-30
- **Item do roadmap:** dia em que a renda cai (ex.: "todo último dia útil do mês")
- **Entrada no CHANGELOG:** em `[Não lançado]` → Adicionado, substituindo a do histórico da
  renda (que ainda não tinha sido lançada): "Aba Renda, com o histórico da renda fixa…" e "No
  resumo, a renda do mês mostra em que dia cai cada pagamento"

## O que a feature entrega (1)

Hoje a renda é um valor por mês: a renda de outubro entra inteira no saldo de outubro, sem dia.
Com esta feature, cada renda registrada diz **quando** o dinheiro cai, em uma ou mais partes —
um salário pago metade no dia 15 e metade no último dia útil, por exemplo. Cada parte tem o
seu valor em reais e a sua regra de dia: um dia fixo do mês, o último dia útil ou o N-ésimo dia
útil.

Cada parte também diz para qual mês o dinheiro conta. Quem recebe no último dia útil de outubro
e usa esse dinheiro para pagar as contas de novembro marca a parte como "conta no mês
seguinte", e o saldo de novembro passa a receber essa parte. Um adiantamento no dia 15 pode
continuar contando no próprio mês.

Cada renda passa a ter um período: uma data a partir da qual vale e, se acabou, uma data em
que deixa de valer. Uma renda nova não encerra mais a anterior: duas rendas podem valer ao
mesmo tempo (dois empregos), e a renda do mês soma as duas. Mudar o dia ou a divisão de uma
data em diante é encerrar a renda antiga e começar outra, sem reescrever o passado. A renda
fixa ganha uma seção própria de configuração, onde dá para editar cada renda e o seu período —
"parei de receber" passa a ser o fim de uma renda, não uma renda de valor zero.

O dia calculado não muda número nenhum: o que decide o mês de uma parte é a marcação "conta no
mês seguinte". Nas palavras do usuário: "os gastos do mês contabilizam pro mês mas só é quitado
a partir de quando recebe o salário, então antes disso fica pro mês anterior".

## Motivação (1)

Pedido pelo usuário em 30/10/2026, na etapa 2 do saldo cumulativo
(`2026-10-30-saldo-cumulativo.md`, decisão "Mês sem dia"): ao configurar a renda, a pessoa
deveria poder dizer o dia e o mês em que ela entra — "eu recebo todo último dia útil do mês".
Naquela feature a renda ficou só com mês e ano, e o dia virou este item. Nas perguntas desta
etapa o usuário acrescentou que o salário às vezes é pago quebrado em dois ou mais dias.

As regras de dia útil seguem uma pesquisa sobre o pagamento de salário no Brasil, trazida pelo
usuário em 30/10/2026 (não versionada no repositório). Os pontos usados:

- Pela CLT (art. 459, §1º), o salário mensal é pago até o 5º dia útil do mês seguinte. Na
  contagem (IN MTP 2/2021, art. 14), o sábado conta como dia útil e o domingo e os feriados não
  contam.
- O dinheiro tem de estar disponível até esse dia. Quando o 5º dia útil cai num sábado e o
  banco não credita nesse dia, a prática é pagar na sexta.
- É comum um adiantamento ("vale") no dia 15 ou 20, com o restante até o 5º dia útil.
- Servidores federais recebem no 1º dia útil do mês seguinte, e alguns estados no último dia
  útil do próprio mês. Domésticos recebem até o dia 7.
- Quando uma data fixa cai em dia não útil, a prática é antecipar o pagamento para o dia útil
  anterior.

## Casos de uso (1)

- **UC1 — Registrar a renda com um dia.** Quem: usuário logado. O quê: registra uma renda a
  partir de uma data, com uma parte: valor, regra de dia e se conta no próprio mês ou no
  seguinte. Resultado: a renda aparece no histórico com o dia descrito ("último dia útil",
  "dia 10", "5º dia útil"), e o saldo dos meses recebe o valor conforme a marcação.
- **UC2 — Renda dividida em vários dias.** Quem: usuário logado. O quê: registra uma renda com
  duas ou mais partes, cada uma com valor, regra de dia e marcação de mês. Resultado: a renda
  do mês no resumo é a soma das partes que contam nele.
- **UC3 — Parte que conta no mês seguinte.** Quem: usuário logado. O quê: marca uma parte como
  "conta no mês seguinte". Resultado: o pagamento que cai num mês entra no saldo do mês
  seguinte. Como o "a partir de" se refere ao **pagamento**, uma renda que vale a partir de
  01/10 com a parte marcada só aparece no saldo a partir de novembro. Um pagamento conta quando
  a data dele está dentro do período da renda.
- **UC4 — Ver quando a renda cai.** Quem: usuário logado. O quê: confere em que data cada parte
  cai num mês. Resultado: a data calculada pela regra. O 5º dia útil de outubro de 2026 é
  terça, 6/10. O último dia útil de outubro de 2026 é sexta, 30/10.
  - **Contagem dos dias úteis.** Segue a CLT: segunda a sábado contam, e domingo e feriado
    nacional não contam.
  - **Data em que o dinheiro cai.** Se a data calculada cair no sábado, num domingo ou num
    feriado nacional, vale o dia útil anterior que caia de segunda a sexta. O 5º dia útil de
    novembro de 2026 é sábado, 7/11 (Finados não conta), e a renda cai na sexta, 6/11.
- **UC5 — Mudar a renda a partir de uma data.** Quem: usuário logado. O quê: encerra a renda
  atual numa data e registra a nova a partir da seguinte, com outro valor, outras partes ou
  outros dias. Resultado: dali em diante vale a nova; os meses anteriores continuam com a
  antiga.
- **UC6 — Apagar uma renda.** Quem: usuário logado. O quê: apaga uma renda. Resultado: as partes
  saem junto e o período dela deixa de somar. Nenhuma outra renda se estende para cobrir o
  buraco — diferente de hoje, em que a anterior volta a valer.
- **UC11 — Duas rendas ao mesmo tempo.** Quem: usuário logado com dois empregos, ou um emprego e
  uma aposentadoria. O quê: registra duas rendas com períodos que se sobrepõem. Resultado: nos
  meses em comum, a renda do mês é a soma das partes das duas que contam nele.
- **UC7 — Seção da renda fixa.** Quem: usuário logado. O quê: abre a seção dedicada à renda
  fixa e vê o histórico, cada renda com o período em que vale, as partes, o dia de cada uma e
  a marcação de mês. Resultado: tudo o que se configura da renda fica num lugar só.
- **UC8 — Editar uma renda registrada.** Quem: usuário logado. O quê: muda o valor, as partes,
  os dias ou o período de uma renda que já existe. Resultado: o saldo dos meses que ela
  cobre muda na hora, e os meses fora dela não.
- **UC9 — Parar de receber.** Quem: usuário logado. O quê: diz a data em que uma renda deixa de
  valer. Resultado: pagamentos depois dessa data não somam; se não houver outra renda valendo,
  os meses seguintes ficam sem renda.
- **UC10 — Rendas antigas sem dia.** Quem: usuário logado com rendas registradas antes desta
  feature. O quê: escolhe o dia de cada uma. Resultado: até escolher, elas continuam contando
  no próprio mês, como hoje, e a seção da renda indica que falta o dia.

## Casos de falha (1)

- **F1 — Valor de uma parte inválido.** Quando: uma parte vem com valor negativo, com mais de
  duas casas decimais ou acima de R$ 9.999.999.999,99 (o teto da coluna). Esperado: 422 com a
  mensagem em português do campo, como as outras validações; nada é gravado.
- **F2 — Dia fixo fora da faixa.** Quando: dia fixo menor que 1 ou maior que 31. Esperado: 422.
- **F3 — Dia fixo que o mês não tem ou que não é dia útil.** Quando: dia 31 num mês de 30 dias,
  29 a 31 em fevereiro, ou um dia que cai no sábado, domingo ou feriado nacional. Esperado: a
  parte é antecipada para o dia de pagamento anterior (UC4). Exemplos: o dia 10 de outubro de
  2026 é sábado e vira sexta, 9/10; o dia 31 em fevereiro vira o último dia de pagamento de
  fevereiro.
- **F4 — N-ésimo dia útil que o mês não tem.** Quando: N maior que o número de dias úteis do
  mês. Esperado: 422 já ao registrar, para N acima do menor número de dias úteis que um mês
  pode ter na contagem da CLT. Assim todo N aceito existe em todo mês. O número exato sai da
  lista de feriados nacionais (etapa 2).
- **F5 — Último dia útil que não é dia de pagamento.** Quando: o mês termina no sábado, no
  domingo ou num feriado nacional. Esperado: a parte cai no dia de pagamento anterior.
- **F6 — Renda sem nenhuma parte, ou com partes demais.** Quando: a lista de partes vem vazia,
  ou com mais partes do que um limite razoável. Esperado: 422 — parar de receber é o fim da
  renda (UC9), não uma renda vazia.
- **F7 — Mês com duas rendas ou com nenhuma na troca.** Quando: a renda que acaba em 30/09 tem
  a parte "conta no mês seguinte" e a nova, a partir de 01/10, conta no próprio mês. Esperado:
  outubro recebe as duas (o pagamento de 30/09 e o de outubro), porque os dois pagamentos
  acontecem de verdade. Na troca contrária, um mês fica sem renda. O saldo mostra isso como é,
  sem compensar.
- **F8 — Rendas que já existem, sem dia.** Quando: a migração encontra as rendas gravadas antes
  desta feature. Esperado: nenhum saldo muda; elas ficam sem dia até o usuário escolher
  (UC10). Hoje uma renda vale até começar a próxima; na migração, esse fim implícito vira o
  fim explícito de cada uma, senão as antigas passariam a se somar (UC11). Uma renda antiga de
  valor 0 significava "parei de receber" e vira o fim da anterior.
- **F13 — Duas partes no mesmo dia.** Quando: duas partes com a mesma regra (dois "dia 10", dois
  "último dia útil"). Esperado: 422 — receber tudo num dia é uma renda de uma parte só. Regras
  diferentes que coincidem num mês específico ("dia 30" e "último dia útil" em outubro de
  2026) são aceitas: o dia não muda número, então o efeito é só a tela mostrar duas partes na
  mesma data. Pela pesquisa, as combinações comuns (vale no dia 15 ou 20 com o 5º dia útil,
  que cai nos primeiros dez dias do mês, ou com o último dia útil) nunca coincidem.
- **F14 — Fim antes do início.** Quando: a data em que a renda deixa de valer é anterior à data
  em que começa. Esperado: 422. Data fora de 1900 a 2199, o mesmo limite dos meses: 422.
- **F15 — Editar uma renda que foi apagada em outra aba.** Quando: a renda não existe mais.
  Esperado: 404 e a mensagem de que a renda não foi encontrada, como já acontece ao apagar.
- **F9 — Sem sessão ou renda de outra conta.** Quando: sem token, token vencido, conta excluída.
  Esperado: o mesmo de hoje — 401, e a renda de outra conta não é alcançável (escopo pelo
  usuário do JWT).
- **F10 — Salvar duas vezes.** Quando: duplo clique em Salvar, ou reenvio. Esperado: o mesmo
  resultado de um clique. Com rendas sobrepostas permitidas (UC11), registrar de novo não
  substitui mais nada: um segundo envio criaria uma segunda renda igual, e a renda do mês
  dobraria em silêncio. Isso tem de ser impedido.
- **F11 — Rede cai no meio do salvamento.** Quando: a API não responde ao salvar. Esperado:
  mensagem de erro, e a renda fica inteira ou como estava — nunca com só algumas partes
  gravadas.
- **F12 — Celular.** Quando: tela de 375px, teclado aberto, Safari do iPhone. Esperado: o
  formulário com várias partes cabe em uma coluna, adicionar e remover parte funciona com o
  teclado aberto, e os campos não disparam o zoom do Safari (fonte de 16px).

## Perguntas abertas (1)

Nenhuma.

## Fora do escopo (1, revisado na 2)

- **Feriados estaduais e municipais.** Só os nacionais entram na conta. A CLT também exclui o
  feriado municipal da contagem, então numa cidade com feriado no começo do mês o 5º dia útil
  real pode cair um dia depois do mostrado. A lib traz os estaduais, mas a renda não sabe onde a pessoa
  trabalha.
- **Saldo "até hoje"** (a renda do mês atual só entra depois do dia em que cai). Foi uma das
  opções; o usuário escolheu que o dia decide o mês da renda, não o momento dentro do mês.
- **Lançamentos de entrada** (freela, reembolso…). Continuam com a data do lançamento; só a
  renda fixa ganha dia.
- **Porcentagem por parte.** A divisão é em reais; a renda do mês é a soma das partes.
- **Lembrete ou notificação** do dia do pagamento.
- **Assinaturas e faturas com a mesma configuração.** O usuário quer repetir o modelo da seção
  da renda fixa (valor, início e fim) para assinaturas e faturas, se der certo aqui. Fica para
  um item próprio do roadmap depois desta feature.

## Decisões (2)

### Feriados vêm da lib `holidays`

**Escolhido:** `holidays` (Python, MIT, calcula por regra, então vale para qualquer ano),
dependência de runtime aprovada pelo usuário em 30/10/2026. Testada na pasta de rascunho: a
versão 0.107 devolve os 10 nacionais de 2026, tem o 20/11 só a partir de 2024 e traz Carnaval e
Corpus Christi como facultativos. O `pip-audit` não achou vulnerabilidade. Traz junto
`python-dateutil`, `six` e `tzdata`. A lib não acessa banco nem rede, então pode ser usada
dentro de `domain/` sem quebrar a regra das camadas.
**Alternativas:**
- **feriadosapi.com:** precisa de token, depende da rede a cada resumo, não tem SLA, e os
  feriados municipais, o único ganho, são pagos.
- **feriados-dev-oss:** os feriados vêm ano a ano em seeds, só de 2024 a 2027. É um serviço
  Node com Postgres próprio para hospedar, e o seed de 2024 já não tem a segunda de Carnaval.
- **Lista à mão:** 20 linhas sem dependência, mas uma lei nova exige lembrar de atualizar.
**Custo aceito:** uma dependência de runtime com três transitivas, e um feriado criado por lei
só entra com a atualização da versão.

### A data do crédito pula também Carnaval e Corpus Christi

**Escolhido:** a contagem do N-ésimo dia útil segue a CLT (segunda a sábado, sem domingo e sem
feriado nacional por lei). A data em que o dinheiro cai, depois disso, é antecipada para o
dia anterior que tenha banco: segunda a sexta, sem feriado nacional, sem a segunda e a terça de
Carnaval e sem Corpus Christi.
**Alternativas:** só feriados por lei — a data mostrada poderia cair num dia sem banco.
**Custo aceito:** duas listas de dias, uma para contar (CLT) e outra para creditar (banco).

### Tela própria "Renda"

**Escolhido:** tela nova com aba no menu. O card de renda sai de Configurações.
**Alternativas:** card maior em Configurações — tela longa demais com período e partes.
**Custo aceito:** dois arquivos novos (`IncomeScreen.tsx` e o teste) e uma aba a mais no menu.

### Partes numa tabela própria

**Escolhido:** tabela `partes_renda`, apagada em cascata com a renda. O banco garante o valor
maior que zero e o tipo da regra.
**Alternativas:** coluna JSON em `rendas` — o banco não valida nada dentro do JSON, o dinheiro
vira texto, e o JSON se comporta diferente no sqlite e no Postgres.
**Custo aceito:** salvar a renda e as partes tem de ser uma transação só (F11).

### A data aparece na tela Renda e no resumo

**Escolhido:** na tela Renda, cada parte mostra a próxima data. O resumo do mês lista os
pagamentos que contam nele, com data e valor — é o que explica um salário de 30/10 contando em
novembro.
**Alternativas:** só na tela Renda — o resumo de novembro não diria de onde veio a renda.
**Custo aceito:** o `Summary` ganha um campo (contrato do `/summary` e do `/trend`).

### Renda idêntica pede confirmação

**Escolhido:** o botão fica travado enquanto salva. O servidor responde 409 a uma renda
idêntica a outra já gravada (mesmo período e mesmas partes), a não ser que o pedido diga que a
duplicata é de propósito. Com o 409, a tela abre uma janela de confirmação e, se o usuário
confirmar, reenvia com essa marcação. Texto da janela: "Essa renda já foi registrada. Registrar
mesmo assim?". Pedido do usuário: a duplicata fica a critério dele, em
vez de ser recusada.
**Alternativas:** recusar sempre; ou travar só o botão, sem cobrir o reenvio da rede.
**Custo aceito:** um parâmetro a mais na criação e na edição, e o `api.ts` passa a distinguir o
409 dos outros erros.

### Até 4 partes por renda

**Escolhido:** de 1 a 4 partes. Cobre vale mais salário e pagamento semanal.
**Custo aceito:** quem recebe em mais de 4 datas registra duas rendas sobrepostas (UC11).

### N-ésimo dia útil vai de 1 a 23

**Escolhido:** 23 é o menor número de dias úteis (contagem da CLT) de um mês entre 1900 e 2199,
calculado com a lib (fevereiro de 1900). Assim todo N aceito existe em todo mês (F4).

## Contratos alterados (2, confirmado na 6)

- **API:**
  - `GET /incomes?today=AAAA-MM-DD` — lista as rendas, por data de início. Cada parte traz
    `next_date`, a próxima data de pagamento a partir de `today`, ou nulo se não houver
    (renda encerrada, ou renda antiga sem dia). Sem `today`, o servidor usa a data de hoje em
    UTC, como o `/trend` faz com o mês.
  - `POST /incomes?allow_duplicate=false` — cria a renda e responde 201. Responde 409 quando há
    uma idêntica, a não ser com `allow_duplicate=true`.
  - `PUT /incomes/{id}` — substitui a renda inteira, partes incluídas, numa transação só.
    Responde 404 se a renda não é do usuário, e 409 com o mesmo critério do `POST`.
  - `DELETE /incomes/{id}` — 204, ou 404.
  - **Saem** `PUT /incomes/{month}` e `DELETE /incomes/{month}`: com rendas sobrepostas, o
    mês não identifica mais uma renda.
  - Corpo (`IncomeIn`): `start` (data), `end` (data ou nulo), `parts` (1 a 4). Cada parte
    (`IncomePartIn`) tem:
    - `amount` — maior que 0, até 12 dígitos e 2 casas;
    - `rule` — `dia_fixo`, `ultimo_dia_util` ou `dia_util`;
    - `day` — de 1 a 31 para `dia_fixo`, de 1 a 23 para `dia_util`, nulo para
      `ultimo_dia_util`;
    - `next_month` (bool).
  - 422 quando:
    - `day` não combina com `rule`;
    - duas partes têm a mesma regra e o mesmo dia (F13);
    - `end` é anterior a `start` (F14);
    - uma data está fora de 1900–2199.
  - Resposta (`IncomeOut`): `id`, `start`, `end` e `parts`. As partes têm os campos acima mais
    `next_date`, e `rule` pode ser nulo (renda antiga sem dia, UC10). Na edição, `rule` é
    obrigatório, então editar uma renda antiga obriga a escolher o dia.
  - `Summary` ganha `income_payments`: os pagamentos que contam no mês, cada um com `date`
    (nula para renda sem dia), `amount` e `next_month`. `monthly_income` é a soma deles.
- **Schema:**
  - `rendas` perde `mes`, `valor` e `uq_renda_mes`. Ganha `inicio` (date) e `fim` (date,
    nulo), com a checagem de que `fim` não vem antes de `inicio`.
  - Tabela nova `partes_renda`: `id`; `renda_id` (FK com cascata); `valor` (`Numeric(12,2)`,
    maior que 0); `regra` (nula ou uma das três); `dia` (int, nulo); `mes_seguinte` (bool).
  - Migração: cada renda atual vira uma renda com uma parte sem regra. `inicio` é o mês dela,
    e `fim` é a véspera da próxima renda do mesmo usuário. Uma renda de valor 0 é apagada,
    porque o fim da anterior já marca o "parei de receber" (F8). O downgrade só aproxima: soma
    as partes e volta ao dia 1 do mês de início.
- **Tipos do frontend:** `Income`, `IncomeIn` e `Summary` mudam, e entram `IncomePart`,
  `IncomePartIn` e `IncomePayment` no `api-schema.d.ts`.
- **Variáveis de ambiente:** nenhuma.
- **Dependências:** `holidays==0.107` em `backend/requirements.txt`.
- **Confirmado na 6:** o contrato acima vale como está. A mais, achado da etapa 5: os ids de
  rota de `/entries/{id}` e `/incomes/{id}` passam de 2**31 - 1 → 422, em vez de 500.

## Plano de implementação (2)

### Domínio (`service.py`)

- **Datas.** `payment_date(rule, day, year, month)` calcula a data do crédito: conta pela
  CLT e antecipa para o dia anterior com banco. Os dois calendários saem da lib: os feriados
  nacionais, e Carnaval e Corpus Christi derivados da Sexta-feira Santa que ela informa.
- **Pagamentos do mês.** `income_payments(month, incomes)` devolve os pagamentos que contam no
  mês: os do próprio mês sem `next_month` e os do mês anterior com `next_month`, sempre que a
  data do pagamento está dentro do período da renda. Uma renda sem regra usa o dia 1, que é
  exatamente o comportamento de hoje.
- **Substituições.** `income_for` vira a soma dos pagamentos, e `calculate_summaries` passa a
  preencher `income_payments`. `next_payment(part, income, today)` alimenta o `next_date`.
- **Início da soma corrida.** O acumulado começa no mais antigo entre o primeiro lançamento e
  o primeiro início de renda, como hoje.

### API

- **Rotas.** Saem as rotas por mês e entram as rotas por id. A validação de `rule` e `day` e
  das partes repetidas fica no schema. `_owned_income` faz o mesmo papel do `_owned_entry`.
- **Transação.** A troca das partes no `PUT` acontece numa transação só.
- **Duplicata.** É detectada comparando com as rendas do usuário: período e conjunto de partes
  iguais.

### Infra

- **Modelos.** `Income` com `start` e `end`. `IncomePart` novo, com `Mapped[Decimal]`.
- **Migração.** Escrita à mão, com o backfill do F8, conferida no Postgres de teste e com
  `alembic check` limpo.

### Frontend

- **Tela Renda.** `IncomeScreen.tsx`, novo e aprovado, com rota `/renda`, aba no `Header` e
  teste ao lado. Lista as rendas com período, partes e próxima data, e avisa quando uma renda
  não tem dia (UC10). O formulário cria ou edita: início, fim opcional e de 1 a 4 partes, cada
  uma com valor, regra (`NativeSelect`), dia e "conta no mês seguinte" (`Checkbox`).
- **Duplicata.** O 409 abre o `Dialog` de confirmação.
- **Configurações.** Perde o card de renda.
- **Resumo.** Lista os pagamentos que contam no mês, com data e valor.
- **`api.ts`.** Ganha `incomes(today)`, `createIncome`, `updateIncome` e `removeIncome(id)`. Um
  erro com `status` permite à tela reconhecer o 409, e `FIELD_LABELS` ganha os campos novos.

### Testes por caso

- **`test_service.py`:**
  - UC1, UC2 e UC3: soma das partes e pagamento que conta no mês seguinte.
  - UC4: datas de outubro, novembro e dezembro de 2026 conferidas com a pesquisa.
  - F3: dia fixo em sábado, em feriado e dia 31 em fevereiro.
  - F5, F7 (troca nos dois sentidos), UC9 (fim), UC11 (sobreposição) e UC10 (sem regra = dia 1).
  - Carnaval e Corpus Christi.
- **`test_api.py`:**
  - UC5, UC6 e UC8: criar, editar e apagar por id.
  - F1, F2, F4, F6, F13 e F14: os 422.
  - F9: sem token e renda alheia, 401 e 404.
  - F10: 409 e `allow_duplicate`.
  - F15: editar renda apagada, 404.
  - `income_payments` no `/summary`.
  - F11: a troca das partes é atômica.
- **`test_migrations.py`:** F8, o backfill de fim e a renda de valor 0.
- **`IncomeScreen.test.tsx`:** UC7, o formulário com partes, a janela do 409 (F10) e o aviso
  de "sem dia" (UC10).
- **`SummaryScreen.test.tsx`:** a lista de pagamentos.
- **Na mão, no navegador:** F12, a tela de 375px com teclado aberto, nos dois temas.

## O que foi construído (6)

### Backend

- **Domínio.** `payment_date` dá a data do crédito de uma regra num mês; `income_payments`
  junta os pagamentos que contam num mês e substituiu o `income_for` (que saiu na etapa 4);
  `next_payment` dá a próxima data de uma parte, para a tela. O calendário de cada ano
  (`_calendar`, em cache) separa os feriados que tiram dia útil da CLT dos dias sem banco. Ao
  contrário do plano, Carnaval e Corpus Christi não são derivados da Sexta-feira Santa: vêm
  da própria lib, na categoria `OPTIONAL`, buscados pelo nome em inglês.
- **API.** `/incomes` virou um recurso por id (`POST`, `PUT`, `DELETE`), com 409 para renda
  repetida e `today` na listagem. O `Summary` traz `income_payments`. Mensagens das regras do
  `IncomeIn` saem em português direto do validador.

### Frontend

- **Tela Renda** (`IncomeScreen`, aba nova no `Header`, rota `/renda`): formulário com até 4
  partes, a lista das rendas com o período e a próxima data de cada parte, e o diálogo de
  confirmação da renda repetida. O cartão de renda saiu de Configurações.
- **Resumo:** a linha da renda lista os pagamentos do mês com o dia; o atalho de renda zerada
  leva para `/renda`.
- **`errorMessage`** passou a mostrar a frase do servidor em `value_error` (sem o prefixo do
  Pydantic) e ganhou `too_short` e `too_long`.

### Infra / dados

- Migração `6f1a02b20a81`: `rendas` ganha `inicio`/`fim`, nasce `partes_renda`, e cada renda
  antiga vira uma parte sem regra. Dependência nova `holidays` (pip-audit limpo).

## Armadilhas (6)

### A suíte contra Postgres estoura "too many clients already"

**Causa:** cada teste de `test_api.py` criava um engine e não o descartava; as conexões do pool
ficavam abertas até o fim da suíte. Já era assim — só apareceu quando o número de testes passou
do limite do Postgres.
**Como se manifesta:** erros de conexão a partir de certo ponto, só com `TEST_DATABASE_URL`; o
sqlite não mostra nada.
**O que fazer:** o `conftest.py` chama `engine.dispose()` depois do `TestClient`. Fixture nova
que crie engine precisa fazer o mesmo.

### A data do crédito pode cair no mês anterior ao da regra

**Causa:** o recuo para o dia com banco atravessa o mês (dia fixo 2 em nov/2026 → 30/10).
**Como se manifesta:** um pagamento de novembro com data de outubro na lista do resumo.
**O que fazer:** nada — é o esperado. O mês em que conta é o da regra; a data real só decide
se o pagamento está dentro do período da renda.

### Campo chamado `date` num schema Pydantic

**Causa:** dentro da classe, o nome do campo sombreia o tipo `date` importado.
**Como se manifesta:** erro de definição do schema, ou anotação resolvida para o campo.
**O que fazer:** anotar com `datetime.date` (é o que `IncomePayment` faz).

### Teste de migração antigo fixado numa revisão

**Causa:** a migração desta feature apaga `rendas.mes` e `rendas.valor`, que o teste do
histórico da renda inspeciona.
**Como se manifesta:** quem trocar `"580bb2fb1f8d"` por `"head"` em `test_migrations.py` vê o
teste quebrar.
**O que fazer:** testar cada migração na revisão dela; a desta feature tem teste próprio.

### `getByLabelText` acha dois elementos no Checkbox do Base UI

**Causa:** o Checkbox renderiza o botão e um input escondido, os dois com o mesmo rótulo.
**Como se manifesta:** "Found multiple elements" no teste.
**O que fazer:** `getByRole('checkbox', { name })`.

### Id de rota acima do `integer` do Postgres respondia 500

**Causa:** `int` sem teto no FastAPI; o Postgres estoura na consulta. Já valia para `/entries`.
No sqlite só a partir de 2**63.
**Como se manifesta:** 500 em `PUT`/`PATCH`/`DELETE` com id ≥ 2**31.
**O que fazer:** rota nova com id usa o tipo `Id` de `finance.py` (422 acima de 2**31 - 1).

## Como verificar (6)

```bash
cd backend && uv run --no-project --with-requirements requirements.txt \
  --with-requirements requirements-dev.txt pytest -q      # TestPaymentDate, TestIncomePayments, TestRenda
cd frontend && npm test                                    # IncomeScreen.test.tsx, SummaryScreen.test.tsx
```

Na tela, com `./dev.sh`:

1. Aba **Renda**: registrar uma renda de 2 partes — dia fixo 20 e último dia útil com "Conta
   no mês seguinte". A lista mostra "próxima: 19/11" para o dia 20 de novembro de 2026
   (Consciência Negra) e a do último dia útil.
2. Registrar de novo a mesma renda: aparece "Essa renda já foi registrada. Registrar mesmo
   assim?". Cancelar não grava; confirmar grava a segunda.
3. **Resumo** de novembro: a renda lista cada pagamento com o dia, e a parte do mês seguinte
   aparece como "recebida no mês anterior".
4. Com uma renda de antes da feature (sem dia), a lista avisa e a edição começa no 5º dia útil.

Pela API: `POST /incomes` com `end` antes de `start` → 422 "O fim da renda vem antes do
início."; `DELETE /incomes/2147483648` → 422.
