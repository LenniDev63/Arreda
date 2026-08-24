import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  MapPin, Bed, Bath, Users, Star, ArrowLeft, Check, ShieldCheck,
  Calendar as CalIcon, Home as HomeIcon, ChevronLeft, ChevronRight, X, MessageSquare,
  AlertCircle, Loader2, CheckCircle2,
} from 'lucide-react';
import { fetchProperty, fetchAvailability } from '@/lib/queries';
import type { PropertyWithRelations, AvailabilityBlock } from '@/lib/types';
import { AMENITIES, RENTAL_TYPES, formatCurrency, rentalTypeLabel, formatDate } from '@/lib/constants';
import { AmenityIcon } from '@/components/AmenityIcon';
import { StarRating } from '@/components/StarRating';
import { AvailabilityCalendar } from '@/components/AvailabilityCalendar';
import { FavoriteButton } from '@/components/FavoriteButton';
import { useAuth } from '@/context/AuthContext';
import { calculateSmartTotal, isRangeAvailable, toDateInputValue } from '@/lib/booking';
import { supabase } from '@/lib/supabase';

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [property, setProperty] = useState<PropertyWithRelations | null>(null);
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);

  // States para seleção de reserva no calendário
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([fetchProperty(id), fetchAvailability(id)])
      .then(([p, b]) => {
        if (!p) setError('Imóvel não encontrado.');
        else { setProperty(p); setBlocks(b); }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="container-app py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-stone-200 rounded w-1/3" />
          <div className="aspect-[16/9] bg-stone-200 rounded-2xl" />
          <div className="h-6 bg-stone-200 rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="container-app py-20 text-center">
        <HomeIcon className="mx-auto h-12 w-12 text-stone-300" />
        <p className="mt-3 text-stone-600">{error ?? 'Imóvel não encontrado.'}</p>
        <Link to="/buscar" className="btn-primary mt-4">Voltar à busca</Link>
      </div>
    );
  }

  const photos = (property.photos ?? []).sort((a, b) => a.ordem - b.ordem);
  const cover = photos[0]?.url ?? 'https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?auto=compress&cs=tinysrgb&w=1200';
  const pricing = property.pricing ?? [];
  const reviews = property.reviews ?? [];
  const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.nota, 0) / reviews.length : null;
  const amenities = property.amenities ?? [];
  const cheapest = pricing.length > 0
    ? pricing.reduce((min, p) => (Number(p.preco) < Number(min.preco) ? p : min))
    : null;

  const isOwner = profile?.id === property.owner_id;

  // Lógica de 2 cliques e validação no calendário
  function handleSelectDate(date: Date) {
    setDateError(null);
    if (!startDate || (startDate && endDate)) {
      setStartDate(date);
      setEndDate(null);
    } else if (date > startDate) {
      if (isRangeAvailable(startDate, date, blocks)) {
        setEndDate(date);
      } else {
        setDateError('Existe um conflito de disponibilidade com datas reservadas dentro do intervalo selecionado!');
        setStartDate(date);
        setEndDate(null);
      }
    } else {
      setStartDate(date);
      setEndDate(null);
    }
  }

  // Cálculo automático do valor total
  const calculation = startDate && endDate ? calculateSmartTotal(startDate, endDate, pricing) : null;

  // Submeter a reserva diretamente na página
  async function handleReserveSubmit() {
    if (!profile) {
      navigate('/login');
      return;
    }
    if (isOwner) return;

    if (!startDate || !endDate) {
      setDateError('Selecione a data de entrada e saída no calendário.');
      return;
    }

    if (!calculation || calculation.totalAmount <= 0) {
      setDateError(calculation?.error ?? 'Não foi possível calcular o valor da reserva.');
      return;
    }

    setSubmittingBooking(true);
    setDateError(null);

    try {
      const { error: bErr } = await supabase
        .from('bookings')
        .insert({
          property_id: property.id,
          client_id: profile.id,
          tipo_locacao: calculation.primaryTipo,
          data_inicio: toDateInputValue(startDate),
          data_fim: toDateInputValue(endDate),
          valor_total: calculation.totalAmount,
          status: 'pendente',
        });

      if (bErr) {
        if (bErr.code === '23P01' || bErr.message.includes('overlapping') || bErr.message.includes('no_overlapping_bookings')) {
          throw new Error('Conflito de disponibilidade: Este período já foi reservado por outro cliente.');
        }
        throw bErr;
      }

      setBookingSuccess(true);
      // Atualiza a lista de datas bloqueadas no calendário
      fetchAvailability(property.id).then(setBlocks);
    } catch (e) {
      setDateError((e as Error).message);
    } finally {
      setSubmittingBooking(false);
    }
  }

  return (
    <div className="container-app py-6">
      <Link to="/buscar" className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-emerald-700 mb-4">
        <ArrowLeft className="h-4 w-4" /> Voltar à busca
      </Link>

      <div className="grid lg:grid-cols-[1fr_380px] gap-8">
        {/* MAIN CONTENT */}
        <div>
          {/* Title */}
          <div className="mb-4">
            <h1 className="text-2xl md:text-3xl font-bold text-stone-900">{property.titulo}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-stone-600">
              <span className="flex items-center gap-1"><MapPin className="h-4 w-4 text-emerald-600" /> {property.bairro}, {property.cidade}</span>
              {avgRating && (
                <span className="flex items-center gap-1 font-medium text-stone-800">
                  <Star className="h-4 w-4 fill-orange-400 text-orange-400" /> {avgRating.toFixed(1)}
                  <span className="text-stone-400 font-normal">({reviews.length})</span>
                </span>
              )}
              {isOwner && property.status === 'rascunho' && (
                <span className="badge bg-amber-50 text-amber-700 border-amber-200">Rascunho — não visível publicamente</span>
              )}
            </div>
          </div>

          {/* Gallery */}
          <div className="mb-6">
            <div className="relative grid grid-cols-4 gap-2 rounded-2xl overflow-hidden">
              <div className="absolute top-3 right-3 z-10">
                <FavoriteButton propertyId={property.id} />
              </div>
              <button
                onClick={() => setGalleryIndex(0)}
                className="col-span-4 md:col-span-2 row-span-2 aspect-[16/10] md:aspect-auto overflow-hidden bg-stone-100 group"
              >
                <img src={cover} alt={property.titulo} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
              </button>
              {photos.slice(1, 5).map((ph, i) => (
                <button
                  key={ph.id}
                  onClick={() => setGalleryIndex(i + 1)}
                  className="hidden md:block aspect-square overflow-hidden bg-stone-100 group relative"
                >
                  <img src={ph.url} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  {i === 3 && photos.length > 5 && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-medium text-sm">
                      +{photos.length - 5} fotos
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Quick stats */}
          <div className="card p-5 mb-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <Bed className="mx-auto h-6 w-6 text-emerald-600" />
                <p className="mt-1 font-semibold text-stone-800">{property.quartos}</p>
                <p className="text-xs text-stone-500">quarto{property.quartos !== 1 ? 's' : ''}</p>
              </div>
              <div>
                <Bath className="mx-auto h-6 w-6 text-emerald-600" />
                <p className="mt-1 font-semibold text-stone-800">{property.banheiros}</p>
                <p className="text-xs text-stone-500">banheiro{property.banheiros !== 1 ? 's' : ''}</p>
              </div>
              <div>
                <Users className="mx-auto h-6 w-6 text-emerald-600" />
                <p className="mt-1 font-semibold text-stone-800">{property.capacidade}</p>
                <p className="text-xs text-stone-500">hóspedes</p>
              </div>
            </div>
          </div>

          {/* Description */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-stone-900 mb-3">Sobre o imóvel</h2>
            <p className="text-stone-600 leading-relaxed whitespace-pre-line">{property.descricao || 'Sem descrição informada.'}</p>
          </section>

          {/* Amenities */}
          {amenities.length > 0 && (
            <section className="mb-8">
              <h2 className="text-xl font-bold text-stone-900 mb-3">Comodidades</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {amenities.map((a) => {
                  const def = AMENITIES.find((am) => am.id === a.amenity_name) ?? AMENITIES.find((am) => am.label === a.amenity_name);
                  return (
                    <div key={a.id} className="flex items-center gap-2.5 rounded-xl border border-stone-100 bg-white px-3 py-2.5">
                      <AmenityIcon name={def?.icon ?? 'Check'} className="h-5 w-5 text-emerald-600" />
                      <span className="text-sm text-stone-700">{def?.label ?? a.amenity_name}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Pricing */}
          {pricing.length > 0 && (
            <section className="mb-8">
              <h2 className="text-xl font-bold text-stone-900 mb-3">Opções de locação</h2>
              <div className="grid sm:grid-cols-3 gap-3">
                {pricing.map((p) => (
                  <div key={p.id} className="card p-4">
                    <p className="text-sm text-stone-500">{rentalTypeLabel(p.tipo)}</p>
                    <p className="mt-1 text-2xl font-bold text-emerald-700">{formatCurrency(p.preco)}</p>
                    <p className="text-xs text-stone-400">
                      /{p.tipo === 'diaria' ? 'noite' : p.tipo === 'semanal' ? 'semana' : 'mês'}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Rules */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-stone-900 mb-3">Regras da casa</h2>
            <div className="card p-5">
              <p className="text-stone-600 whitespace-pre-line">{property.regras || 'Sem regras específicas informadas.'}</p>
            </div>
          </section>

          {/* Cancellation policy */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-stone-900 mb-3">Política de cancelamento</h2>
            <div className="card p-5 flex gap-3">
              <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-sm text-stone-600">{property.politica_cancelamento}</p>
            </div>
          </section>

          {/* Reviews */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-stone-900 mb-3 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-emerald-600" /> Avaliações ({reviews.length})
            </h2>
            {reviews.length === 0 ? (
              <div className="card p-6 text-center text-sm text-stone-500">
                Ainda não há avaliações para este imóvel.
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map((r) => (
                  <div key={r.id} className="card p-4">
                    <div className="flex items-center justify-between">
                      <StarRating value={r.nota} size={16} />
                      <span className="text-xs text-stone-400">
                        {new Date(r.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    {r.comentario && <p className="mt-2 text-sm text-stone-600">{r.comentario}</p>}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* SIDEBAR — Booking card & calendar */}
        <aside>
          <div className="lg:sticky lg:top-20 space-y-4">
            <div className="card p-5 shadow-card">
              {cheapest && (
                <div className="mb-4">
                  <span className="text-xs text-stone-500">a partir de</span>
                  <p className="text-3xl font-bold text-emerald-700">
                    {formatCurrency(cheapest.preco)}
                    <span className="text-sm font-normal text-stone-400">
                      /{cheapest.tipo === 'diaria' ? 'noite' : cheapest.tipo === 'semanal' ? 'semana' : 'mês'}
                    </span>
                  </p>
                </div>
              )}

              {/* Calendário interativo de datas */}
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-stone-800 mb-2 flex items-center gap-1.5">
                  <CalIcon className="h-4 w-4 text-emerald-600" /> Selecione o período
                </h3>
                <AvailabilityCalendar
                  blocks={blocks}
                  startDate={startDate}
                  endDate={endDate}
                  onSelectDate={handleSelectDate}
                />
              </div>

              {/* Datas selecionadas */}
              <div className="grid grid-cols-2 gap-2 text-xs mb-3 p-2.5 bg-stone-50 rounded-xl border border-stone-100">
                <div>
                  <span className="text-stone-400 block">Entrada</span>
                  <span className="font-semibold text-stone-700">
                    {startDate ? formatDate(startDate) : 'Clique no dia'}
                  </span>
                </div>
                <div>
                  <span className="text-stone-400 block">Saída</span>
                  <span className="font-semibold text-stone-700">
                    {endDate ? formatDate(endDate) : 'Clique na saída'}
                  </span>
                </div>
              </div>

              {/* Erro de conflito */}
              {dateError && (
                <div className="mb-3 rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700 flex items-start gap-1.5">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>{dateError}</div>
                </div>
              )}

              {/* Sucesso na reserva */}
              {bookingSuccess && (
                <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-center space-y-2">
                  <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />
                  <h4 className="font-bold text-stone-900 text-sm">Reserva solicitada!</h4>
                  <p className="text-xs text-stone-600">
                    Sua solicitação foi enviada ao proprietário.
                  </p>
                  <Link to="/painel/cliente/reservas" className="btn-primary w-full text-xs py-2 block">
                    Ver minhas reservas
                  </Link>
                </div>
              )}

              {/* Detalhamento do preço */}
              {calculation && calculation.totalAmount > 0 && !bookingSuccess && (
                <div className="space-y-2 py-3 border-t border-stone-100 text-sm mb-3">
                  {calculation.breakdown.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-stone-600 text-xs">
                      <span>{item.label}</span>
                      <span className="font-medium text-stone-800">{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                  <div className="pt-2 flex justify-between items-baseline border-t border-stone-100">
                    <span className="font-semibold text-stone-800">Total</span>
                    <span className="text-xl font-bold text-emerald-700">{formatCurrency(calculation.totalAmount)}</span>
                  </div>
                </div>
              )}

              {!bookingSuccess && (
                isOwner ? (
                  <Link to={`/imovel/${property.id}/editar`} className="btn-outline w-full">
                    Editar meu imóvel
                  </Link>
                ) : (
                  <button
                    onClick={handleReserveSubmit}
                    disabled={submittingBooking || !startDate || !endDate || pricing.length === 0}
                    className="btn-primary w-full py-3 disabled:opacity-50"
                  >
                    {submittingBooking ? (
                      <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                    ) : (
                      <>
                        <CalIcon className="h-4 w-4" /> Solicitar reserva
                      </>
                    )}
                  </button>
                )
              )}

              <div className="mt-3 flex items-center gap-2 text-xs text-stone-500">
                <Check className="h-4 w-4 text-emerald-600" /> Confirmação enviada ao proprietário
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Lightbox */}
      {galleryIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setGalleryIndex(null)}
        >
          <button className="absolute top-4 right-4 text-white/80 hover:text-white" onClick={() => setGalleryIndex(null)}>
            <X className="h-8 w-8" />
          </button>
          <button
            className="absolute left-4 text-white/80 hover:text-white p-2"
            onClick={(e) => { e.stopPropagation(); setGalleryIndex((i) => (i! - 1 + photos.length) % photos.length); }}
          >
            <ChevronLeft className="h-8 w-8" />
          </button>
          <img
            src={photos[galleryIndex]?.url ?? cover}
            alt=""
            className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="absolute right-4 text-white/80 hover:text-white p-2"
            onClick={(e) => { e.stopPropagation(); setGalleryIndex((i) => (i! + 1) % photos.length); }}
          >
            <ChevronRight className="h-8 w-8" />
          </button>
          <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm">
            {galleryIndex + 1} / {photos.length}
          </span>
        </div>
      )}
    </div>
  );
}
