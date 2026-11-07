import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { setHiddenValues } from '@/state/privacy'
import { Amount } from './Amount'

// a cor vem das classes do tema (--income, --expense); o jsdom não aplica CSS, então o teste
// confere a classe, e o sinal continua no texto para quem não distingue as cores (F1)
describe('Amount', () => {
  // UC4
  it('entrada é verde, com "+"', () => {
    render(<Amount value="150.50" kind="entrada" />)
    const valor = screen.getByText('R$ 150,50')
    expect(valor).toHaveClass('text-income')
    expect(valor).toHaveTextContent('+R$ 150,50')
  })

  it('gasto é laranja, com "-"', () => {
    render(<Amount value="150.50" kind="gasto" />)
    const valor = screen.getByText('R$ 150,50')
    expect(valor).toHaveClass('text-expense')
    expect(valor).toHaveTextContent('-R$ 150,50')
  })

  // F4
  it('saldo negativo fica laranja, como gasto, e positivo verde', () => {
    render(
      <>
        <Amount value="-30.00" kind="saldo" />
        <Amount value="30.00" kind="saldo" />
      </>,
    )
    expect(screen.getByText('R$ -30,00')).toHaveClass('text-expense')
    expect(screen.getByText('R$ 30,00')).toHaveClass('text-income')
  })

  it('zero, de qualquer tipo, e valor sem tipo ficam neutros, sem sinal', () => {
    render(
      <>
        <Amount value="0.00" kind="saldo" />
        <Amount value="0.00" kind="entrada" />
        <Amount value="0" kind="gasto" />
        <Amount value="12.00" />
      </>,
    )
    for (const valor of [...screen.getAllByText('R$ 0,00'), screen.getByText('R$ 12,00')]) {
      const texto = valor.textContent
      expect(valor).not.toHaveClass('text-income')
      expect(valor).not.toHaveClass('text-expense')
      expect(texto).toMatch(/^R\$/)
    }
  })
})

describe('Amount com os valores escondidos', () => {
  afterEach(() => setHiddenValues(false))

  // UC12, F17
  it('mostra "R$ ••••" sem cor e diz "valor escondido" ao leitor de tela', () => {
    setHiddenValues(true)
    render(<Amount value="150.50" kind="gasto" />)
    const valor = screen.getByRole('img', { name: 'valor escondido' })
    expect(valor).toHaveTextContent('R$ ••••')
    expect(valor).not.toHaveClass('text-expense')
    expect(screen.queryByText(/150,50/)).not.toBeInTheDocument()
  })
})
