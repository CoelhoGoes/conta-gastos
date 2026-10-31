import { useEffect, useState, type FormEvent } from 'react'
import { RiAddLine, RiDeleteBinLine } from '@remixicon/react'
import { ApiError, api } from '@/data/api'
import { formatCurrency, formatDate, formatDayMonth, todayIso } from '@/shared/format'
import type { Income, IncomeIn, IncomePart, PaydayRule } from '@/shared/types'
import { Button } from '@/presentation/components/ui/button'
import { Input } from '@/presentation/components/ui/input'
import { Label } from '@/presentation/components/ui/label'
import { Checkbox } from '@/presentation/components/ui/checkbox'
import { NativeSelect, NativeSelectOption } from '@/presentation/components/ui/native-select'
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/presentation/components/ui/dialog'
import { Page } from '@/presentation/components/Page'
import { ErrorText } from '@/presentation/components/ErrorText'
import { RowActions } from '@/presentation/components/RowActions'
import { StatusText } from '@/presentation/components/StatusText'

// os mesmos limites do servidor (schemas.py): o formulário só evita a ida e volta
const MAX_PARTS = 4
const MAX_DAY: Record<PaydayRule, number | null> = {
  dia_fixo: 31,
  dia_util: 23,
  ultimo_dia_util: null,
}

const RULES: { value: PaydayRule; label: string }[] = [
  { value: 'dia_util', label: 'N-ésimo dia útil' },
  { value: 'ultimo_dia_util', label: 'Último dia útil' },
  { value: 'dia_fixo', label: 'Dia fixo do mês' },
]

interface PartForm {
  amount: string
  rule: PaydayRule
  day: string
  next_month: boolean
}

const emptyPart = (): PartForm => ({ amount: '', rule: 'dia_util', day: '5', next_month: false })

function describeDay(rule: IncomePart['rule'], day: number | null | undefined): string {
  if (rule === 'dia_fixo') return `Dia ${day}`
  if (rule === 'dia_util') return `${day}º dia útil`
  if (rule === 'ultimo_dia_util') return 'Último dia útil'
  return 'Sem dia definido'
}

function describePeriod(income: Income): string {
  return income.end
    ? `De ${formatDate(income.start)} a ${formatDate(income.end)}`
    : `Desde ${formatDate(income.start)}`
}

export function IncomeScreen() {
  const [incomes, setIncomes] = useState<Income[] | null>(null)
  const [listError, setListError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Income | null>(null)
  const [start, setStart] = useState(todayIso)
  const [end, setEnd] = useState('')
  const [parts, setParts] = useState<PartForm[]>(() => [emptyPart()])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // F10: o servidor achou uma renda idêntica; a tela pergunta antes de registrar outra
  const [confirmDuplicate, setConfirmDuplicate] = useState(false)

  function load() {
    return api
      .incomes(todayIso())
      .then(setIncomes)
      .catch((e: Error) => setListError(e.message))
  }

  useEffect(() => {
    load()
  }, [])

  function reset() {
    setEditing(null)
    setStart(todayIso())
    setEnd('')
    setParts([emptyPart()])
    setError(null)
  }

  function edit(income: Income) {
    setEditing(income)
    setStart(income.start)
    setEnd(income.end ?? '')
    setParts(
      income.parts.map((p) => ({
        amount: p.amount,
        // renda antiga sem dia (UC10): editar obriga a escolher, e o padrão é o mais comum
        rule: p.rule ?? 'dia_util',
        day: p.rule ? String(p.day ?? '') : '5',
        next_month: p.next_month,
      })),
    )
    setError(null)
  }

  function updatePart(index: number, change: Partial<PartForm>) {
    setParts((list) => list.map((p, i) => (i === index ? { ...p, ...change } : p)))
  }

  function body(): IncomeIn {
    return {
      start,
      end: end || null,
      parts: parts.map((p) => ({
        amount: p.amount,
        rule: p.rule,
        day: MAX_DAY[p.rule] === null ? null : Number(p.day),
        next_month: p.next_month,
      })),
    }
  }

  async function save(allowDuplicate: boolean) {
    setSaving(true)
    setError(null)
    try {
      if (editing) await api.updateIncome(editing.id, body(), allowDuplicate)
      else await api.createIncome(body(), allowDuplicate)
      reset()
      await load()
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) setConfirmDuplicate(true)
      else setError(e instanceof Error ? e.message : 'Não deu para salvar a renda.')
    } finally {
      setSaving(false)
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    save(false)
  }

  async function remove(income: Income) {
    setListError(null)
    try {
      await api.removeIncome(income.id)
      if (editing?.id === income.id) reset()
      setIncomes((list) => list?.filter((i) => i.id !== income.id) ?? null)
    } catch (e) {
      setListError(e instanceof Error ? e.message : 'Não deu para apagar a renda.')
    }
  }

  return (
    <Page active="renda" className="md:grid md:grid-cols-2 md:items-start">
      <Card>
        <CardHeader>
          <CardTitle>{editing ? 'Editar renda' : 'Nova renda'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <p className="text-xs text-muted-foreground">
              Valor fixo que você recebe todo mês, em uma ou mais partes. Não é um lançamento:
              entra no saldo de cada mês do período. Mais de uma renda ao mesmo tempo soma.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="income-start">A partir de</Label>
                <Input
                  id="income-start"
                  type="date"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="income-end">Até (opcional)</Label>
                <Input
                  id="income-end"
                  type="date"
                  min={start}
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </div>
            </div>

            <fieldset className="flex flex-col gap-4">
              <legend className="mb-2 text-sm font-medium">Partes</legend>
              {parts.map((part, index) => {
                const n = index + 1
                const maxDay = MAX_DAY[part.rule]
                return (
                  <div
                    key={index}
                    role="group"
                    aria-label={`Parte ${n}`}
                    className="flex flex-col gap-3 rounded-md border border-border p-3"
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor={`part-amount-${n}`}>Valor</Label>
                        <Input
                          id={`part-amount-${n}`}
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={part.amount}
                          onChange={(e) => updatePart(index, { amount: e.target.value })}
                          required
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor={`part-day-${n}`}>Dia</Label>
                        <Input
                          id={`part-day-${n}`}
                          type="number"
                          step="1"
                          min="1"
                          max={maxDay ?? undefined}
                          value={maxDay === null ? '' : part.day}
                          onChange={(e) => updatePart(index, { day: e.target.value })}
                          disabled={maxDay === null}
                          required={maxDay !== null}
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor={`part-rule-${n}`}>Quando cai</Label>
                      <NativeSelect
                        id={`part-rule-${n}`}
                        className="w-full"
                        value={part.rule}
                        onChange={(e) => updatePart(index, { rule: e.target.value as PaydayRule })}
                      >
                        {RULES.map((r) => (
                          <NativeSelectOption key={r.value} value={r.value}>
                            {r.label}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`part-next-${n}`}
                        checked={part.next_month}
                        onCheckedChange={(checked) =>
                          updatePart(index, { next_month: Boolean(checked) })
                        }
                      />
                      <Label htmlFor={`part-next-${n}`} className="font-normal">
                        Conta no mês seguinte
                      </Label>
                      {parts.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="ml-auto"
                          aria-label={`Remover parte ${n}`}
                          title="Remover parte"
                          onClick={() => setParts((list) => list.filter((_, i) => i !== index))}
                        >
                          <RiDeleteBinLine />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
              {parts.length < MAX_PARTS && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setParts((list) => [...list, emptyPart()])}
                >
                  <RiAddLine data-icon="inline-start" />
                  Adicionar parte
                </Button>
              )}
              <p className="text-xs text-muted-foreground">
                Dia útil conta de segunda a sábado, sem domingo e feriado nacional, como na CLT.
                Se a data cair num dia sem banco, o dinheiro entra no dia útil anterior. "Conta no
                mês seguinte" é para o salário que paga as contas do mês que vem.
              </p>
            </fieldset>

            <ErrorText>{error}</ErrorText>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={saving}>
                {saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Registrar renda'}
              </Button>
              {editing && (
                <Button type="button" variant="outline" onClick={reset}>
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rendas registradas</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ErrorText>{listError}</ErrorText>
          {incomes && incomes.length === 0 && (
            <StatusText>Nenhuma renda registrada.</StatusText>
          )}
          {incomes && incomes.length > 0 && (
            <ul aria-label="Rendas registradas" className="flex flex-col divide-y">
              {incomes.map((income) => {
                const period = describePeriod(income)
                return (
                  <li key={income.id} className="flex flex-col gap-2 py-3 first:pt-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{period}</span>
                      <div className="ml-auto">
                        <RowActions
                          name={`renda ${period.toLowerCase()}`}
                          onEdit={() => edit(income)}
                          onDelete={() => remove(income)}
                        />
                      </div>
                    </div>
                    <ul className="flex flex-col gap-1 text-sm">
                      {income.parts.map((part, i) => (
                        <li key={i} className="flex flex-wrap items-baseline gap-x-2">
                          <span className="tabular-nums">R$ {formatCurrency(part.amount)}</span>
                          <span className="text-muted-foreground">
                            {describeDay(part.rule, part.day)}
                            {part.next_month && ' · conta no mês seguinte'}
                          </span>
                          {part.next_date && (
                            <span className="ml-auto text-muted-foreground">
                              próxima: {formatDayMonth(part.next_date)}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                    {income.parts.some((p) => !p.rule) && (
                      <p className="text-xs text-muted-foreground">
                        Registrada antes de existir o dia de pagamento: conta no próprio mês. Edite
                        para escolher o dia.
                      </p>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={confirmDuplicate} onOpenChange={setConfirmDuplicate}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Renda repetida</DialogTitle>
            <DialogDescription>Essa renda já foi registrada. Registrar mesmo assim?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmDuplicate(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={saving}
              onClick={() => {
                setConfirmDuplicate(false)
                save(true)
              }}
            >
              Registrar mesmo assim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  )
}
