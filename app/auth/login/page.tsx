'use client'

import { useState } from 'react'
import { createClient } from '@/lib/client'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import Link from 'next/link'
import { useToast } from "@/hooks/use-toast"

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()

  // --- LOGIN COM E-MAIL E SENHA ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        toast({ variant: 'destructive', title: 'Erro', description: "Erro ao entrar: " + authError.message })
        return
      }

      if (user) {
        // LÓGICA DE REDIRECIONAMENTO POR ROLE
        const adminEmails = ['alvino@onemidia.tv.br', 'mentepsiclinic@gmail.com', 'onemidiamarketing@gmail.com'];
        const isSuperAdmin = adminEmails.includes(user.email?.toLowerCase() || '');

        // Se não for super admin, verifica a role no perfil
        const { data: profile } = await supabase
          .from('professional_profile')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();
        
        const isRoleAdmin = profile?.role === 'admin';

        if (isSuperAdmin || isRoleAdmin) {
          // Se for admin, redireciona para o Hub
          router.push('/auth/hub');
        } else {
          // Caso contrário, para o dashboard padrão
          router.push('/dashboard');
        }
        router.refresh();
      }
      
    } catch (err) {
      console.error("Erro inesperado no login:", err)
      toast({ variant: 'destructive', title: 'Erro', description: "Ocorreu um erro inesperado. Tente novamente." })
    } finally {
      setLoading(false)
    }
  }

  // --- LOGIN COM GOOGLE ---
  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            prompt: 'select_account',
          },
        },
      })

      if (error) throw error
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro Google', description: err.message })
      setGoogleLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[999] bg-slate-50 w-screen h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="bg-teal-600 p-2.5 rounded-xl text-white font-bold text-3xl shadow-lg">M</div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">MentePsi</h2>
        </div>

        <Card className="shadow-2xl border-0">
          <CardHeader>
            <CardTitle className="text-xl text-center text-slate-800">Bem-vindo de volta</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Botão Google */}
            <Button 
              variant="outline" 
              type="button" 
              className="w-full bg-white hover:bg-slate-50 text-slate-900 border-slate-200 shadow-sm font-medium h-11 transition-all flex items-center justify-center gap-2 active:scale-95"
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
              Entrar com Google
            </Button>

            {/* Divisor */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-400">Ou use seu e-mail</span>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">E-mail</label>
                <Input 
                  type="email" 
                  placeholder="seu@email.com" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  required 
                  disabled={loading || googleLoading}
                />
              </div>
              
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-700">Senha</label>
                  <Link 
                    href="/forgot-password" 
                    className="text-xs font-medium text-teal-600 hover:text-teal-700 hover:underline transition-colors"
                  >
                    Esqueceu a senha?
                  </Link>
                </div>
                <Input 
                  type="password" 
                  placeholder="Sua senha" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  required 
                  disabled={loading || googleLoading}
                />
              </div>
              
              <Button 
                className="w-full bg-teal-600 hover:bg-teal-700 text-white h-11 font-bold mt-2 transition-all active:scale-95" 
                type="submit" 
                disabled={loading || googleLoading}
              >
                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "Entrar no Sistema"}
              </Button>
            </form>

            <div className="mt-8 text-center border-t pt-6">
              <p className="text-sm text-slate-600">
                Ainda não tem conta?{' '}
                <Link href="/auth/registro" className="text-teal-600 font-bold hover:underline">
                  Cadastre-se grátis
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}