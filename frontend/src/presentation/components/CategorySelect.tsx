import { useEffect, useState } from 'react'
import { api } from '@/data/api'
import type { Category, EntryType } from '@/shared/types'
import { ErrorText } from '@/presentation/components/ErrorText'
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

// A lista fechada de categorias do tipo (gasto ou entrada), vinda da tabela `categorias` pela API.
// Enquanto carrega — ou se não carregar — sobra só o placeholder, e o `required` impede salvar.
export function CategorySelect({ type, value, onChange, placeholder, ...rest }: CategorySelectProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let ativo = true
    api.categoryList().then(
      (list) => ativo && setCategories(list),
      () => ativo && setError('Não foi possível carregar as categorias.'),
    )
    return () => {
      ativo = false
    }
  }, [])

  return (
    <>
      <NativeSelect {...rest} className="w-full" value={value} onChange={(e) => onChange(e.target.value)}>
        {placeholder !== undefined && <NativeSelectOption value="">{placeholder}</NativeSelectOption>}
        {categories
          .filter((c) => c.type === type)
          .map((c) => (
            <NativeSelectOption key={c.id} value={c.name}>
              {c.name}
            </NativeSelectOption>
          ))}
      </NativeSelect>
      <ErrorText>{error}</ErrorText>
    </>
  )
}
