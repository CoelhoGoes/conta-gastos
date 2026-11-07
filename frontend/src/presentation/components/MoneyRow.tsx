import { Amount, type AmountKind } from '@/presentation/components/Amount'

// O valor de uma linha de <dl>, alinhado pelos dígitos, na cor do que ele é (ver Amount).
export function MoneyRow({ value, kind }: { value: string; kind?: AmountKind }) {
  return (
    <dd>
      <Amount value={value} kind={kind} />
    </dd>
  )
}
