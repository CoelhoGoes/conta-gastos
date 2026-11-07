import { useSyncExternalStore } from 'react'

// Esconder os valores da tela é escolha do aparelho, como o tema: fica no localStorage e vale
// em todas as telas até tocar no olho de novo. Quem mostra dinheiro lê com useHiddenValues().

const HIDE_KEY = 'gf:hide-values'
const listeners = new Set<() => void>()

export function getHiddenValues() {
  return localStorage.getItem(HIDE_KEY) === '1'
}

export function setHiddenValues(hidden: boolean) {
  if (hidden) localStorage.setItem(HIDE_KEY, '1')
  else localStorage.removeItem(HIDE_KEY)
  listeners.forEach((notify) => notify())
}

function subscribe(notify: () => void) {
  listeners.add(notify)
  return () => {
    listeners.delete(notify)
  }
}

export function useHiddenValues() {
  return useSyncExternalStore(subscribe, getHiddenValues)
}
