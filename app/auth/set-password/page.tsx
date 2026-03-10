'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/client'
import { useRouter } from 'next/navigation'
import { Loader2, ShieldCheck, CheckCircle2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function SetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionChecked, setSessionChecked] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        // Se não tiver sessão (link inválido ou expirado), manda pro login
        router.push('/auth/login')
      } else {
        setSessionChecked(true)
      }
    }
    checkSession()
  }, [supabase, router])

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password.length < 6) {
      toast({ variant: 'destructive', title: 'Senha muito curta', description: 'A senha deve ter no mínimo 6 caracteres.' })
      return
    }
    if (password !== confirmPassword) {
      toast({ variant: 'destructive', title: 'Senhas não conferem', description: 'Por favor, digite a mesma senha nos dois campos.' })
      return
    }

    setLoading(true)

    try {
      // 1. Atualiza a senha do usuário
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error

      // 2. Ativa o assistente na tabela da equipe
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('clinic_team')
          .update({ active: true, status: 'active', accepted_at: new Date().toISOString() })
          .eq('member_user_id', user.id)
      }

      toast({ title: 'Tudo pronto!', description: 'Sua conta foi ativada com sucesso.' })
      
      // 3. Redireciona para o painel do assistente
      router.push('/dashboard/assistente')
      router.refresh()

    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: error.message })
    } finally {
      setLoading(false)
    }
  }

  if (!sessionChecked) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-teal-600" /></div>

  return (
    <div className="fixed inset-0 z-[999] bg-slate-50 w-screen h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center gap-3">
          <div className="bg-teal-600 p-3 rounded-2xl text-white shadow-lg shadow-teal-200">
            <ShieldCheck size={32} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Ativar Conta de Equipe</h2>
        </div>

        <div className="bg-white shadow-xl border border-slate-100 rounded-xl overflow-hidden">
          <div className="p-6 text-center border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-800">Defina sua Senha de Acesso</h3>
            <p className="text-slate-500 text-sm mt-1">
              Para sua segurança, crie uma senha forte para acessar o painel da clínica.
            </p>
          </div>
          <div className="p-6">
            <form onSubmit={handleSetPassword} className="space-y-4">
              <div className="space-y-2">
                <input 
                  type="password" 
                  placeholder="Nova Senha" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  required 
                  disabled={loading} 
                  className="flex h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all" 
                />
                <input 
                  type="password" 
                  placeholder="Confirmar Senha" 
                  value={confirmPassword} 
                  onChange={e => setConfirmPassword(e.target.value)} 
                  required 
                  disabled={loading} 
                  className="flex h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all" 
                />
              </div>
              
              <button 
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-bold ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-teal-600 text-slate-50 hover:bg-teal-700 h-12 w-full shadow-md hover:shadow-lg active:scale-95" 
                type="submit" 
                disabled={loading}
              >
                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : <span className="flex items-center gap-2"><CheckCircle2 size={18} /> Ativar e Entrar</span>}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}