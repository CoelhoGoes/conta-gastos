import { cn } from 'cn'
import { formatCurrency } from '@/shared/format'
import { useHiddenValues } from '@/state/privacy'

export type AmountKind = 'entrada' | 'gasto' | 'saldo'

// "R$ x" na cor do que o valor é: entrada verde com "+", gasto laranja com "-", saldo pelo
// próprio sinal (negativo como gasto). Zero fica neutro e sem sinal, de qualquer tipo, e sem
// kind sai só o número, na cor de quem o contém. O sinal fica num <span> à parte, para o texto
// do valor continuar sendo "R$ x". Com os valores escondidos (state/privacy), sai "R$ ••••",
// sem cor nem sinal, e o leitor de tela ouve "valor escondido" em vez dos pontos.
export function Amount({
  value,
  kind,
  className,
}: {
  value: string
  kind?: AmountKind
  className?: string
}) {
  const hidden = useHiddenValues()
  if (hidden) {
    return (
      <span role="img" aria-label="valor escondido" className={cn('whitespace-nowrap tabular-nums', className)}>
        R$ ••••
      </span>
    )
  }
  const n = Number(value)
  const tone =
    n === 0
      ? undefined
      : kind === 'entrada' || (kind === 'saldo' && n > 0)
        ? 'text-income'
        : kind === 'gasto' || (kind === 'saldo' && n < 0)
          ? 'text-expense'
          : undefined
  const sign = n === 0 ? null : kind === 'entrada' ? '+' : kind === 'gasto' ? '-' : null
  return (
    <span className={cn('whitespace-nowrap tabular-nums', tone, className)}>
      {sign && <span>{sign}</span>}R$ {formatCurrency(value)}
    </span>
  )
}
