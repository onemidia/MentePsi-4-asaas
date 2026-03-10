'use client'

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from "lucide-react";

export const dynamic = 'force-dynamic';

function CheckoutContent() {
  const searchParams = useSearchParams();
  const status = searchParams.get('status');
  // Você pode usar o status para exibir mensagens diferentes (ex: sucesso, falha)
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center space-y-4 bg-slate-50">
      <Loader2 className="h-12 w-12 animate-spin text-teal-600" />
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-800">Processando Checkout...</h1>
        <p className="text-slate-500">Aguarde, estamos preparando seu ambiente.</p>
        {status && <p className="text-xs text-slate-400 mt-2">Status: {status}</p>}
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-teal-600" /></div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}