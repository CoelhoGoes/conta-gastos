import { formatCurrency } from '@/shared/format'

// O valor de uma linha de <dl>, alinhado pelos dígitos, com o sinal opcional em cinza.
export function MoneyRow({ value, signal }: { value: string; signal?: '+' | '-' }) {
  return (
    <dd className="tabular-nums">
      {signal && <span className="text-muted-foreground">{signal} </span>}
      R$ {formatCurrency(value)}
    </dd>
  )
}
