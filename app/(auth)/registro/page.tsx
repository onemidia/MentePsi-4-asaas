'use client'

import { useState } from 'react'
import { createClient } from '@/lib/client'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, ShieldCheck } from "lucide-react"
import Link from 'next/link'

export default function RegistroPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nome, setNome] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleRegistro = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // 1. Criar o usuário no Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { 
          data: { 
            full_name: nome,
            email: email
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        }
      })

      if (error) throw error

      if (data?.user) {
        // 2. Definimos a data de término do trial (30 dias a partir de agora)
        const trialEnds = new Date()
        trialEnds.setDate(trialEnds.getDate() + 30)

        // 3. ATUALIZAÇÃO PARA PLANO ÚNICO PROFISSIONAL
        // Adicionamos um pequeno retry ou delay se necessário, mas o .eq('id') costuma ser rápido
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ 
            plan_type: 'profissional',
            subscription_status: 'trialing',
            trial_ends_at: trialEnds.toISOString(), // CRUCIAL para a trava funcionar
            email: email 
          })
          .eq('id', data.user.id)

        if (updateError) {
          console.error("Erro ao atualizar perfil:", updateError.message)
        }

        // 4. Redireciona para o Dashboard
        router.push('/dashboard')
        router.refresh()
      }
    } catch (error: any) {
      alert("Erro ao criar conta: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[999] bg-slate-50 w-screen h-screen flex items-center justify-center overflow-y-auto p-4">
      <div className="w-full max-w-md">
        
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="bg-teal-600 p-2.5 rounded-xl text-white font-bold text-3xl shadow-lg shadow-teal-200">M</div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">MentePsi 2.0</h2>
          <div className="flex items-center gap-1.5 text-xs font-bold text-teal-600 bg-teal-50 px-3 py-1 rounded-full uppercase tracking-wider">
            <ShieldCheck size={14} /> Acesso Profissional Liberado
          </div>
        </div>

        <Card className="shadow-2xl border-0 ring-1 ring-slate-200 overflow-hidden">
          <div className="h-1.5 bg-teal-600 w-full" />
          <CardHeader className="pb-4">
            <CardTitle className="text-xl text-center text-slate-800 font-bold">Inicie sua jornada grátis</CardTitle>
            <p className="text-center text-slate-500 text-sm">
              Você terá <strong>30 dias de acesso total</strong> às ferramentas de IA, Fichas Digitais e muito mais.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegistro} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 ml-1">Nome Completo</label>
                <Input placeholder="Seu nome" value={nome} onChange={e => setNome(e.target.value)} required className="h-12 border-slate-200 focus:ring-teal-500 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 ml-1">E-mail Profissional</label>
                <Input type="email" placeholder="nome@exemplo.com" value={email} onChange={e => setEmail(e.target.value)} required className="h-12 border-slate-200 focus:ring-teal-500 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 ml-1">Crie uma Senha</label>
                <Input type="password" placeholder="Mínimo 6 caracteres" value={password} onChange={e => setPassword(e.target.value)} required className="h-12 border-slate-200 focus:ring-teal-500 rounded-xl" />
              </div>
              
              <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white h-14 text-lg font-black transition-all shadow-lg shadow-teal-100 mt-6 rounded-xl" type="submit" disabled={loading}>
                {loading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : "Criar Minha Conta Grátis"}
              </Button>
            </form>

            <div className="mt-8 text-center border-t border-slate-100 pt-6">
              <p className="text-sm text-slate-600">
                Já possui uma conta?{' '}
                <Link href="/login" className="text-teal-600 font-black hover:underline transition-colors">
                  Entrar agora
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
        
        <p className="text-center text-[10px] text-slate-400 mt-6 uppercase tracking-widest font-medium">
          🔒 Seus dados estão protegidos por criptografia de ponta a ponta.
        </p>
      </div>
    </div>
  )
}