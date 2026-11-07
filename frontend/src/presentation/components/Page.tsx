import type { ReactNode } from 'react'
import { cn } from 'cn'
import { SidebarInset, SidebarProvider } from '@/presentation/components/ui/sidebar'
import { AppSidebar, NAV_ITEMS, type Screen } from '@/presentation/components/AppSidebar'
import { BottomNav } from '@/presentation/components/BottomNav'

// Invólucro das telas logadas: menu lateral no computador, abas embaixo no celular, e o
// conteúdo limitado a max-w-6xl. O título e as ações (Lançar, mês) ficam na linha de cima; o
// Início do celular troca essa linha pelo cabeçalho verde, via `hero`.
// A grade de cada tela vem pelo className — fora de md, tudo é uma coluna só.
export function Page({
  active,
  title,
  actions,
  hero,
  className,
  children,
}: {
  active: Screen
  /** Sem ele, o nome da tela no menu. */
  title?: string
  actions?: ReactNode
  hero?: ReactNode
  className?: string
  children: ReactNode
}) {
  const label = NAV_ITEMS.find((item) => item.screen === active)?.label
  return (
    <SidebarProvider>
      {/* o React 19 leva o <title> para o <head>; o nome é o mesmo do menu */}
      <title>{label}</title>
      <AppSidebar active={active} />
      {/* embaixo, a altura da BottomNav mais o indicador de início do iPhone (F7) */}
      <SidebarInset className="min-w-0 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
        {hero}
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 md:gap-6 md:p-8">
          <div className={cn('flex flex-wrap items-center gap-3 md:gap-4', hero && 'hidden md:flex')}>
            <h1 className="flex-1 text-2xl font-bold">{title ?? label}</h1>
            {actions}
          </div>
          <div className={cn('flex flex-col gap-5 md:gap-6', className)}>{children}</div>
        </div>
      </SidebarInset>
      <BottomNav active={active} />
    </SidebarProvider>
  )
}
