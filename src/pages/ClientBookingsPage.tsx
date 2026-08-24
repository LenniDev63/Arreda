import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Loader2, MapPin, Star, Check, AlertCircle, MessageSquare, X, CreditCard } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchClientBookings } from '@/lib/queries';
import { supabase } from '@/lib/supabase';
import type { BookingWithRelations, BookingStatus } from '@/lib/types';
import { BOOKING_STATUS, formatCurrency, formatDate, rentalTypeLabel } from '@/lib/constants';
import { StarRating } from '@/components/StarRating';
import { EmptyState } from '@/components/EmptyState';

type Filter = 'all' | 'pendente' | 'aguardando_pagamento' | 'confirmada' | 'concluida' | 'cancelada' | 'recusada';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'pendente', label: 'Pendentes' },
  { id: 'aguardando_pagamento', label: 'Aguardando pagamento' },
  { id: 'confirmada', label: 'Confirmadas' },
  { id: 'concluida', label: 'Concluídas' },
  { id: 'cancelada', label: 'Canceladas' },
  { id: 'recusada', label: 'Recusadas' },
];

export default function ClientBookingsPage() {
  const { profile } = useAuth();
  const [bookings, setBookings] = useState<BookingWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [reviewTarget, setReviewTarget] = useState<BookingWithRelations | null>(null);

  async function load() {
    if (!profile) return;
    setLoading(true);
    try { setBookings(await fetchClientBookings(profile.id)); } catch (e) { console.error(e); }
    setLoading(false);
  }

  useEffect(() => { load(); }, [profile]);

  const filtered = filter === 'all' ? bookings : bookings.filter((b) => b.status === filter);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-emerald-600" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Minhas reservas</h1>
        <p className="text-sm text-stone-500">{bookings.length} reserva(s) no total</p>
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
          description="Que tal explorar acomodações e fazer sua primeira reserva?"
          action={<Link to="/buscar" className="btn-primary">Explorar imóveis</Link>}
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((b) => (
            <BookingCard key={b.id} booking={b} onReview={() => setReviewTarget(b)} onReload={load} />
          ))}
        </div>
      )}

      {reviewTarget && (
        <ReviewModal booking={reviewTarget} onClose={() => setReviewTarget(null)} onSubmitted={() => { setReviewTarget(null); load(); }} />
      )}
    </div>
  );
}

function BookingCard({ booking, onReview, onReload }: { booking: BookingWithRelations; onReview: () => void; onReload: () => void }) {
  const st = BOOKING_STATUS[booking.status];
  const prop = booking.property;
  const cover = (prop?.photos ?? [])[0]?.url ?? 'https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?auto=compress&cs=tinysrgb&w=400';
  const [canceling, setCanceling] = useState(false);

  const canReview = booking.status === 'concluida';
  const canCancel = booking.status === 'pendente' || booking.status === 'confirmada';
  const canPay = booking.status === 'aguardando_pagamento';

  async function handleCancel() {
    if (!confirm('Deseja realmente cancelar esta reserva?')) return;
    setCanceling(true);
    const { error } = await supabase.from('bookings').update({ status: 'cancelada' as BookingStatus }).eq('id', booking.id);
    setCanceling(false);
    if (error) { alert('Erro: ' + error.message); return; }
    onReload();
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-col sm:flex-row">
        <Link to={`/imovel/${booking.property_id}`} className="sm:w-44 h-32 sm:h-auto shrink-0 overflow-hidden bg-stone-100">
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
            <div><p className="text-xs text-stone-400">Check-in</p><p className="font-medium text-stone-700">{formatDate(booking.data_inicio)}</p></div>
            <div><p className="text-xs text-stone-400">Check-out</p><p className="font-medium text-stone-700">{formatDate(booking.data_fim)}</p></div>
            <div><p className="text-xs text-stone-400">Locação</p><p className="font-medium text-stone-700">{rentalTypeLabel(booking.tipo_locacao)}</p></div>
            <div><p className="text-xs text-stone-400">Total</p><p className="font-bold text-emerald-700">{formatCurrency(booking.valor_total)}</p></div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {canPay && (
              <Link to={`/pagamento/${booking.id}`} className="btn-secondary py-2 text-xs">
                <CreditCard className="h-3.5 w-3.5" /> Pagar agora
              </Link>
            )}
            {canReview && <button onClick={onReview} className="btn-primary py-2 text-xs"><Star className="h-3.5 w-3.5" /> Avaliar estadia</button>}
            {canCancel && <button onClick={handleCancel} disabled={canceling} className="btn-danger py-2 text-xs">
              {canceling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><X className="h-3.5 w-3.5" /> Cancelar reserva</>}
            </button>}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewModal({ booking, onClose, onSubmitted }: { booking: BookingWithRelations; onClose: () => void; onSubmitted: () => void }) {
  const { profile } = useAuth();
  const [nota, setNota] = useState(5);
  const [comentario, setComentario] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setError(null);
    const { error } = await supabase.from('reviews').insert({
      property_id: booking.property_id,
      client_id: profile.id,
      nota,
      comentario: comentario.trim(),
    });
    setSaving(false);
    if (error) { setError(error.message); return; }
    onSubmitted();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-md card p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2"><MessageSquare className="h-5 w-5 text-emerald-600" /> Avaliar estadia</h3>
            <p className="text-sm text-stone-500 line-clamp-1">{booking.property?.titulo}</p>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600"><X className="h-5 w-5" /></button>
        </div>

        {error && (
          <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Sua nota</label>
            <StarRating value={nota} onChange={setNota} size={32} />
          </div>
          <div>
            <label className="label">Comentário (opcional)</label>
            <textarea value={comentario} onChange={(e) => setComentario(e.target.value)} rows={4} className="input resize-y" placeholder="Conte como foi sua estadia…" />
          </div>
          <button type="submit" disabled={saving} className="btn-primary w-full py-3">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4" /> Enviar avaliação</>}
          </button>
        </form>
      </div>
    </div>
  );
}
