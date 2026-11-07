import type { CSSProperties, ReactNode } from 'react'
import type { CategoryBreakdown } from '@/shared/types'
import { Progress } from '@/presentation/components/ui/progress'
import { Amount } from '@/presentation/components/Amount'

// As cinco cores de barra do tema (--chart-1..5): as cinco maiores categorias do mês ganham uma
// cada, e o resto vira uma barra "Outras", a única cinza (F5). O tema as ordena alternando
// verde e laranja, claro e escuro. A API devolve as categorias da maior para a menor.
const BAR_COLORS = [1, 2, 3, 4, 5].map((n) => `var(--chart-${n})`)
const OTHERS_COLOR = 'var(--chart-others)'

export interface Slice {
  label: string
  color: string
  categories: CategoryBreakdown[]
  // subtítulo do detalhe quando ele junta mais de uma categoria
  description?: ReactNode
}

export function toSlices(categories: CategoryBreakdown[]): Slice[] {
  const top = categories.slice(0, BAR_COLORS.length).map((c, i) => ({
    label: c.category,
    color: BAR_COLORS[i],
    categories: [c],
  }))
  const rest = categories.slice(BAR_COLORS.length)
  const others = {
    label: 'Outras',
    color: OTHERS_COLOR,
    categories: rest,
    description: `As ${rest.length} categorias de menor gasto no mês`,
  }
  return rest.length ? [...top, others] : top
}

// "Para onde foi o dinheiro": uma linha por categoria, com a barra proporcional à maior. Tocar
// numa linha abre o detalhe dela (UC20).
export function CategoryBars({
  slices,
  onOpen,
}: {
  slices: Slice[]
  onOpen: (slice: Slice) => void
}) {
  // só o comprimento da barra; nenhum valor somado aqui aparece como texto — "Outras" mostra
  // quantas categorias junta, não um total calculado no navegador
  const size = (s: Slice) => s.categories.reduce((sum, c) => sum + Number(c.total), 0)
  const largest = Math.max(...slices.map(size), 0)
  return (
    <ul className="flex flex-col gap-1">
      {slices.map((slice) => (
        <li key={slice.label}>
          <button
            type="button"
            onClick={() => onOpen(slice)}
            className="flex w-full flex-col gap-2 rounded-lg px-2 py-2 text-left text-sm outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex w-full justify-between gap-3">
              <span>{slice.label}</span>
              {slice.categories.length === 1 ? (
                <Amount value={slice.categories[0].total} className="font-medium" />
              ) : (
                <span className="text-muted-foreground">{slice.categories.length} categorias</span>
              )}
            </span>
            <Progress
              aria-label={slice.label}
              value={largest ? Math.min(100, (size(slice) / largest) * 100) : 0}
              style={{ '--bar': slice.color } as CSSProperties}
              className="w-full [&_[data-slot=progress-indicator]]:rounded-full [&_[data-slot=progress-indicator]]:bg-(--bar) [&_[data-slot=progress-track]]:h-1.5"
            />
          </button>
        </li>
      ))}
    </ul>
  )
}
