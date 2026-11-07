import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { describe, expect, it } from 'vitest'
import { SidebarProvider } from '@/presentation/components/ui/sidebar'
import { AppSidebar, type Screen } from './AppSidebar'

function Rota() {
  return <p data-testid="rota">{useLocation().pathname}</p>
}

function montar(active: Screen) {
  return render(
    <MemoryRouter>
      <SidebarProvider>
        <AppSidebar active={active} />
      </SidebarProvider>
      <Routes>
        <Route path="*" element={<Rota />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AppSidebar', () => {
  // UC11, F17: todas as telas, e só a aberta marcada como atual
  it('mostra todas as telas e marca só a ativa', () => {
    montar('lancamentos')
    const menu = screen.getByRole('list')
    expect(within(menu).getAllByRole('button').map((b) => b.textContent)).toEqual([
      'Início',
      'Extrato',
      'Fatura',
      'Renda',
      'Importar',
      'Configurações',
    ])
    expect(screen.getByRole('button', { name: 'Extrato' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: 'Início' })).not.toHaveAttribute('aria-current')
  })

  it('cada item leva à sua rota, com os endereços de antes', async () => {
    const user = userEvent.setup()
    montar('resumo')
    await user.click(screen.getByRole('button', { name: 'Extrato' }))
    expect(screen.getByTestId('rota')).toHaveTextContent('/lancamentos')
    await user.click(screen.getByRole('button', { name: 'Configurações' }))
    expect(screen.getByTestId('rota')).toHaveTextContent('/configuracoes')
  })
})
