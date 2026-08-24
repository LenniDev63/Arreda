import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Plus, Home as HomeIcon, Edit, Trash2, MapPin, Star, Loader2, Calendar, TrendingUp } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { fetchOwnerProperties, fetchOwnerBookings } from '@/lib/queries';
import type { PropertyWithRelations, BookingWithRelations } from '@/lib/types';
import { EmptyState } from '@/components/EmptyState';
import { BOOKING_STATUS, formatCurrency, formatDate } from '@/lib/constants';

export default function OwnerDashboard() {
  const { profile } = useAuth();
  const location = useLocation();
  const [properties, setProperties] = useState<PropertyWithRelations[]>([]);
  const [bookings, setBookings] = useState<BookingWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function load() {
    if (!profile) return;
    setLoading(true);
    try {
      const [props, bks] = await Promise.all([
        fetchOwnerProperties(profile.id),
        fetchOwnerBookings(profile.id),
      ]);
      setProperties(props);
      setBookings(bks);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [profile]);

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir este imóvel? Esta ação não pode ser desfeita.')) return;
    setDeleting(id);
    const { error } = await supabase.from('properties').delete().eq('id', id);
    setDeleting(null);
    if (error) { alert('Erro ao excluir: ' + error.message); return; }
    load();
  }

  const pendingCount = bookings.filter((b) => b.status === 'pendente').length;
  const totalRevenue = bookings
    .filter((b) => b.status === 'confirmada' || b.status === 'concluida')
    .reduce((s, b) => s + Number(b.valor_total), 0);

  const isOverview = location.pathname === '/painel/proprietario';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (isOverview) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Olá, {profile?.nome?.split(' ')[0] ?? 'Proprietário'}!</h1>
          <p className="text-sm text-stone-500">Aqui está o resumo da sua atividade no Arreda.</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="card p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                <HomeIcon className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-stone-900">{properties.length}</p>
                <p className="text-xs text-stone-500">imóveis ativos</p>
              </div>
            </div>
          </div>
          <div className="card p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
                <Calendar className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-stone-900">{pendingCount}</p>
                <p className="text-xs text-stone-500">reservas pendentes</p>
              </div>
            </div>
          </div>
          <div className="card p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-stone-900">{formatCurrency(totalRevenue)}</p>
                <p className="text-xs text-stone-500">faturamento confirmado</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap gap-3">
          <Link to="/anunciar" className="btn-primary"><Plus className="h-4 w-4" /> Anunciar novo imóvel</Link>
          <Link to="/painel/proprietario/imoveis" className="btn-outline">Ver meus imóveis</Link>
          <Link to="/painel/proprietario/reservas" className="btn-outline">Ver reservas recebidas</Link>
        </div>

        {/* Recent bookings */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-stone-900">Reservas recentes</h2>
            {bookings.length > 0 && <Link to="/painel/proprietario/reservas" className="text-sm text-emerald-700 hover:underline">Ver todas</Link>}
          </div>
          {bookings.length === 0 ? (
            <EmptyState icon={<Calendar className="h-10 w-10" />} title="Nenhuma reserva ainda" description="Quando clientes solicitarem reservas nos seus imóveis, elas aparecem aqui." />
          ) : (
            <div className="space-y-3">
              {bookings.slice(0, 4).map((b) => (
                <BookingRow key={b.id} booking={b} />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // My properties view
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Meus imóveis</h1>
          <p className="text-sm text-stone-500">{properties.length} imóvel(is) cadastrado(s)</p>
        </div>
        <Link to="/anunciar" className="btn-primary"><Plus className="h-4 w-4" /> Novo imóvel</Link>
      </div>

      {properties.length === 0 ? (
        <EmptyState
          icon={<HomeIcon className="h-12 w-12" />}
          title="Você ainda não tem imóveis"
          description="Cadastre seu primeiro imóvel e comece a receber reservas."
          action={<Link to="/anunciar" className="btn-primary"><Plus className="h-4 w-4" /> Anunciar imóvel</Link>}
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {properties.map((p) => {
            const photos = p.photos ?? [];
            const cover = photos.length > 0 ? photos.sort((a, b) => a.ordem - b.ordem)[0].url : 'https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?auto=compress&cs=tinysrgb&w=600';
            const reviews = p.reviews ?? [];
            const avg = reviews.length > 0 ? reviews.reduce((s, r) => s + r.nota, 0) / reviews.length : null;
            return (
              <div key={p.id} className="card overflow-hidden group">
                <Link to={`/imovel/${p.id}`}>
                  <div className="aspect-[4/3] overflow-hidden bg-stone-100">
                    <img src={cover} alt={p.titulo} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                </Link>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <Link to={`/imovel/${p.id}`} className="font-semibold text-stone-900 line-clamp-1 hover:text-emerald-700">{p.titulo}</Link>
                    <span className={`badge shrink-0 ${p.status === 'publicado' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                      {p.status === 'publicado' ? 'Publicado' : 'Rascunho'}
                    </span>
                  </div>
                  {avg && <span className="flex items-center gap-1 text-xs font-medium text-stone-600"><Star className="h-3 w-3 fill-orange-400 text-orange-400" />{avg.toFixed(1)}</span>}
                  <p className="mt-1 flex items-center gap-1 text-sm text-stone-500"><MapPin className="h-3.5 w-3.5" />{p.bairro}, {p.cidade}</p>
                  <div className="mt-4 flex gap-2">
                    <Link to={`/imovel/${p.id}/editar`} className="btn-outline flex-1 py-2 text-xs"><Edit className="h-3.5 w-3.5" /> Editar</Link>
                    <Link to={`/painel/proprietario/calendario/${p.id}`} className="btn-outline flex-1 py-2 text-xs"><Calendar className="h-3.5 w-3.5" /> Calendário</Link>
                    <button onClick={() => handleDelete(p.id)} disabled={deleting === p.id} className="btn-danger py-2 text-xs">
                      {deleting === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BookingRow({ booking }: { booking: BookingWithRelations }) {
  const st = BOOKING_STATUS[booking.status];
  return (
    <div className="card p-4 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="font-semibold text-stone-800 truncate">{booking.property?.titulo ?? 'Imóvel'}</p>
        <p className="text-sm text-stone-500">
          {formatDate(booking.data_inicio)} → {formatDate(booking.data_fim)} · {formatCurrency(booking.valor_total)}
        </p>
      </div>
      <span className={`badge ${st.color} shrink-0`}>{st.label}</span>
    </div>
  );
}
