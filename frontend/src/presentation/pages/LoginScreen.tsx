import { useState, type FormEvent } from 'react'
import { useAuth } from '@/state/auth-context'
import { Button } from '@/presentation/components/ui/button'
import { Input } from '@/presentation/components/ui/input'
import { Label } from '@/presentation/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/components/ui/card'
import { ErrorText } from '@/presentation/components/ErrorText'

export function LoginScreen() {
  const { login, register, error } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        await register(email, password)
      }
    } catch {
      // erro já fica exposto via useAuth().error
    } finally {
      setSubmitting(false)
    }
  }

  return (
    // celular: o bloco verde em cima e o formulário sobreposto; computador: lado a lado
    <div className="flex min-h-svh flex-col bg-background md:grid md:grid-cols-2">
      <title>{mode === 'login' ? 'Entrar' : 'Criar conta'}</title>
      <div className="flex items-center gap-3 bg-hero px-6 pt-14 pb-24 text-hero-foreground md:justify-center md:p-16">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-white/16 text-xl font-bold md:size-14 md:text-2xl">
          G
        </span>
        <span className="text-2xl font-bold tracking-tight md:text-3xl">Gestão Financeira</span>
      </div>

      <div className="-mt-14 flex justify-center px-4 pb-8 md:mt-0 md:items-center md:p-12">
        <Card className="w-full max-w-sm rounded-3xl shadow-lg md:shadow-sm">
          <form onSubmit={onSubmit}>
            <CardHeader>
              <CardTitle className="text-xl">{mode === 'login' ? 'Entrar' : 'Criar conta'}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="voce@exemplo.com"
                  className="h-12"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  placeholder={mode === 'login' ? 'Sua senha' : 'Pelo menos 8 caracteres'}
                  className="h-12"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={mode === 'register' ? 8 : undefined}
                />
              </div>
              <ErrorText>{error}</ErrorText>
              <Button type="submit" size="lg" className="h-12" disabled={submitting}>
                {submitting
                  ? 'Enviando...'
                  : mode === 'login'
                    ? 'Entrar'
                    : 'Cadastrar'}
              </Button>
              <Button
                type="button"
                variant="link"
                className="px-0"
                onClick={() =>
                  setMode((m) => (m === 'login' ? 'register' : 'login'))
                }
              >
                {mode === 'login'
                  ? 'Não tem conta? Cadastre-se'
                  : 'Já tem conta? Entrar'}
              </Button>
            </CardContent>
          </form>
        </Card>
      </div>
    </div>
  )
}
