import { useCallback, useState } from 'react';
import { createPaymentIntent } from '@/services/paymentService';

interface CreatePaymentIntentParams {
  bookingId: string;
}

interface CreatePaymentIntentResult {
  clientSecret: string;
}

export function usePaymentIntent() {
  const [data, setData] = useState<CreatePaymentIntentResult | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mutate = useCallback(async (params: CreatePaymentIntentParams) => {
    setIsPending(true);
    setIsError(false);
    setErrorMessage(null);
    try {
      const result = await createPaymentIntent(params);
      setData(result);
    } catch (err) {
      setIsError(true);
      setErrorMessage((err as Error).message);
    } finally {
      setIsPending(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setIsPending(false);
    setIsError(false);
    setErrorMessage(null);
  }, []);

  return { mutate, data, isPending, isError, errorMessage, reset };
}
