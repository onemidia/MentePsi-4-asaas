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
  const supabase = createClient()
  const { toast } = useToast()

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    // 🚀 O SEGREDO: Mandamos para o callback avisando que o próximo passo é o reset-password
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })

    if (error) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message })
    } else {
      toast({ title: 'E-mail enviado!', description: 'Verifique sua caixa de entrada.' })
    }
    setLoading(false)
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