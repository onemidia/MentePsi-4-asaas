'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function SuccessPage() {
  const router = useRouter()

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/dashboard')
    }, 5000)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen bg-green-50">
      <div className="bg-white p-8 rounded-xl shadow-md text-center">
        <h1 className="text-2xl font-bold text-green-600">
          🎉 Pagamento confirmado!
        </h1>

        <p className="mt-4 text-gray-600">
          Sua assinatura foi ativada com sucesso.
        </p>

        <p className="mt-2 text-gray-500 text-sm">
          Você será redirecionado para o painel em alguns segundos...
        </p>

        <button
          onClick={() => router.push('/dashboard')}
          className="mt-6 px-4 py-2 bg-green-600 text-white rounded-lg"
        >
          Ir para o painel
        </button>
      </div>
    </div>
  )
}