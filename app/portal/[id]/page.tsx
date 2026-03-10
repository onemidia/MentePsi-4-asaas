"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from '@/lib/client'

export default function SetPasswordPage() {
  const supabase = createClient()
  const router = useRouter()

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    const checkSession = async () => {
      // 1. Verifica se já existe sessão ativa
      const { data } = await supabase.auth.getSession()
      if (data.session) {
        setSessionReady(true)
      }

      // 2. Escuta mudanças de auth (importante para capturar o hash da URL #access_token=...)
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, session) => {
          if (session) {
            setSessionReady(true)
          }
        }
      )

      return () => {
        subscription.unsubscribe()
      }
    }

    checkSession()
  }, [supabase])

  const handleSetPassword = async () => {
    setError(null)

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.")
      return
    }

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.")
      return
    }

    setLoading(true)

    // Atualiza a senha do usuário logado (via token do convite)
    const { error } = await supabase.auth.updateUser({
      password
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Ativa o assistente na tabela clinic_team
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { error: updateError } = await supabase
        .from("clinic_team")
        .update({
          status: "active",
          active: true,
          accepted_at: new Date().toISOString()
        })
        .eq("member_user_id", user.id)

      if (updateError) console.error("Erro ao ativar assistente:", updateError)
    }

    alert("Senha criada com sucesso!")
    router.push("/dashboard")
  }

  if (!sessionReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
           <p className="text-slate-500 font-medium">Validando convite...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg space-y-6">
        <h1 className="text-2xl font-bold text-center text-slate-900">Criar sua senha</h1>
        <p className="text-sm text-slate-500 text-center">Defina uma senha segura para acessar o sistema.</p>

        <div className="space-y-4">
          <input type="password" placeholder="Nova senha" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-teal-500 outline-none" />
          <input type="password" placeholder="Confirmar senha" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-teal-500 outline-none" />
        </div>

        {error && <p className="text-red-500 text-sm text-center bg-red-50 p-2 rounded">{error}</p>}

        <button onClick={handleSetPassword} disabled={loading} className="w-full bg-teal-600 text-white py-3 rounded-lg font-bold hover:bg-teal-700 transition-colors disabled:opacity-70">
          {loading ? "Salvando..." : "Finalizar Cadastro"}
        </button>
      </div>
    </div>
  )
}