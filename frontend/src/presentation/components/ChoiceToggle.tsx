import { cn } from 'cn'
import { ToggleGroup, ToggleGroupItem } from '@/presentation/components/ui/toggle-group'

interface ChoiceToggleProps<T extends string> {
  options: readonly { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  /** Ocupa a largura toda, cada opção com a mesma fatia. */
  fill?: boolean
  'aria-label'?: string
  'aria-labelledby'?: string
}

// Escolha única entre poucas opções (tipo, forma, tema). Clicar no já escolhido faz o
// ToggleGroup devolver []: isso é ignorado, então o campo nunca fica sem valor.
export function ChoiceToggle<T extends string>({
  options,
  value,
  onChange,
  fill,
  ...aria
}: ChoiceToggleProps<T>) {
  return (
    <ToggleGroup
      {...aria}
      variant="outline"
      spacing={0}
      className={cn(fill && 'w-full')}
      value={[value]}
      onValueChange={(v) => v[0] && onChange(v[0] as T)}
    >
      {options.map((o) => (
        <ToggleGroupItem key={o.value} value={o.value} className={cn(fill && 'flex-1')}>
          {o.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
