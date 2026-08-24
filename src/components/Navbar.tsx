import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, LayoutDashboard, LogOut, User as UserIcon, Home, Search, Repeat } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Logo } from './Logo';

export function Navbar() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const isOwner = profile?.tipo === 'owner';
  const isOwnerPanel = location.pathname.startsWith('/painel/proprietario');
  const dashboardPath = isOwnerPanel ? '/painel/proprietario' : '/painel/cliente';

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  const navLink = (to: string, label: string) => {
    const active = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
    return (
      <Link
        to={to}
        onClick={() => setOpen(false)}
        className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
          active ? 'text-emerald-700 bg-emerald-50' : 'text-stone-600 hover:text-emerald-700 hover:bg-stone-100'
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-white/90 backdrop-blur-md">
      <div className="container-app flex h-16 items-center justify-between gap-4">
        <Link to="/" className="shrink-0">
          <Logo />
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navLink('/', 'Início')}
          {navLink('/buscar', 'Explorar')}
          {profile && navLink(dashboardPath, 'Meu painel')}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          {profile ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full border border-stone-200 py-1.5 pl-1.5 pr-3 hover:shadow-sm transition"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 overflow-hidden">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <UserIcon className="h-4 w-4" />
                  )}
                </div>
                <span className="text-sm font-medium text-stone-700 max-w-[120px] truncate">
                  {profile.nome?.split(' ')[0] || 'Conta'}
                </span>
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 z-20 mt-2 w-60 rounded-xl border border-stone-100 bg-white p-1.5 shadow-lg animate-fade-in">
                    <div className="px-3 py-2 border-b border-stone-100 mb-1">
                      <p className="text-sm font-semibold text-stone-800 truncate">{profile.nome}</p>
                      <p className="text-xs text-stone-500">
                        {isOwner ? (isOwnerPanel ? 'Modo proprietário' : 'Modo cliente') : 'Cliente'}
                      </p>
                    </div>
                    {isOwner && (
                      <Link
                        to={isOwnerPanel ? '/painel/cliente' : '/painel/proprietario'}
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-stone-700 hover:bg-stone-100"
                      >
                        <Repeat className="h-4 w-4 text-stone-500" />
                        {isOwnerPanel ? 'Modo cliente' : 'Modo proprietário'}
                      </Link>
                    )}
                    <Link
                      to={dashboardPath}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-stone-700 hover:bg-stone-100"
                    >
                      <LayoutDashboard className="h-4 w-4 text-stone-500" /> Meu painel
                    </Link>
                    <Link
                      to="/perfil"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-stone-700 hover:bg-stone-100"
                    >
                      <UserIcon className="h-4 w-4 text-stone-500" /> Meu perfil
                    </Link>
                    {isOwner && isOwnerPanel && (
                      <Link
                        to="/anunciar"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-stone-700 hover:bg-stone-100"
                      >
                        <Home className="h-4 w-4 text-stone-500" /> Anunciar imóvel
                      </Link>
                    )}
                    <button
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" /> Sair
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" className="btn-ghost">Entrar</Link>
              <Link to="/cadastro" className="btn-primary">Cadastrar</Link>
            </>
          )}
        </div>

        <button
          className="md:hidden rounded-lg p-2 text-stone-600 hover:bg-stone-100"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-stone-200 bg-white animate-fade-in">
          <div className="container-app py-3 flex flex-col gap-1">
            {navLink('/', 'Início')}
            {navLink('/buscar', 'Explorar')}
            {profile && navLink(dashboardPath, 'Meu painel')}
            {profile && navLink('/perfil', 'Meu perfil')}
            {isOwner && isOwnerPanel && navLink('/anunciar', 'Anunciar imóvel')}
            {isOwner && (
              <Link
                to={isOwnerPanel ? '/painel/cliente' : '/painel/proprietario'}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-stone-600 hover:bg-stone-100"
              >
                <Repeat className="h-4 w-4" /> {isOwnerPanel ? 'Modo cliente' : 'Modo proprietário'}
              </Link>
            )}
            <div className="mt-2 pt-2 border-t border-stone-100">
              {profile ? (
                <button onClick={handleSignOut} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                  <LogOut className="h-4 w-4" /> Sair
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  <Link to="/login" onClick={() => setOpen(false)} className="btn-outline w-full">Entrar</Link>
                  <Link to="/cadastro" onClick={() => setOpen(false)} className="btn-primary w-full">Cadastrar</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
