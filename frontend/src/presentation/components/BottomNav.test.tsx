import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { describe, expect, it } from 'vitest'
import { BottomNav } from './BottomNav'

function Rota() {
  return <p data-testid="rota">{useLocation().pathname}</p>
}

describe('BottomNav', () => {
  // UC11, F17: as quatro abas do celular, com a atual anunciada
  it('mostra Início, Extrato, Fatura e Renda, e leva à rota de cada uma', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <BottomNav active="fatura" />
        <Routes>
          <Route path="*" element={<Rota />} />
        </Routes>
      </MemoryRouter>,
    )
    const abas = screen.getByRole('navigation', { name: 'Abas' })
    expect(within(abas).getAllByRole('button').map((b) => b.textContent)).toEqual([
      'Início',
      'Extrato',
      'Fatura',
      'Renda',
    ])
    expect(within(abas).getByRole('button', { name: 'Fatura' })).toHaveAttribute('aria-current', 'page')
    await user.click(within(abas).getByRole('button', { name: 'Renda' }))
    expect(screen.getByTestId('rota')).toHaveTextContent('/renda')
  })
})
