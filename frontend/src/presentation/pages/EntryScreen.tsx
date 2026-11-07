import { useEffect, useState } from 'react'
import { RiArrowDownLine, RiArrowUpLine, RiSearchLine } from '@remixicon/react'
import { cn } from 'cn'
import { api } from '@/data/api'
import { currentMonth, formatDayMonth } from '@/shared/format'
import type { EntryOut, Summary } from '@/shared/types'
import { Button } from '@/presentation/components/ui/button'
import { Card, CardContent } from '@/presentation/components/ui/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/presentation/components/ui/empty'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/presentation/components/ui/input-group'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/presentation/components/ui/table'
import { useIsMobile } from '@/presentation/hooks/use-mobile'
import { Page } from '@/presentation/components/Page'
import { MonthNav } from '@/presentation/components/MonthNav'
import { ChoiceToggle } from '@/presentation/components/ChoiceToggle'
import { RowActions } from '@/presentation/components/RowActions'
import { ErrorText } from '@/presentation/components/ErrorText'
import { StatusText } from '@/presentation/components/StatusText'
import { Amount } from '@/presentation/components/Amount'
import { EntryDialog, LaunchButton } from '@/presentation/components/EntryDialog'

type Filter = 'tudo' | 'entrada' | 'gasto' | 'credito'

const FILTERS = [
  { value: 'tudo', label: 'Tudo' },
  { value: 'entrada', label: 'Entradas' },
  { value: 'gasto', label: 'Saídas' },
  { value: 'credito', label: 'Crédito' },
] as const satisfies readonly { value: Filter; label: string }[]

// busca sem diferença de maiúsculas e acentos: "acai" acha "Açaí"
const fold = (text: string) =>
  text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('pt-BR')

function matches(entry: EntryOut, query: string, filter: Filter) {
  if (filter === 'credito' ? entry.method !== 'credito' : filter !== 'tudo' && entry.type !== filter)
    return false
  return fold(entry.description).includes(fold(query.trim()))
}

function method(entry: EntryOut) {
  if (entry.method === 'credito') return `Crédito ${entry.installments}x`
  return entry.method === 'avista' ? 'À vista' : 'Importado'
}

// O círculo com a seta que diz, além da cor, se o dinheiro entrou ou saiu (F1)
function Arrow({ entry }: { entry: EntryOut }) {
  const income = entry.type === 'entrada'
  const Icon = income ? RiArrowUpLine : RiArrowDownLine
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-full',
        income ? 'bg-income-muted text-income' : 'bg-expense-muted text-expense',
      )}
    >
      <Icon className="size-4" />
    </span>
  )
}

// A lista do mês por dia, na ordem em que a API devolve
function byDay(entries: EntryOut[]) {
  const days: { date: string; entries: EntryOut[] }[] = []
  for (const entry of entries) {
    const last = days.at(-1)
    if (last?.date === entry.date) last.entries.push(entry)
    else days.push({ date: entry.date, entries: [entry] })
  }
  return days
}

export function EntryScreen() {
  const isMobile = useIsMobile()
  const [month, setMonth] = useState(currentMonth())
  // salvar e excluir pedem recarga mudando esta chave, em vez de buscar direto: assim a
  // busca sempre usa o mês que está na tela, mesmo se ele mudou durante o salvamento
  const [reloadKey, setReloadKey] = useState(0)
  const reload = () => setReloadKey((k) => k + 1)
  const [entries, setEntries] = useState<EntryOut[] | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)
  // separado do listError: a recarga que segue uma exclusão falha não pode apagar o aviso
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('tudo')
  // undefined = fechado; null = lançamento novo; um lançamento = editar aquele
  const [editing, setEditing] = useState<EntryOut | null | undefined>(undefined)

  useEffect(() => {
    let ativo = true
    setListLoading(true)
    setListError(null)
    Promise.all([api.entries(month), api.summary(month)])
      .then(([entriesData, summaryData]: [EntryOut[], Summary]) => {
        // dois cliques rápidos podem devolver fora de ordem: ignora o que já não é o mês da tela
        if (!ativo) return
        setEntries(entriesData)
        setSummary(summaryData)
      })
      .catch((e: Error) => ativo && setListError(e.message))
      .finally(() => ativo && setListLoading(false))
    return () => {
      ativo = false
    }
  }, [month, reloadKey])

  function remove(id: number) {
    setDeleteError(null)
    return api
      .removeEntry(id)
      .then(reload)
      .catch((e: Error) => {
        setDeleteError(e.message)
        // F13: pode ter sumido em outra aba; a lista volta a bater com o servidor
        reload()
      })
  }

  const shown = entries?.filter((e) => matches(e, query, filter)) ?? []
  const searching = query.trim() !== '' || filter !== 'tudo'
  const clearSearch = () => {
    setQuery('')
    setFilter('tudo')
  }

  return (
    <Page
      active="lancamentos"
      actions={
        <>
          <LaunchButton size="lg" className="md:order-last" onClick={() => setEditing(null)} />
          {/* no celular o mês desce para uma linha própria, de ponta a ponta */}
          <MonthNav month={month} onChange={setMonth} className="max-md:order-last max-md:w-full" />
        </>
      }
    >
      {summary && (
        <Card size="sm">
          <CardContent>
            {/* no celular, uma linha por valor; a partir de lg, três colunas */}
            <dl className="grid grid-cols-1 gap-2 lg:grid-cols-3 lg:gap-4">
              <div className="flex items-baseline justify-between gap-2 lg:flex-col">
                <dt className="text-sm text-muted-foreground">Saldo disponível</dt>
                <dd className="font-bold lg:text-xl">
                  <Amount value={summary.available_balance} kind="saldo" />
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-2 lg:flex-col">
                <dt className="text-sm text-muted-foreground">Saldo do mês</dt>
                <dd className="font-bold lg:text-xl">
                  <Amount value={summary.month_balance} kind="saldo" />
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-2 lg:flex-col">
                <dt className="text-sm text-muted-foreground">Gasto do mês</dt>
                <dd className="font-bold lg:text-xl">
                  <Amount value={summary.total_spent} kind="gasto" />
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      )}

      <Card className="gap-0 py-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <InputGroup className="h-11 flex-[1_1_16rem] rounded-xl bg-muted">
            <InputGroupAddon>
              <RiSearchLine />
            </InputGroupAddon>
            <InputGroupInput
              aria-label="Buscar lançamento"
              placeholder="Buscar lançamento"
              className="text-base md:text-sm"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </InputGroup>
          <ChoiceToggle aria-label="Filtro" options={FILTERS} value={filter} onChange={setFilter} />
        </div>

        <div className="p-4">
          {listLoading && <StatusText>Carregando…</StatusText>}
          <ErrorText>{listError}</ErrorText>
          <ErrorText>{deleteError}</ErrorText>
          {!listLoading && entries && shown.length === 0 && (
            // F14: diz se é a busca ou o mês que está vazio
            <Empty className="py-8">
              <EmptyHeader>
                <EmptyTitle>
                  {searching ? 'Nada bate com a busca' : 'Nenhum lançamento neste mês.'}
                </EmptyTitle>
                {searching && (
                  <EmptyDescription>O mês tem lançamentos, mas nenhum com esse filtro.</EmptyDescription>
                )}
              </EmptyHeader>
              {searching && (
                <Button type="button" variant="outline" onClick={clearSearch}>
                  Limpar busca
                </Button>
              )}
            </Empty>
          )}

          {shown.length > 0 && isMobile && (
            // celular: por dia; tocar no item abre o Lançar preenchido, com o apagar dentro (P5)
            <div className="flex flex-col gap-4">
              {byDay(shown).map((day) => (
                <section key={day.date} className="flex flex-col gap-1">
                  <h2 className="text-sm font-semibold text-muted-foreground">
                    {formatDayMonth(day.date)}
                  </h2>
                  <ul className="flex flex-col">
                    {day.entries.map((entry) => (
                      <li key={entry.id}>
                        <button
                          type="button"
                          aria-label={`Editar ${entry.description}`}
                          onClick={() => setEditing(entry)}
                          className="flex w-full items-center gap-3 rounded-lg py-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <Arrow entry={entry} />
                          <span className="flex min-w-0 flex-1 flex-col">
                            {/* break-words: descrição de extrato traz palavra longa */}
                            <span className="font-medium break-words">{entry.description}</span>
                            <span className="text-sm text-muted-foreground">
                              {entry.category} · {method(entry)}
                            </span>
                          </span>
                          <Amount
                            value={entry.amount}
                            kind={entry.type}
                            className="font-semibold"
                          />
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}

          {shown.length > 0 && !isMobile && (
            // computador: tabela; a rolagem lateral fica dentro do cartão (F8)
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Forma</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>
                    <span className="sr-only">Ações</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-muted-foreground tabular-nums">
                      {formatDayMonth(entry.date)}
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-2.5 font-medium whitespace-normal">
                        <Arrow entry={entry} />
                        {entry.description}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{entry.category}</TableCell>
                    <TableCell className="text-muted-foreground">{method(entry)}</TableCell>
                    <TableCell className="text-right">
                      <Amount value={entry.amount} kind={entry.type} className="font-semibold" />
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <RowActions
                          name={entry.description}
                          onEdit={() => setEditing(entry)}
                          onDelete={() => remove(entry.id)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>

      {editing !== undefined && (
        <EntryDialog entry={editing} onClose={() => setEditing(undefined)} onChanged={reload} />
      )}
    </Page>
  )
}
