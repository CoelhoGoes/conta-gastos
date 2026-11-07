import { useEffect, useState } from 'react'
import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from 'recharts'
import { api } from '@/data/api'
import { formatCurrencyInteger, formatMonthShort } from '@/shared/format'
import { useHiddenValues } from '@/state/privacy'
import type { Summary } from '@/shared/types'
import { NativeSelect, NativeSelectOption } from '@/presentation/components/ui/native-select'
import { ChartTooltipRow } from '@/presentation/components/ChartTooltipRow'
import { EdgeToEdgeCurve } from '@/presentation/components/EdgeToEdgeCurve'
import { LineIcon } from '@/presentation/components/LineIcon'
import { ErrorText } from '@/presentation/components/ErrorText'
import { StatusText } from '@/presentation/components/StatusText'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/presentation/components/ui/chart'

const PRESETS = [3, 6, 12] as const

// As duas barras empilham porque cash_expenses + invoice é exatamente o total_spent
// do mês (docs/dominio.md). A linha responde outra pergunta: quanto sobrou.
// As barras são gasto, então ficam nos laranjas: à vista na cor de gasto (--expense) e a
// fatura num laranja de outra claridade (--chart-5). As linhas ficam nos verdes: o saldo
// acumulado no mais contrastado (--chart-balance), para continuar sendo o traço em destaque,
// e o saldo do mês (sem o que vem dos anteriores) num verde de outra claridade. A renda é
// tracejada e cinza (--chart-income), para se separar dos dois verdes e das barras.
// A renda é uma série, não uma ReferenceLine: só assim entra na legenda
// do shadcn (o Legend do recharts 3.8 não aceita item avulso) e some dela junto com a linha
// quando a renda é zero.
const config = {
  cash_expenses: { label: 'À vista', color: 'var(--expense)' },
  invoice: { label: 'Fatura', color: 'var(--chart-5)' },
  available_balance: {
    label: 'Saldo acumulado',
    color: 'var(--chart-balance)',
    icon: () => <LineIcon color="var(--color-available_balance)" />,
  },
  month_balance: {
    label: 'Saldo do mês',
    color: 'var(--chart-month-balance)',
    icon: () => <LineIcon color="var(--color-month_balance)" />,
  },
  income: {
    label: 'Renda',
    color: 'var(--chart-income)',
    icon: () => <LineIcon color="var(--color-income)" dashed />,
  },
} satisfies ChartConfig

interface Point {
  month: string
  cash_expenses: number
  invoice: number
  available_balance: number
  month_balance: number
  income: number
}

export function TrendChart({ until }: { until: string }) {
  const [months, setMonths] = useState<number>(6)
  const [points, setPoints] = useState<Point[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const hidden = useHiddenValues()

  useEffect(() => {
    let ativo = true
    // `until` vem da tela, que o calcula no fuso do navegador: quem sabe o fuso de
    // quem olha é o cliente, não o servidor — ver docs/dominio.md, seção Tendência.
    api
      .trend(months, until)
      .then((data: Summary[]) => {
        if (!ativo) return
        setPoints(
          data.map((s) => ({
            month: s.month,
            cash_expenses: Number(s.cash_expenses),
            invoice: Number(s.invoice),
            available_balance: Number(s.available_balance),
            month_balance: Number(s.month_balance),
            income: Number(s.monthly_income),
          })),
        )
      })
      .catch((e: Error) => ativo && setError(e.message))
    return () => {
      ativo = false
    }
  }, [months, until])

  // a renda de cada mês vem do histórico de rendas (service.py); zero em todos = nenhuma registrada
  const hasIncome = points?.some((p) => p.income > 0) ?? false

  return (
    <div className="flex flex-col gap-4">
      <NativeSelect
        size="sm"
        aria-label="Período"
        value={months}
        onChange={(e) => setMonths(Number(e.target.value))}
      >
        {PRESETS.map((n) => (
          <NativeSelectOption key={n} value={n}>
            {n} meses
          </NativeSelectOption>
        ))}
      </NativeSelect>

      <ErrorText>{error}</ErrorText>
      {!points && !error && <StatusText>Carregando…</StatusText>}

      {points && (
        <ChartContainer config={config} className="h-64 w-full">
          <ComposedChart data={points} accessibilityLayer>
            <CartesianGrid vertical={false} />
            {/* rótulos em --foreground: o cinza #666 que o recharts põe some no tema escuro, e o
                seletor do shadcn que o trocaria (.recharts-cartesian-axis-tick text) não casa
                com o recharts 3.8 */}
            {/* com os valores escondidos (UC12) o eixo de reais some; as barras e linhas ficam, sem
                escala não dizem quanto */}
            <YAxis
              hide={hidden}
              width="auto"
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--foreground)' }}
              tickFormatter={formatCurrencyInteger}
            />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fill: 'var(--foreground)' }}
              tickFormatter={formatMonthShort}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(v) => formatMonthShort(String(v))}
                  // o mesmo marcador da legenda: quadradinho nas barras, traço nas linhas
                  formatter={(value, name, item) => {
                    const itemConfig = config[name as keyof typeof config]
                    const Icon = itemConfig && 'icon' in itemConfig ? itemConfig.icon : undefined
                    return (
                      <ChartTooltipRow
                        name={itemConfig?.label ?? String(name)}
                        value={value as number}
                        color={item.color}
                        marker={Icon && <Icon />}
                      />
                    )
                  }}
                />
              }
            />
            {/* itemSorter null: a legenda segue a ordem das séries abaixo, não a alfabética */}
            {/* cinco itens não cabem numa linha a 375px: quebram em linhas, cada nome inteiro */}
            <ChartLegend
              itemSorter={null}
              content={
                <ChartLegendContent className="flex-wrap gap-x-4 gap-y-1 [&>div]:whitespace-nowrap" />
              }
            />
            {/* isAnimationActive={false}: com a animação ligada o recharts 3.8 monta os
                grupos das barras vazios, sem nenhum path. A linha não é afetada. */}
            <Bar dataKey="cash_expenses" stackId="gasto" fill="var(--color-cash_expenses)" isAnimationActive={false} radius={[0, 0, 2, 2]} />
            <Bar dataKey="invoice" stackId="gasto" fill="var(--color-invoice)" isAnimationActive={false} radius={[2, 2, 0, 0]} />
            <Line
              dataKey="available_balance"
              type="monotone"
              stroke="var(--color-available_balance)"
              strokeWidth={2}
              shape={<EdgeToEdgeCurve />}
              dot={{ fill: 'var(--color-available_balance)' }}
              activeDot={{ r: 6 }}
            />
            <Line
              dataKey="month_balance"
              type="monotone"
              stroke="var(--color-month_balance)"
              strokeWidth={2}
              shape={<EdgeToEdgeCurve />}
              dot={false}
            />
            {hasIncome && (
              <Line
                dataKey="income"
                stroke="var(--color-income)"
                strokeWidth={2}
                strokeDasharray="4 4"
                shape={<EdgeToEdgeCurve />}
                dot={false}
                activeDot={false}
              />
            )}
          </ComposedChart>
        </ChartContainer>
      )}
    </div>
  )
}
