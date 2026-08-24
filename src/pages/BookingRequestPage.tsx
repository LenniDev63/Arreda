import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Loader2, Calendar as CalIcon, Check, AlertCircle,
  ShieldCheck, Home as HomeIcon, MapPin, Bed, Bath, Users,
} from 'lucide-react';
import { fetchProperty, fetchAvailability } from '@/lib/queries';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { PropertyWithRelations, AvailabilityBlock } from '@/lib/types';
import { RENTAL_TYPES, formatCurrency } from '@/lib/constants';
import { AvailabilityCalendar } from '@/components/AvailabilityCalendar';
import { calculateSmartTotal, isRangeAvailable, parseDateInput, toDateInputValue } from '@/lib/booking';

export default function BookingRequestPage() {
  const { propertyId } = useParams<{ propertyId: string }>();
  const { profile } = useAuth();

  const [property, setProperty] = useState<PropertyWithRelations | null>(null);
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>([]);
  const [loading, setLoading] = useState(true);

  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  useEffect(() => {
    if (!propertyId) return;
    Promise.all([fetchProperty(propertyId), fetchAvailability(propertyId)])
      .then(([p, b]) => {
        setProperty(p);
        setBlocks(b);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [propertyId]);

  const pricing = property?.pricing ?? [];
  const calculation = startDate && endDate ? calculateSmartTotal(startDate, endDate, pricing) : null;
  const rangeAvailable = startDate && endDate ? isRangeAvailable(startDate, endDate, blocks) : true;

  function handleSelectDate(date: Date) {
    if (!startDate || (startDate && endDate)) {
      setStartDate(date);
      setEndDate(null);
    } else if (date > startDate) {
      if (isRangeAvailable(startDate, date, blocks)) {
        setEndDate(date);
      } else {
        setError('Existem datas indisponíveis no período selecionado. Escolha outro intervalo.');
        setStartDate(date);
        setEndDate(null);
      }
    } else {
      setStartDate(date);
      setEndDate(null);
    }
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!property || !profile || !startDate || !endDate) {
      setError('Selecione o período da reserva.');
      return;
    }
    if (!rangeAvailable) {
      setError('O período selecionado não está disponível.');
      return;
    }
    if (!calculation || calculation.totalAmount <= 0) {
      setError(calculation?.error ?? 'Não foi possível calcular o valor. Verifique os preços do imóvel.');
      return;
    }

    setSubmitting(true);
    try {
      const { data: booking, error: bErr } = await supabase
        .from('bookings')
        .insert({
          property_id: property.id,
          client_id: profile.id,
          tipo_locacao: calculation.primaryTipo,
          data_inicio: toDateInputValue(startDate),
          data_fim: toDateInputValue(endDate),
          valor_total: calculation.totalAmount,
          status: 'pendente',
        })
        .select()
        .single();
      if (bErr) {
        if (bErr.code === '23P01' || bErr.message.includes('overlapping')) {
          throw new Error('Overbooking: Outro usuário já reservou este período.');
        }
        throw bErr;
      }
      setSuccessId(booking.id);
    } catch (e) {
      setError((e as Error).message);
    }
    setSubmitting(false);
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-emerald-600" /></div>;
  }
  if (!property) {
    return (
      <div className="container-app py-20 text-center">
        <HomeIcon className="mx-auto h-12 w-12 text-stone-300" />
        <p className="mt-3 text-stone-600">Imóvel não encontrado.</p>
        <Link to="/buscar" className="btn-primary mt-4">Buscar imóveis</Link>
      </div>
    );
  }

  if (successId) {
    return (
      <div className="container-app py-16 max-w-lg">
        <div className="card p-8 text-center animate-slide-up">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <Check className="h-8 w-8 text-emerald-600" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-stone-900">Reserva solicitada!</h1>
          <p className="mt-2 text-stone-600">
            Sua solicitação foi enviada ao proprietário. Após a aprovação, você poderá
            efetuar o pagamento e confirmar a reserva.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/painel/cliente/reservas" className="btn-primary">Ver minhas reservas</Link>
            <Link to="/buscar" className="btn-outline">Continuar explorando</Link>
          </div>
        </div>
      </div>
    );
  }

  const photos = (property.photos ?? []).sort((a, b) => a.ordem - b.ordem);
  const cover = photos[0]?.url ?? 'https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?auto=compress&cs=tinysrgb&w=600';

  return (
    <div className="container-app py-6 max-w-5xl">
      <Link to={`/imovel/${property.id}`} className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-emerald-700 mb-4">
        <ArrowLeft className="h-4 w-4" /> Voltar ao imóvel
      </Link>
      <h1 className="text-2xl font-bold text-stone-900 mb-6">Solicitar reserva</h1>

      <form onSubmit={handleSubmit} className="grid lg:grid-cols-[1fr_360px] gap-8">
        <div className="space-y-6">
          <div className="card p-4 flex gap-4">
            <img src={cover} alt="" className="h-20 w-28 rounded-xl object-cover shrink-0" />
            <div className="min-w-0">
              <h2 className="font-semibold text-stone-900 line-clamp-1">{property.titulo}</h2>
              <p className="text-sm text-stone-500 flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{property.bairro}, {property.cidade}</p>
              <div className="mt-1.5 flex gap-3 text-xs text-stone-500">
                <span className="flex items-center gap-1"><Bed className="h-3.5 w-3.5" />{property.quartos}</span>
                <span className="flex items-center gap-1"><Bath className="h-3.5 w-3.5" />{property.banheiros}</span>
                <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{property.capacidade}</span>
              </div>
            </div>
          </div>

          <section>
            <h3 className="font-semibold text-stone-800 mb-3 flex items-center gap-2"><CalIcon className="h-5 w-5 text-emerald-600" /> Selecione as datas</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Check-in</label>
                <input
                  type="date"
                  min={toDateInputValue(new Date())}
                  value={startDate ? toDateInputValue(startDate) : ''}
                  onChange={(e) => { setStartDate(parseDateInput(e.target.value)); setEndDate(null); }}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Check-out</label>
                <input
                  type="date"
                  min={startDate ? toDateInputValue(new Date(startDate.getTime() + 86400000)) : toDateInputValue(new Date())}
                  value={endDate ? toDateInputValue(endDate) : ''}
                  onChange={(e) => setEndDate(parseDateInput(e.target.value))}
                  className="input"
                />
              </div>
            </div>
            <div className="mt-4">
              <AvailabilityCalendar blocks={blocks} startDate={startDate} endDate={endDate} onSelectDate={handleSelectDate} />
            </div>
            {startDate && endDate && !rangeAvailable && (
              <p className="mt-2 text-sm text-red-600 flex items-center gap-1"><AlertCircle className="h-4 w-4" /> Período indisponível. Selecione outro intervalo.</p>
            )}
          </section>
        </div>

        <aside>
          <div className="lg:sticky lg:top-20 card p-5 shadow-card">
            <h3 className="font-semibold text-stone-800 mb-4">Resumo</h3>

            {startDate && endDate && (
              <div className="mb-3 rounded-xl bg-stone-50 p-3 text-sm text-stone-600 space-y-1">
                <p><span className="text-stone-400">Check-in:</span> {startDate.toLocaleDateString('pt-BR')}</p>
                <p><span className="text-stone-400">Check-out:</span> {endDate.toLocaleDateString('pt-BR')}</p>
                <p><span className="text-stone-400">Noites:</span> {calculation?.nights}</p>
              </div>
            )}

            {calculation && calculation.breakdown.length > 0 && (
              <div className="space-y-2 border-t border-stone-100 pt-3 text-sm mb-3">
                {calculation.breakdown.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-stone-600 text-xs">
                    <span>{item.label}</span>
                    <span className="font-medium text-stone-800">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-stone-100 flex justify-between items-baseline">
              <span className="font-semibold text-stone-800">Total</span>
              <span className="text-2xl font-bold text-emerald-700">{formatCurrency(calculation?.totalAmount ?? 0)}</span>
            </div>

            {error && (
              <div className="mt-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 flex items-start gap-1.5">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !startDate || !endDate || !calculation || calculation.totalAmount <= 0 || !rangeAvailable}
              className="btn-primary w-full py-3 mt-4"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Enviar solicitação</>}
            </button>

            <p className="mt-3 flex items-center gap-1.5 text-xs text-stone-500">
              <ShieldCheck className="h-4 w-4 text-emerald-600" /> A reserva fica pendente até o proprietário aprovar
            </p>
          </div>
        </aside>
      </form>
    </div>
  );
}
