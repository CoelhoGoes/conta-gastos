import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import {
  RiAddLine,
  RiArrowRightSLine,
  RiBankCardLine,
  RiEyeLine,
  RiEyeOffLine,
  RiFileListLine,
  RiInformationLine,
  RiSettings3Line,
  RiUploadCloud2Line,
} from '@remixicon/react'
import { cn } from 'cn'
import { api } from '@/data/api'
import { currentMonth, formatDayMonth, formatMonthLong } from '@/shared/format'
import type { CategoryBreakdown, EntryOut, Summary } from '@/shared/types'
import { useAuth } from '@/state/auth-context'
import { setHiddenValues, useHiddenValues } from '@/state/privacy'
import { setHeroBar } from '@/state/theme'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/presentation/components/ui/card'
import { Button } from '@/presentation/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/presentation/components/ui/dialog'
import { useIsMobile } from '@/presentation/hooks/use-mobile'
import { Page } from '@/presentation/components/Page'
import { MonthNav } from '@/presentation/components/MonthNav'
import { CategoryTotal } from '@/presentation/components/CategoryTotal'
import { MoneyRow } from '@/presentation/components/MoneyRow'
import { ErrorText } from '@/presentation/components/ErrorText'
import { StatusText } from '@/presentation/components/StatusText'
import { Amount } from '@/presentation/components/Amount'
import { CategoryBars, toSlices, type Slice } from '@/presentation/components/CategoryBars'
import { EntryDialog, LaunchButton } from '@/presentation/components/EntryDialog'
// recharts é pesado e só esta seção usa: carrega em separado, sem bloquear a tela
const TrendChart = lazy(() =>
  import('@/presentation/components/TrendChart').then((m) => ({ default: m.TrendChart })),
)

// O detalhe de "Ver todas": todas as categorias, na ordem em que a API as devolve — da
// maior para a menor (service.py).
function allCategories(categories: CategoryBreakdown[], summary: Summary | null): Slice {
  const n = categories.length
  return {
    label: 'Gasto do mês',
    color: '',
    categories,
    description: (
      <>
        <Amount value={summary?.total_spent ?? '0'} /> em {n} {n === 1 ? 'categoria' : 'categorias'}
        , da maior para a menor
      </>
    ),
  }
}

// os botões redondos e translúcidos sobre o cabeçalho verde
const HERO_BUTTON = 'rounded-full bg-white/12 text-hero-foreground hover:bg-white/20 hover:text-hero-foreground'

// O olho que esconde os valores em todas as telas (UC12). O rótulo diz o que o toque vai fazer.
function EyeButton({ className }: { className?: string }) {
  const hidden = useHiddenValues()
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-lg"
      aria-label={hidden ? 'Mostrar valores' : 'Esconder valores'}
      aria-pressed={hidden}
      className={className}
      onClick={() => setHiddenValues(!hidden)}
    >
      {hidden ? <RiEyeOffLine /> : <RiEyeLine />}
    </Button>
  )
}

// Ação rápida do Início no celular: círculo com o ícone e o rótulo embaixo
function QuickAction({
  label,
  icon,
  onClick,
  circleClassName,
}: {
  label: string
  icon: ReactNode
  onClick: () => void
  circleClassName?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-2 rounded-xl text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span
        className={cn(
          'flex size-14 items-center justify-center rounded-full bg-card text-primary shadow-xs [&_svg]:size-6',
          circleClassName,
        )}
      >
        {icon}
      </span>
      {label}
    </button>
  )
}

export function SummaryScreen() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isMobile = useIsMobile()
  const [month, setMonth] = useState(currentMonth())
  const [reloadKey, setReloadKey] = useState(0)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [categories, setCategories] = useState<CategoryBreakdown[] | null>(null)
  const [recent, setRecent] = useState<EntryOut[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [recentError, setRecentError] = useState<string | null>(null)
  const [openSlice, setOpenSlice] = useState<Slice | null>(null)
  const [launching, setLaunching] = useState(false)

  // P6: no celular a barra do navegador emenda com o cabeçalho verde; ao sair, volta ao fundo
  useEffect(() => {
    setHeroBar(isMobile)
    return () => setHeroBar(false)
  }, [isMobile])

  useEffect(() => {
    let ativo = true
    setError(null)
    Promise.all([api.summary(month), api.categoryBreakdown(month)])
      .then(([s, c]: [Summary, CategoryBreakdown[]]) => {
        // dois cliques rápidos podem devolver fora de ordem: ignora o que já não é o mês atual
        if (!ativo) return
        setSummary(s)
        setCategories(c)
      })
      .catch((e: Error) => ativo && setError(e.message))
    return () => {
      ativo = false
    }
  }, [month, reloadKey])

  // os últimos lançamentos só aparecem no computador, e falham sem levar o resto junto (F16)
  useEffect(() => {
    if (isMobile) return
    let ativo = true
    setRecentError(null)
    api
      .entries(month)
      .then((e: EntryOut[]) => ativo && setRecent(e.slice(0, 5)))
      .catch((e: Error) => ativo && setRecentError(e.message))
    return () => {
      ativo = false
    }
  }, [month, reloadKey, isMobile])

  const loading = !summary && !error
  const slices = categories ? toSlices(categories) : []
  const greeting = `Olá, ${user?.email.split('@')[0] ?? ''}`

  const hero = isMobile && (
    <header className="flex flex-col gap-5 rounded-b-3xl bg-hero px-5 pt-5 pb-7 text-hero-foreground">
      <div className="flex items-center gap-2">
        <span className="flex-1 truncate font-semibold">{greeting}</span>
        <EyeButton className={HERO_BUTTON} />
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          aria-label="Configurações"
          className={HERO_BUTTON}
          onClick={() => navigate('/configuracoes')}
        >
          <RiSettings3Line />
        </Button>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-sm opacity-85">Saldo disponível</span>
        {summary && (
          <>
            <Amount value={summary.available_balance} className="text-4xl font-bold tracking-tight" />
            <span className="text-sm opacity-90">
              Saldo do mês <Amount value={summary.month_balance} className="font-semibold" />
            </span>
          </>
        )}
      </div>
      <div className="self-start text-foreground">
        <MonthNav month={month} onChange={setMonth} />
      </div>
    </header>
  )

  return (
    <Page
      active="resumo"
      title={greeting}
      hero={hero}
      actions={
        <>
          <EyeButton />
          <MonthNav month={month} onChange={setMonth} />
          <LaunchButton size="lg" onClick={() => setLaunching(true)} />
        </>
      }
    >
      {isMobile && (
        <nav aria-label="Ações rápidas" className="grid grid-cols-4 gap-2">
          <QuickAction
            label="Lançar"
            icon={<RiAddLine />}
            onClick={() => setLaunching(true)}
            circleClassName="bg-foreground text-background"
          />
          <QuickAction label="Extrato" icon={<RiFileListLine />} onClick={() => navigate('/lancamentos')} />
          <QuickAction label="Fatura" icon={<RiBankCardLine />} onClick={() => navigate('/fatura')} />
          <QuickAction label="Importar" icon={<RiUploadCloud2Line />} onClick={() => navigate('/importar')} />
        </nav>
      )}

      <ErrorText>{error}</ErrorText>
      {loading && <StatusText>Carregando…</StatusText>}

      {summary && Number(summary.monthly_income) === 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
          <div className="flex gap-2">
            <RiInformationLine className="mt-0.5 shrink-0 text-muted-foreground" />
            <StatusText>
              Nenhuma renda mensal vale para este mês, então o saldo dele está sendo calculado
              como se ela fosse zero.
            </StatusText>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() => navigate('/renda')}
          >
            Informar renda mensal
          </Button>
        </div>
      )}

      {/* no computador, o saldo em destaque ocupa a linha toda, com os totais do mês ao lado */}
      {summary && !isMobile && (
        <section
          aria-label="Saldo"
          className="flex flex-wrap items-end gap-8 rounded-3xl bg-hero px-8 py-7 text-hero-foreground"
        >
          <div className="flex flex-[1_1_16rem] flex-col gap-1">
            <span className="text-sm opacity-85">Saldo disponível</span>
            <Amount value={summary.available_balance} className="text-5xl font-bold tracking-tight" />
            <span className="text-sm opacity-90">
              Saldo do mês <Amount value={summary.month_balance} className="font-semibold" />
            </span>
          </div>
        </section>
      )}

      <div className="flex flex-col gap-5 md:grid md:grid-cols-2 md:items-start md:gap-6">
        {summary && (
          <Card
            role="link"
            tabIndex={0}
            aria-label="Abrir a fatura"
            className="cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => navigate('/fatura')}
            onKeyDown={(e) => e.key === 'Enter' && navigate('/fatura')}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RiBankCardLine className="size-5" />
                Cartão de crédito
              </CardTitle>
              <CardAction>
                <RiArrowRightSLine className="text-muted-foreground" />
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-0.5">
              <span className="text-sm text-muted-foreground">Fatura de {formatMonthLong(month)}</span>
              {/* neutro: o valor da fatura no cartão não usa a cor de saída */}
              <Amount value={summary.invoice} className="text-2xl font-bold" />
            </CardContent>
          </Card>
        )}

        {summary && (
          <Card>
            <CardHeader>
              <CardTitle>Resumo do mês</CardTitle>
              <CardAction>
                <Button type="button" variant="link" className="px-0" onClick={() => navigate('/lancamentos')}>
                  Ver extrato
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <dl className="flex flex-col gap-2 text-sm">
                <div className="flex flex-wrap justify-between">
                  <dt className="text-muted-foreground">Renda mensal</dt>
                  <MoneyRow value={summary.monthly_income} kind="entrada" />
                  {/* de onde veio a renda: o salário de 30/10 que conta em novembro aparece aqui */}
                  {summary.income_payments.length > 0 && (
                    <dd className="mt-1 w-full">
                      <ul
                        aria-label="Pagamentos da renda"
                        className="flex flex-col gap-0.5 pl-3 text-xs text-muted-foreground"
                      >
                        {summary.income_payments.map((p, i) => (
                          <li key={i} className="flex justify-between gap-2">
                            <span>
                              {p.date ? formatDayMonth(p.date) : 'Sem dia definido'}
                              {p.next_month && ' · recebida no mês anterior'}
                            </span>
                            <Amount value={p.amount} />
                          </li>
                        ))}
                      </ul>
                    </dd>
                  )}
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Entradas extras</dt>
                  <MoneyRow value={summary.extra_income} kind="entrada" />
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Gastos à vista</dt>
                  <MoneyRow value={summary.cash_expenses} kind="gasto" />
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Fatura do cartão</dt>
                  <MoneyRow value={summary.invoice} kind="gasto" />
                </div>
                <div className="flex justify-between border-t pt-2 font-medium">
                  <dt>Gasto total do mês</dt>
                  <MoneyRow value={summary.total_spent} kind="gasto" />
                </div>
              </dl>
            </CardContent>
          </Card>
        )}

        {categories && (
          <Card>
            <CardHeader>
              <CardTitle>Para onde foi o dinheiro</CardTitle>
              {categories.length > 0 && (
                <CardAction>
                  <Button
                    type="button"
                    variant="link"
                    className="px-0"
                    onClick={() => setOpenSlice(allCategories(categories, summary))}
                  >
                    Ver todas
                  </Button>
                </CardAction>
              )}
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {categories.length === 0 && <StatusText>Nenhum gasto neste mês.</StatusText>}
              {slices.length > 0 && (
                <>
                  <CategoryBars slices={slices} onOpen={setOpenSlice} />
                  <p className="border-t pt-4 text-xs text-muted-foreground">
                    Inclui as parcelas que vencem neste mês, mesmo de compras feitas antes — por
                    isso um item pode aparecer aqui sem ter sido comprado agora.
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Tendência</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<StatusText>Carregando…</StatusText>}>
              <TrendChart until={month} />
            </Suspense>
          </CardContent>
        </Card>

        {!isMobile && (
          <Card>
            <CardHeader>
              <CardTitle>Últimos lançamentos</CardTitle>
            </CardHeader>
            <CardContent>
              <ErrorText>{recentError}</ErrorText>
              {recent?.length === 0 && <StatusText>Nenhum lançamento neste mês.</StatusText>}
              {recent && recent.length > 0 && (
                <ul className="flex flex-col divide-y divide-border">
                  {recent.map((entry) => (
                    <li key={entry.id} className="flex items-center justify-between gap-3 py-2.5">
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate font-medium">{entry.description}</span>
                        <span className="text-xs text-muted-foreground">
                          {entry.category} · {formatDayMonth(entry.date)}
                        </span>
                      </span>
                      <Amount value={entry.amount} kind={entry.type} className="font-semibold" />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={openSlice !== null} onOpenChange={(open) => !open && setOpenSlice(null)}>
        {openSlice && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{openSlice.label}</DialogTitle>
              <DialogDescription>
                {openSlice.description ?? <CategoryTotal category={openSlice.categories[0]} />}
              </DialogDescription>
            </DialogHeader>
            <div className="flex max-h-[60svh] flex-col gap-4 overflow-y-auto text-sm">
              {openSlice.categories.map((category) => (
                <section key={category.category} className="flex flex-col">
                  {openSlice.description && (
                    <h3 className="flex justify-between gap-4 font-medium">
                      {category.category}
                      <span className="font-normal text-muted-foreground">
                        <CategoryTotal category={category} />
                      </span>
                    </h3>
                  )}
                  <ul className="flex flex-col divide-y divide-border">
                    {category.items.map((item, i) => (
                      <li key={`${item.description}-${i}`} className="flex justify-between gap-4 py-2">
                        <span>
                          {item.description}
                          {item.installment && (
                            <span className="text-muted-foreground">
                              {' '}
                              (parcela {item.installment}/{item.total_installments})
                            </span>
                          )}
                        </span>
                        <Amount value={item.amount} />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </DialogContent>
        )}
      </Dialog>

      {launching && (
        <EntryDialog
          entry={null}
          onClose={() => setLaunching(false)}
          onChanged={() => setReloadKey((k) => k + 1)}
        />
      )}
    </Page>
  )
}
