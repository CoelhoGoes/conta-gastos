import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { CategoryBreakdown } from '@/shared/types'
import { CategoryBars, toSlices } from './CategoryBars'

const cat = (category: string, total: string): CategoryBreakdown => ({
  category,
  total,
  share: '0.1',
  items: [],
})

const seis = ['Moradia', 'Mercado', 'Saúde', 'Lazer', 'Contas', 'Pets'].map((c, i) =>
  cat(c, String(600 - i * 100)),
)

describe('toSlices', () => {
  // UC7, F5
  it('dá uma cor a cada uma das cinco maiores, na ordem, e junta o resto em "Outras" cinza', () => {
    const slices = toSlices(seis)
    expect(slices.map((s) => s.color)).toEqual([
      'var(--chart-1)',
      'var(--chart-2)',
      'var(--chart-3)',
      'var(--chart-4)',
      'var(--chart-5)',
      'var(--chart-others)',
    ])
    expect(slices[5].label).toBe('Outras')
    expect(slices[5].categories.map((c) => c.category)).toEqual(['Pets'])
  })

  it('sem sobra, não há "Outras"', () => {
    expect(toSlices(seis.slice(0, 3)).map((s) => s.label)).toEqual(['Moradia', 'Mercado', 'Saúde'])
  })
})

describe('CategoryBars', () => {
  // UC20
  it('mostra o valor de cada categoria e abre o detalhe ao tocar', async () => {
    const onOpen = vi.fn()
    const slices = toSlices([...seis, cat('Viagem', '50')])
    render(<CategoryBars slices={slices} onOpen={onOpen} />)
    expect(screen.getByText('R$ 600,00')).toBeInTheDocument()
    expect(screen.getByText('2 categorias')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Mercado/ }))
    expect(onOpen).toHaveBeenCalledWith(slices[1])
  })
})
