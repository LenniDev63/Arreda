import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Calendar, Heart } from 'lucide-react';

const NAV = [
  { to: '/painel/cliente', label: 'Visão geral', shortLabel: 'Início', icon: LayoutDashboard, end: true },
  { to: '/painel/cliente/reservas', label: 'Minhas reservas', shortLabel: 'Reservas', icon: Calendar, end: false },
  { to: '/painel/cliente/favoritos', label: 'Meus favoritos', shortLabel: 'Favoritos', icon: Heart, end: false },
];

export function ClientLayout() {
  return (
    <div className="container-app py-8 pb-24 lg:pb-8">
      <div className="grid lg:grid-cols-[240px_1fr] gap-8">
        <aside className="hidden lg:block">
          <div className="card p-3 lg:sticky lg:top-20">
            <h2 className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-stone-400">Cliente</h2>
            <nav className="space-y-1">
              {NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                      isActive ? 'bg-emerald-50 text-emerald-700' : 'text-stone-600 hover:bg-stone-100'
                    }`
                  }
                >
                  <item.icon className="h-4 w-4" /> {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </aside>
        <div className="min-w-0">
          <Outlet />
        </div>
      </div>

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-stone-200 bg-white/95 backdrop-blur-md lg:hidden safe-area-bottom"
        aria-label="Navegação do cliente"
      >
        <div className="flex items-stretch justify-around px-1 pt-2">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] font-medium transition ${
                  isActive ? 'text-emerald-700' : 'text-stone-500'
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              <span className="truncate">{item.shortLabel}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
