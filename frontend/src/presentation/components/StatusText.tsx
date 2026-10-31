import type { ReactNode } from 'react'

// Texto cinza de apoio: estado ("Carregando…", "Nenhum lançamento neste mês.") ou uma
// explicação curta abaixo de um campo.
export function StatusText({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>
}
