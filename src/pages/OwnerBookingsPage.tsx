import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Loader2, Check, XCircle, MapPin, User as UserIcon, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchOwnerBookings } from '@/lib/queries';
import type { BookingWithRelations, BookingStatus } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { BOOKING_STATUS, formatCurrency, formatDate, rentalTypeLabel } from '@/lib/constants';
import { EmptyState } from '@/components/EmptyState';

type Filter = 'all' | 'pendente' | 'aguardando_pagamento' | 'confirmada' | 'concluida' | 'cancelada';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'pendente', label: 'Pendentes' },
  { id: 'aguardando_pagamento', label: 'Aguardando pagamento' },
  { id: 'confirmada', label: 'Confirmadas' },
  { id: 'concluida', label: 'Concluídas' },
  { id: 'cancelada', label: 'Canceladas' },
];

export default function OwnerBookingsPage() {
  const { profile } = useAuth();
  const [bookings, setBookings] = useState<BookingWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [acting, setActing] = useState<string | null>(null);

  async function load() {
    if (!profile) return;
    setLoading(true);
    try {
      setBookings(await fetchOwnerBookings(profile.id));
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [profile]);

  async function updateStatus(b: BookingWithRelations, status: BookingStatus) {
    setActing(b.id);
    const { error } = await supabase.from('bookings').update({ status }).eq('id', b.id);
    setActing(null);
    if (error) { alert('Erro: ' + error.message); return; }
    load();
  }

  const filtered = filter === 'all' ? bookings : bookings.filter((b) => b.status === filter);
  const pending = bookings.filter((b) => b.status === 'pendente').length;

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-emerald-600" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Reservas recebidas</h1>
        <p className="text-sm text-stone-500">
          {bookings.length} reserva(s) no total{pending > 0 && <> · <span className="text-amber-700 font-medium">{pending} pendente(s)</span></>}
        </p>
      </div>

      <div className="flex gap-1 overflow-x-auto scrollbar-hide border-b border-stone-200">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`whitespace-nowrap px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              filter === f.id ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-stone-500 hover:text-stone-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Calendar className="h-12 w-12" />}
          title="Nenhuma reserva aqui"
          description="Quando clientes solicitarem reservas, elas aparecem nesta lista para você aprovar ou recusar."
          action={<Link to="/painel/proprietario/imoveis" className="btn-outline">Ver meus imóveis</Link>}
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((b) => (
            <BookingCard key={b.id} booking={b} acting={acting === b.id} onApprove={() => updateStatus(b, 'aguardando_pagamento')} onReject={() => updateStatus(b, 'recusada')} onConclude={() => updateStatus(b, 'concluida')} />
          ))}
        </div>
      )}
    </div>
  );
}

function BookingCard({
  booking, acting, onApprove, onReject, onConclude,
}: {
  booking: BookingWithRelations;
  acting: boolean;
  onApprove: () => void;
  onReject: () => void;
  onConclude: () => void;
}) {
  const st = BOOKING_STATUS[booking.status];
  const prop = booking.property;
  const client = booking.client;
  const cover = (prop?.photos ?? [])[0]?.url ?? 'https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?auto=compress&cs=tinysrgb&w=400';

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-col sm:flex-row">
        <Link to={`/imovel/${booking.property_id}`} className="sm:w-40 h-32 sm:h-auto shrink-0 overflow-hidden bg-stone-100">
          <img src={cover} alt="" className="h-full w-full object-cover" />
        </Link>
        <div className="flex-1 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <Link to={`/imovel/${booking.property_id}`} className="font-semibold text-stone-900 hover:text-emerald-700 line-clamp-1">
                {prop?.titulo ?? 'Imóvel'}
              </Link>
              <p className="mt-0.5 flex items-center gap-1 text-sm text-stone-500">
                <MapPin className="h-3.5 w-3.5" /> {prop?.bairro}, {prop?.cidade}
              </p>
            </div>
            <span className={`badge ${st.color} shrink-0`}>{st.label}</span>
          </div>

          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-xs text-stone-400">Check-in</p>
              <p className="font-medium text-stone-700">{formatDate(booking.data_inicio)}</p>
            </div>
            <div>
              <p className="text-xs text-stone-400">Check-out</p>
              <p className="font-medium text-stone-700">{formatDate(booking.data_fim)}</p>
            </div>
            <div>
              <p className="text-xs text-stone-400">Locação</p>
              <p className="font-medium text-stone-700">{rentalTypeLabel(booking.tipo_locacao)}</p>
            </div>
            <div>
              <p className="text-xs text-stone-400">Total</p>
              <p className="font-bold text-emerald-700">{formatCurrency(booking.valor_total)}</p>
            </div>
          </div>

          {client && (
            <div className="mt-3 flex items-center gap-2 text-sm text-stone-600">
              <UserIcon className="h-4 w-4 text-stone-400" /> {client.nome}
              {client.telefone && <span className="text-stone-400">· {client.telefone}</span>}
            </div>
          )}

          {booking.status === 'pendente' && (
            <div className="mt-4 flex gap-2">
              <button onClick={onApprove} disabled={acting} className="btn-primary py-2 text-xs">
                {acting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><CheckCircle2 className="h-3.5 w-3.5" /> Aprovar</>}
              </button>
              <button onClick={onReject} disabled={acting} className="btn-danger py-2 text-xs">
                {acting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><XCircle className="h-3.5 w-3.5" /> Recusar</>}
              </button>
            </div>
          )}
          {booking.status === 'confirmada' && (
            <div className="mt-4 flex gap-2">
              <button onClick={onConclude} disabled={acting} className="btn-outline py-2 text-xs">
                {acting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Check className="h-3.5 w-3.5" /> Marcar como concluída</>}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
