import { supabase } from '@/lib/supabase';

interface CreatePaymentIntentParams {
  bookingId: string;
}

interface CreatePaymentIntentResult {
  clientSecret: string;
}

export async function createPaymentIntent(
  params: CreatePaymentIntentParams
): Promise<CreatePaymentIntentResult> {
  const { data, error } = await supabase.functions.invoke<CreatePaymentIntentResult>(
    'create-payment-intent',
    { body: params }
  );

  if (error || !data?.clientSecret) {
    throw new Error(error?.message ?? 'Falha ao iniciar pagamento');
  }

  return data;
}
