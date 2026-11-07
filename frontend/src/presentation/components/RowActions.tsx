import { useEffect, useRef, useState } from 'react'
import { RiPencilLine } from '@remixicon/react'
import { Button } from '@/presentation/components/ui/button'

interface RowActionsProps {
  /** Como a linha é chamada nos rótulos: "Editar feira", "Excluir feira". */
  name: string
  /** Sem ele, só o excluir: é o caso de dentro do Lançar, que já é a edição. */
  onEdit?: () => void
  onDelete: () => Promise<unknown>
}

const CONFIRM_MS = 2000

// Editar e excluir de uma linha de lista. Excluir pede um segundo clique em até 2 s, para um
// toque errado não apagar nada, e fica desativado enquanto a exclusão não volta.
export function RowActions({ name, onEdit, onDelete }: RowActionsProps) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  function onDeleteClick() {
    clearTimeout(timer.current)
    if (!confirming) {
      setConfirming(true)
      timer.current = setTimeout(() => setConfirming(false), CONFIRM_MS)
      return
    }
    setConfirming(false)
    setDeleting(true)
    // a linha some quando dá certo; se der errado, o botão volta
    onDelete().finally(() => setDeleting(false))
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      {onEdit && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={`Editar ${name}`}
          title="Editar"
          onClick={onEdit}
        >
          <RiPencilLine />
        </Button>
      )}
      <Button
        type="button"
        variant="destructive"
        size="sm"
        aria-label={confirming ? `Confirmar exclusão de ${name}` : `Excluir ${name}`}
        disabled={deleting}
        onClick={onDeleteClick}
      >
        {confirming ? 'Confirmar?' : 'Excluir'}
      </Button>
    </div>
  )
}
