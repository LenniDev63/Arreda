import { useState } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Loader2 } from 'lucide-react';

interface CheckoutFormProps {
  onSuccess: () => void;
}

export function CheckoutForm({ onSuccess }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/#/reserva/sucesso`,
      },
      redirect: 'if_required',
    });

    if (error) {
      setErrorMessage(error.message ?? 'Erro ao processar pagamento');
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {errorMessage && (
        <p className="text-sm text-red-600">{errorMessage}</p>
      )}
      <button
        type="submit"
        disabled={!stripe || isSubmitting}
        className="btn-secondary w-full py-3 disabled:opacity-50"
      >
        {isSubmitting ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Processando...</>
        ) : (
          'Confirmar pagamento'
        )}
      </button>
    </form>
  );
}
