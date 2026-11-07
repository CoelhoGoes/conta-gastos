import { useEffect, useState } from 'react'
import { api } from '@/data/api'
import { formatMonthShort, shiftMonth } from '@/shared/format'
import type { Summary } from '@/shared/types'
import { Progress } from '@/presentation/components/ui/progress'
import { Amount } from '@/presentation/components/Amount'
import { ErrorText } from '@/presentation/components/ErrorText'
import { StatusText } from '@/presentation/components/StatusText'

// Quanto já está comprometido nas faturas dos três meses seguintes (UC19). Vem do GET /trend
// com `until` no futuro, do qual só o campo `invoice` interessa; mês sem parcela não aparece.
// Carrega e falha sozinho, para um erro aqui não derrubar a fatura do mês (F16).
export function UpcomingInvoices({
  month,
  onSelect,
}: {
  month: string
  onSelect: (month: string) => void
}) {
  const [months, setMonths] = useState<Summary[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let ativo = true
    setMonths(null)
    setError(null)
    api
      .trend(4, shiftMonth(month, 3))
      .then((data: Summary[]) => {
        if (ativo) setMonths(data.filter((s) => s.month > month && Number(s.invoice) > 0))
      })
      .catch((e: Error) => ativo && setError(e.message))
    return () => {
      ativo = false
    }
  }, [month])

  if (error) return <ErrorText>{error}</ErrorText>
  if (!months) return <StatusText>Carregando…</StatusText>
  if (months.length === 0) return <StatusText>Nenhuma parcela nas próximas faturas.</StatusText>

  // só o comprimento da barra do computador; o texto é sempre o valor da API
  const largest = Math.max(...months.map((s) => Number(s.invoice)))
  return (
    <ul aria-label="Próximas faturas" className="flex flex-wrap gap-2 md:flex-col md:gap-1">
      {months.map((s) => (
        <li key={s.month} className="md:w-full">
          <button
            type="button"
            onClick={() => onSelect(s.month)}
            className="flex flex-col items-start gap-0.5 rounded-xl bg-muted px-3.5 py-2 text-left text-xs outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring md:w-full md:gap-2 md:bg-transparent md:px-2 md:text-sm md:hover:bg-muted"
          >
            <span className="flex w-full justify-between gap-3">
              <span className="text-muted-foreground">{formatMonthShort(s.month)}</span>
              <Amount value={s.invoice} className="text-sm font-semibold" />
            </span>
            <Progress
              aria-label={`Fatura de ${formatMonthShort(s.month)}`}
              value={(Number(s.invoice) / largest) * 100}
              className="hidden w-full md:flex [&_[data-slot=progress-track]]:h-1.5"
            />
          </button>
        </li>
      ))}
    </ul>
  )
}
