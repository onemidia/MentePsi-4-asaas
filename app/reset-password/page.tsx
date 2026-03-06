'use client'

import { useState } from 'react'
import { createClient } from '@/lib/client'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Lock, Eye, EyeOff } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      toast({ variant: "destructive", title: "Erro", description: "As senhas não coincidem." })
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.updateUser({
      password: password
    })

    if (error) {
      toast({ variant: "destructive", title: "Erro ao atualizar", description: error.message })
    } else {
      toast({ title: "Sucesso!", description: "Sua senha foi redefinida. Você será redirecionado." })
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md border-none shadow-2xl">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto bg-teal-100 p-3 rounded-full w-fit mb-2 text-teal-600">
            <Lock size={24} />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">Nova Senha</CardTitle>
          <p className="text-slate-500 text-sm">Digite sua nova senha de acesso abaixo.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Nova Senha</label>
              <div className="relative">
                <Input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="No mínimo 6 caracteres" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Confirmar Nova Senha</label>
              <Input 
                type="password" 
                placeholder="Repita a nova senha" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <Button className="w-full bg-teal-600 hover:bg-teal-700 font-bold h-11" disabled={loading}>
              {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "Redefinir Senha"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}