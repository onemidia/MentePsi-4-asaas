'use client'

import { Loader2 } from "lucide-react";

/**
 * Esta página pode ser usada no futuro para exibir um resumo do pedido
 * ou uma tela de "processando pagamento". Por enquanto, ela será simples
 * para corrigir o erro de build.
 */
export default function CheckoutPage() {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center space-y-4 bg-slate-50">
      <Loader2 className="h-12 w-12 animate-spin text-teal-600" />
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-800">Processando...</h1>
        <p className="text-slate-500">Aguarde, estamos preparando seu ambiente.</p>
      </div>
    </div>
  );
}