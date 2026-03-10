'use client'

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createClient } from '@/lib/client';

export const dynamic = 'force-dynamic';

function CheckoutContent() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [status, setStatus] = useState('processing');
  const [errorMessage, setErrorMessage] = useState('');
  const supabase = createClient();

  useEffect(() => {
    // Debug de Parâmetros
    const params = Object.fromEntries(searchParams.entries());
    console.log('🔍 [Checkout] Search Params:', params);

    const processCheckout = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          throw new Error('Usuário não autenticado.');
        }

        // Prevenir Loop Infinito (Timeout de 10s)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        // Verificar a URL do Fetch
        const response = await fetch('/api/asaas/create-charge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            email: user.email,
            name: user.user_metadata?.full_name,
            ...params // Passa os parâmetros da URL (ex: planId)
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        // Tratar Erros de Rede
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Falha na comunicação com o servidor.');
        }

        const data = await response.json();
        console.log('✅ [Checkout] Sucesso:', data);
        setStatus('success');
        
        // Redirecionamento ou mensagem de sucesso
        if (data.invoiceUrl) {
             window.location.href = data.invoiceUrl;
        } else {
             toast({ title: 'Sucesso', description: 'Cobrança gerada com sucesso.' });
        }

      } catch (error: any) {
        console.error('❌ [Checkout] Erro:', error);
        setStatus('error');
        
        if (error.name === 'AbortError') {
          setErrorMessage('Tempo esgotado. O servidor demorou muito para responder.');
        } else {
          setErrorMessage(error.message || 'Erro desconhecido.');
        }
        
        toast({ 
          variant: 'destructive', 
          title: 'Erro no Checkout', 
          description: error.message 
        });
      }
    };

    // Executa apenas uma vez na montagem
    if (status === 'processing') {
        processCheckout();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === 'error') {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center space-y-4 bg-slate-50 p-4">
        <div className="bg-red-100 p-4 rounded-full">
          <AlertCircle className="h-8 w-8 text-red-600" />
        </div>
        <h1 className="text-xl font-bold text-slate-800">Não foi possível concluir</h1>
        <p className="text-slate-500 text-center max-w-md">{errorMessage}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  if (status === 'success') {
      return (
        <div className="flex h-screen w-screen flex-col items-center justify-center space-y-4 bg-slate-50">
            <Loader2 className="h-12 w-12 animate-spin text-teal-600" />
            <p className="text-slate-500">Redirecionando para pagamento...</p>
        </div>
      )
  }

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center space-y-4 bg-slate-50">
      <Loader2 className="h-12 w-12 animate-spin text-teal-600" />
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-800">Processando Checkout...</h1>
        <p className="text-slate-500">Aguarde, estamos preparando seu ambiente.</p>
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