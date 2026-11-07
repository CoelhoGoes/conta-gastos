import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { getHiddenValues, setHiddenValues, useHiddenValues } from './privacy'

describe('privacy', () => {
  beforeEach(() => localStorage.clear())

  // UC12: a escolha fica no aparelho entre visitas
  it('guarda a escolha no localStorage', () => {
    expect(getHiddenValues()).toBe(false)
    setHiddenValues(true)
    expect(localStorage.getItem('gf:hide-values')).toBe('1')
    expect(getHiddenValues()).toBe(true)
    setHiddenValues(false)
    expect(localStorage.getItem('gf:hide-values')).toBeNull()
  })

  it('avisa quem está na tela quando muda', () => {
    const { result } = renderHook(() => useHiddenValues())
    expect(result.current).toBe(false)
    act(() => setHiddenValues(true))
    expect(result.current).toBe(true)
  })
})
