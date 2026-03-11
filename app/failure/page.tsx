'use client'

import { useRouter } from 'next/navigation'

export default function FailurePage() {
  const router = useRouter()

  return (
    <div className="flex items-center justify-center min-h-screen bg-red-50">
      <div className="bg-white p-8 rounded-xl shadow-md text-center">
        <h1 className="text-2xl font-bold text-red-600">
          ❌ Pagamento não concluído
        </h1>

        <p className="mt-4 text-gray-600">
          Não conseguimos confirmar seu pagamento.
        </p>

        <p className="mt-2 text-gray-500 text-sm">
          Você pode tentar novamente.
        </p>

        <button
          onClick={() => router.push('/checkout')}
          className="mt-6 px-4 py-2 bg-red-600 text-white rounded-lg"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  )
}