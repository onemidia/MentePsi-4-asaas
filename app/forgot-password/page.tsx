'use client'
import { useState } from 'react'
import { createClient } from '@/lib/client'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, ArrowLeft } from "lucide-react"
import Link from 'next/link'
import { useToast } from "@/hooks/use-toast"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSent, setIsSent] = useState(false)
  const supabase = createClient()
  const { toast } = useToast()

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true)
    const redirectUrl = process.env.NODE_ENV === 'production' 
      ? 'https://www.mentepsi.com.br/reset-password'
      : 'http://localhost:3000/reset-password';

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    })

    if (!error) {
      setIsSent(true) // Isso deve ativar uma mensagem fixa na tela
      toast({ title: "Link enviado com sucesso!" })
    } else {
      toast({ variant: "destructive", title: "Erro", description: error.message })
    }
    setLoading(false)
  }

  if (isSent) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center p-6 border-teal-200 bg-teal-50 shadow-xl">
          <CardHeader>
            <CardTitle className="text-teal-800">Verifique seu e-mail</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-teal-700 mb-4">
              Enviamos um link de redefinição para <strong>{email}</strong>. 
              Verifique sua caixa de entrada e lixo eletrônico.
            </p>
            <Button onClick={() => setIsSent(false)} variant="link" className="text-teal-600">Tentar outro e-mail</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-0">
        <CardHeader><CardTitle className="text-xl text-center">Recuperar Senha</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleReset} className="space-y-4">
            <Input type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
            <Button className="w-full bg-teal-600" type="submit" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : "Enviar link"}
            </Button>
            <Link href="/login" className="flex items-center justify-center gap-2 text-sm text-slate-500"><ArrowLeft size={16}/> Voltar</Link>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}