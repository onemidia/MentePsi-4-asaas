'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/client'
import { Loader2, AlertCircle, CreditCard, ShieldCheck } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function CheckoutPage() {
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [cpf, setCpf] = useState('')
  const [user, setUser] = useState<any>(null)
  const [planDetails, setPlanDetails] = useState<any>(null)
  
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const planIdentifier = searchParams.get('plan')

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          router.push(`/login?next=/checkout?plan=${planIdentifier}`)
          return
        }
        setUser(user)

        if (!planIdentifier) {
          setError("Plano não especificado.")
          setLoading(false)
          return
        }

        // Busca flexível: Tenta por UUID, depois por slug.
        let planData = null;
        const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(planIdentifier);

        if (isUUID) {
          const { data } = await supabase.from('plans').select('*').eq('id', planIdentifier).single();
          planData = data;
        }

        if (!planData) {
          const { data } = await supabase.from('plans').select('*').eq('slug', planIdentifier).single();
          planData = data;
        }
        
        if (!planData) {
          console.error(`Plano não encontrado com o identificador: ${planIdentifier}`);
          throw new Error('Erro ao carregar informações do plano. Por favor, tente novamente.')
        }
        
        setPlanDetails({ name: planData.name, price: planData.price || 49.99 })

        // Busca CPF do perfil
        const { data: profile } = await supabase
          .from('profiles')
          .select('cpf')
          .eq('id', user.id)
          .single()

        if (profile?.cpf) {
          setCpf(profile.cpf)
        }
        
        setLoading(false)

      } catch (err: any) {
        setError(err.message)
        setLoading(false)
      }
    }

    init()
  }, [planIdentifier, router, supabase])

  const handlePayment = async () => {
    const cleanCpf = cpf.replace(/\D/g, '')
    if (cleanCpf.length < 11) {
      toast({ variant: "destructive", title: "CPF Obrigatório", description: "Informe um CPF válido para emitir a cobrança." })
      return
    }

    setProcessing(true)
    try {
      // 1. Atualiza CPF no perfil se mudou ou não existia
      await supabase.from('profiles').update({ cpf }).eq('id', user.id)

      // 2. Chama API de Checkout
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planName: planDetails.name,
          price: planDetails.price,
          userId: user.id,
          userEmail: user.email,
          cpf: cpf
        })
      })

      const data = await response.json()

      if (data.error) throw new Error(data.error)

      if (data.invoiceUrl) {
        window.location.href = data.invoiceUrl
      } else {
        throw new Error("Link de pagamento não gerado.")
      }

    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro no processamento", description: err.message })
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700 flex items-center gap-2">
              <AlertCircle /> Erro
            </CardTitle>
            <CardDescription className="text-red-600">{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/planos')} variant="outline" className="w-full border-red-200 text-red-700 hover:bg-red-100">
              Voltar para Planos
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Finalizar Assinatura</h1>
          <p className="text-slate-500">Confirme seus dados para liberar o acesso completo.</p>
        </div>

        <Card className="border-slate-200 shadow-lg">
          <CardHeader className="bg-slate-50/50 border-b pb-4">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-lg text-slate-800">Plano {planDetails?.name}</CardTitle>
                <CardDescription>Cobrança mensal recorrente</CardDescription>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-teal-600">R$ {planDetails?.price?.toFixed(2).replace('.', ',')}</div>
                <div className="text-xs text-slate-400">/mês</div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cpf">CPF / CNPJ (Para Nota Fiscal)</Label>
              <Input 
                id="cpf" 
                placeholder="000.000.000-00" 
                value={cpf}
                onChange={(e) => {
                  let v = e.target.value.replace(/\D/g, '')
                  if (v.length > 14) v = v.slice(0, 14)
                  // Máscara simples visual
                  if (v.length <= 11) {
                    v = v.replace(/(\d{3})(\d)/, '$1.$2')
                    v = v.replace(/(\d{3})(\d)/, '$1.$2')
                    v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2')
                  } else {
                    v = v.replace(/^(\d{2})(\d)/, '$1.$2')
                    v = v.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
                    v = v.replace(/\.(\d{3})(\d)/, '.$1/$2')
                    v = v.replace(/(\d{4})(\d)/, '$1-$2')
                  }
                  setCpf(v)
                }}
              />
              <p className="text-xs text-slate-500">Necessário para emissão de boleto/pix registrado no Asaas.</p>
            </div>

            <div className="bg-blue-50 p-3 rounded-lg flex gap-3 items-start">
              <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">
                Você será redirecionado para o ambiente seguro do Asaas para escolher entre <strong>Pix, Boleto ou Cartão de Crédito</strong>.
              </p>
            </div>
          </CardContent>
          <CardFooter className="pt-2 pb-6">
            <Button className="w-full h-12 text-lg bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-md" onClick={handlePayment} disabled={processing || cpf.replace(/\D/g, '').length < 11}>
              {processing ? <Loader2 className="animate-spin mr-2" /> : <CreditCard className="mr-2 h-5 w-5" />}
              Ir para Pagamento
            </Button>
          </CardFooter>
        </Card>
        
        <Button variant="ghost" className="w-full text-slate-400 hover:text-slate-600" onClick={() => router.back()}>
          Cancelar e Voltar
        </Button>
      </div>
    </div>
  )
}