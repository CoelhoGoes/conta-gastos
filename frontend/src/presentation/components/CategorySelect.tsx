import { ENTRADA_CATEGORIES, GASTO_CATEGORIES } from '@/shared/categories'
import type { EntryType } from '@/shared/types'
import { NativeSelect, NativeSelectOption } from '@/presentation/components/ui/native-select'

interface CategorySelectProps {
  type: EntryType
  value: string
  onChange: (category: string) => void
  id?: string
  'aria-label'?: string
  /** Primeira opção vazia, para obrigar a escolher (com `required`). */
  placeholder?: string
  required?: boolean
}

// A lista fechada de categorias do tipo (gasto ou entrada), de docs/dominio.md.
export function CategorySelect({ type, value, onChange, placeholder, ...rest }: CategorySelectProps) {
  return (
    <NativeSelect {...rest} className="w-full" value={value} onChange={(e) => onChange(e.target.value)}>
      {placeholder !== undefined && <NativeSelectOption value="">{placeholder}</NativeSelectOption>}
      {(type === 'gasto' ? GASTO_CATEGORIES : ENTRADA_CATEGORIES).map((c) => (
        <NativeSelectOption key={c} value={c}>
          {c}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  )
}
