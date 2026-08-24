import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Calendar, Loader2, ArrowLeft, Plus, Trash2, AlertCircle, Home as HomeIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { fetchAvailability, fetchOwnerProperties } from '@/lib/queries';
import type { PropertyWithRelations, AvailabilityBlock } from '@/lib/types';
import { formatDate, formatCurrency, rentalTypeLabel } from '@/lib/constants';
import { toDateInputValue, todayStr } from '@/lib/booking';
import { AvailabilityCalendar } from '@/components/AvailabilityCalendar';
import { EmptyState } from '@/components/EmptyState';

export default function OwnerCalendarPage() {
  const { propertyId } = useParams<{ propertyId: string }>();
  const { profile } = useAuth();
  const [properties, setProperties] = useState<PropertyWithRelations[]>([]);
  const [current, setCurrent] = useState<PropertyWithRelations | null>(null);
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>([]);
  const [loading, setLoading] = useState(true);

  const [startStr, setStartStr] = useState('');
  const [endStr, setEndStr] = useState('');
  const [motivo, setMotivo] = useState('indisponivel');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!profile) return;
    fetchOwnerProperties(profile.id)
      .then((props) => {
        setProperties(props);
        if (propertyId) {
          const found = props.find((p) => p.id === propertyId);
          setCurrent(found ?? props[0] ?? null);
        } else {
          setCurrent(props[0] ?? null);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [profile, propertyId]);

  useEffect(() => {
    if (!current) return;
    fetchAvailability(current.id).then(setBlocks).catch(console.error);
  }, [current]);

  const bookings = current
    ? blocks.filter((b) => b.motivo === 'reserva')
    : [];
  const manualBlocks = current
    ? blocks.filter((b) => b.motivo !== 'reserva')
    : [];

  async function handleAddBlock(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (!current || !startStr || !endStr) {
      setError('Selecione as datas de início e fim.');
      return;
    }
    const start = new Date(startStr);
    const end = new Date(endStr);
    if (end < start) {
      setError('A data final deve ser posterior à inicial.');
      return;
    }
    setSaving(true);
    const { error: insErr } = await supabase
      .from('availability_blocks')
      .insert({
        property_id: current.id,
        data_inicio: startStr,
        data_fim: endStr,
        motivo: motivo.trim() || 'indisponivel',
      });
    setSaving(false);
    if (insErr) { setError(insErr.message); return; }
    setStartStr('');
    setEndStr('');
    setMotivo('indisponivel');
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2500);
    fetchAvailability(current.id).then(setBlocks);
  }

  async function handleDeleteBlock(block: AvailabilityBlock) {
    if (!current) return;
    if (!confirm('Remover este bloqueio de datas?')) return;
    const { error } = await supabase
      .from('availability_blocks')
      .delete()
      .eq('id', block.id);
    if (error) { alert('Erro: ' + error.message); return; }
    fetchAvailability(current.id).then(setBlocks);
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-emerald-600" /></div>;
  }

  if (properties.length === 0) {
    return (
      <EmptyState
        icon={<HomeIcon className="h-12 w-12" />}
        title="Você ainda não tem imóveis"
        description="Cadastre seu primeiro imóvel para gerenciar a disponibilidade."
        action={<Link to="/anunciar" className="btn-primary"><Plus className="h-4 w-4" /> Anunciar imóvel</Link>}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/painel/proprietario/imoveis" className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-emerald-700 mb-2">
          <ArrowLeft className="h-4 w-4" /> Voltar para meus imóveis
        </Link>
        <h1 className="text-2xl font-bold text-stone-900">Calendário de disponibilidade</h1>
        <p className="text-sm text-stone-500">Bloqueie datas para manutenção, indisponibilidade ou uso próprio.</p>
      </div>

      {/* Property selector */}
      <div className="card p-4">
        <label className="label">Imóvel</label>
        <select
          value={current?.id ?? ''}
          onChange={(e) => {
            const found = properties.find((p) => p.id === e.target.value);
            setCurrent(found ?? null);
          }}
          className="input"
        >
          {properties.map((p) => (
            <option key={p.id} value={p.id}>{p.titulo} — {p.bairro}, {p.cidade}</option>
          ))}
        </select>
        {current && (
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-stone-500">
            <span><strong className="text-stone-700">{current.quartos}</strong> quartos</span>
            <span><strong className="text-stone-700">{current.banheiros}</strong> banheiros</span>
            <span><strong className="text-stone-700">{current.capacidade}</strong> hóspedes</span>
            {current.pricing?.map((pr) => (
              <span key={pr.tipo}>{rentalTypeLabel(pr.tipo)}: <strong className="text-stone-700">{formatCurrency(Number(pr.preco))}</strong></span>
            ))}
          </div>
        )}
      </div>

      {current && (
        <>
          {/* Calendar */}
          <div className="card p-5">
            <h2 className="font-semibold text-stone-800 mb-3 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-emerald-600" /> Calendário
            </h2>
            <div className="flex flex-wrap gap-4 mb-4 text-xs text-stone-500">
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-red-200" /> Bloqueado</span>
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-stone-100 border border-stone-300" /> Disponível</span>
            </div>
            <AvailabilityCalendar
              blocks={blocks}
              startDate={null}
              endDate={null}
              onSelectDate={() => {}}
            />
          </div>

          {/* Add block form */}
          <form onSubmit={handleAddBlock} className="card p-5 space-y-4">
            <h2 className="font-semibold text-stone-800">Bloquear datas manualmente</h2>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" /> {error}
              </div>
            )}
            {success && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-700">
                Datas bloqueadas com sucesso!
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">De</label>
                <input
                  type="date"
                  min={todayStr()}
                  value={startStr}
                  onChange={(e) => setStartStr(e.target.value)}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Até</label>
                <input
                  type="date"
                  min={startStr || todayStr()}
                  value={endStr}
                  onChange={(e) => setEndStr(e.target.value)}
                  className="input"
                  required
                />
              </div>
            </div>
            <div>
              <label className="label">Motivo (opcional)</label>
              <input
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className="input"
                placeholder="Ex: manutenção, uso próprio, reforma..."
              />
            </div>
            <button type="submit" disabled={saving} className="btn-primary py-2.5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4" /> Bloquear datas</>}
            </button>
          </form>

          {/* Manual blocks list */}
          {manualBlocks.length > 0 && (
            <div className="card p-5">
              <h2 className="font-semibold text-stone-800 mb-3">Bloqueios manuais</h2>
              <div className="space-y-2">
                {manualBlocks.map((b) => (
                  <div key={b.id} className="flex items-center justify-between rounded-xl border border-stone-200 px-4 py-3">
                    <div>
                      <p className="font-medium text-stone-800 text-sm">
                        {formatDate(b.data_inicio)} → {formatDate(b.data_fim)}
                      </p>
                      {b.motivo !== 'indisponivel' && (
                        <p className="text-xs text-stone-500 mt-0.5">{b.motivo}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteBlock(b)}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remover
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Booked dates (from reservations) */}
          {bookings.length > 0 && (
            <div className="card p-5">
              <h2 className="font-semibold text-stone-800 mb-3">Datas reservadas</h2>
              <div className="space-y-2">
                {bookings.map((b) => (
                  <div key={b.id} className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50/40 px-4 py-3">
                    <div>
                      <p className="font-medium text-stone-800 text-sm">
                        {formatDate(b.data_inicio)} → {formatDate(b.data_fim)}
                      </p>
                      <p className="text-xs text-stone-500 mt-0.5">Reserva confirmada</p>
                    </div>
                    <span className="badge bg-emerald-50 text-emerald-700 border-emerald-200">Reservado</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
