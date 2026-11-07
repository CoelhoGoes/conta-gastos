# Paleta de cores e redesenho estilo banco digital

- **Status:** concluído
- **Início:** 2026-11-03 (reaberta em 2026-11-04 para absorver o redesenho)
- **Item do roadmap:** corrigir a paleta de cores do site e redesenhar as telas no estilo dos
  apps de banco digital, no celular e no computador
- **Entrada no CHANGELOG:** "Visual novo, no estilo dos apps de banco digital, no celular e no
  computador, no tema claro e no escuro…" (Alterado), mais as entradas do olho que esconde
  os valores, da busca no Extrato, das próximas faturas, da navegação e da janela de lançar.
  As linhas não lançadas da rosca e da barra do topo foram reescritas para o estado final
- **Design de referência:** canvas [Gestão Financeira — estilo banco digital](https://claude.ai/artifact/FcJNTPmAW7AVY5QnkV43fQ),
  com a prancha de paleta, quatro telas de celular e quatro de computador, só no modo claro

## O que a feature entrega (1)

O site passa a se parecer com um app de banco digital, como Nubank, Inter ou C6. No celular, o
Início abre com um cabeçalho verde que mostra o saldo disponível em destaque, um botão que
esconde os valores e uma fileira de ações rápidas. A navegação vira uma barra de abas fixa
embaixo da tela. No computador, a navegação fica num menu lateral e o Início mostra o saldo,
a fatura, as categorias, a tendência e os últimos lançamentos lado a lado.

As cores passam a ter papéis fixos. O verde é a cor da marca e marca dinheiro que entra ou
sobra. O laranja marca dinheiro que sai e as cores extras dos gráficos. O Lançar e o valor da
fatura no Início são neutros, na cor do texto. O vermelho aparece só em erro e na ação de
apagar. Todo o resto é cinza. Isso vale no modo claro e no escuro.

Algumas coisas passam a ser possíveis:

- esconder os valores na tela;
- buscar e filtrar lançamentos no Extrato;
- ver quanto já está comprometido nas próximas faturas;
- lançar um gasto ou uma entrada numa tela própria, no celular, ou numa janela por cima da
  tela atual, no computador.

## Motivação (1)

A primeira rodada desta feature foi pedida pelo usuário em 03/11/2026: um site com paleta
clara e coesa, que deixe entender rapidamente o que acontece, com a menor margem para erros
possível. A troca de paleta já era esperada desde o gráfico de tendência
(`2026-10-29-grafico-de-tendencia.md`), que deixou a renda (âmbar) e o saldo do mês (azul) em
tokens marcados como "provisório até a paleta nova".

Em 04/11/2026, com a paleta implementada mas ainda não commitada, o usuário pediu para
transformar o design do site num app de gerenciamento que lembre os aplicativos bancários.
Ele também disse que a paleta "ficou muito bagunçada" e deu as regras: verde como primária,
laranja como secundária e só de contraste, e vermelho apenas para erro. Depois, ao revisar o
canvas, ampliou o uso do laranja: saída de dinheiro e cores extras de gráfico. O usuário
escolheu absorver o redesenho nesta feature, em vez de fechar a paleta e abrir um item novo.

## Estado atual (1)

Conferido no código e no Figma em 03/11/2026.

**No código:**

- Toda cor vem dos tokens de `frontend/src/index.css`, com um bloco para o claro (`:root`) e
  outro para o escuro (`.dark`). Fora dos componentes do shadcn, nenhuma tela tem cor fixa.
- Os valores são os neutros padrão do shadcn, com o verde como `--primary`. O gráfico usa
  uma rampa de 5 verdes (`--chart-1..5`), mais o âmbar da renda e o azul do saldo do mês.
- As telas quase não usam cor:
  - `text-muted-foreground` aparece 27 vezes;
  - `text-destructive` aparece uma vez;
  - gasto e entrada não têm cor, só o sinal.
- O tema é escolhido por aparelho, entre claro, escuro e sistema (`state/theme.ts`).
- Não existe `<meta name="theme-color">`, então a barra do navegador no celular não acompanha
  o tema.

**No Figma** ([financial-management-system](https://www.figma.com/design/az7qkvt41EOSQggKVA7M56/financial-management-system?node-id=0-1)),
relido em 04/11/2026, depois que o usuário refez a paleta e acrescentou o vermelho. A escala
bege da primeira versão saiu.

Modo claro (frame `ColorPalette`, fundo branco), do tom mais claro ao mais escuro:

| Escala | 100 | 200 | 300 | 400 | 500 | 600 | 700 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| secondary (verde) | `#32805D` | `#2D7353` | `#266447` | `#20573E` | `#194732` | `#0F3222` | `#061E13` |
| tertiary (cinza frio) | `#727275` | `#676769` | `#59595B` | `#4D4D4F` | `#3F3F41` | `#2C2C2D` | `#19191A` |
| quaternary (laranja) | `#C74821` | `#B4411D` | `#9D3718` | `#8A2F13` | `#72260E` | `#521907` | `#340D03` |
| grey (cinza quente) | `#737370` | `#676764` | `#595957` | `#4E4E4B` | `#3F3F3D` | `#2C2C2B` | `#1A1A19` |
| red (vermelho) | `#DC2548` | `#C62140` | `#AD1B37` | `#98162F` | `#7E1126` | `#5B0919` | `#3A040C` |

Modo escuro (frame `ColorPalette — Dark mode`), do mais escuro ao mais claro. O frame é
desenhado sobre preto `#000000`, mas o fundo do site no modo escuro é `#1A1A19` (ver
Respondidas):

| Escala | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| verde | `#358762` | `#3E996F` | `#47AE7F` | `#51C48F` | `#5BDAA0` | `#93EABE` | `#D1F5E0` |
| cinza frio | `#78787B` | `#89898C` | `#9B9B9E` | `#AFAFB1` | `#C4C4C5` | `#D8D8D9` | `#ECECEC` |
| laranja | `#D24D23` | `#ED5829` | `#FF6E4C` | `#FF917F` | `#FFB0A5` | `#FFCDC7` | `#FFE7E4` |
| cinza quente | `#797976` | `#898986` | `#9C9C98` | `#AFAFAD` | `#C4C4C2` | `#D9D9D7` | `#ECECEC` |
| vermelho | `#E7284C` | `#FF3A5B` | `#FF6A7C` | `#FF8E99` | `#FFAEB5` | `#FFCCD0` | `#FFE7E8` |

- Cores-base: no claro `#266447`, `#59595B`, `#9D3718` e `#AD1B37`; no escuro `#47AE7F`,
  `#9B9B9E`, `#FF6E4C` e `#FF6A7C`.
- As cores são preenchimentos soltos. As variáveis do arquivo não estão mais ligadas a elas,
  e os nomes das camadas do modo claro ainda mostram os valores antigos.

**Contraste medido (WCAG):** as cinco escalas têm o mesmo contraste no mesmo passo. Sobre o
fundo do frame (branco no claro, preto no escuro), vão de 4,8:1 no passo 1 a cerca de 17,5:1
no 7, então **todo tom passa no AA como texto**. Sobre o `#1A1A19` do site, o passo 1 escuro
cai para 4,0:1 e deixa de passar. O mesmo vale ao contrário: verde, laranja e vermelho no mesmo passo têm
contraste de 1,0:1 entre si, e só o matiz os separa.

As escalas não têm tons perto do fundo. Superfícies e bordas (cartão, campo, fundo apagado)
precisam dos tons claros do frame escuro no modo claro, e dos tons escuros do frame claro no
modo escuro.

**Layout, conferido no código em 04/11/2026:**

- **Navegação:** toda tela logada usa o `Page`, com a barra `Header` no topo e o conteúdo
  limitado a `max-w-6xl`. A barra tem cinco abas (Resumo, Lançamentos, Fatura, Renda,
  Importar), o ícone de Configurações e o botão Sair. No celular, as abas descem para uma
  segunda linha e mostram só o ícone.
- **Resumo:** cartão de resumo com o saldo disponível em destaque e os totais do mês. Tem a
  rosca de categorias, em que tocar numa fatia abre um diálogo com as categorias dela, e o
  gráfico de tendência de 6 meses.
- **Lançamentos:** formulário de criar e editar, fixo ao lado no computador, e lista do mês.
  Editar um item carrega o mesmo formulário.
- **Fatura:** tabela das parcelas de um mês, com navegação entre meses. A API devolve uma
  fatura por mês (`GET /invoices/{month}`).
- **Ainda não existem:** esconder valores, busca, filtros e a visão das próximas faturas.


## Casos de uso (1)

Os UC1 a UC8 são da paleta e valem em todas as telas. Os UC9 em diante são do redesenho.

- **UC1 — Usar o site no modo claro.** Quem: usuário logado com o tema claro. O quê: abre
  qualquer tela. Resultado: fundo, cartões, textos, bordas, botões e campos saem da paleta
  nova. Nenhuma cor sobra do tema antigo.
- **UC2 — Usar o site no modo escuro.** Quem: usuário logado com o tema escuro, ou com
  "sistema" num aparelho escuro. O quê: abre qualquer tela. Resultado: os mesmos papéis de
  cor do UC1, com os tons escuros. O canvas só desenha o claro, então o escuro precisa ser
  desenhado e aprovado antes da implementação.
- **UC3 — Trocar de tema.** Quem: usuário logado. O quê: troca entre claro, escuro e sistema
  em Configurações. Resultado: todas as cores acompanham na hora, sem recarregar, incluindo
  os gráficos.
- **UC4 — Distinguir entrada de saída pela cor.** Quem: usuário logado. O quê: olha qualquer
  valor de dinheiro (listas, totais, fatura, saldo). Resultado: o que entra ou sobra fica
  verde, com `+`; o que sai fica laranja, com `−`.
- **UC5 — Reconhecer erro e ação de apagar.** Quem: usuário logado. O quê: vê uma mensagem
  de erro, um campo inválido ou a confirmação de apagar. Resultado: vermelho, e só aí.
  Nenhum gráfico usa vermelho.
- **UC6 — Achar a ação principal da tela.** Quem: usuário logado. O quê: procura como lançar
  algo. Resultado: em cada tela, o Lançar (ou o botão que confirma o lançamento) aparece
  preenchido na cor do texto, neutro. Os outros botões são verdes ou neutros.
- **UC7 — Ler os gráficos.** Quem: usuário logado, no Início. O quê: olha as categorias e a
  tendência. Resultado: as categorias aparecem como barras horizontais, com cores alternando
  verde e laranja, claro e escuro, e "Outras" em cinza. O gráfico de tendência de 6 meses
  continua no Início, com a paleta nova.
- **UC8 — Ler qualquer texto colorido.** Quem: usuário logado, nos dois modos. O quê: lê um
  valor, rótulo ou mensagem em cor. Resultado: texto com pelo menos 4,5:1 de contraste
  (WCAG AA). Barras, bordas de campo e ícones com pelo menos 3:1.
- **UC9 — Ver o Início no celular.** Quem: usuário logado, em tela estreita. O quê: abre o
  app. Resultado: um cabeçalho verde com o saldo disponível e o saldo do mês. Abaixo dele, as
  ações rápidas (Lançar, Extrato, Fatura, Importar), um cartão da fatura do mês que leva à
  Fatura, o resumo do mês, as barras de categoria e a tendência.
- **UC10 — Ver o Início no computador.** Quem: usuário logado, em tela larga. O quê: abre o
  app. Resultado: menu lateral, saldo em destaque com os totais do mês, e cartões da fatura,
  das categorias, da tendência e dos últimos lançamentos.
- **UC11 — Navegar.** Quem: usuário logado. O quê: troca de tela. Resultado: no celular, pela
  barra de abas fixa embaixo (Início, Extrato, Fatura, Renda), mais Importar nas ações
  rápidas do Início, Configurações no ícone do cabeçalho e Sair dentro de Configurações. No
  computador, pelo menu lateral, com todas as telas. A tela atual fica marcada.
- **UC12 — Esconder os valores.** Quem: usuário logado, com alguém olhando a tela. O quê:
  toca no olho do Início. Resultado: os valores viram `R$ ••••` em todas as telas, e a
  escolha fica guardada no aparelho até tocar de novo.
- **UC13 — Lançar no celular.** Quem: usuário logado. O quê: toca em Lançar. Resultado: abre
  uma tela própria, com a escolha entre gasto e entrada, valor (com o teclado numérico do
  sistema), categoria, descrição, data e,
  para gasto, à vista ou crédito com parcelas. O valor de cada parcela aparece enquanto
  digita. Ao confirmar, volta para onde estava, e o saldo já reflete o lançamento.
- **UC14 — Lançar no computador.** Quem: usuário logado. O quê: clica em Lançar. Resultado:
  abre uma janela por cima da tela atual, com os mesmos campos do UC13. Ao confirmar, a
  janela fecha e a tela de baixo atualiza.
- **UC15 — Editar ou apagar um lançamento.** Quem: usuário logado. O quê: escolhe um
  lançamento no Extrato. Resultado: no celular, tocar no item abre o Lançar preenchido, com
  o Apagar dentro dele. No computador, cada linha tem editar e apagar. Apagar pede
  confirmação, como hoje.
- **UC16 — Ver o Extrato.** Quem: usuário logado. O quê: abre o Extrato de um mês.
  Resultado: no celular, lançamentos agrupados por dia, com o total de cada dia. No
  computador, uma tabela com data, descrição, categoria, forma e valor, e cartões com
  entradas, saídas e saldo do mês.
- **UC17 — Buscar e filtrar no Extrato.** Quem: usuário logado. O quê: digita parte da
  descrição, ou escolhe Tudo, Entradas, Saídas ou Crédito. Resultado: a lista do mês aberto
  mostra só o que bate.
- **UC18 — Ver a Fatura.** Quem: usuário logado. O quê: abre a Fatura de um mês. Resultado:
  o total em destaque, a navegação entre meses e as parcelas, cada uma com o progresso
  (4/10). Os valores da Fatura são neutros: sem sinal e na cor do texto.
- **UC19 — Ver as próximas faturas.** Quem: usuário logado. O quê: abre a Fatura. Resultado:
  os totais dos meses seguintes que já têm parcelas, em chips no celular e num gráfico de
  barras no computador. Tocar num mês abre aquela fatura.
- **UC20 — Abrir o detalhe de uma categoria.** Quem: usuário logado, no Início. O quê: toca
  numa barra de categoria ou em "Outras". Resultado: abre o detalhe, como a rosca faz hoje.
- **UC21 — Usar as demais telas.** Quem: visitante (Login) ou usuário logado (Renda,
  Importar, Configurações). O quê: abre a tela. Resultado: a mesma navegação, paleta e
  linguagem visual (cartões, cantos, tipografia) das telas desenhadas.

## Casos de falha (1)

- **F1 — Daltonismo.** Quando: alguém com deuteranopia ou protanopia, em que verde e laranja
  se aproximam, olha entradas, saídas, erros e gráficos. Esperado: nada depende só da cor.
  O sinal, o ícone de seta, o texto da mensagem e a legenda continuam dizendo o que cada coisa
  é. Barras vizinhas também diferem em claridade.
- **F2 — Tema do sistema muda com o app aberto.** Quando: o aparelho troca de claro para
  escuro com o tema em "sistema". Esperado: as cores acompanham, como no UC3.
- **F3 — Componente que ficou para trás.** Quando: um componente do shadcn usa um token que
  a troca não cobriu. Esperado: diálogo, seletor, foco do teclado e toggle aparecem na paleta
  nova, nos dois modos.
- **F4 — Valor zero ou saldo negativo.** Quando: um total dá zero, ou um saldo fica
  negativo. Esperado: o saldo negativo fica laranja, como saída. O zero fica neutro, sem cor
  e sem sinal.
- **F5 — Mais categorias que cores.** Quando: o mês tem mais categorias que cores de barra.
  Esperado: as maiores ganham uma cor cada e o resto se junta em "Outras", em cinza.
- **F6 — Modo de alto contraste do sistema.** Quando: o navegador força cores próprias.
  Esperado: o sinal, os ícones e os textos continuam dizendo o que é entrada, saída e erro.
- **F7 — iPhone e PWA.** Quando: o app abre no Safari do iPhone ou instalado na tela
  inicial. Esperado:
  - a barra de abas fixa não fica atrás do indicador de início e não cobre o último item da
    lista;
  - no Lançar, o teclado aberto não esconde o botão de confirmar;
  - a barra do navegador (`theme-color`) acompanha o tema.
- **F8 — Largura intermediária.** Quando: tablet ou janela entre o celular e o computador.
  Esperado: a tela escolhe uma das duas navegações e nada quebra. Tabelas largas rolam dentro
  do cartão, sem rolagem horizontal da página.
- **F9 — Valor inválido no Lançar.** Quando: o valor está vazio, é zero ou é negativo, ou o
  servidor recusa (422), por exemplo por categoria fora da lista. Esperado: o lançamento não
  é criado. O campo e a mensagem aparecem em vermelho, e o que foi digitado continua lá.
- **F10 — Lançar duas vezes.** Quando: duplo clique ou toque repetido em confirmar.
  Esperado: um lançamento só. O botão fica indisponível enquanto envia.
- **F11 — Rede ou API fora no meio do Lançar.** Quando: o envio falha. Esperado: a tela ou
  janela não fecha, mostra o erro em vermelho e mantém os campos para tentar de novo.
- **F12 — Sessão expirada.** Quando: o token vence com o app aberto, inclusive durante o
  Lançar. Esperado: o mesmo de hoje, a volta para o Login. O que foi digitado se perde.
- **F13 — Lançamento que não existe mais.** Quando: o lançamento foi apagado em outra aba e
  alguém tenta editar ou apagar. Esperado: a mensagem de erro aparece e a lista se atualiza.
- **F14 — Busca sem resultado.** Quando: nenhum lançamento do mês bate com a busca ou o
  filtro. Esperado: uma mensagem de lista vazia que diz que é a busca, não o mês, que está
  vazia, e um jeito de limpar.
- **F15 — Sem dados.** Quando: mês sem lançamentos, fatura sem parcelas, nenhuma fatura
  futura, ou conta nova sem renda. Esperado: mensagens de vazio no lugar de cada bloco. O
  aviso de renda zerada do Resumo de hoje continua.
- **F16 — Uma parte da tela falha.** Quando: a API responde ao saldo mas falha nas próximas
  faturas, na tendência ou nas categorias. Esperado: o bloco que falhou mostra o erro, e o
  resto da tela continua usável.
- **F17 — Teclado e leitor de tela.** Quando: alguém navega sem mouse ou com leitor de tela.
  Esperado:
  - a janela de Lançar prende o foco, fecha com Esc e devolve o foco a quem a abriu;
  - a barra de abas e o menu lateral anunciam a tela atual;
  - o botão de olho diz se vai mostrar ou esconder;
  - valores escondidos não são lidos em voz alta.

Não se aplicam, de propósito: conta excluída e recurso de outro usuário. O redesenho não muda
quem pode ver o quê, e as chamadas continuam escopadas pelo JWT.

## Perguntas abertas (1)

Nenhuma.

Respondidas na etapa 2, em 04/11/2026:

- **Fechar o Lançar com algo digitado (P4):** pergunta antes de descartar.
- **Barra do navegador no celular (P6):** verde no Início, emendando com o cabeçalho; nas
  outras telas, o fundo.
- **Login (P7):** ganha um desenho próprio, feito no canvas antes da etapa 3.

Respondidas em 04/11/2026, no redesenho:

- **Esconder valores (P1):** a escolha fica guardada no aparelho entre visitas, como o tema,
  e esconde os valores em todas as telas.
- **Valor no Lançar do celular (P2):** campo com o teclado numérico do sistema, não um
  teclado próprio como no canvas.
- **Importar, Configurações e Sair no celular (P3):** como no canvas. Importar é ação rápida
  do Início, Configurações é o ícone do cabeçalho, e Sair fica dentro de Configurações.
- **Editar e apagar no Extrato do celular (P5):** tocar no item abre o Lançar preenchido, com
  o Apagar dentro dele.

- **Absorver na feature da paleta:** o redesenho entra nesta feature, em vez de fechar a
  paleta primeiro.
- **Modo escuro:** continua, com claro, escuro e sistema. Precisa ser desenhado antes da
  implementação.
- **Funções novas que entram:** esconder valores, busca e filtros no Extrato, próximas
  faturas.
- **Gráficos do Início:** categorias em barras horizontais, e a tendência de 6 meses
  continua.
- **Papéis das cores**, que substituem as respostas da primeira rodada onde conflitam:
  - verde é primária, entrada e superávit;
  - laranja é saída de dinheiro e as cores extras de gráfico;
  - vermelho é só erro e apagar, e sai da rosca e dos gráficos;
  - o Lançar e o valor da fatura no cartão do Início são neutros, na cor do texto (pedido em
    07/11/2026, depois de ver o modo escuro; antes eram laranja).

Da primeira rodada, só paleta:

Respondidas em 03/11/2026:

- Entrada e gasto **ganham cor**: entrada verde, gasto laranja, com o sinal mantido.
- Erro e apagar **ganham um vermelho próprio**, fora da paleta atual.
- O fundo do modo claro era **branco**; em 04/11/2026 passou a `#ECECEC` com cartões brancos (ver Decisões).
- O contraste **AA é obrigatório**.

Respondidas em 04/11/2026:

- O botão principal e os destaques **continuam verdes**, no tom do Figma. O custo aceito é
  que o verde diz duas coisas, entrada e ação.
- O saldo negativo fica **laranja, como gasto**.
- A barra do navegador no celular (`theme-color`) **entra** nesta feature.
- A rosca de categorias usa **cores variadas da paleta**, não uma rampa de laranja.
- O valor zero, num total ou num saldo, fica **neutro**, sem cor.
- A escala vermelha **entrou no Figma**, junto com a paleta refeita (ver Estado atual). Com
  ela, todo tom das escalas passa no AA, e o aviso sobre o laranja `#FF5F2D` deixou de valer.
- O fundo do modo escuro é **`#1A1A19`**, o `grey/700` da escala clara, e não o preto
  `#000000` do frame. Foi comparado com `#000000` e com o `#161613` da primeira versão. Ele tem
  o mesmo tom quente e sai da própria paleta. Sobre ele, o passo 1 das escalas escuras cai para
  4,0:1 e reprova como texto; do passo 2 em diante passa (5,0:1 ou mais), e os tons-base dão
  6,3:1. A borda de campo `#676764` fica no limite (3,07:1).

## Fora do escopo (1, revisado na 2)

- **Ícones e logo do PWA.**
- **App nativo.** O redesenho é do site. O app nativo continua no futuro, e consome a mesma API.
- **Regras de negócio.** Saldo, fatura, parcelas e categorias continuam calculados como hoje
  no `service.py`. O redesenho muda só como aparecem.
- **Telas novas além das que existem.** Renda, Importar e Configurações ganham a
  linguagem nova (UC21), mas não um redesenho de conteúdo. O Login é a exceção: ganha um
  desenho próprio (P7).
- **Busca fora do mês aberto.** O filtro do Extrato roda sobre o mês carregado. Buscar em
  todos os meses pediria parâmetros novos na API.
- **Rota própria para o Lançar.** Ele abre como janela, e o botão voltar do celular não o
  fecha.
- **Endereços novos.** Os rótulos mudam (Início, Extrato), as rotas não.

## Decisões (2)

### Rodada 2 — redesenho (04/11/2026)

Verificado em 04/11/2026:

- **Conferido no código:** o front já usa o shadcn/ui (`base-nova`, sobre Base UI) com 12
  componentes, e o alias `hooks` do `components.json` aponta para `@/hooks`, pasta que não
  existe. A fatura vem de `GET /invoices/{month}`, um mês por vez. O `GET /trend` aceita
  `until` sem limite de futuro e devolve o `invoice` de cada mês. O `GET /entries?month=` traz
  o mês inteiro.
- **Consultado no registro do shadcn** (`npx shadcn view`): sidebar, sheet, drawer, tabs,
  input-group, empty, field, item, skeleton, separator, avatar, progress, scroll-area,
  alert-dialog e use-mobile não trazem dependência de runtime nova; só dependem de `cn` e
  `@base-ui/react`, que já existem. O `sonner` traria `sonner` e `next-themes`. A Sidebar grava
  um cookie de estado.
- **Consultado no npm:** `daisyui` 5.7.50, `@heroui/react` 3.2.7 (com `react-aria`,
  `react-aria-components` e `@internationalized/date` como peers), `flowbite-react` 0.12.17
  (último release em 09/02/2026, com ferramentas de build entre as dependências de runtime) e
  `@headlessui/react` 2.2.10.
- **Não verificado:** tamanho final do bundle e comportamento do Dialog em tela cheia no
  Safari do iPhone. Os dois ficam para a etapa 3.

#### Biblioteca de componentes: ampliar o shadcn

**Escolhido:** continuar no shadcn/ui e instalar os componentes que o redesenho pede.
**Alternativas:**
- HeroUI v3: reescrever tudo, com React Aria e mais peso no navegador;
- daisyUI: só CSS, dois sistemas convivendo;
- Flowbite React: release parado desde fevereiro e dependências estranhas;
- Headless UI: sem estilo, repete o Base UI.

**Custo aceito:** o código dos componentes vive no projeto e a manutenção é nossa.

#### Menu lateral: Sidebar do shadcn, hooks em `presentation/hooks/`

**Escolhido:** o menu do computador usa a `Sidebar`. O `use-mobile.ts` que ela pede vai para
`src/presentation/hooks/`, e o alias `hooks` do `components.json` passa a
`@/presentation/hooks`. No celular, a Sidebar fica escondida, e a navegação é a `BottomNav`.
**Alternativas:**
- menu feito com `Button`: mais simples, mas fora do shadcn;
- hooks em `src/hooks/`: fica fora das camadas.

**Custo aceito:** a Sidebar traz o que o desenho não usa: recolher, cookie de estado, atalho
Ctrl+B e a versão em Sheet. Ela instala `sheet`, `tooltip`, `separator` e `skeleton` junto.

#### Próximas faturas: `GET /trend` com `until` no futuro

**Escolhido:** a Fatura pede `trend(4, mês+3)` e usa só o campo `invoice` de cada mês. Meses
sem parcela não aparecem.
**Alternativas:**
- uma chamada `/invoices` por mês: várias requisições que falham sozinhas;
- endpoint novo: contrato e testes de API para o mesmo dado.

**Custo aceito:** o servidor calcula o resumo inteiro de 4 meses para o front usar um campo.

#### Lançar: um `Dialog`, tela cheia abaixo de `md`

**Escolhido:** o `EntryDialog` concentra o formulário que hoje vive dentro do `EntryScreen`.
Ele abre por cima de qualquer tela, para criar ou editar, e ocupa a tela inteira no celular.
Fechar com algum campo preenchido abre um `AlertDialog` "Descartar lançamento?", com
Continuar editando e Descartar, este em vermelho.
**Alternativas:**
- rota `/lancar` no celular: o voltar funcionaria, mas seriam dois invólucros;
- descartar direto ao fechar;
- confirmação feita à mão dentro do formulário.

**Custo aceito:** o voltar do celular não fecha o Lançar.

#### Busca e filtros do Extrato: no navegador

**Escolhido:** a busca por descrição (sem diferença de maiúsculas e acentos) e os filtros
Tudo, Entradas, Saídas e Crédito rodam sobre a lista do mês que já foi carregada. A busca usa
o `InputGroup`. Os filtros usam o `ChoiceToggle`, e a lista vazia usa o `Empty`.
**Alternativas:** parâmetros novos no `GET /entries`.

**Custo aceito:** não busca fora do mês aberto.

#### Categorias: barras com `Progress`, a rosca sai

**Escolhido:** o `CategoryBars` mostra uma linha por categoria, com nome, valor e uma
`Progress` proporcional à maior categoria. São no máximo 5 cores e "Outras" em cinza, e tocar
abre o diálogo de detalhe de hoje. `CategoryDonut.tsx` e o teste dele são apagados. A
tendência continua lazy, com recharts.
**Alternativas:**
- `Chart` de barras do recharts: mais pesado e mais difícil de usar ao toque;
- guardar a rosca sem uso: código morto.

**Custo aceito:** perde o tooltip e a animação do recharts nas categorias.

#### Esconder valores: `state/privacy.ts`

**Escolhido:** a escolha fica guardada por aparelho no `localStorage` (`gf:hide-values`), no
mesmo padrão do `theme.ts`. O `Amount` lê esse estado e, escondido, mostra `R$ ••••` com um
`aria-label` "valor escondido". Eixos e tooltips da tendência também escondem os números.
**Alternativas:** nenhuma real: a regra veio da resposta P1.

**Custo aceito:** quem mostra valor sem passar pelo `Amount` (eixo do gráfico) precisa ler o
estado à parte.

#### Barra do navegador: verde no Início

**Escolhido:** o `SummaryScreen` grava a cor do cabeçalho na `theme-color` ao montar e
devolve a do fundo ao sair. O script inline do `index.html` continua com a cor do fundo.
**Alternativas:** sempre a cor do fundo.

**Custo aceito:** ao abrir direto no Início, a barra pisca da cor do fundo para o verde no
primeiro render.

#### Rotas: rótulos novos, endereços iguais

**Escolhido:** a navegação mostra Início e Extrato, mas as rotas continuam `/` e
`/lancamentos`.
**Alternativas:** renomear para `/extrato` com redirecionamento.

**Custo aceito:** o endereço `/lancamentos` não bate com o rótulo "Extrato".

#### Paleta: revisão das decisões da primeira rodada

**Escolhido:** valem os papéis das respostas de 04/11/2026. Muda o seguinte em relação às
decisões da primeira rodada, abaixo:

- **Lançar neutro (revisto em 07/11/2026):** o Lançar e o botão que confirma o lançamento usam
  o `Button` com `bg-foreground text-background`, sem token nem variante nova. Os
  `--highlight` e a variante `highlight`, decididos antes, saem. `--primary` continua verde.
- **Gráficos:** o vermelho sai. As cores `--chart-1..5` alternam verde e laranja, claro e
  escuro, e o `--chart-others` fica cinza.
- **Texto de saída:** o `--expense` usa o laranja que passa no AA sobre cartão e fundo
  apagado.
- **Fatura neutra (pedido em 07/11/2026):** na tela da Fatura, as parcelas e o total aparecem
  sem sinal e na cor do texto, não em laranja. Vale no celular, no computador e nas próximas
  faturas. Desfaz a nota da rodada 1 que deu o `−` às parcelas e ao total. Fora da Fatura,
  a fatura do mês continua como saída: no resumo do Início, em laranja com `−`.
- **Valores finais:** fundo, cartão e todos os tons do modo escuro saem do desenho que precisa
  ser aprovado antes da etapa 3 (ver **Plano**). A tabela de tokens abaixo é atualizada com
  eles.

**Custo aceito:** a etapa 3 só começa depois de uma rodada de design no canvas.

### Rodada 1 — só paleta (03–04/11/2026)

Implementadas e ainda não commitadas. O que conflita com a rodada 2 vale como está na rodada 2.


Fatos conferidos no código em 04/11/2026:

- toda cor das telas vem dos tokens de `frontend/src/index.css`;
- os tokens `sidebar-*` não são usados por nenhum componente;
- o `theme-color` não existe;
- o projeto não tem manifest de PWA.

Os contrastes foram medidos com a fórmula do WCAG, num script na pasta de rascunho.

### Tokens do tema

**Escolhido:** os tokens de `index.css` passam a usar estas cores. O contraste é de cada cor
sobre o fundo do modo; "apagado" é sobre `muted`.

| Token (papel) | Claro | Escuro | Contraste claro / escuro |
| --- | --- | --- | --- |
| `background` (fundo) | `#ECECEC` | `#1A1A19` | — |
| `foreground` (texto) | `#1A1A19` | `#ECECEC` | 14,7 / 14,7; no cartão claro 17,4 |
| `card`, `popover` | `#FFFFFF` | `#1A1A19`, separado pela borda | — |
| `muted`, `secondary`, `accent` (fundo apagado, hover) | `#D9D9D7` | `#2C2C2B` | — |
| `muted-foreground` (texto secundário) | `#595957` | `#9C9C98` | 5,9 / 6,3; cartão 7,0 / 6,3; apagado 5,0 / 5,1 |
| `border` (divisória, borda de cartão) | `#D9D9D7` | `#2C2C2B` | decorativa |
| `input` (borda de campo) | `#797976` | `#797976` | 3,7 / 4,0; no cartão claro 4,4 |
| `primary` (botão principal) | `#266447` | `#47AE7F` | 7,0 / 6,3 |
| `primary-foreground` (texto no botão) | `#FFFFFF` | `#1A1A19` | 7,0 / 6,3 |
| `ring` (contorno de foco) | `#32805D` | `#47AE7F` | 4,8 / 6,3 |
| `destructive` (erro, apagar) | `#AD1B37` | `#FF6A7C` | 7,0 / 6,3 |
| `income`, novo (entrada) | `#266447` | `#47AE7F` | 7,0 / 6,3; apagado 5,9 / 5,1 |
| `expense`, novo (gasto, saldo negativo) | `#9D3718` | `#FF6E4C` | 7,0 / 6,3; apagado 5,9 / 5,1 |
| `chart-month-balance` (saldo do mês) | `#59595B` | `#9B9B9E` | 7,0 / 6,3 |
| `theme-color` (barra do celular) | `#ECECEC` | `#1A1A19` | — |

- **Valores derivados:** os `*-foreground` que faltam na tabela (`card`, `popover`,
  `secondary`, `accent`) usam o `foreground` do modo.
- **Tokens `sidebar-*`:** recebem os valores equivalentes (`card`, `primary`, `accent`,
  `border`, `ring`). Não são apagados, porque o shadcn os espera.
- **`--chart-income`:** sai, e a renda passa a usar `--income`. O `--chart-month-balance` fica,
  mas deixa de ser provisório.

- **Fundo claro `#ECECEC`, cartão branco:** o `#ECECEC` é o espelho do `#1A1A19`. É o último
  tom do cinza na paleta escura, e os dois ficam a cerca de 1,2:1 do extremo. Como quase tudo
  fica dentro de cartões brancos, os tons-base continuam em 7,0:1 ali, e caem para 5,9:1 no que
  fica direto no fundo, como a barra do topo.
- **Consequências, sem bifurcação:**
  - o `muted` passa a `#D9D9D7`, porque com `#ECECEC` o hover dos botões da barra do topo
    ficaria igual ao fundo;
  - o `muted-foreground` passa a `#595957`, porque o `#676764` daria 4,0:1 sobre o `#D9D9D7`
    e reprovaria;
  - a borda de campo passa a `#797976`, porque o `#898986` daria 2,97:1 sobre o fundo.
  Assim, `muted` e `input` ficam simétricos entre os modos.

**Alternativas:**

- fundo claro `#FFFFFF` (máximo contraste, mas assimétrico com o escuro);
- fundo e cartão `#ECECEC` (reprovava texto secundário e borda de campo);
- fundo escuro `#000000` ou `#161613` (ver Respondidas);
- borda de campo `#676764` no escuro, que fica em 3,07:1, no limite.

**Custo aceito:**

- os modos ficam assimétricos: no claro, o cartão se destaca por ser mais claro que o fundo; no
  escuro, é igual ao fundo e se separa só pela borda;
- o verde é ao mesmo tempo botão e entrada;
- verde, laranja e vermelho do mesmo passo só se distinguem pelo matiz, então o sinal + ou −
  continua obrigatório (F1).

### Fatias da rosca: laranja, verde e vermelho, cinza só em "Outras"

**Escolhido:** revisto pelo usuário depois da etapa 4. `--chart-1..5`, na ordem das fatias,
alternam as três famílias e a claridade. O cinza fica só para "Outras".

| Fatia | Claro | Escuro |
| --- | --- | --- |
| 1 | `#C74821` laranja | `#FF6E4C` laranja |
| 2 | `#194732` verde-escuro | `#93EABE` verde-claro |
| 3 | `#AD1B37` vermelho | `#FF6A7C` vermelho |
| 4 | `#32805D` verde | `#3E996F` verde |
| 5 | `#72260E` laranja-escuro | `#FFCDC7` laranja-claro |
| Outras | `#797976` cinza (`--chart-others`) | `#797976` cinza |

- **Contraste:** sobre o cartão, todas as fatias têm pelo menos 4,8:1.
- **Entre fatias vizinhas:** de 1,3 a 2,5, sempre com matiz diferente.

**Alternativas:**

- a primeira versão, com cinza na fatia 3: o usuário não gostou do uso de cores;
- só verde e laranja;
- só verde e vermelho.

**Custo aceito:** o vermelho, que até aqui era só erro e apagar, aparece também numa fatia da
rosca.

### Gráfico de tendência: barras laranja, linhas verdes, renda cinza

**Escolhido:** revisto pelo usuário depois da etapa 4.

| Série | Cor | Claro | Escuro |
| --- | --- | --- | --- |
| barras À vista | `--expense` | | |
| barras Fatura | `--chart-5` | laranja-escuro | laranja-claro |
| saldo acumulado | `--chart-balance` | `#194732` | `#93EABE` |
| saldo do mês | `--chart-month-balance` | `#32805D` | `#3E996F` |
| renda, tracejada | `--chart-income` | `#59595B` | `#9B9B9E` |

**Alternativas:**

- renda em verde de um extremo da escala: três linhas verdes dependeriam só da claridade;
- renda em vermelho: a cor de erro numa série que é coisa boa;
- a versão anterior, com o saldo na cor do texto e a renda em verde: faltava verde e a linha
  não agradou.

**Custo aceito:**

- **A renda deixa de ser verde,** a cor de entrada. A legenda e o tracejado dizem o que ela é.
- **No claro, as linhas se perdem onde cruzam as barras.** O cinza da renda e o laranja da
  barra À vista têm a mesma claridade (1,0:1), e os verdes ficam entre 1,0 e 1,5:1 contra as
  barras.

### Cor dos valores: componente novo `Amount`

**Escolhido:** o arquivo novo `presentation/components/Amount.tsx` recebe o valor e o tipo e
mostra o sinal, `R$` e o valor na cor certa:

| Tipo | Cor |
| --- | --- |
| `entrada` | verde, sinal `+` |
| `gasto` | laranja, sinal `−` |
| `saldo` | laranja se negativo, verde se positivo, neutro se zero |

O `MoneyRow` passa a usar o `Amount` por dentro. Decidir pelo sinal do saldo é apresentação,
não regra de negócio: o valor vem pronto da API.

**Alternativas:** classe em cada tela. Repetiria a regra do saldo em três lugares, e um lugar
esquecido ficaria sem cor.

**Custo aceito:** um arquivo novo, mais o teste dele.

### `theme-color` por script

**Escolhido:** uma `<meta name="theme-color">` no `index.html`. O conteúdo dela é atualizado
no mesmo lugar que liga a classe `.dark`: o `applyTheme` do `theme.ts` e o script inline do
`index.html`, que já repetem essa regra.

**Alternativas:** duas metas com `media="(prefers-color-scheme: …)"`. Erram quando o tema
escolhido difere do sistema.

**Custo aceito:** a regra continua repetida em dois lugares, como já é. Agora cada um tem uma
linha a mais.

## Contratos alterados (2, confirmado na 6)

- **API:** nenhum. O `GET /trend` passa a ser chamado com `until` no futuro, o que ele já
  aceita.
- **Schema:** nenhum.
- **Tipos do frontend:** nenhum.
- **Variáveis de ambiente:** nenhuma.
- **Configuração:** alias `hooks` do `components.json` passa a `@/presentation/hooks`.
- **Armazenamento do aparelho:** chave nova `gf:hide-values` no `localStorage`. A Sidebar grava
  o cookie `sidebar_state`.
- **Tokens CSS da rodada 2:** os `--chart-1..5` mudam de valor, sem vermelho. Nenhum token novo
  de ação.
- **Tokens CSS:**
  - novos: `--chart-others` (fatia "Outras"), `--chart-balance` (saldo acumulado), `--income` e
    `--expense`, com `--color-income` e `--color-expense` no
    `@theme inline`, o que dá as classes `text-income` e `text-expense`;
  - novos na rodada 3 (confirmado na 6): `--hero`, `--hero-foreground`, `--income-muted` e
    `--expense-muted`, também no `@theme inline`;
  - `--chart-income` continua, agora cinza frio, para a linha de renda;
  - sai: `--header-height`, junto com o `Header`;
  - mudam de valor: todos os outros, incluindo `--radius` (`.75rem`) e os `--sidebar-*` (verde).
- **Componentes internos** (confirmado na 6): `Header` e `CategoryDonut` saem; `RowActions`
  aceita `onEdit` opcional; `Page` troca o `Header` pela `AppSidebar` e pela `BottomNav`.

## Plano de implementação (2)

### Rodada 2 — redesenho

**Antes da etapa 3:** desenhar no canvas o Login (celular e computador) e as telas no modo
escuro, e aprovar com o usuário. Os valores aprovados completam a tabela de tokens.

**Aprovados em 04/11/2026:**

- **Componentes do shadcn:** sidebar, sheet, tooltip, separator, skeleton, progress,
  alert-dialog, input-group, textarea e empty. Nenhum traz dependência nova.
- **Hook:** `presentation/hooks/use-mobile.ts`.
- **Componentes novos em `presentation/components/`**, cada um com seu `.test.tsx`:
  `AppSidebar`, `BottomNav`, `EntryDialog`, `CategoryBars` e `UpcomingInvoices`.
- **Estado:** `state/privacy.ts`, com `privacy.test.ts`.
- **Saem:** `Header.tsx`, `CategoryDonut.tsx` e os testes deles.
- **Muda:** o alias `hooks` do `components.json`. O `button.tsx` fica como o shadcn instala.
- **Nenhuma dependência de runtime nova.**

**Por camada:**

- **Tema (`index.css`):** os tokens novos, os `--chart-*` revistos e os valores do escuro
  aprovados.
- **Casca (`Page`):**
  - no computador, `SidebarProvider` com `AppSidebar` e o conteúdo;
  - no celular, o conteúdo e a `BottomNav` fixa, com `env(safe-area-inset-bottom)` e
    espaço embaixo para não cobrir o último item;
  - os títulos de aba (`<title>`) que o `Header` fazia passam para o `Page`.
- **Início (`SummaryScreen`):** cabeçalho verde com saldo e olho no celular, bloco de saldo no
  computador, ações rápidas, cartão da fatura, resumo, `CategoryBars`, tendência e últimos
  lançamentos (computador). Grava a `theme-color` verde.
- **Extrato (`EntryScreen`):**
  - o formulário sai para o `EntryDialog`;
  - lista por dia no celular, tabela no computador, cartões de totais;
  - busca e filtros no navegador; tocar no item, no celular, abre o `EntryDialog` preenchido.
- **Lançar (`EntryDialog`):**
  - criar e editar, com tela cheia abaixo de `md`;
  - o botão de confirmar fica desabilitado enquanto envia, e o erro fica dentro da janela,
    com os campos mantidos;
  - fechar com algo digitado abre o `AlertDialog`;
  - o apagar fica dentro dele ao editar, com o `RowActions` ou a mesma confirmação de dois
    cliques;
  - quem abriu a janela recarrega os dados ao salvar.
- **Fatura (`InvoiceScreen`):** bloco do total, `UpcomingInvoices` (chips no celular, barras
  no computador) e as parcelas com `Progress` do avanço.
- **Valores (`Amount`):** lê o `privacy`.
- **Login, Renda, Importar, Configurações:** casca e linguagem nova; o Login, conforme o
  desenho aprovado. O Sair vai para Configurações.

**Qual teste cobre cada caso (rodada 2):**

| Caso | Teste |
| --- | --- |
| UC4, F4 | `Amount.test.tsx` (já existe) |
| UC6 | Lançar neutro; teste de `SummaryScreen` e `EntryScreen` confere que o botão não usa laranja nem o verde primário |
| UC7, F5, UC20 | `CategoryBars.test.tsx`: cores na ordem, "Outras" cinza, clique abre o detalhe |
| UC9, UC10 | `SummaryScreen.test.tsx`: saldo, ações rápidas, cartão da fatura |
| UC11 | `AppSidebar.test.tsx` e `BottomNav.test.tsx`: links e `aria-current` |
| UC12, F17 | `privacy.test.ts` e `Amount.test.tsx`: escondido mostra `R$ ••••`, guarda por aparelho, rótulo do olho |
| UC13, UC14, F9, F10, F11 | `EntryDialog.test.tsx`: cria, recusa valor inválido, um envio só, erro mantém os campos |
| UC15, F13 | `EntryDialog.test.tsx` e `EntryScreen.test.tsx`: editar preenche, apagar, 404 atualiza a lista |
| P4 | `EntryDialog.test.tsx`: fechar com campo preenchido pede confirmação; vazio fecha direto |
| UC16, UC17, F14 | `EntryScreen.test.tsx`: agrupa por dia, filtra por texto e tipo, vazio da busca |
| UC18, UC19, F15, F16 | `InvoiceScreen.test.tsx` e `UpcomingInvoices.test.tsx`: total, progresso, meses futuros, erro só no bloco; parcelas e total sem `−` e sem `text-expense` |
| P6 | `SummaryScreen.test.tsx`: grava e restaura a `theme-color` |
| UC1–UC3, UC8, F1–F3, F6–F8 | verificação manual nas telas, 375 px, 768 px e desktop, nos dois temas; contraste por script |
| F12 | já coberto por `api.test.ts` (401 limpa a sessão) |

### Rodada 1 — só paleta

**Arquivos novos aprovados:** `presentation/components/Amount.tsx` e `Amount.test.tsx`.
Nenhuma dependência nova.

- **Tema (`index.css`):**
  - `:root` e `.dark` recebem os valores da tabela, em hex, como no Figma;
  - entram `--income`, `--expense`, `--chart-balance` e `--chart-others`, e o `--chart-income`
    passa a cinza frio;
  - o comentário de "provisório" sai.
- **Valores nas telas:**
  - o `Amount` substitui o sinal e o `R$` montados à mão nas listas de Lançamentos e de
    Importação, nos itens e no total da Fatura, e nos dois saldos (Resumo e Lançamentos);
  - o `MoneyRow` delega ao `Amount`;
  - o sinal deixa de ser cinza e ganha a cor do valor.
- **Gráficos:**
  - a ordem do `SLICE_COLORS` e o comentário dele mudam;
  - o `config` do `TrendChart` passa a usar `--expense`, `--chart-5`, `--chart-balance`,
    `--chart-month-balance` e `--chart-income`, e o comentário dele muda.
- **Tema do aparelho:**
  - a `<meta name="theme-color">` entra no `index.html`;
  - o script inline e o `applyTheme` gravam o `content` (`#ECECEC` ou `#1A1A19`).
- **Documentação de regra:** o `rules-frontend.md` cita o `--chart-income` âmbar e o
  `--chart-month-balance` azul. Fica para a etapa 6, com autorização.

**Qual teste cobre cada caso:**

| Caso | Teste |
| --- | --- |
| UC4 | `Amount.test.tsx`: `entrada` tem `text-income` e `+`, `gasto` tem `text-expense` e `−`. Os testes de `EntryScreen`, `ImportScreen` e `InvoiceScreen` conferem a classe numa linha de cada tipo |
| F4 | `Amount.test.tsx`: saldo negativo laranja, positivo verde, zero sem classe de cor. `SummaryScreen.test.tsx`: saldo negativo |
| UC6, F5 | `TrendChart.test.tsx`: as séries usam `--expense`, `--income` e `--chart-month-balance`. `SummaryScreen.test.tsx`: as fatias recebem `--chart-1..5` na ordem nova |
| UC3, F2, F7 | `theme.test.ts`: `setTheme` e a troca do sistema atualizam a `theme-color` |
| UC5 | já coberto: `ErrorText` usa `text-destructive`, e o apagar do `RowActions` usa a variante `destructive`. Fica a conferência visual |
| UC1, UC2, F3, F6 | verificação manual: todas as telas em 375 px e no desktop, nos dois temas, mais o Windows em alto contraste se houver como emular. F3 também por conferência: todo token de `:root` tem par em `.dark` |
| UC7, F1 | contraste medido por script (tabela acima). Na tela, conferir que o sinal e a legenda continuam presentes |

### Desvios e notas da implementação (3, para a etapa 6)

- **Valor zero:** fica neutro e sem sinal em qualquer tipo, não só no saldo. Isso apareceu na
  tela: "Renda mensal" zerada saía como `+R$ 0,00` em verde. É a regra de F4 aplicada a todo
  valor.
- **Totais do Resumo:** Renda mensal e Entradas extras saem como entrada (verde, `+`). À
  vista, Fatura e Gasto total saem como gasto (laranja, `-`). A Renda mensal antes não tinha
  sinal.
- **Fatura:** as parcelas e o total ganham o `-` de gasto. Antes não tinham sinal.
- **Sinal num `<span>` à parte:** assim, o texto do valor continua sendo `R$ x`, e as
  buscas por texto dos testes seguem iguais. Os dois testes de saldo que liam o
  `previousElementSibling` do valor passaram a subir até o `<dd>`.
- **`theme-color`:** a cor da barra repetia o `--background` no `theme.ts` e no script
  inline do `index.html` (o `theme.ts` deixou de copiar na rodada 3, ver abaixo).

#### Rodada 3 — redesenho estilo banco digital (07/11/2026)

O que vale daqui em diante, onde conflita com as notas acima (a Fatura, por exemplo, voltou a
não ter sinal):

- **Tokens aprovados no canvas** (`index.css`):

  | Token | Claro | Escuro |
  | --- | --- | --- |
  | `--background` | `#F5F5F3` | `#121211` |
  | `--card` | `#FFFFFF` | `#1F1F1E` |
  | `--muted`, `--secondary`, `--accent` | `#EFEFED` | `#2A2A29` |
  | `--border` | `#E4E4E1` | `#2E2E2D` |
  | `--input` | `#8A8A87` | `#6E6E6B` |
  | `--muted-foreground` | `#5E5E5B` | `#A3A3A0` |
  | `--destructive` | `#C62140` | `#FF6A7C` |
  | `--hero` / `--hero-foreground` | `#266447` / `#FFFFFF` | `#173F2D` / `#FFFFFF` |
  | `--income` / `--income-muted` | `#266447` / `#E8F2ED` | `#47AE7F` / `#1B3326` |
  | `--expense` / `--expense-muted` | `#B4411D` / `#FBEEE9` | `#FF7A5C` / `#3A2219` |
  | `--chart-1..5` | `#266447 #C74821 #0F3222 #D9653D #72260E` | `#47AE7F #FF7A5C #93EABE #FFB0A5 #FFCDC7` |
  | `--chart-others` | `#8A8A87` | `#797976` |

  `--radius` passou a `.75rem`. `--header-height` saiu junto com o `Header`.
- **A rosca virou barras** (`CategoryBars`, com o `Progress` do shadcn): a tabela de fatias
  acima vale para a ordem das cores, com os valores novos de `--chart-1..5`.
- **Navegação:** `Header` saiu. No desktop, `Sidebar` do shadcn (`AppSidebar`); no celular,
  `BottomNav` com Início, Extrato, Fatura e Renda. O `Sidebar` grava o cookie
  `sidebar_state`.
- **Sidebar verde** (pedido do usuário depois da etapa 4, para combinar com o Início e o
  Login): os `--sidebar-*` usam o verde do `--hero` (`#266447` claro, `#173F2D` escuro), com
  texto branco. O item ativo é branco a 14% sobre o verde (`#447A61` / `#375A4A`, 5,0:1 e
  7,7:1 com o texto); os inativos ficam em branco a 80% (5,2:1 e 8,2:1). O "G" do topo
  inverte: quadrado branco com a letra verde. O canvas ainda mostra a sidebar clara/escura.
- **Lançar e Salvar neutros** (`bg-foreground text-background`), sem token nem variante nova;
  `button.tsx` ficou como veio do shadcn.
- **Componentes shadcn instalados:** sidebar, sheet, tooltip, separator, skeleton, progress,
  alert-dialog, input-group, textarea, empty, e o hook `use-mobile` em
  `presentation/hooks/` (alias novo no `components.json`). Instalados com `yes n |` para não
  sobrescrever `button.tsx` e `input.tsx`, que têm edição local. Nenhuma dependência de
  runtime nova.
- **Valores escondidos** (o olho do Início): `state/privacy.ts`, por aparelho, no
  `localStorage` em `gf:hide-values`. O `Amount` mostra `R$ ••••` com `aria-label`.
- **`theme-color`:** no Início, no celular, a barra do navegador fica na cor do `--hero`
  (`setHeroBar`); nas outras telas, no fundo. Revisto na etapa 4: o `theme.ts` não copia
  mais as cores, lê `--hero` e `--background` do CSS (`getComputedStyle`) depois de trocar a
  classe. A única cópia que sobra é a do fundo no script do `index.html`, que roda antes do
  CSS carregar. Nos testes, o jsdom não carrega o `index.css`: quem testa a barra põe um
  `<style>` com as duas variáveis no `<head>`.
- **Desvios do canvas:**
  - não há prévia de valor por parcela no lançamento nem total por dia no Extrato: os dois
    seriam conta de dinheiro no cliente. Fica para decidir se vale pedir à API;
  - os totais do Extrato são Saldo disponível, Saldo do mês e Gasto do mês, não
    Entradas/Saídas: a API não devolve um total de entradas do mês;
  - os saldos sobre o verde do hero ficam neutros, só com o sinal: laranja sobre verde não
    passa no contraste;
  - o Login manteve o link "Não tem conta? Cadastre-se" em vez de um seletor;
  - o primeiro cartão de Configurações virou "Fatura do cartão", com o e-mail embaixo.
- **Esconder valores em todo lugar** (achado M1 da etapa 5): o tooltip do gráfico de
  tendência (`ChartTooltipRow`) e o valor de cada parte da Renda passaram a usar o `Amount`;
  o eixo de reais do gráfico some (`YAxis hide`) com os valores escondidos, e barras e linhas
  ficam, sem escala. O recharts não desenha eixo nem tooltip no jsdom: o eixo foi conferido
  só na tela, e o tooltip é testado pela `ChartTooltipRow` sozinha, dentro do
  `TrendChart.test.tsx`.
- **Pequenas mudanças de contrato interno:** `Amount` é `whitespace-nowrap` (em 768 px o
  `-R$` quebrava); `RowActions.onEdit` é opcional (o diálogo de edição tem só o apagar);
  `test-setup.ts` ganhou um `matchMedia` falso, porque `use-mobile` o lê.
- **Lint:** avisos novos do mesmo tipo dos que já existiam: `set-state-in-effect` em
  `SummaryScreen` e `UpcomingInvoices`; `only-export-components` em `AppSidebar` e no
  `sidebar.tsx` de terceiros.
- **`rules-frontend.md`** está desatualizado (`Header`, `CategoryDonut`, `--chart-income`
  âmbar, lista de componentes instalados). Corrigido na etapa 6, com autorização do usuário.

## O que foi construído (6)

### Backend

Nada. Todo valor vem dos endpoints que já existiam; o `GET /trend` só passou a ser chamado
com `until` no futuro, para as próximas faturas.

### Frontend

- **Tema (`index.css`):** a paleta da rodada 3 — fundo cinza-claro e cartões brancos, quase
  preto no escuro; verde para entrada e destaque (`--hero`, `--income`), laranja para saída
  (`--expense`), vermelho só em `--destructive`. A sidebar usa o verde do `--hero`.
- **Estado:** `privacy.ts` guarda no aparelho se os valores estão escondidos; `theme.ts`
  pinta a barra do navegador de verde no Início do celular, lendo a cor do CSS.
- **Navegação:** `AppSidebar` (menu lateral do shadcn) no computador e `BottomNav` no celular
  substituem o `Header`. O `Page` monta os dois e aceita um `hero` no lugar da linha de título.
- **Peças novas:** `Amount` (todo valor em reais: cor, sinal e o "R$ ••••"),
  `EntryDialog` + `LaunchButton` (lançar e editar numa janela, com confirmação ao descartar),
  `CategoryBars` (gasto por categoria em barras, no lugar da rosca) e `UpcomingInvoices`.
- **Telas:** Início, Extrato e Fatura reescritos; Login com o bloco verde; Configurações com o
  Sair. Renda e Importar só herdaram o tema e a navegação.

### Infra / dados

Nada além do `components.json`, que ganhou o alias `hooks` para `@/presentation/hooks`.

## Armadilhas (6)

### `npx shadcn add` quer sobrescrever `button.tsx` e `input.tsx`

**Causa:** componentes como `sidebar` e `input-group` dependem do `button` e do `input`, e o
CLI pergunta se pode reinstalá-los. Os dois têm edição local.
**Como se manifesta:** um prompt "overwrite?" no meio da instalação; aceitar apaga a edição
local sem aviso.
**O que fazer:** rodar com `yes n | npx shadcn@latest add <nome>`, e conferir o `git diff` de
`ui/` depois.

### `beforeEach(() => vi.mocked(x).mockResolvedValue(...))` vira teardown

**Causa:** o vitest trata o valor que o `beforeEach` devolve como função de limpeza. A arrow
de uma linha devolve o mock, que é chamado no fim do teste.
**Como se manifesta:** "unhandled rejection" ou chamada fantasma do mock, num teste que
parece certo.
**O que fazer:** corpo em bloco, `beforeEach(() => { ... })`.

### O jsdom não tem `matchMedia` nem carrega o `index.css`

**Causa:** o `useIsMobile` e a `Sidebar` leem `matchMedia`; o `theme.ts` lê as cores do CSS.
**Como se manifesta:** erro `matchMedia is not a function`, ou um `vi.stubGlobal('matchMedia')`
sem `addEventListener` quebrando a tela; a cor da barra do navegador vem vazia.
**O que fazer:** o `test-setup.ts` já põe um `matchMedia` falso que nunca casa, então os testes
montam a versão de computador; quem
substitui precisa dos dois `*EventListener`. Teste de cor põe um `<style>` com as variáveis
no `<head>`.

### O recharts não desenha eixo nem tooltip no jsdom

**Causa:** o `ResponsiveContainer` mede zero no jsdom.
**Como se manifesta:** não dá para testar o eixo de reais escondido nem o tooltip pelo
gráfico.
**O que fazer:** testar a `ChartTooltipRow` sozinha e conferir o eixo na tela.

### O `Progress` do shadcn não recebe cor

**Causa:** a cor do indicador vem fixa do componente.
**Como se manifesta:** todas as barras da categoria saem na mesma cor.
**O que fazer:** passar a cor numa variável (`style={{ '--bar': cor }}`) e aplicar com
`[&_[data-slot=progress-indicator]]:bg-(--bar)`, como no `CategoryBars`.

## Como verificar (6)

1. `./dev.sh` e entrar com uma conta de teste.
2. **Celular (375 px), claro e escuro:** Início com o bloco verde emendando na barra do
   navegador; abas no rodapé; Lançar abre em tela cheia e, com algo digitado, fechar pede
   confirmação; Extrato agrupado por dia, com busca ("acai" acha "Açaí") e filtros.
3. **Computador:** menu lateral verde com a tela atual destacada; Extrato em tabela; Fatura
   com as próximas faturas e o andamento de cada parcela, sem sinal nos valores.
4. **Cores:** entrada em verde com "+", gasto em laranja com "-", zero neutro; vermelho só em
   erro e no excluir.
5. **Olho do Início:** escondido, todo valor vira "R$ ••••" em todas as telas, inclusive o
   tooltip do gráfico e a Renda, e o eixo de reais do gráfico some; recarregar mantém.
6. `cd frontend && npm test && npm run build && npm run lint`.
