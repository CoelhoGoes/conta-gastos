import { useNavigate } from 'react-router'
import {
  RiHomeLine,
  RiFileListLine,
  RiBankCardLine,
  RiWallet3Line,
  RiUploadCloud2Line,
  RiSettings3Line,
} from '@remixicon/react'
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/presentation/components/ui/sidebar'

export type Screen = 'resumo' | 'lancamentos' | 'fatura' | 'renda' | 'importar' | 'configuracoes'

// Os rótulos mudaram (Início, Extrato), as rotas não. A BottomNav do celular usa os quatro
// primeiros; Importar e Configurações chegam pelo Início.
export const NAV_ITEMS: { screen: Screen; label: string; path: string; icon: typeof RiHomeLine }[] = [
  { screen: 'resumo', label: 'Início', path: '/', icon: RiHomeLine },
  { screen: 'lancamentos', label: 'Extrato', path: '/lancamentos', icon: RiFileListLine },
  { screen: 'fatura', label: 'Fatura', path: '/fatura', icon: RiBankCardLine },
  { screen: 'renda', label: 'Renda', path: '/renda', icon: RiWallet3Line },
  { screen: 'importar', label: 'Importar', path: '/importar', icon: RiUploadCloud2Line },
  { screen: 'configuracoes', label: 'Configurações', path: '/configuracoes', icon: RiSettings3Line },
]

// Menu lateral do computador. Abaixo de md a Sidebar do shadcn some, e a BottomNav assume.
export function AppSidebar({ active }: { active: Screen }) {
  const navigate = useNavigate()
  return (
    <Sidebar aria-label="Principal">
      <SidebarHeader className="flex-row items-center gap-2.5 px-4 pt-6 pb-4">
        <span className="flex size-9 items-center justify-center rounded-lg bg-sidebar-primary font-bold text-sidebar-primary-foreground">
          G
        </span>
        <span className="font-bold">Gestão Financeira</span>
      </SidebarHeader>
      <SidebarContent className="px-3">
        <SidebarMenu className="gap-1">
          {NAV_ITEMS.map((item) => (
            <SidebarMenuItem key={item.screen}>
              <SidebarMenuButton
                size="lg"
                isActive={item.screen === active}
                aria-current={item.screen === active ? 'page' : undefined}
                className="h-11 rounded-xl px-3 text-sidebar-foreground/80 data-active:font-semibold [&_svg]:size-5"
                onClick={() => navigate(item.path)}
              >
                <item.icon />
                <span>{item.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  )
}
