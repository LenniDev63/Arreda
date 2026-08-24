import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';

export default function BookingSuccessPage() {
  return (
    <div className="container-app py-16 max-w-lg">
      <div className="card p-8 text-center animate-slide-up">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <Check className="h-8 w-8 text-emerald-600" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-stone-900">Pagamento confirmado!</h1>
        <p className="mt-2 text-stone-600">
          Sua reserva foi paga com sucesso. Você receberá os detalhes no painel de reservas.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/painel/cliente/reservas" className="btn-primary">Ver minhas reservas</Link>
          <Link to="/buscar" className="btn-outline">Continuar explorando</Link>
        </div>
      </div>
    </div>
  );
}
