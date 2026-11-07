import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Summary } from '@/shared/types'
import { UpcomingInvoices } from './UpcomingInvoices'

vi.mock('@/data/api', () => ({ api: { trend: vi.fn() } }))
const { api } = await import('@/data/api')

const mes = (month: string, invoice: string): Summary => ({
  month,
  invoice,
  monthly_income: '0',
  extra_income: '0',
  cash_expenses: '0',
  total_spent: invoice,
  month_balance: '0',
  available_balance: '0',
  income_payments: [],
})

describe('UpcomingInvoices', () => {
  beforeEach(() => {
    vi.mocked(api.trend).mockReset()
  })

  // UC19
  it('pede os três meses seguintes e mostra só os que têm parcela, sem sinal', async () => {
    vi.mocked(api.trend).mockResolvedValue([
      mes('2026-11', '1384.90'),
      mes('2026-12', '980.00'),
      mes('2027-01', '0.00'),
      mes('2027-02', '512.00'),
    ])
    const onSelect = vi.fn()
    render(<UpcomingInvoices month="2026-11" onSelect={onSelect} />)

    expect(api.trend).toHaveBeenCalledWith(4, '2027-02')
    const dez = await screen.findByText('R$ 980,00')
    expect(dez).not.toHaveClass('text-expense')
    expect(dez.textContent).toBe('R$ 980,00')
    expect(screen.getByText('R$ 512,00')).toBeInTheDocument()
    expect(screen.queryByText('R$ 1.384,90')).not.toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)

    await userEvent.click(screen.getByRole('button', { name: /dez/ }))
    expect(onSelect).toHaveBeenCalledWith('2026-12')
  })

  // F15
  it('sem parcelas futuras, diz que não há', async () => {
    vi.mocked(api.trend).mockResolvedValue([mes('2026-11', '10.00'), mes('2026-12', '0')])
    render(<UpcomingInvoices month="2026-11" onSelect={() => {}} />)
    expect(await screen.findByText('Nenhuma parcela nas próximas faturas.')).toBeInTheDocument()
  })

  // F16
  it('o erro fica dentro do bloco', async () => {
    vi.mocked(api.trend).mockRejectedValue(new Error('Falhou'))
    render(<UpcomingInvoices month="2026-11" onSelect={() => {}} />)
    expect(await screen.findByText('Falhou')).toBeInTheDocument()
  })
})
