import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import type { UserType } from '@/lib/types';

interface Props {
  children: ReactNode;
  requireType?: UserType;
}

export function ProtectedRoute({ children, requireType }: Props) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="animate-pulse text-emerald-700 font-medium">Carregando…</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
  }

  if (requireType && profile && profile.tipo !== requireType) {
    const home = profile.tipo === 'owner' ? '/painel/proprietario' : '/painel/cliente';
    return <Navigate to={home} replace />;
  }

  return <>{children}</>;
}
