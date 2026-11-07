import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setHiddenValues } from '@/state/privacy'
import { AuthProvider } from '@/state/auth-context'
import { currentMonth, shiftMonth } from '@/shared/format'
import type { Summary } from '@/shared/types'
import { SummaryScreen } from './SummaryScreen'

vi.mock('@/data/api', () => ({
  api: {
    isAuthenticated: () => true,
    me: vi.fn(),
    summary: vi.fn(),
    categoryBreakdown: vi.fn(),
    trend: vi.fn(),
    entries: vi.fn(),
    categoryList: vi.fn(),
    logout: vi.fn(),
  },
}))

const { api } = await import('@/data/api')

const resumo = (monthly_income: string) => ({
  month: '2026-09',
  monthly_income,
  extra_income: '0',
  cash_expenses: '0',
  invoice: '0',
  total_spent: '0',
  month_balance: monthly_income,
  available_balance: monthly_income,
  income_payments: [] as Summary['income_payments'],
})

const LAZER = {
  category: 'Lazer',
  total: '400.00',
  share: '1',
  items: [{ description: 'Televisão', amount: '400.00', installment: 3, total_installments: 9 }],
}

function montar() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <SummaryScreen />
      </AuthProvider>
    </MemoryRouter>,
  )
}

// UC7/F7: a grade do desktop vem do CSS; a ordem no HTML (celular, Tab, leitor de tela) não muda
const vemAntes = (a: Node, b: Node) =>
  Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)

describe('SummaryScreen', () => {
  beforeEach(() => {
    vi.mocked(api.me).mockResolvedValue({ id: 1, email: 'a@b.co', closing_day: 10 })
    vi.mocked(api.categoryBreakdown).mockResolvedValue([])
    vi.mocked(api.trend).mockResolvedValue([])
    vi.mocked(api.entries).mockResolvedValue([])
  })

  it('avisa quando a renda mensal é zero', async () => {
    vi.mocked(api.summary).mockResolvedValue(resumo('0'))
    montar()
    expect(await screen.findByText(/renda mensal vale para este mês/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /informar renda mensal/i })).toBeInTheDocument()
  })

  it('o aviso de renda zero leva para a tela Renda', async () => {
    const user = userEvent.setup()
    vi.mocked(api.summary).mockResolvedValue(resumo('0'))
    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<SummaryScreen />} />
            <Route path="/renda" element={<p>tela da renda</p>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    )
    await user.click(await screen.findByRole('button', { name: /informar renda mensal/i }))
    expect(await screen.findByText('tela da renda')).toBeInTheDocument()
  })

  // UC4: o salário de 30/10 que conta em novembro aparece no resumo de novembro
  it('lista os pagamentos que formam a renda do mês', async () => {
    vi.mocked(api.summary).mockResolvedValue({
      ...resumo('5000.00'),
      income_payments: [
        { date: '2026-10-30', amount: '3000.00', next_month: true },
        { date: '2026-11-13', amount: '2000.00', next_month: false },
      ],
    })
    montar()
    const lista = await screen.findByRole('list', { name: 'Pagamentos da renda' })
    const linhas = within(lista).getAllByRole('listitem')
    expect(linhas[0]).toHaveTextContent('30/10 · recebida no mês anterior')
    expect(linhas[0]).toHaveTextContent('R$ 3.000,00')
    expect(linhas[1]).toHaveTextContent('13/11')
    expect(linhas[1]).not.toHaveTextContent('mês anterior')
  })

  it('renda antiga sem dia aparece como tal', async () => {
    vi.mocked(api.summary).mockResolvedValue({
      ...resumo('5000.00'),
      income_payments: [{ date: null, amount: '5000.00', next_month: false }],
    })
    montar()
    const lista = await screen.findByRole('list', { name: 'Pagamentos da renda' })
    expect(lista).toHaveTextContent('Sem dia definido')
  })

  it('não avisa quando a renda já foi informada', async () => {
    vi.mocked(api.summary).mockResolvedValue(resumo('6500.00'))
    montar()
    expect(await screen.findByText('Resumo do mês')).toBeInTheDocument()
    expect(screen.queryByText(/renda mensal vale para este mês/i)).not.toBeInTheDocument()
  })

  it('mostra os valores no formato brasileiro', async () => {
    vi.mocked(api.summary).mockResolvedValue(resumo('6500.00'))
    montar()
    // sem gasto nenhum, os dois saldos são iguais à renda — o valor aparece nos três lugares
    expect(await screen.findAllByText('R$ 6.500,00')).toHaveLength(3)
    expect(screen.queryByText('R$ 6500.00')).not.toBeInTheDocument()
  })

  // UC1
  it('mostra o saldo acumulado em destaque e o saldo do mês abaixo', async () => {
    vi.mocked(api.summary).mockResolvedValue({
      ...resumo('6500.00'),
      month_balance: '1200.00',
      available_balance: '9800.00',
    })
    montar()
    const saldo = await screen.findByRole('region', { name: 'Saldo' })
    const acumulado = within(saldo).getByText('R$ 9.800,00')
    const doMes = within(saldo).getByText('R$ 1.200,00')
    expect(saldo).toHaveTextContent('Saldo disponívelR$ 9.800,00Saldo do mês R$ 1.200,00')
    expect(vemAntes(acumulado, doMes)).toBe(true)
  })

  // F4: sobre o verde do cabeçalho não cabe laranja; o sinal diz que é negativo
  it('saldo negativo aparece com o sinal', async () => {
    vi.mocked(api.summary).mockResolvedValue({
      ...resumo('6500.00'),
      month_balance: '-300.00',
      available_balance: '-300.00',
    })
    montar()
    expect(await screen.findAllByText('R$ -300,00')).toHaveLength(2)
  })

  it('abre no mês corrente', async () => {
    vi.mocked(api.summary).mockResolvedValue(resumo('6500.00'))
    montar()
    await waitFor(() => expect(api.summary).toHaveBeenCalledWith(currentMonth()))
    expect(api.categoryBreakdown).toHaveBeenCalledWith(currentMonth())
  })

  it('refaz resumo e categorias ao navegar para outro mês', async () => {
    const user = userEvent.setup()
    vi.mocked(api.summary).mockResolvedValue(resumo('6500.00'))
    montar()
    await screen.findByText('Resumo do mês')

    const anterior = shiftMonth(currentMonth(), -1)
    await user.click(screen.getByRole('button', { name: 'Mês anterior' }))
    await waitFor(() => expect(api.summary).toHaveBeenCalledWith(anterior))
    expect(api.categoryBreakdown).toHaveBeenCalledWith(anterior)
  })

  it('a barra mostra nome e total da categoria, sem os itens', async () => {
    vi.mocked(api.summary).mockResolvedValue(resumo('6500.00'))
    vi.mocked(api.categoryBreakdown).mockResolvedValue([LAZER])
    montar()
    const legenda = await screen.findByRole('button', { name: /Lazer/ })
    expect(legenda).toHaveTextContent('LazerR$ 400,00')
    expect(screen.queryByText(/Televisão/)).not.toBeInTheDocument()
  })

  it('passando de cinco categorias, as menores viram "Outras", que abre todas no popup', async () => {
    const user = userEvent.setup()
    const categoria = (category: string, total: string, share: string) => ({
      category,
      total,
      share,
      items: [{ description: `item de ${category}`, amount: total, installment: null, total_installments: null }],
    })
    vi.mocked(api.summary).mockResolvedValue(resumo('6500.00'))
    vi.mocked(api.categoryBreakdown).mockResolvedValue([
      categoria('Moradia', '700.00', '0.35'),
      categoria('Mercado', '500.00', '0.25'),
      categoria('Transporte', '300.00', '0.15'),
      categoria('Lazer', '200.00', '0.10'),
      categoria('Saúde', '150.00', '0.075'),
      categoria('Contas', '100.00', '0.05'),
      categoria('Educação', '50.00', '0.025'),
    ])
    montar()

    const outras = await screen.findByRole('button', { name: /Outras/ })
    expect(outras).toHaveTextContent('2 categorias')
    // UC7, F5: as cinco maiores levam as cores de barra do tema, na ordem
    const cor = (b: HTMLElement) =>
      b.querySelector<HTMLElement>('[data-slot=progress]')?.style.getPropertyValue('--bar')
    const cores = ['Moradia', 'Mercado', 'Transporte', 'Lazer', 'Saúde'].map((c) =>
      cor(screen.getByRole('button', { name: new RegExp(c) })),
    )
    expect(cores).toEqual([1, 2, 3, 4, 5].map((n) => `var(--chart-${n})`))
    // e "Outras" tem cor própria: o único cinza das barras
    expect(cor(outras)).toBe('var(--chart-others)')
    expect(screen.queryByRole('button', { name: /Contas/ })).not.toBeInTheDocument()

    await user.click(outras)
    const popup = await screen.findByRole('dialog', { name: 'Outras' })
    expect(popup).toHaveTextContent('As 2 categorias de menor gasto no mês')
    expect(within(popup).getByRole('heading', { name: /Contas/ })).toHaveTextContent(
      'R$ 100,00 · 5,0% do gasto do mês',
    )
    expect(within(popup).getByRole('heading', { name: /Educação/ })).toBeInTheDocument()
    expect(popup).toHaveTextContent('item de Educação')
  })

  it('"Ver todas" abre todas as categorias da maior para a menor', async () => {
    const user = userEvent.setup()
    const categoria = (category: string, total: string) => ({
      category,
      total,
      share: '0.1',
      items: [{ description: `item de ${category}`, amount: total, installment: null, total_installments: null }],
    })
    vi.mocked(api.summary).mockResolvedValue({ ...resumo('6500.00'), total_spent: '1150.00' })
    // a API devolve da maior para a menor (service.py); a tela mantém essa ordem
    vi.mocked(api.categoryBreakdown).mockResolvedValue([
      categoria('Moradia', '700.00'),
      categoria('Mercado', '300.00'),
      categoria('Lazer', '100.00'),
      categoria('Saúde', '50.00'),
    ])
    montar()

    const centro = await screen.findByRole('button', { name: 'Ver todas' })
    await user.click(centro)
    const popup = await screen.findByRole('dialog', { name: 'Gasto do mês' })
    expect(popup).toHaveTextContent('R$ 1.150,00 em 4 categorias, da maior para a menor')
    expect(within(popup).getAllByRole('heading', { level: 3 }).map((h) => h.textContent?.split('R$')[0])).toEqual([
      'Moradia',
      'Mercado',
      'Lazer',
      'Saúde',
    ])

    // ao fechar, o foco volta para o botão
    await user.keyboard('{Escape}')
    await waitFor(() => expect(centro).toHaveFocus())
  })

  it('clicar na categoria abre o popup com o total e as transações', async () => {
    const user = userEvent.setup()
    vi.mocked(api.summary).mockResolvedValue(resumo('6500.00'))
    vi.mocked(api.categoryBreakdown).mockResolvedValue([LAZER])
    montar()

    await user.click(await screen.findByRole('button', { name: /Lazer/ }))
    const popup = await screen.findByRole('dialog', { name: 'Lazer' })
    expect(popup).toHaveTextContent('R$ 400,00 · 100,0% do gasto do mês')
    expect(within(popup).getByText(/Televisão/).closest('li')).toHaveTextContent(
      'Televisão (parcela 3/9)R$ 400,00',
    )

    await user.click(within(popup).getByRole('button', { name: 'Fechar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    // o foco volta para a categoria, para quem navega por teclado não recomeçar do topo
    await waitFor(() => expect(screen.getByRole('button', { name: /Lazer/ })).toHaveFocus())
  })

  it('o título da aba é o nome da tela', async () => {
    montar()
    await waitFor(() => expect(document.title).toBe('Início'))
  })

  it('mantém a ordem fatura → resumo → categorias → tendência', async () => {
    vi.mocked(api.summary).mockResolvedValue(resumo('6500.00'))
    montar()
    const fatura = await screen.findByText('Cartão de crédito')
    const resumoTitulo = await screen.findByText('Resumo do mês')
    const categorias = await screen.findByText('Para onde foi o dinheiro')
    expect(vemAntes(fatura, resumoTitulo)).toBe(true)
    const tendencia = screen.getByText('Tendência')
    expect(vemAntes(resumoTitulo, categorias)).toBe(true)
    expect(vemAntes(categorias, tendencia)).toBe(true)
  })

  // UC10: o cartão da fatura mostra o valor neutro e leva à Fatura
  it('o cartão da fatura é neutro e abre a Fatura', async () => {
    const user = userEvent.setup()
    vi.mocked(api.summary).mockResolvedValue({ ...resumo('6500.00'), invoice: '1384.90' })
    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<SummaryScreen />} />
            <Route path="/fatura" element={<p>tela da fatura</p>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    )
    const cartao = await screen.findByRole('link', { name: 'Abrir a fatura' })
    const valor = within(cartao).getByText('R$ 1.384,90')
    expect(valor).not.toHaveClass('text-expense')
    expect(valor.textContent).toBe('R$ 1.384,90')
    await user.click(cartao)
    expect(await screen.findByText('tela da fatura')).toBeInTheDocument()
  })

  // UC6
  it('o Lançar é neutro e abre a janela', async () => {
    const user = userEvent.setup()
    vi.mocked(api.summary).mockResolvedValue(resumo('6500.00'))
    vi.mocked(api.categoryList).mockResolvedValue([])
    montar()
    const lancar = await screen.findByRole('button', { name: 'Lançar' })
    expect(lancar).toHaveClass('bg-foreground')
    await user.click(lancar)
    expect(await screen.findByRole('dialog', { name: 'Novo lançamento' })).toBeInTheDocument()
  })

  // UC10, F16: os últimos lançamentos falham sozinhos
  it('mostra os últimos lançamentos, e o erro deles não derruba a tela', async () => {
    vi.mocked(api.summary).mockResolvedValue(resumo('6500.00'))
    vi.mocked(api.entries).mockRejectedValue(new Error('Não deu.'))
    montar()
    expect(await screen.findByText('Não deu.')).toBeInTheDocument()
    expect(screen.getByText('Resumo do mês')).toBeInTheDocument()
  })

  describe('esconder os valores (UC12, F17)', () => {
    afterEach(() => setHiddenValues(false))

    it('o olho troca o rótulo e esconde os valores', async () => {
      const user = userEvent.setup()
      vi.mocked(api.summary).mockResolvedValue(resumo('6500.00'))
      montar()
      await screen.findAllByText('R$ 6.500,00')
      await user.click(screen.getByRole('button', { name: 'Esconder valores' }))
      expect(screen.queryByText('R$ 6.500,00')).not.toBeInTheDocument()
      expect(screen.getAllByRole('img', { name: 'valor escondido' }).length).toBeGreaterThan(0)
      expect(screen.getByRole('button', { name: 'Mostrar valores' })).toHaveAttribute(
        'aria-pressed',
        'true',
      )
    })
  })

  describe('no celular', () => {
    const largura = window.innerWidth
    beforeEach(() => {
      window.innerWidth = 375
      // as variáveis do index.css que o theme.ts lê, já que o jsdom não carrega o CSS
      document.head.innerHTML =
        '<meta name="theme-color" content="#f5f5f3" /><style>:root { --background: #f5f5f3; --hero: #266447 }</style>'
    })
    afterEach(() => {
      window.innerWidth = largura
    })

    // UC9: cabeçalho verde com o saldo e as ações rápidas
    it('mostra o cabeçalho com o saldo e as ações rápidas', async () => {
      vi.mocked(api.summary).mockResolvedValue(resumo('6500.00'))
      montar()
      const acoes = await screen.findByRole('navigation', { name: 'Ações rápidas' })
      expect(within(acoes).getAllByRole('button').map((b) => b.textContent)).toEqual([
        'Lançar',
        'Extrato',
        'Fatura',
        'Importar',
      ])
      expect(screen.getByRole('button', { name: 'Configurações' })).toBeInTheDocument()
      expect(screen.queryByText('Últimos lançamentos')).not.toBeInTheDocument()
    })

    // P6: a barra do navegador fica verde no Início e volta ao fundo ao sair
    it('pinta a barra do navegador de verde e devolve ao sair', async () => {
      vi.mocked(api.summary).mockResolvedValue(resumo('6500.00'))
      const { unmount } = montar()
      const barra = () => document.querySelector('meta[name="theme-color"]')?.getAttribute('content')
      await waitFor(() => expect(barra()).toBe('#266447'))
      unmount()
      expect(barra()).toBe('#f5f5f3')
    })
  })
})
