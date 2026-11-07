import { formatPercent } from '@/shared/format'
import type { CategoryBreakdown } from '@/shared/types'
import { Amount } from '@/presentation/components/Amount'

// "R$ 120,00 · 12,5% do gasto do mês"
export function CategoryTotal({ category }: { category: CategoryBreakdown }) {
  return (
    <>
      <Amount value={category.total} /> · {formatPercent(category.share)} do gasto do mês
    </>
  )
}
