import type { ReactNode } from 'react'
import { Amount } from '@/presentation/components/Amount'
import { ChartSwatch } from '@/presentation/components/ChartSwatch'

// Linha "nome … R$ valor" dos tooltips dos gráficos. Com `color`, mostra a cor da série; com
// `marker`, mostra ele no lugar do quadradinho (o traço das séries de linha, por exemplo).
// O valor passa pelo Amount, que o esconde junto com os outros (UC12).
export function ChartTooltipRow({
  name,
  value,
  color,
  marker,
}: {
  name: string
  value: number | string
  color?: string
  marker?: ReactNode
}) {
  return (
    <span className="flex w-full items-center justify-between gap-4">
      <span className="flex items-center gap-2">
        {marker ?? (color && <ChartSwatch color={color} />)}
        {name}
      </span>
      <Amount value={String(value)} />
    </span>
  )
}
