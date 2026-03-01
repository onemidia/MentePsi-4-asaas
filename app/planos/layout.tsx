'use client'

import { createClient } from '@/lib/client'
import { ReactNode, useEffect, useState } from "react"
import Link from "next/link"

export default function PlanosLayout({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession()
      setSession(data.session)
      setLoading(false)
    }
    getSession()
  }, [])

  if (loading) return <div className="min-h-screen bg-slate-50" />

  // Se NÃO houver sessão (Visitante / Aba Anônima)
  if (!session) {
    return (
      <div className="flex flex-col min-h-screen bg-white">
        <header className="border-b bg-white py-4 px-6 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-2">
            <div className="bg-teal-600 p-1.5 rounded-lg text-white font-bold text-xl">M</div>
            <span className="text-xl font-bold text-slate-900 tracking-tight">MentePsi</span>
          </div>
          <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-teal-600">
            Entrar
          </Link>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    )
  }

  // Se estiver logado, apenas mostra os planos (a sidebar já deve estar no layout pai)
  return <>{children}</>
}