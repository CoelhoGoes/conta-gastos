// A escolha é por aparelho, de propósito: fica no localStorage, não no usuário do backend.
// Sem escolha salva, segue o sistema. O script inline do index.html repete a regra de
// isDark() para aplicar a classe antes do primeiro paint — mudar uma é mudar a outra.

export type Theme = 'system' | 'light' | 'dark'

const THEME_KEY = 'gf:theme'
// a cor da barra do navegador no celular: o --background do tema, ou o --hero quando o Início
// mostra o cabeçalho verde, para a barra emendar com ele. Lida do index.css, depois de trocar
// a classe, para não copiar a cor aqui; só o script do index.html guarda uma cópia do fundo.
let heroBar = false
const systemDark = () => window.matchMedia('(prefers-color-scheme: dark)')

export function getTheme(): Theme {
  const saved = localStorage.getItem(THEME_KEY)
  return saved === 'light' || saved === 'dark' ? saved : 'system'
}

function isDark(theme: Theme) {
  return theme === 'dark' || (theme === 'system' && systemDark().matches)
}

function applyTheme() {
  const dark = isDark(getTheme())
  document.documentElement.classList.toggle('dark', dark)
  const color = getComputedStyle(document.documentElement)
    .getPropertyValue(heroBar ? '--hero' : '--background')
    .trim()
  // sem o CSS carregado a variável vem vazia: melhor manter a cor do index.html que apagar
  if (color) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color)
}

// o Início liga ao montar e desliga ao sair; a troca de tema no meio respeita a escolha
export function setHeroBar(on: boolean) {
  heroBar = on
  applyTheme()
}

export function setTheme(theme: Theme) {
  if (theme === 'system') localStorage.removeItem(THEME_KEY)
  else localStorage.setItem(THEME_KEY, theme)
  applyTheme()
}

// com "system", o app acompanha o sistema trocar de tema enquanto está aberto
export function followSystemTheme() {
  systemDark().addEventListener('change', applyTheme)
}
