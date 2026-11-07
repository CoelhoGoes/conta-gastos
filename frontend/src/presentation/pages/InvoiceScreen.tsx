import { useEffect, useState } from 'react'
import { api } from '@/data/api'
import { currentMonth, formatDayMonth, formatMonthLong } from '@/shared/format'
import type { Invoice } from '@/shared/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/components/ui/card'
import { Progress } from '@/presentation/components/ui/progress'
import { Page } from '@/presentation/components/Page'
import { MonthNav } from '@/presentation/components/MonthNav'
import { ErrorText } from '@/presentation/components/ErrorText'
import { StatusText } from '@/presentation/components/StatusText'
import { Amount } from '@/presentation/components/Amount'
import { UpcomingInvoices } from '@/presentation/components/UpcomingInvoices'
import { EntryDialog, LaunchButton } from '@/presentation/components/EntryDialog'

// Os valores da Fatura são neutros: sem sinal e na cor do texto (UC18). Fora daqui, a fatura
// do mês é uma saída como as outras.
export function InvoiceScreen() {
  const [month, setMonth] = useState(currentMonth())
  const [reloadKey, setReloadKey] = useState(0)
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)
  const [launching, setLaunching] = useState(false)

  useEffect(() => {
    let ativo = true
    setListLoading(true)
    setListError(null)
    api
      .invoice(month)
      .then((data: Invoice) => {
        // dois cliques rápidos podem devolver fora de ordem: ignora o que já não é o mês da tela
        if (ativo) setInvoice(data)
      })
      .catch((e: Error) => ativo && setListError(e.message))
      .finally(() => ativo && setListLoading(false))
    return () => {
      ativo = false
    }
  }, [month, reloadKey])

  return (
    <Page
      active="fatura"
      actions={
        <>
          <LaunchButton size="lg" className="md:order-last" onClick={() => setLaunching(true)} />
          {/* no celular o mês desce para uma linha própria, de ponta a ponta */}
          <MonthNav month={month} onChange={setMonth} className="max-md:order-last max-md:w-full" />
        </>
      }
      className="md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] md:items-start"
    >
      <Card className="md:col-start-1">
        <CardContent className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">Fatura de {formatMonthLong(month)}</span>
          {invoice && invoice.month === month ? (
            <>
              <Amount value={invoice.total} className="text-4xl font-bold tracking-tight" />
              <span className="text-sm text-muted-foreground">
                {invoice.items.length} {invoice.items.length === 1 ? 'parcela' : 'parcelas'}
              </span>
            </>
          ) : (
            listLoading && <StatusText>Carregando…</StatusText>
          )}
          <ErrorText>{listError}</ErrorText>
        </CardContent>
      </Card>

      <Card className="md:col-start-2 md:row-span-2 md:row-start-1">
        <CardHeader>
          <CardTitle>Próximas faturas</CardTitle>
        </CardHeader>
        <CardContent>
          <UpcomingInvoices key={reloadKey} month={month} onSelect={setMonth} />
        </CardContent>
      </Card>

      <Card className="md:col-start-1">
        <CardHeader>
          <CardTitle>Parcelas</CardTitle>
        </CardHeader>
        <CardContent>
          {!listLoading && invoice && invoice.items.length === 0 && (
            <StatusText>Nenhuma parcela nesta fatura.</StatusText>
          )}
          {invoice && invoice.items.length > 0 && (
            <ul className="flex flex-col divide-y divide-border">
              {invoice.items.map((item) => (
                <li key={item.entry_id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col">
                      <span className="font-medium break-words">{item.description}</span>
                      <span className="text-sm text-muted-foreground">
                        {item.category} · comprado em {formatDayMonth(item.purchase_date)}
                      </span>
                    </div>
                    <Amount value={item.installment_amount} className="font-semibold" />
                  </div>
                  <div className="flex items-center gap-3">
                    <Progress
                      aria-label={`Parcela ${item.installment} de ${item.total_installments}`}
                      value={(item.installment / item.total_installments) * 100}
                      className="flex-1 [&_[data-slot=progress-track]]:h-1.5"
                    />
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {item.installment}/{item.total_installments}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

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
