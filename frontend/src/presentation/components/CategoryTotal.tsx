import { formatCurrency, formatPercent } from '@/shared/format'
import type { CategoryBreakdown } from '@/shared/types'

// "R$ 120,00 · 12,5% do gasto do mês"
export function CategoryTotal({ category }: { category: CategoryBreakdown }) {
  return (
    <>
      R$ {formatCurrency(category.total)} · {formatPercent(category.share)} do gasto do mês
    </>
  )
}
