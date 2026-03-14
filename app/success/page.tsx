'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react';
import { createClient } from '@/lib/client';

export default function SuccessPage() {
  const router = useRouter()

  const handleRedirect = async () => {
    const supabase = createClient();
    await supabase.auth.refreshSession();
    router.push('/dashboard');
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      handleRedirect();
    }, 5000)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 px-4">
      <div className="bg-white p-10 rounded-2xl shadow-xl text-center max-w-md w-full border border-green-100">
        {/* Ícone Animado */}
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
          <span className="text-3xl">✅</span>
        </div>

        <h1 className="text-3xl font-extrabold text-slate-900 mb-2">
          Tudo pronto!
        </h1>

        <p className="text-lg text-slate-600 mb-6">
          Sua assinatura <strong>MentePsi Pro</strong> foi ativada. Prepare-se para elevar o nível da sua clínica.
        </p>

        <div className="space-y-4">
          <button
            onClick={handleRedirect}
            className="w-full py-3 px-6 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-green-200"
          >
            Entrar no meu Consultório
          </button>
          
          <p className="text-slate-400 text-sm animate-pulse">
            Redirecionando automaticamente em instantes...
          </p>
        </div>
      </div>
    </div>
  )
}