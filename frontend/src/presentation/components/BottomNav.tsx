import { useNavigate } from 'react-router'
import { cn } from 'cn'
import { NAV_ITEMS, type Screen } from '@/presentation/components/AppSidebar'

// Abas fixas embaixo, só abaixo de md. O padding de baixo respeita o indicador de início do
// iPhone (F7); o Page reserva a mesma altura para a aba não cobrir o último item.
export function BottomNav({ active }: { active: Screen }) {
  const navigate = useNavigate()
  return (
    <nav
      aria-label="Abas"
      className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-border bg-card px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden"
    >
      {NAV_ITEMS.slice(0, 4).map((item) => {
        const current = item.screen === active
        return (
          <button
            key={item.screen}
            type="button"
            aria-current={current ? 'page' : undefined}
            onClick={() => navigate(item.path)}
            className={cn(
              'flex flex-col items-center gap-1 rounded-lg py-1.5 text-[11px] outline-none focus-visible:ring-2 focus-visible:ring-ring',
              current ? 'font-semibold text-primary' : 'font-medium text-muted-foreground',
            )}
          >
            <item.icon className="size-6" />
            {item.label}
          </button>
        )
      })}
    </nav>
  )
}
