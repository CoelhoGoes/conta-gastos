import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/state/auth-context'
import { todayIso } from '@/shared/format'
import type { Income } from '@/shared/types'
import { IncomeScreen } from './IncomeScreen'

vi.mock('@/data/api', async () => {
  // o ApiError é o de verdade: a tela distingue o 409 pela classe e pelo status
  const { ApiError } = await vi.importActual<typeof import('@/data/api')>('@/data/api')
  return {
    ApiError,
    api: {
      isAuthenticated: () => true,
      me: vi.fn(),
      incomes: vi.fn(),
      createIncome: vi.fn(),
      updateIncome: vi.fn(),
      removeIncome: vi.fn(),
      logout: vi.fn(),
    },
  }
})
const { api, ApiError } = await import('@/data/api')

const SALARIO: Income = {
  id: 1,
  start: '2026-01-01',
  end: null,
  parts: [
    { amount: '2000.00', rule: 'dia_fixo', day: 20, next_month: false, next_date: '2026-11-19' },
    { amount: '3000.00', rule: 'ultimo_dia_util', day: null, next_month: true, next_date: '2026-11-30' },
  ],
}
const ANTIGA: Income = {
  id: 2,
  start: '2025-03-01',
  end: '2025-12-31',
  parts: [{ amount: '4000.00', rule: null, day: null, next_month: false, next_date: null }],
}

function montar() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <IncomeScreen />
      </AuthProvider>
    </MemoryRouter>,
  )
}

const lista = () => screen.findByRole('list', { name: 'Rendas registradas' })

describe('IncomeScreen', () => {
  beforeEach(() => {
    vi.mocked(api.me).mockResolvedValue({ id: 1, email: 'a@b.co', closing_day: 10 })
    vi.mocked(api.incomes).mockResolvedValue([ANTIGA, SALARIO])
    vi.mocked(api.createIncome).mockResolvedValue(SALARIO)
    vi.mocked(api.updateIncome).mockResolvedValue(SALARIO)
    vi.mocked(api.removeIncome).mockResolvedValue(null)
  })

  it('pede as rendas com a data de hoje do aparelho', async () => {
    montar()
    await lista()
    expect(api.incomes).toHaveBeenCalledWith(todayIso())
  })

  // UC7: período, partes, regra, mês seguinte e próxima data
  it('lista cada renda com o período e as partes', async () => {
    montar()
    const [antiga, salario] = within(await lista()).getAllByRole('listitem', { name: '' }).filter(
      (li) => li.parentElement?.getAttribute('aria-label') === 'Rendas registradas',
    )
    expect(antiga).toHaveTextContent('De 01/03/2025 a 31/12/2025')
    expect(salario).toHaveTextContent('Desde 01/01/2026')
    expect(salario).toHaveTextContent('R$ 2.000,00')
    expect(salario).toHaveTextContent('Dia 20')
    expect(salario).toHaveTextContent('próxima: 19/11')
    expect(salario).toHaveTextContent('Último dia útil · conta no mês seguinte')
  })

  // UC10
  it('avisa quando uma renda antiga não tem dia', async () => {
    montar()
    await lista()
    expect(screen.getByText(/Registrada antes de existir o dia de pagamento/)).toBeInTheDocument()
    expect(screen.getByText('Sem dia definido')).toBeInTheDocument()
  })

  it('sem renda registrada, diz isso', async () => {
    vi.mocked(api.incomes).mockResolvedValue([])
    montar()
    expect(await screen.findByText('Nenhuma renda registrada.')).toBeInTheDocument()
  })

  // UC1/UC2/UC3
  it('registra uma renda dividida em duas partes', async () => {
    const user = userEvent.setup()
    montar()
    await lista()

    const inicio = screen.getByLabelText('A partir de')
    expect(inicio).toHaveValue(todayIso())
    await user.clear(inicio)
    await user.type(inicio, '2026-10-01')

    const parte1 = screen.getByRole('group', { name: 'Parte 1' })
    await user.type(within(parte1).getByLabelText('Valor'), '2000')
    await user.selectOptions(within(parte1).getByLabelText('Quando cai'), 'dia_fixo')
    await user.clear(within(parte1).getByLabelText('Dia'))
    await user.type(within(parte1).getByLabelText('Dia'), '15')

    await user.click(screen.getByRole('button', { name: 'Adicionar parte' }))
    const parte2 = screen.getByRole('group', { name: 'Parte 2' })
    await user.type(within(parte2).getByLabelText('Valor'), '3000')
    await user.selectOptions(within(parte2).getByLabelText('Quando cai'), 'ultimo_dia_util')
    expect(within(parte2).getByLabelText('Dia')).toBeDisabled()
    await user.click(within(parte2).getByRole('checkbox', { name: 'Conta no mês seguinte' }))

    await user.click(screen.getByRole('button', { name: 'Registrar renda' }))
    await waitFor(() =>
      expect(api.createIncome).toHaveBeenCalledWith(
        {
          start: '2026-10-01',
          end: null,
          parts: [
            { amount: '2000', rule: 'dia_fixo', day: 15, next_month: false },
            { amount: '3000', rule: 'ultimo_dia_util', day: null, next_month: true },
          ],
        },
        false,
      ),
    )
    // recarrega a lista, que traz as próximas datas calculadas pelo servidor
    expect(api.incomes).toHaveBeenCalledTimes(2)
  })

  // F6: o mesmo limite do servidor
  it('aceita no máximo quatro partes', async () => {
    const user = userEvent.setup()
    montar()
    await lista()
    for (let i = 0; i < 3; i++) await user.click(screen.getByRole('button', { name: 'Adicionar parte' }))
    expect(screen.getAllByRole('group', { name: /Parte \d/ })).toHaveLength(4)
    expect(screen.queryByRole('button', { name: 'Adicionar parte' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Remover parte 4' }))
    expect(screen.getAllByRole('group', { name: /Parte \d/ })).toHaveLength(3)
  })

  it('o dia segue o limite de cada regra', async () => {
    const user = userEvent.setup()
    montar()
    await lista()
    const parte = screen.getByRole('group', { name: 'Parte 1' })
    expect(within(parte).getByLabelText('Dia')).toHaveAttribute('max', '23')
    await user.selectOptions(within(parte).getByLabelText('Quando cai'), 'dia_fixo')
    expect(within(parte).getByLabelText('Dia')).toHaveAttribute('max', '31')
  })

  // F10
  it('renda repetida pede confirmação e só registra se a pessoa confirmar', async () => {
    const user = userEvent.setup()
    vi.mocked(api.createIncome)
      .mockRejectedValueOnce(new ApiError(409, 'Essa renda já foi registrada.'))
      .mockResolvedValueOnce(SALARIO)
    montar()
    await lista()
    await user.type(screen.getByLabelText('Valor'), '5000')
    await user.click(screen.getByRole('button', { name: 'Registrar renda' }))

    expect(await screen.findByText('Essa renda já foi registrada. Registrar mesmo assim?')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Registrar mesmo assim' }))
    await waitFor(() => expect(api.createIncome).toHaveBeenLastCalledWith(expect.anything(), true))
  })

  it('cancelar a confirmação não registra nada', async () => {
    const user = userEvent.setup()
    vi.mocked(api.createIncome).mockRejectedValueOnce(new ApiError(409, 'Essa renda já foi registrada.'))
    montar()
    await lista()
    await user.type(screen.getByLabelText('Valor'), '5000')
    await user.click(screen.getByRole('button', { name: 'Registrar renda' }))
    await user.click(await screen.findByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(screen.queryByText(/Registrar mesmo assim\?/)).not.toBeInTheDocument())
    expect(api.createIncome).toHaveBeenCalledTimes(1)
  })

  it('outro erro do servidor aparece no formulário', async () => {
    const user = userEvent.setup()
    vi.mocked(api.createIncome).mockRejectedValueOnce(new ApiError(422, 'O fim da renda vem antes do início.'))
    montar()
    await lista()
    await user.type(screen.getByLabelText('Valor'), '5000')
    await user.click(screen.getByRole('button', { name: 'Registrar renda' }))
    expect(await screen.findByText('O fim da renda vem antes do início.')).toBeInTheDocument()
  })

  // UC8/UC10: editar a renda antiga obriga a escolher o dia, que começa no 5º dia útil
  it('edita uma renda pelo botão da linha', async () => {
    const user = userEvent.setup()
    montar()
    await lista()
    await user.click(screen.getByRole('button', { name: 'Editar renda de 01/03/2025 a 31/12/2025' }))
    expect(screen.getByText('Editar renda')).toBeInTheDocument()
    expect(screen.getByLabelText('A partir de')).toHaveValue('2025-03-01')
    expect(screen.getByLabelText('Até (opcional)')).toHaveValue('2025-12-31')
    const parte = screen.getByRole('group', { name: 'Parte 1' })
    expect(within(parte).getByLabelText('Quando cai')).toHaveValue('dia_util')
    expect(within(parte).getByLabelText('Dia')).toHaveValue(5)

    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))
    await waitFor(() =>
      expect(api.updateIncome).toHaveBeenCalledWith(
        2,
        {
          start: '2025-03-01',
          end: '2025-12-31',
          parts: [{ amount: '4000.00', rule: 'dia_util', day: 5, next_month: false }],
        },
        false,
      ),
    )
    expect(await screen.findByText('Nova renda')).toBeInTheDocument()
  })

  // UC6: como em lançamentos, o primeiro clique só pede confirmação
  it('apaga uma renda pelo botão da linha, depois de confirmar', async () => {
    const user = userEvent.setup()
    montar()
    await lista()
    await user.click(screen.getByRole('button', { name: 'Excluir renda desde 01/01/2026' }))
    expect(api.removeIncome).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Confirmar exclusão de renda desde 01/01/2026' }))
    expect(api.removeIncome).toHaveBeenCalledWith(1)
    await waitFor(() => expect(screen.queryByText('Desde 01/01/2026')).not.toBeInTheDocument())
  })

  // F15
  it('mostra o erro ao apagar uma renda que já não existe', async () => {
    const user = userEvent.setup()
    vi.mocked(api.removeIncome).mockRejectedValueOnce(new ApiError(404, 'Renda não encontrada.'))
    montar()
    await lista()
    await user.click(screen.getByRole('button', { name: 'Excluir renda desde 01/01/2026' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar exclusão de renda desde 01/01/2026' }))
    expect(await screen.findByText('Renda não encontrada.')).toBeInTheDocument()
  })

  it('o título da aba é o nome da tela', async () => {
    montar()
    await waitFor(() => expect(document.title).toBe('Renda'))
  })
})
