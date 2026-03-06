import "server-only";

import { PaymentResponse } from "mercadopago/dist/clients/payment/commonTypes";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function handleMercadoPagoPayment(paymentData: PaymentResponse) {
  const metadata = paymentData.metadata;
  const userEmail = metadata.user_email; // Os metadados do Mercado Pago são convertidos para snake_case
  const userId = metadata.user_id; // Os metadados do Mercado Pago são convertidos para snake_case

  if (userId) {
    await supabaseAdmin.from('professional_profile').update({ subscription_status: 'active' }).eq('id', userId);
  }

  return;
}
