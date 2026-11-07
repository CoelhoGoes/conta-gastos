import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/state/auth-context'
import { currentMonth, formatMonthLong, shiftMonth } from '@/shared/format'
import type { Category, EntryOut } from '@/shared/types'
import { EntryScreen } from './EntryScreen'

vi.mock('@/data/api', () => ({
  api: {
    isAuthenticated: () => true,
    me: vi.fn(),
    entries: vi.fn(),
    summary: vi.fn(),
    createEntry: vi.fn(),
    updateEntry: vi.fn(),
    removeEntry: vi.fn(),
    categoryList: vi.fn(),
    logout: vi.fn(),
  },
}))
const { api } = await import('@/data/api')

// O que `GET /categories` devolve, em recorte: a lista de verdade vive na tabela `categorias`
const CATEGORIAS: Category[] = [
  ...['Mercado', 'Alimentação', 'Lazer', 'Outros'].map((name, i) => ({ id: i + 1, type: 'gasto' as const, name })),
  ...['Salário', 'Freela', 'Reembolso', 'Outros'].map((name, i) => ({ id: i + 11, type: 'entrada' as const, name })),
]
const RESUMO = {
  month: '2026-09', monthly_income: '5000.00', extra_income: '0', cash_expenses: '0',
  invoice: '0', total_spent: '300.00', month_balance: '1000.00', available_balance: '4000.00',
  income_payments: [],
}
const LANCAMENTO: EntryOut = {
  id: 1, description: 'feira', amount: '150.50', type: 'gasto',
  category: 'Mercado', category_id: 1, method: 'avista', date: '2026-09-05', installments: 1,
}
const SALARIO: EntryOut = {
  ...LANCAMENTO, id: 2, description: 'Salário', amount: '5000.00', type: 'entrada',
  category: 'Salário', date: '2026-09-05',
}
const TV: EntryOut = {
  ...LANCAMENTO, id: 3, description: 'Televisão', amount: '3600.00', category: 'Lazer',
  method: 'credito', installments: 9, date: '2026-09-02',
}
const ACAI: EntryOut = { ...LANCAMENTO, id: 4, description: 'Açaí', date: '2026-09-01' }

function montar() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <EntryScreen />
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('EntryScreen', () => {
  beforeEach(() => {
    vi.mocked(api.me).mockResolvedValue({ id: 1, email: 'a@b.co', closing_day: 10 })
    vi.mocked(api.entries).mockResolvedValue([LANCAMENTO, SALARIO, TV, ACAI])
    vi.mocked(api.summary).mockResolvedValue(RESUMO)
    vi.mocked(api.createEntry).mockResolvedValue(LANCAMENTO)
    vi.mocked(api.removeEntry).mockReset().mockResolvedValue(null)
    vi.mocked(api.categoryList).mockResolvedValue(CATEGORIAS)
  })

  // UC16: no computador, uma tabela; a saída tem cor, sinal e seta (UC4, F1)
  it('mostra a tabela do mês com data, categoria, forma e valor', async () => {
    montar()
    const linha = (await screen.findByText('Televisão')).closest('tr')!
    expect(within(linha).getByText('02/09')).toBeInTheDocument()
    expect(within(linha).getByText('Lazer')).toBeInTheDocument()
    expect(within(linha).getByText('Crédito 9x')).toBeInTheDocument()
    const valor = within(linha).getByText('R$ 3.600,00')
    expect(valor).toHaveClass('text-expense')
    expect(valor).toHaveTextContent('-R$ 3.600,00')
  })

  it('mostra os saldos e o gasto do mês vindos do resumo', async () => {
    montar()
    const acumulado = await screen.findByText('R$ 4.000,00')
    expect(acumulado.closest('dd')?.previousElementSibling).toHaveTextContent('Saldo disponível')
    expect(screen.getByText('R$ 1.000,00').closest('dd')?.previousElementSibling).toHaveTextContent(
      'Saldo do mês',
    )
    expect(screen.getByText('R$ 300,00').closest('dd')?.previousElementSibling).toHaveTextContent(
      'Gasto do mês',
    )
  })

  describe('busca e filtros (UC17, F14)', () => {
    it('busca pela descrição sem diferença de maiúsculas e acentos', async () => {
      const user = userEvent.setup()
      montar()
      await screen.findByText('feira')
      await user.type(screen.getByRole('textbox', { name: 'Buscar lançamento' }), 'ACAI')
      expect(screen.getByText('Açaí')).toBeInTheDocument()
      expect(screen.queryByText('feira')).not.toBeInTheDocument()
    })

    it('filtra entradas, saídas e crédito', async () => {
      const user = userEvent.setup()
      montar()
      await screen.findByText('feira')
      const filtro = screen.getByRole('group', { name: 'Filtro' })

      await user.click(within(filtro).getByRole('button', { name: 'Entradas' }))
      expect(screen.getByText('Salário', { selector: 'span' })).toBeInTheDocument()
      expect(screen.queryByText('feira')).not.toBeInTheDocument()

      await user.click(within(filtro).getByRole('button', { name: 'Saídas' }))
      expect(screen.getByText('feira')).toBeInTheDocument()
      expect(screen.queryByText('R$ 5.000,00')).not.toBeInTheDocument()

      await user.click(within(filtro).getByRole('button', { name: 'Crédito' }))
      expect(screen.getByText('Televisão')).toBeInTheDocument()
      expect(screen.queryByText('feira')).not.toBeInTheDocument()
    })

    it('busca sem resultado diz que é a busca, e limpar volta a lista', async () => {
      const user = userEvent.setup()
      montar()
      await screen.findByText('feira')
      await user.type(screen.getByRole('textbox', { name: 'Buscar lançamento' }), 'zzz')
      expect(screen.getByText('Nada bate com a busca')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Limpar busca' }))
      expect(screen.getByText('feira')).toBeInTheDocument()
      expect(screen.getByRole('textbox', { name: 'Buscar lançamento' })).toHaveValue('')
    })

    it('mês vazio diz que é o mês, sem botão de limpar', async () => {
      vi.mocked(api.entries).mockResolvedValue([])
      montar()
      expect(await screen.findByText('Nenhum lançamento neste mês.')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Limpar busca' })).not.toBeInTheDocument()
    })
  })

  describe('o Lançar', () => {
    // UC6, UC14
    it('é neutro e abre a janela; salvar recarrega a lista', async () => {
      const user = userEvent.setup()
      montar()
      await screen.findByText('feira')
      const lancar = screen.getByRole('button', { name: 'Lançar' })
      expect(lancar).toHaveClass('bg-foreground')
      expect(lancar).not.toHaveClass('bg-primary')
      await user.click(lancar)

      const janela = await screen.findByRole('dialog', { name: 'Novo lançamento' })
      await user.type(within(janela).getByLabelText('Descrição'), 'pão')
      await within(janela).findByRole('option', { name: 'Mercado' })
      await user.selectOptions(within(janela).getByLabelText('Categoria'), 'Mercado')
      await user.type(within(janela).getByLabelText('Valor'), '12.50')
      await user.click(within(janela).getByRole('button', { name: 'Salvar' }))

      await waitFor(() => expect(api.entries).toHaveBeenCalledTimes(2))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    // UC15
    it('o lápis da linha abre a edição preenchida', async () => {
      const user = userEvent.setup()
      montar()
      await screen.findByText('feira')
      await user.click(screen.getByRole('button', { name: 'Editar feira' }))
      const janela = await screen.findByRole('dialog', { name: 'Editar lançamento' })
      expect(within(janela).getByLabelText('Descrição')).toHaveValue('feira')
    })
  })

  describe('a exclusão na tabela', () => {
    it('exige dois cliques e recarrega a lista', async () => {
      const user = userEvent.setup()
      montar()
      await screen.findByText('feira')
      await user.click(screen.getByRole('button', { name: 'Excluir feira' }))
      expect(api.removeEntry).not.toHaveBeenCalled()
      await user.click(screen.getByRole('button', { name: 'Confirmar exclusão de feira' }))
      await waitFor(() => expect(api.entries).toHaveBeenCalledTimes(2))
      expect(api.removeEntry).toHaveBeenCalledWith(1)
    })

    // F13: apagado em outra aba
    it('se falhar, mostra o erro e atualiza a lista', async () => {
      vi.mocked(api.removeEntry).mockRejectedValue(new Error('Lançamento não encontrado.'))
      const user = userEvent.setup()
      montar()
      await screen.findByText('feira')
      await user.click(screen.getByRole('button', { name: 'Excluir feira' }))
      await user.click(screen.getByRole('button', { name: 'Confirmar exclusão de feira' }))
      await waitFor(() => expect(api.entries).toHaveBeenCalledTimes(2))
      expect(await screen.findByText('Lançamento não encontrado.')).toBeInTheDocument()
    })
  })

  describe('no celular', () => {
    const largura = window.innerWidth
    beforeEach(() => {
      window.innerWidth = 375
    })
    afterEach(() => {
      window.innerWidth = largura
    })

    // UC16: lista por dia, sem tabela
    it('agrupa por dia', async () => {
      montar()
      const dia = await screen.findByRole('heading', { name: '05/09' })
      const secao = dia.closest('section')!
      expect(within(secao).getByText('feira')).toBeInTheDocument()
      expect(within(secao).getByText('Salário', { selector: 'span' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: '02/09' })).toBeInTheDocument()
      expect(screen.queryByRole('table')).not.toBeInTheDocument()
    })

    // P5: tocar no item abre o Lançar preenchido, com o apagar dentro
    it('tocar no item abre a edição com o excluir', async () => {
      const user = userEvent.setup()
      montar()
      await user.click(await screen.findByRole('button', { name: 'Editar feira' }))
      const janela = await screen.findByRole('dialog', { name: 'Editar lançamento' })
      expect(within(janela).getByRole('button', { name: 'Excluir feira' })).toBeInTheDocument()
    })
  })

  describe('a navegação entre meses', () => {
    const anterior = shiftMonth(currentMonth(), -1)
    const DO_MES_ANTERIOR = { ...LANCAMENTO, id: 9, description: 'aluguel de setembro' }

    it('abre no mês corrente', async () => {
      montar()
      await waitFor(() => expect(api.entries).toHaveBeenCalledWith(currentMonth()))
      expect(api.summary).toHaveBeenCalledWith(currentMonth())
      expect(screen.getByText(formatMonthLong(currentMonth()))).toBeInTheDocument()
    })

    it('refaz lista e saldo ao ir para o mês anterior', async () => {
      const user = userEvent.setup()
      montar()
      await screen.findByText('feira')
      vi.mocked(api.entries).mockResolvedValue([DO_MES_ANTERIOR])
      await user.click(screen.getByRole('button', { name: 'Mês anterior' }))
      expect(await screen.findByText('aluguel de setembro')).toBeInTheDocument()
      expect(screen.queryByText('feira')).not.toBeInTheDocument()
      expect(api.summary).toHaveBeenLastCalledWith(anterior)
      expect(screen.getByText(formatMonthLong(anterior))).toBeInTheDocument()
    })

    it('resposta atrasada do mês que ficou para trás não sobrescreve a lista', async () => {
      const user = userEvent.setup()
      let responderMesCorrente: (v: EntryOut[]) => void = () => {}
      vi.mocked(api.entries).mockImplementation((m) =>
        m === currentMonth()
          ? new Promise((resolve) => (responderMesCorrente = resolve))
          : Promise.resolve([DO_MES_ANTERIOR]),
      )
      montar()
      await user.click(await screen.findByRole('button', { name: 'Mês anterior' }))
      expect(await screen.findByText('aluguel de setembro')).toBeInTheDocument()
      responderMesCorrente([LANCAMENTO])
      await new Promise((r) => setTimeout(r, 20))
      expect(screen.queryByText('feira')).not.toBeInTheDocument()
    })
  })
})
