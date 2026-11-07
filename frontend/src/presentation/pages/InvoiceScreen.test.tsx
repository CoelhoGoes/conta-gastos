import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/state/auth-context'
import { currentMonth, formatMonthLong, shiftMonth } from '@/shared/format'
import type { Invoice } from '@/shared/types'
import { InvoiceScreen } from './InvoiceScreen'

vi.mock('@/data/api', () => ({
  api: {
    isAuthenticated: () => true,
    me: vi.fn(),
    invoice: vi.fn(),
    trend: vi.fn(),
    categoryList: vi.fn(),
    logout: vi.fn(),
  },
}))
const { api } = await import('@/data/api')

const PARCELA = {
  entry_id: 1, description: 'Televisão', category: 'Lazer',
  purchase_date: '2026-08-04', installment: 3, total_installments: 9,
  installment_amount: '400.00',
}
const vazia = (month: string) => ({ month, total: '0', items: [] })
const comItens = (month: string) => ({
  month, total: '1400.00',
  items: [
    PARCELA,
    { ...PARCELA, entry_id: 2, description: 'Notebook', category: 'Educação',
      purchase_date: '2026-07-06', installment: 2, total_installments: 12,
      installment_amount: '1000.00' },
  ],
})

function montar() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <InvoiceScreen />
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('InvoiceScreen', () => {
  beforeEach(() => {
    vi.mocked(api.me).mockResolvedValue({ id: 1, email: 'a@b.co', closing_day: 10 })
    vi.mocked(api.invoice).mockResolvedValue(comItens(currentMonth()))
    vi.mocked(api.trend).mockResolvedValue([])
    vi.mocked(api.categoryList).mockResolvedValue([{ id: 1, type: 'gasto', name: 'Lazer' }])
  })

  it('abre no mês corrente', async () => {
    montar()
    await waitFor(() => expect(api.invoice).toHaveBeenCalledWith(currentMonth()))
    expect(screen.getByText(`Fatura de ${formatMonthLong(currentMonth())}`)).toBeInTheDocument()
  })

  it('mostra cada parcela com descrição, categoria, data e o X/Y', async () => {
    montar()
    const linha = (await screen.findByText('Televisão')).closest('li')!
    expect(within(linha).getByText('Lazer · comprado em 04/08')).toBeInTheDocument()
    expect(within(linha).getByText('3/9')).toBeInTheDocument()
    expect(within(linha).getByRole('progressbar', { name: 'Parcela 3 de 9' })).toBeInTheDocument()
    expect(within(linha).getByText('R$ 400,00')).toBeInTheDocument()
  })

  it('mostra o total no formato brasileiro', async () => {
    montar()
    expect(await screen.findByText('R$ 1.400,00')).toBeInTheDocument()
  })

  // UC18: na Fatura os valores são neutros, sem sinal e sem a cor de gasto
  it('parcelas e total aparecem neutros, sem "-"', async () => {
    montar()
    const total = await screen.findByText('R$ 1.400,00')
    const parcela = screen.getByText('R$ 400,00')
    for (const valor of [total, parcela]) {
      expect(valor).not.toHaveClass('text-expense')
      expect(valor.textContent).toBe(valor === total ? 'R$ 1.400,00' : 'R$ 400,00')
    }
  })

  // UC19: as próximas faturas partem do mês da tela
  it('pede as próximas faturas do mês aberto', async () => {
    montar()
    await waitFor(() => expect(api.trend).toHaveBeenCalledWith(4, shiftMonth(currentMonth(), 3)))
  })

  // UC6, UC14
  it('o Lançar é neutro e abre a janela de lançamento', async () => {
    const user = userEvent.setup()
    montar()
    const lancar = screen.getByRole('button', { name: 'Lançar' })
    expect(lancar).toHaveClass('bg-foreground')
    expect(lancar).not.toHaveClass('bg-primary')
    await user.click(lancar)
    expect(await screen.findByRole('dialog', { name: 'Novo lançamento' })).toBeInTheDocument()
  })

  it('anda para o mês anterior e para o seguinte', async () => {
    const user = userEvent.setup()
    montar()
    await screen.findByText('Televisão')

    const atual = currentMonth()
    await user.click(screen.getByRole('button', { name: 'Mês anterior' }))
    await waitFor(() => expect(api.invoice).toHaveBeenCalledWith(shiftMonth(atual, -1)))
    expect(screen.getByText(`Fatura de ${formatMonthLong(shiftMonth(atual, -1))}`)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Próximo mês' }))
    await user.click(screen.getByRole('button', { name: 'Próximo mês' }))
    await waitFor(() => expect(api.invoice).toHaveBeenCalledWith(shiftMonth(atual, 1)))
  })

  it('ignora a resposta de um mês que já saiu da tela', async () => {
    const user = userEvent.setup()
    let resolverAtual!: (v: Invoice) => void
    vi.mocked(api.invoice)
      .mockReturnValueOnce(new Promise((r) => { resolverAtual = r }))
      .mockResolvedValueOnce(vazia(shiftMonth(currentMonth(), -1)))
    montar()

    await user.click(screen.getByRole('button', { name: 'Mês anterior' }))
    expect(await screen.findByText('Nenhuma parcela nesta fatura.')).toBeInTheDocument()

    resolverAtual(comItens(currentMonth()))
    await new Promise((r) => setTimeout(r, 0))
    expect(screen.queryByText('Televisão')).not.toBeInTheDocument()
  })

  it('avisa quando o mês não tem parcela, em vez de mostrar lista vazia', async () => {
    vi.mocked(api.invoice).mockResolvedValue(vazia(currentMonth()))
    montar()
    expect(await screen.findByText('Nenhuma parcela nesta fatura.')).toBeInTheDocument()
    expect(screen.queryByText('Televisão')).not.toBeInTheDocument()
  })

  it('mostra o erro quando a busca falha', async () => {
    vi.mocked(api.invoice).mockRejectedValue(new Error('Sessão expirada.'))
    montar()
    expect(await screen.findByText('Sessão expirada.')).toBeInTheDocument()
    expect(screen.queryByText('Televisão')).not.toBeInTheDocument()
  })
})
