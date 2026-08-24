import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Home as HomeIcon, Star, Loader2, Search } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchClientBookings } from '@/lib/queries';
import type { BookingWithRelations } from '@/lib/types';
import { BOOKING_STATUS, formatCurrency, formatDate } from '@/lib/constants';
import { EmptyState } from '@/components/EmptyState';

export default function ClientDashboard() {
  const { profile } = useAuth();
  const [bookings, setBookings] = useState<BookingWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    fetchClientBookings(profile.id)
      .then(setBookings)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [profile]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-emerald-600" /></div>;
  }

  const pending = bookings.filter((b) => b.status === 'pendente').length;
  const confirmed = bookings.filter((b) => b.status === 'confirmada').length;
  const completed = bookings.filter((b) => b.status === 'concluida').length;
  const recent = bookings.slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Olá, {profile?.nome?.split(' ')[0] ?? 'viajante'}!</h1>
        <p className="text-sm text-stone-500">Pronto para sua próxima estadia?</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50"><Calendar className="h-5 w-5 text-amber-600" /></div>
            <div><p className="text-2xl font-bold text-stone-900">{pending}</p><p className="text-xs text-stone-500">reservas em aberto</p></div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50"><HomeIcon className="h-5 w-5 text-emerald-600" /></div>
            <div><p className="text-2xl font-bold text-stone-900">{confirmed}</p><p className="text-xs text-stone-500">confirmadas</p></div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50"><Star className="h-5 w-5 text-orange-500" /></div>
            <div><p className="text-2xl font-bold text-stone-900">{completed}</p><p className="text-xs text-stone-500">estadias concluídas</p></div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link to="/buscar" className="btn-primary"><Search className="h-4 w-4" /> Explorar imóveis</Link>
        <Link to="/painel/cliente/reservas" className="btn-outline">Ver minhas reservas</Link>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-stone-900">Reservas recentes</h2>
          {bookings.length > 0 && <Link to="/painel/cliente/reservas" className="text-sm text-emerald-700 hover:underline">Ver todas</Link>}
        </div>
        {recent.length === 0 ? (
          <EmptyState
            icon={<HomeIcon className="h-12 w-12" />}
            title="Você ainda não tem reservas"
            description="Encontre o imóvel perfeito para sua próxima viagem e faça sua primeira reserva."
            action={<Link to="/buscar" className="btn-primary"><Search className="h-4 w-4" /> Explorar imóveis</Link>}
          />
        ) : (
          <div className="space-y-3">
            {recent.map((b) => <BookingRow key={b.id} booking={b} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function BookingRow({ booking }: { booking: BookingWithRelations }) {
  const st = BOOKING_STATUS[booking.status];
  const prop = booking.property;
  const cover = (prop?.photos ?? [])[0]?.url ?? 'https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?auto=compress&cs=tinysrgb&w=200';
  return (
    <Link to="/painel/cliente/reservas" className="card p-4 flex items-center gap-4 hover:shadow-card-hover transition">
      <img src={cover} alt="" className="h-14 w-20 rounded-lg object-cover shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-stone-800 line-clamp-1">{prop?.titulo ?? 'Imóvel'}</p>
        <p className="text-sm text-stone-500">{formatDate(booking.data_inicio)} → {formatDate(booking.data_fim)} · {formatCurrency(booking.valor_total)}</p>
      </div>
      <span className={`badge ${st.color} shrink-0`}>{st.label}</span>
    </Link>
  );
}
