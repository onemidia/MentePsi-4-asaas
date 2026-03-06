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
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()

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
        // Atualiza apenas o last_login, deixando a verificação de planos para o Middleware/Dashboard
        await supabase
          .from('professional_profile')
          .upsert({ user_id: user.id, last_login: new Date().toISOString() })

        // 🚀 A MÁGICA ESTÁ AQUI:
        // Em vez de forçar /dashboard, mandamos para a raiz '/'
        // O Middleware vai interceptar essa batida na raiz, 
        // verá que você é Admin e te jogará para o /hub automaticamente.
        router.push('/')
        router.refresh()
      }
      
    } catch (err) {
      console.error("Erro inesperado no login:", err)
      toast({ variant: 'destructive', title: 'Erro', description: "Ocorreu um erro inesperado. Tente novamente." })
    } finally {
      setLoading(false)
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
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">E-mail</label>
                <Input 
                  type="email" 
                  placeholder="seu@email.com" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  required 
                />
              </div>
              
              <div className="space-y-1.5">
                {/* AJUSTE AQUI: Container flex para o label e o link de esqueci a senha */}
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
                />
              </div>
              
              <Button 
                className="w-full bg-teal-600 hover:bg-teal-700 text-white h-11 font-bold mt-2 transition-all active:scale-95" 
                type="submit" 
                disabled={loading}
              >
                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "Entrar no Sistema"}
              </Button>
            </form>

            <div className="mt-8 text-center border-t pt-6">
              <p className="text-sm text-slate-600">
                Ainda não tem conta?{' '}
                <Link href="/registro" className="text-teal-600 font-bold hover:underline">
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