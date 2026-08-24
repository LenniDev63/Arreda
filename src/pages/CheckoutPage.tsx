import { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertCircle, MapPin } from 'lucide-react';
import { usePaymentIntent } from '@/hooks/usePaymentIntent';
import { CheckoutForm } from '@/components/CheckoutForm';
import { fetchClientBookings } from '@/lib/queries';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency, formatDate, rentalTypeLabel } from '@/lib/constants';
import type { BookingWithRelations } from '@/lib/types';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string);

export default function CheckoutPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { mutate, data, isPending, isError, errorMessage } = usePaymentIntent();
  const [booking, setBooking] = useState<BookingWithRelations | null>(null);
  const [loadingBooking, setLoadingBooking] = useState(true);
  const [bookingError, setBookingError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile || !bookingId) return;
    fetchClientBookings(profile.id)
      .then((bookings) => {
        const found = bookings.find((b) => b.id === bookingId);
        if (!found) {
          setBookingError('Reserva não encontrada.');
          return;
        }
        if (found.status !== 'aguardando_pagamento') {
          setBookingError('Esta reserva não está aguardando pagamento.');
          return;
        }
        setBooking(found);
        mutate({ bookingId });
      })
      .catch((e) => setBookingError((e as Error).message))
      .finally(() => setLoadingBooking(false));
  }, [profile, bookingId, mutate]);

  if (loadingBooking || isPending) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (bookingError || !booking) {
    return (
      <div className="container-app py-16 max-w-lg text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
        <p className="mt-3 text-stone-600">{bookingError ?? 'Reserva inválida.'}</p>
        <Link to="/painel/cliente/reservas" className="btn-primary mt-4">Voltar às reservas</Link>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container-app py-16 max-w-lg text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
        <p className="mt-3 text-stone-600">{errorMessage ?? 'Não foi possível iniciar o pagamento.'}</p>
        <Link to="/painel/cliente/reservas" className="btn-primary mt-4">Voltar às reservas</Link>
      </div>
    );
  }

  if (!data?.clientSecret) return null;

  const prop = booking.property;
  const cover = (prop?.photos ?? [])[0]?.url ?? 'https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?auto=compress&cs=tinysrgb&w=600';

  return (
    <div className="container-app py-6 max-w-lg">
      <Link to="/painel/cliente/reservas" className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-emerald-700 mb-4">
        <ArrowLeft className="h-4 w-4" /> Voltar às reservas
      </Link>

      <h1 className="text-2xl font-bold text-stone-900 mb-6">Pagamento da reserva</h1>

      <div className="card p-4 mb-6 flex gap-4">
        <img src={cover} alt="" className="h-20 w-28 rounded-xl object-cover shrink-0" />
        <div className="min-w-0">
          <h2 className="font-semibold text-stone-900 line-clamp-1">{prop?.titulo ?? 'Imóvel'}</h2>
          <p className="text-sm text-stone-500 flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />{prop?.bairro}, {prop?.cidade}
          </p>
          <p className="mt-1 text-xs text-stone-500">
            {formatDate(booking.data_inicio)} → {formatDate(booking.data_fim)} · {rentalTypeLabel(booking.tipo_locacao)}
          </p>
          <p className="mt-1 text-lg font-bold text-emerald-700">{formatCurrency(booking.valor_total)}</p>
        </div>
      </div>

      <div className="card p-5">
        <Elements stripe={stripePromise} options={{ clientSecret: data.clientSecret }}>
          <CheckoutForm onSuccess={() => navigate('/reserva/sucesso')} />
        </Elements>
      </div>
    </div>
  );
}
