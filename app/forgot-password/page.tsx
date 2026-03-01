'use client'

import { useState } from "react"
import { createClient } from "@/lib/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // CIRURGIA: Alterado de /auth/callback para /callback
    // Isso deve bater com o arquivo que você moveu para app/callback/route.ts
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/callback?next=/reset-password`,
    })

    if (error) {
      toast({ variant: "destructive", title: "Erro", description: error.message })
    } else {
      toast({ 
        title: "E-mail enviado!", 
        description: "Verifique sua caixa de entrada. Use o link mais recente enviado." 
      })
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md border-none shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <div className="bg-teal-600 w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold mx-auto mb-4 shadow-md">M</div>
          <CardTitle className="text-2xl font-bold text-slate-900">Recuperar Senha</CardTitle>
          <p className="text-slate-500 text-sm">Digite seu e-mail para receber o link de redefinição.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">E-mail cadastrado</label>
              <Input 
                type="email" 
                placeholder="seu-email@exemplo.com" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
              />
            </div>
            <Button className="w-full bg-teal-600 hover:bg-teal-700 font-bold h-11 transition-all" disabled={loading}>
              {loading ? "Enviando link..." : "Enviar Link de Recuperação"}
            </Button>
            <div className="text-center pt-2">
              <Link href="/login" className="text-sm text-slate-500 hover:text-teal-600 font-medium transition-colors">
                ← Voltar para o Login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}