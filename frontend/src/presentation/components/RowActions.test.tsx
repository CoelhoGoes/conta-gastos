import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RowActions } from './RowActions'

describe('RowActions', () => {
  afterEach(() => vi.useRealTimers())

  it('a confirmação expira: depois de 2 s, o próximo clique volta a só pedir confirmação', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const onDelete = vi.fn(() => Promise.resolve())
    render(<RowActions name="feira" onEdit={() => {}} onDelete={onDelete} />)

    await user.click(screen.getByRole('button', { name: 'Excluir feira' }))
    act(() => vi.advanceTimersByTime(2000))
    await user.click(screen.getByRole('button', { name: 'Excluir feira' }))
    expect(onDelete).not.toHaveBeenCalled()
  })

  it('fica desativado enquanto a exclusão não volta, e volta se ela falhar', async () => {
    const user = userEvent.setup()
    let fail!: () => void
    const onDelete = vi.fn(() => new Promise<void>((_, reject) => (fail = () => reject(new Error()))).catch(() => {}))
    render(<RowActions name="feira" onEdit={() => {}} onDelete={onDelete} />)

    await user.click(screen.getByRole('button', { name: 'Excluir feira' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar exclusão de feira' }))
    expect(screen.getByRole('button', { name: 'Excluir feira' })).toBeDisabled()
    await act(async () => fail())
    expect(screen.getByRole('button', { name: 'Excluir feira' })).toBeEnabled()
  })

  it('editar chama onEdit', async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn()
    render(<RowActions name="feira" onEdit={onEdit} onDelete={() => Promise.resolve()} />)
    await user.click(screen.getByRole('button', { name: 'Editar feira' }))
    expect(onEdit).toHaveBeenCalled()
  })
})
