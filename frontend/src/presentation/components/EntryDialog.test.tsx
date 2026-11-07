import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Category, EntryOut } from '@/shared/types'
import { EntryDialog } from './EntryDialog'

vi.mock('@/data/api', async () => {
  const real = await vi.importActual<typeof import('@/data/api')>('@/data/api')
  return {
    ApiError: real.ApiError,
    api: {
      createEntry: vi.fn(),
      updateEntry: vi.fn(),
      removeEntry: vi.fn(),
      categoryList: vi.fn(),
    },
  }
})
const { api, ApiError } = await import('@/data/api')

const CATEGORIAS: Category[] = [
  ...['Mercado', 'Lazer'].map((name, i) => ({ id: i + 1, type: 'gasto' as const, name })),
  ...['Salário', 'Freela'].map((name, i) => ({ id: i + 11, type: 'entrada' as const, name })),
]
const LANCAMENTO: EntryOut = {
  id: 1, description: 'feira', amount: '150.50', type: 'gasto',
  category: 'Mercado', category_id: 1, method: 'avista', date: '2026-09-05', installments: 1,
}

function montar(entry: EntryOut | null = null) {
  const onClose = vi.fn()
  const onChanged = vi.fn()
  render(<EntryDialog entry={entry} onClose={onClose} onChanged={onChanged} />)
  return { onClose, onChanged }
}

async function preencher(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Descrição'), 'pão')
  await screen.findByRole('option', { name: 'Mercado' })
  await user.selectOptions(screen.getByLabelText('Categoria'), 'Mercado')
  await user.type(screen.getByLabelText('Valor'), '12.50')
}

describe('EntryDialog', () => {
  beforeEach(() => {
    vi.mocked(api.createEntry).mockReset().mockResolvedValue(LANCAMENTO)
    vi.mocked(api.updateEntry).mockReset().mockResolvedValue(LANCAMENTO)
    vi.mocked(api.removeEntry).mockReset().mockResolvedValue(null)
    vi.mocked(api.categoryList).mockResolvedValue(CATEGORIAS)
  })

  describe('o payload enviado', () => {
    // UC13, UC14
    it('cria gasto à vista com uma parcela, avisa quem abriu e fecha', async () => {
      const user = userEvent.setup()
      const { onClose, onChanged } = montar()
      expect(screen.getByRole('dialog', { name: 'Novo lançamento' })).toBeInTheDocument()
      await preencher(user)
      await user.click(screen.getByRole('button', { name: 'Salvar' }))

      await waitFor(() => expect(onClose).toHaveBeenCalled())
      // o input é type=number, então "12.50" chega como "12.5" — o backend aceita
      expect(vi.mocked(api.createEntry).mock.calls[0][0]).toMatchObject({
        type: 'gasto', method: 'avista', installments: 1, amount: '12.5', category: 'Mercado',
      })
      expect(onChanged).toHaveBeenCalled()
    })

    it('força entrada para à vista e uma parcela, mesmo com crédito escolhido antes', async () => {
      const user = userEvent.setup()
      montar()
      await user.click(screen.getByRole('button', { name: 'Crédito' }))
      await user.clear(screen.getByLabelText('Parcelas'))
      await user.type(screen.getByLabelText('Parcelas'), '6')
      await user.click(screen.getByRole('button', { name: 'Entrada' }))

      await user.type(screen.getByLabelText('Descrição'), 'freela')
      await screen.findByRole('option', { name: 'Freela' })
      await user.selectOptions(screen.getByLabelText('Categoria'), 'Freela')
      await user.type(screen.getByLabelText('Valor'), '900')
      await user.click(screen.getByRole('button', { name: 'Salvar' }))

      await waitFor(() => expect(api.createEntry).toHaveBeenCalled())
      // o invariante do CLAUDE.md: entrada nunca vai no crédito
      expect(vi.mocked(api.createEntry).mock.calls[0][0]).toMatchObject({
        type: 'entrada', method: 'avista', installments: 1,
      })
    })

    it('manda o número de parcelas quando é gasto no crédito', async () => {
      const user = userEvent.setup()
      montar()
      await preencher(user)
      await user.click(screen.getByRole('button', { name: 'Crédito' }))
      await user.clear(screen.getByLabelText('Parcelas'))
      await user.type(screen.getByLabelText('Parcelas'), '9')
      await user.click(screen.getByRole('button', { name: 'Salvar' }))

      await waitFor(() => expect(api.createEntry).toHaveBeenCalled())
      expect(vi.mocked(api.createEntry).mock.calls[0][0]).toMatchObject({
        method: 'credito', installments: 9,
      })
    })
  })

  describe('o formulário', () => {
    it('troca a lista de categorias junto com o tipo e esconde as parcelas fora do crédito', async () => {
      const user = userEvent.setup()
      montar()
      const categoria = screen.getByLabelText('Categoria')
      expect(await within(categoria).findByRole('option', { name: 'Mercado' })).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Entrada' }))
      expect(within(categoria).getByRole('option', { name: 'Salário' })).toBeInTheDocument()
      expect(within(categoria).queryByRole('option', { name: 'Mercado' })).not.toBeInTheDocument()
      expect(screen.queryByLabelText('Parcelas')).not.toBeInTheDocument()
    })

    // UC6: o confirmar é neutro, como o Lançar
    it('o Salvar é neutro, nem verde nem laranja', () => {
      montar()
      const salvar = screen.getByRole('button', { name: 'Salvar' })
      expect(salvar).toHaveClass('bg-foreground')
      expect(salvar).not.toHaveClass('bg-primary')
    })

    // F9: valor zero não chega ao servidor
    it('recusa valor zero sem chamar a API', async () => {
      const user = userEvent.setup()
      montar()
      await user.type(screen.getByLabelText('Descrição'), 'pão')
      await screen.findByRole('option', { name: 'Mercado' })
      await user.selectOptions(screen.getByLabelText('Categoria'), 'Mercado')
      await user.type(screen.getByLabelText('Valor'), '0')
      await user.click(screen.getByRole('button', { name: 'Salvar' }))
      expect(api.createEntry).not.toHaveBeenCalled()
    })

    // F9, F11: o erro fica dentro da janela, com o que foi digitado
    it('mostra o erro do servidor sem fechar nem limpar os campos', async () => {
      vi.mocked(api.createEntry).mockRejectedValue(new Error('Categoria inválida.'))
      const user = userEvent.setup()
      const { onClose } = montar()
      await preencher(user)
      await user.click(screen.getByRole('button', { name: 'Salvar' }))

      expect(await screen.findByText('Categoria inválida.')).toBeInTheDocument()
      expect(screen.getByLabelText('Descrição')).toHaveValue('pão')
      expect(onClose).not.toHaveBeenCalled()
    })

    // F10
    it('um envio só, mesmo com dois cliques', async () => {
      let terminar!: (e: EntryOut) => void
      vi.mocked(api.createEntry).mockReturnValue(new Promise((r) => (terminar = r)))
      const user = userEvent.setup()
      montar()
      await preencher(user)
      await user.click(screen.getByRole('button', { name: 'Salvar' }))
      expect(screen.getByRole('button', { name: 'Salvando...' })).toBeDisabled()
      await user.click(screen.getByRole('button', { name: 'Salvando...' }))
      terminar(LANCAMENTO)
      await waitFor(() => expect(api.createEntry).toHaveBeenCalledTimes(1))
    })
  })

  describe('a data sugerida', () => {
    beforeEach(() => {
      vi.stubEnv('TZ', 'America/Sao_Paulo')
      vi.useFakeTimers({ toFake: ['Date'] })
    })
    afterEach(() => {
      vi.useRealTimers()
      vi.unstubAllEnvs()
    })

    it('é hoje no fuso local, mesmo depois das 21h', () => {
      // 23h30 de 30/09 em Brasília já é 01/10 em UTC
      vi.setSystemTime(new Date('2026-09-30T23:30:00-03:00'))
      montar()
      expect(screen.getByLabelText('Data')).toHaveValue('2026-09-30')
    })
  })

  describe('a edição', () => {
    // UC15
    it('abre preenchida e salvar altera em vez de criar', async () => {
      const user = userEvent.setup()
      montar(LANCAMENTO)
      expect(screen.getByRole('dialog', { name: 'Editar lançamento' })).toBeInTheDocument()
      expect(screen.getByLabelText('Descrição')).toHaveValue('feira')
      expect(await screen.findByLabelText('Categoria')).toHaveValue('Mercado')
      await user.click(screen.getByRole('button', { name: 'Salvar' }))
      await waitFor(() => expect(api.updateEntry).toHaveBeenCalledWith(1, expect.anything()))
      expect(api.createEntry).not.toHaveBeenCalled()
    })

    it('apaga com dois cliques, de dentro da janela', async () => {
      const user = userEvent.setup()
      const { onClose, onChanged } = montar(LANCAMENTO)
      await user.click(screen.getByRole('button', { name: 'Excluir feira' }))
      expect(api.removeEntry).not.toHaveBeenCalled()
      await user.click(screen.getByRole('button', { name: 'Confirmar exclusão de feira' }))
      await waitFor(() => expect(onClose).toHaveBeenCalled())
      expect(api.removeEntry).toHaveBeenCalledWith(1)
      expect(onChanged).toHaveBeenCalled()
    })

    // F13: apagado em outra aba
    it('lançamento que sumiu mostra o erro e manda recarregar a lista', async () => {
      vi.mocked(api.updateEntry).mockRejectedValue(new ApiError(404, 'Lançamento não encontrado.'))
      const user = userEvent.setup()
      const { onClose, onChanged } = montar(LANCAMENTO)
      await user.click(screen.getByRole('button', { name: 'Salvar' }))
      expect(await screen.findByText('Lançamento não encontrado.')).toBeInTheDocument()
      expect(onChanged).toHaveBeenCalled()
      expect(onClose).not.toHaveBeenCalled()
    })
  })

  describe('fechar (P4)', () => {
    it('sem nada digitado, fecha direto', async () => {
      const user = userEvent.setup()
      const { onClose } = montar()
      await user.keyboard('{Escape}')
      expect(onClose).toHaveBeenCalled()
    })

    it('com algo digitado, pergunta antes de descartar', async () => {
      const user = userEvent.setup()
      const { onClose } = montar()
      await user.type(screen.getByLabelText('Descrição'), 'pão')
      await user.keyboard('{Escape}')
      expect(onClose).not.toHaveBeenCalled()

      const pergunta = await screen.findByRole('alertdialog', { name: 'Descartar lançamento?' })
      await user.click(within(pergunta).getByRole('button', { name: 'Continuar editando' }))
      expect(onClose).not.toHaveBeenCalled()
      expect(screen.getByLabelText('Descrição')).toHaveValue('pão')

      await user.click(screen.getByRole('button', { name: 'Fechar' }))
      await user.click(await screen.findByRole('button', { name: 'Descartar' }))
      expect(onClose).toHaveBeenCalled()
    })
  })
})
