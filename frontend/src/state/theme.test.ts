import { beforeEach, describe, expect, it, vi } from 'vitest'
import { followSystemTheme, setHeroBar, setTheme } from './theme'

// o jsdom não tem matchMedia: este finge o do aparelho, com o tema trocável no meio do teste
const sistema = {
  matches: false,
  listener: null as null | (() => void),
  addEventListener(_: string, fn: () => void) {
    this.listener = fn
  },
}

function trocarSistema(escuro: boolean) {
  sistema.matches = escuro
  sistema.listener?.()
}

const barra = () => document.querySelector('meta[name="theme-color"]')?.getAttribute('content')

describe('followSystemTheme', () => {
  beforeEach(() => {
    // as mesmas variáveis do index.css, que o jsdom não carrega: o theme.ts lê a cor daqui
    document.head.innerHTML = `<meta name="theme-color" content="#f5f5f3" />
      <style>
        :root { --background: #f5f5f3; --hero: #266447 }
        .dark { --background: #121211; --hero: #173f2d }
      </style>`
    localStorage.clear()
    document.documentElement.classList.remove('dark')
    sistema.matches = false
    sistema.listener = null
    vi.stubGlobal('matchMedia', () => sistema)
    followSystemTheme()
  })

  it('em "Sistema", acompanha o aparelho trocar de tema com o app aberto', () => {
    trocarSistema(true)
    expect(document.documentElement).toHaveClass('dark')
    trocarSistema(false)
    expect(document.documentElement).not.toHaveClass('dark')
  })

  // UC3, F2, F7: a barra do navegador no celular acompanha o tema, escolhido ou do sistema
  it('a barra do navegador acompanha o tema', () => {
    trocarSistema(true)
    expect(barra()).toBe('#121211')
    setTheme('light')
    expect(barra()).toBe('#f5f5f3')
    setTheme('dark')
    expect(barra()).toBe('#121211')
  })

  // P6: no Início a barra fica verde, no tom do tema, e volta ao fundo ao sair
  it('com o cabeçalho do Início, a barra fica verde e volta ao fundo depois', () => {
    setTheme('light')
    setHeroBar(true)
    expect(barra()).toBe('#266447')
    setTheme('dark')
    expect(barra()).toBe('#173f2d')
    setHeroBar(false)
    expect(barra()).toBe('#121211')
  })

  it('sem o CSS carregado, mantém a cor que o index.html pôs', () => {
    document.querySelector('style')?.remove()
    setTheme('dark')
    expect(barra()).toBe('#f5f5f3')
  })

  it('com escolha manual, ignora a troca do aparelho', () => {
    setTheme('light')
    trocarSistema(true)
    expect(document.documentElement).not.toHaveClass('dark')
  })
})
