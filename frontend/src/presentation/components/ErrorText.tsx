import type { ReactNode } from 'react'

// Erro que a tela mostra no lugar: o que o servidor recusou ou o que não carregou.
export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null
  return <p className="text-sm text-destructive">{children}</p>
}
