import { useState, type ComponentProps, type FormEvent } from 'react'
import { RiAddLine } from '@remixicon/react'
import { cn } from 'cn'
import { api, ApiError } from '@/data/api'
import { todayIso } from '@/shared/format'
import type { EntryCreate, EntryMethod, EntryOut, EntryType } from '@/shared/types'
import { Button } from '@/presentation/components/ui/button'
import { Input } from '@/presentation/components/ui/input'
import { Label } from '@/presentation/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/presentation/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/presentation/components/ui/alert-dialog'
import { ChoiceToggle } from '@/presentation/components/ChoiceToggle'
import { CategorySelect } from '@/presentation/components/CategorySelect'
import { RowActions } from '@/presentation/components/RowActions'
import { ErrorText } from '@/presentation/components/ErrorText'

const TYPES = [
  { value: 'gasto', label: 'Gasto' },
  { value: 'entrada', label: 'Entrada' },
] as const satisfies readonly { value: EntryType; label: string }[]

const METHODS = [
  { value: 'avista', label: 'À vista' },
  { value: 'credito', label: 'Crédito' },
] as const satisfies readonly { value: EntryMethod; label: string }[]

interface FormState {
  type: EntryType
  amount: string
  description: string
  category: string
  date: string
  method: EntryMethod
  installments: string
}

/** O lançamento no formato do formulário — os inputs trabalham com string. */
function formFromEntry(entry: EntryOut): FormState {
  return {
    type: entry.type,
    amount: entry.amount,
    description: entry.description,
    category: entry.category,
    date: entry.date,
    method: entry.method ?? 'avista',
    installments: String(entry.installments ?? 1),
  }
}

function defaultForm(): FormState {
  return {
    type: 'gasto',
    amount: '',
    description: '',
    category: '',
    date: todayIso(),
    method: 'avista',
    installments: '1',
  }
}

// O botão que abre o Lançar: neutro, na cor do texto, e não verde nem laranja — é a ação
// principal da tela sem competir com as cores de entrada e saída.
export function LaunchButton({ className, children, ...props }: ComponentProps<typeof Button>) {
  return (
    <Button
      type="button"
      className={cn('bg-foreground text-background hover:bg-foreground/85', className)}
      {...props}
    >
      {children ?? (
        <>
          <RiAddLine data-icon="inline-start" />
          Lançar
        </>
      )}
    </Button>
  )
}

interface EntryDialogProps {
  /** null = lançamento novo; um lançamento = editar aquele. */
  entry: EntryOut | null
  onClose: () => void
  /** Salvou, apagou ou descobriu que o lançamento não existe mais: quem abriu recarrega. */
  onChanged: () => void
}

// O Lançar, por cima de qualquer tela: janela no computador, tela cheia abaixo de md. Monte-o
// só enquanto estiver aberto, para o formulário nascer de novo a cada vez.
export function EntryDialog({ entry, onClose, onChanged }: EntryDialogProps) {
  const [initial] = useState(() => (entry ? formFromEntry(entry) : defaultForm()))
  const [form, setForm] = useState(initial)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmingDiscard, setConfirmingDiscard] = useState(false)
  const dirty = (Object.keys(form) as (keyof FormState)[]).some((k) => form[k] !== initial[k])

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => {
      const next = { ...f, [key]: value }
      if (key === 'type') {
        next.category = ''
        if (value === 'entrada') {
          next.method = 'avista'
          next.installments = '1'
        }
      }
      if (key === 'method' && value === 'avista') {
        next.installments = '1'
      }
      return next
    })
  }

  // fechar com algo digitado pergunta antes de jogar fora (P4)
  function requestClose() {
    if (dirty && !submitting) setConfirmingDiscard(true)
    else if (!submitting) onClose()
  }

  // F13: o lançamento sumiu em outra aba — mostra o erro e deixa a lista se atualizar
  function fail(e: unknown) {
    setError((e as Error).message)
    if (e instanceof ApiError && e.status === 404) onChanged()
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const payload: EntryCreate = {
        type: form.type,
        amount: form.amount,
        description: form.description,
        category: form.category,
        date: form.date,
        method: form.type === 'gasto' ? form.method : 'avista',
        installments:
          form.type === 'gasto' && form.method === 'credito' ? Number(form.installments) : 1,
      }
      if (entry === null) await api.createEntry(payload)
      else await api.updateEntry(entry.id, payload)
      onChanged()
      onClose()
    } catch (e) {
      // F11: a janela fica aberta, com os campos, para tentar de novo
      fail(e)
    } finally {
      setSubmitting(false)
    }
  }

  function remove() {
    if (!entry) return Promise.resolve()
    return api
      .removeEntry(entry.id)
      .then(() => {
        onChanged()
        onClose()
      })
      .catch(fail)
  }

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && requestClose()}>
        <DialogContent className="max-h-svh overflow-y-auto max-md:inset-0 max-md:top-0 max-md:left-0 max-md:h-svh max-md:max-w-none max-md:translate-x-0 max-md:translate-y-0 max-md:content-start max-md:rounded-none max-md:p-5 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">
              {entry === null ? 'Novo lançamento' : 'Editar lançamento'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <ChoiceToggle
              aria-label="Tipo"
              fill
              options={TYPES}
              value={form.type}
              onChange={(v) => updateForm('type', v)}
            />

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="amount">Valor</Label>
              {/* teclado numérico do sistema no celular (P2) */}
              <Input
                id="amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                value={form.amount}
                onChange={(e) => updateForm('amount', e.target.value)}
                required
                aria-invalid={error ? true : undefined}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                type="text"
                maxLength={200}
                value={form.description}
                onChange={(e) => updateForm('description', e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="category">Categoria</Label>
              <CategorySelect
                id="category"
                type={form.type}
                value={form.category}
                onChange={(c) => updateForm('category', c)}
                placeholder="Selecione"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                value={form.date}
                onChange={(e) => updateForm('date', e.target.value)}
                required
              />
            </div>

            {form.type === 'gasto' && (
              <div className="flex flex-col gap-1.5">
                <Label id="method-label">Forma</Label>
                <ChoiceToggle
                  aria-labelledby="method-label"
                  fill
                  options={METHODS}
                  value={form.method}
                  onChange={(v) => updateForm('method', v)}
                />
              </div>
            )}

            {form.type === 'gasto' && form.method === 'credito' && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="installments">Parcelas</Label>
                <Input
                  id="installments"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={48}
                  value={form.installments}
                  onChange={(e) => updateForm('installments', e.target.value)}
                  required
                />
              </div>
            )}

            <ErrorText>{error}</ErrorText>

            <LaunchButton type="submit" size="lg" className="h-12 w-full" disabled={submitting}>
              {submitting ? 'Salvando...' : 'Salvar'}
            </LaunchButton>
            {entry !== null && (
              <div className="flex justify-end">
                <RowActions name={entry.description} onDelete={remove} />
              </div>
            )}
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmingDiscard} onOpenChange={setConfirmingDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar lançamento?</AlertDialogTitle>
            <AlertDialogDescription>O que você digitou vai se perder.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar editando</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={onClose}>
              Descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
