import { RiArrowLeftSLine, RiArrowRightSLine } from '@remixicon/react'
import { cn } from 'cn'
import { formatMonthLong, shiftMonth } from '@/shared/format'
import { Button } from '@/presentation/components/ui/button'

interface MonthNavProps {
  month: string
  onChange: (month: string) => void
  className?: string
}

/**
 * Passo de um mês para trás ou para frente.
 *
 * Não usa o `Pagination` do shadcn de propósito: aquele renderiza âncoras, porque
 * foi feito para páginas que têm URL. Aqui não há URL — é estado local —, e âncora
 * sem `href` quebra teclado e leitor de tela.
 */
export function MonthNav({ month, onChange, className }: MonthNavProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-1 rounded-xl border border-border bg-card p-0.5',
        className,
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Mês anterior"
        onClick={() => onChange(shiftMonth(month, -1))}
      >
        <RiArrowLeftSLine />
      </Button>
      <span aria-live="polite" className="min-w-32 text-center text-sm font-semibold">
        {formatMonthLong(month)}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Próximo mês"
        onClick={() => onChange(shiftMonth(month, 1))}
      >
        <RiArrowRightSLine />
      </Button>
    </div>
  )
}
