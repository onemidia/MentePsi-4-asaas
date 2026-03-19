'use client'

import { useState } from 'react'
import { createClient } from '@/lib/client'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, ShieldCheck, Mail, ArrowRight, CheckCircle2 } from "lucide-react"
import Link from 'next/link'
import { useToast } from "@/hooks/use-toast"

export default function RegistroPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nome, setNome] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false) // 🎉 Novo estado para controle de sucesso
  
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()

  // --- REGISTRO COM E-MAIL E SENHA ---
  const handleRegistro = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // 1. Busca configuração de dias de trial
      const { data: planData } = await supabase
        .from('saas_plans')
        .select('trial_days')
        .eq('slug', 'professional')
        .single()
      
      const trialDays = planData?.trial_days || 30

      // 2. Cria o usuário no Supabase Auth
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
        // 3. Cria a assinatura TRIAL
        const trialEnd = new Date()
        trialEnd.setDate(trialEnd.getDate() + trialDays)

        await supabase.from('subscriptions').insert({
          user_id: data.user.id,
          status: 'trialing',
          current_period_end: trialEnd.toISOString(),
          plan_id: null 
        })

        // 🚀 O SEGREDO: Em vez de redirecionar, avisamos para checar o e-mail!
        setIsSubmitted(true) 
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro ao criar conta', description: error.message })
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { prompt: 'select_account' },
        },
      })
      if (error) throw error
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro Google', description: err.message })
      setGoogleLoading(false)
    }
  }

  // --- TELA DE SUCESSO (EXIBIDA APÓS O REGISTRO) ---
  if (isSubmitted) {
    return (
      <div className="fixed inset-0 z-[999] bg-slate-50 w-screen h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="flex flex-col items-center gap-3 mb-4">
            <div className="bg-teal-600 p-2.5 rounded-xl text-white font-bold text-3xl shadow-lg shadow-teal-200">M</div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">MentePsi 2.0</h2>
          </div>

          <Card className="shadow-2xl border-0 ring-1 ring-slate-200 overflow-hidden">
            <div className="h-1.5 bg-teal-600 w-full" />
            <CardContent className="pt-10 pb-10 px-8">
              <div className="bg-teal-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Mail className="text-teal-600 w-10 h-10 animate-bounce" />
              </div>
              
              <h2 className="text-2xl font-black text-slate-800 mb-2">Verifique seu e-mail!</h2>
              <p className="text-slate-600 mb-6">
                Enviamos um link de ativação para:<br/>
                <strong className="text-teal-700">{email}</strong>
              </p>

              <div className="bg-slate-50 rounded-xl p-4 text-left text-sm text-slate-500 mb-8 border border-slate-100">
                <p className="flex items-start gap-2 italic">
                  <CheckCircle2 size={16} className="text-teal-500 mt-0.5 shrink-0" />
                  Caso não encontre, verifique a pasta de <strong>Spam</strong> ou Promoções.
                </p>
              </div>

              <Button 
                onClick={() => router.push('/auth/login')}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white h-12 rounded-xl font-bold flex items-center justify-center gap-2"
              >
                Ir para o Login <ArrowRight size={18} />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // --- RENDERIZAÇÃO NORMAL DO FORMULÁRIO ---
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
          <CardHeader className="pb-4 text-center">
            <CardTitle className="text-xl text-slate-800 font-bold">Inicie sua jornada grátis</CardTitle>
            <p className="text-slate-500 text-sm">
              Você terá <strong>30 dias de acesso total</strong> às ferramentas de IA e Fichas Digitais.
            </p>
          </CardHeader>
          <CardContent>
            
            <Button 
              variant="outline" 
              type="button" 
              className="w-full bg-white hover:bg-slate-50 text-slate-900 border-slate-200 shadow-sm font-medium h-12 transition-all flex items-center justify-center gap-2 active:scale-95 rounded-xl"
              onClick={handleGoogleLogin}
              disabled={googleLoading || loading}
            >
              {googleLoading ? (
                <Loader2 className="animate-spin h-5 w-5 text-slate-400" />
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-5.38z" fill="#EA4335"/>
                </svg>
              )}
              Registrar com Google
            </Button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-400 font-medium">Ou preencha seus dados</span>
              </div>
            </div>

            <form onSubmit={handleRegistro} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 ml-1">Nome Completo</label>
                <Input 
                  placeholder="Seu nome" 
                  value={nome} 
                  onChange={e => setNome(e.target.value)} 
                  required 
                  disabled={loading || googleLoading}
                  className="h-12 border-slate-200 focus:ring-teal-500 rounded-xl" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 ml-1">E-mail Profissional</label>
                <Input 
                  type="email" 
                  placeholder="nome@exemplo.com" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  required 
                  disabled={loading || googleLoading}
                  className="h-12 border-slate-200 focus:ring-teal-500 rounded-xl" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 ml-1">Crie uma Senha</label>
                <Input 
                  type="password" 
                  placeholder="Mínimo 6 caracteres" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  required 
                  disabled={loading || googleLoading}
                  className="h-12 border-slate-200 focus:ring-teal-500 rounded-xl" 
                />
              </div>
              
              <Button 
                className="w-full bg-teal-600 hover:bg-teal-700 text-white h-14 text-lg font-black transition-all shadow-lg shadow-teal-100 mt-6 rounded-xl active:scale-95" 
                type="submit" 
                disabled={loading || googleLoading}
              >
                {loading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : "Criar Minha Conta Grátis"}
              </Button>
            </form>

            <div className="mt-8 text-center border-t border-slate-100 pt-6">
              <p className="text-sm text-slate-600">
                Já possui uma conta?{' '}
                <Link href="/auth/login" className="text-teal-600 font-black hover:underline transition-colors">
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