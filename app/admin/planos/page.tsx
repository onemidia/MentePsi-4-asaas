'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/client'
import { 
  Star, 
  Save, 
  Loader2, 
  CheckCircle2, 
  Settings2,
  Sparkles,
  ShieldCheck
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"

export default function AdminPlanosPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [plan, setPlan] = useState<any>(null)
  const [gracePeriod, setGracePeriod] = useState<number>(0)
  const [configId, setConfigId] = useState<any>(null)
  const supabase = createClient()
  const { toast } = useToast()

  const fetchData = async () => {
    setLoading(true)
    // Buscamos apenas o plano profissional, que é o nosso plano único agora
    const [planRes, configRes] = await Promise.all([
      supabase.from('saas_plans').select('*').eq('slug', 'professional').single(),
      supabase.from('saas_config').select('id, grace_period_days').limit(1).maybeSingle()
    ])

    const data = planRes.data

    if (data) {
      setPlan(data)
    } else {
      // Seed caso não exista o slug profissional
      setPlan({ 
        slug: 'professional', 
        name: 'Plano Profissional MentePsi', 
        price_monthly: 59.90, 
        trial_days: 30 
      })
    }

    if (configRes.data) {
      setGracePeriod(configRes.data.grace_period_days || 0)
      setConfigId(configRes.data.id)
    }

    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const handleSave = async () => {
    setSaving(true)
    
    const { error: planError } = await supabase
      .from('saas_plans')
      .upsert(plan, { onConflict: 'slug' })

    const configPayload = configId ? { id: configId, grace_period_days: gracePeriod } : { grace_period_days: gracePeriod }
    
    const { error: configError } = await supabase
      .from('saas_config')
      .upsert(configPayload)

    if (!planError && !configError) {
      toast({ title: "Configurações Atualizadas!", description: "Oferta e carência foram salvas." })
    } else {
      toast({ variant: "destructive", title: "Erro ao salvar", description: planError?.message || configError?.message })
    }
    setSaving(false)
  }

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-teal-600 h-8 w-8" /></div>

  return (
    <div className="p-8 space-y-8 bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-2xl border shadow-sm gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Sparkles className="text-teal-600" /> Oferta do Plano Único
          </h1>
          <p className="text-slate-500 font-medium">Configure as condições comerciais da assinatura profissional.</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-teal-600 hover:bg-teal-700 h-12 px-10 font-black text-white shadow-lg shadow-teal-100 uppercase tracking-wider active:scale-95 transition-all">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Atualizar Oferta
        </Button>
      </div>

      <div className="max-w-2xl mx-auto">
        <Card className="border-none shadow-xl overflow-hidden">
          <CardHeader className="bg-slate-900 text-white p-8">
            <div className="flex justify-between items-center mb-4">
              <Badge className="bg-teal-500 text-white border-none font-bold px-4 py-1">PRODUTO ATIVO</Badge>
              <Star className="text-amber-400 fill-amber-400" />
            </div>
            <CardTitle className="text-2xl font-black mb-2">
              <Input 
                className="bg-transparent border-none text-2xl font-black p-0 focus-visible:ring-0 h-auto" 
                value={plan.name}
                onChange={(e) => setPlan({...plan, name: e.target.value})}
              />
            </CardTitle>
            <CardDescription className="text-slate-400 font-medium">
              Este é o único plano disponível para novos assinantes.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="p-8 space-y-8 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-3">
                <Label className="text-xs font-black text-slate-500 uppercase tracking-widest">Preço da Assinatura</Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">R$</span>
                  <Input 
                    type="number"
                    className="pl-12 h-14 font-black text-2xl bg-slate-50 border-slate-200 rounded-xl"
                    value={plan.price_monthly}
                    onChange={(e) => setPlan({...plan, price_monthly: Math.max(0, parseFloat(e.target.value) || 0)})}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-xs font-black text-slate-500 uppercase tracking-widest">Dias de Trial Grátis</Label>
                <Input 
                  type="number"
                  className="h-14 font-black text-2xl bg-slate-50 border-slate-200 rounded-xl"
                  value={plan.trial_days}
                  onChange={(e) => setPlan({...plan, trial_days: parseInt(e.target.value)})}
                />
              </div>

              <div className="space-y-3">
                <Label className="text-xs font-black text-slate-500 uppercase tracking-widest">Dias de Carência (Pós-vencimento)</Label>
                <Input 
                  type="number"
                  className="h-14 font-black text-2xl bg-slate-50 border-slate-200 rounded-xl"
                  value={gracePeriod}
                  onChange={(e) => setGracePeriod(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-teal-50 border border-teal-100 flex items-start gap-4">
              <ShieldCheck className="text-teal-600 h-6 w-6 shrink-0 mt-1" />
              <div>
                <p className="text-teal-900 font-bold">Visualização do Cliente</p>
                <p className="text-teal-700 text-sm font-medium">
                  Os psicólogos verão: <span className="underline">{plan.name}</span> por <span className="underline">R$ {plan.price_monthly}/mês</span> com <span className="underline">{plan.trial_days} dias grátis</span> para testar.
                </p>
                <p className="text-teal-600 text-xs mt-2 italic border-t border-teal-200/50 pt-2">
                  * Nota Admin: O sistema permitirá o acesso por {gracePeriod} dias após o vencimento da fatura.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="max-w-2xl mx-auto flex items-center justify-center gap-2 text-slate-400 text-sm font-medium italic">
        <CheckCircle2 size={16} />
        Ao salvar, todos os novos registros herdarão estas configurações automaticamente.
      </div>
    </div>
  )
}