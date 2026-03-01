'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/client'
import { Save, Loader2, MessageSquare, Settings, CreditCard, Clock } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

export default function SaasSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  const [settings, setSettings] = useState({
    whatsapp_suporte: '',
    email_contato: '',
    checkout_url: '', // Link direto para o pagamento
    trial_days: '30',  // Dias de teste padrão
  })

  useEffect(() => {
    async function fetchSettings() {
      const { data } = await supabase.from('global_settings').select('*').single()

      if (data) {
        setSettings({
          whatsapp_suporte: data.whatsapp || '',
          email_contato: data.support_email || '',
          checkout_url: data.checkout_url || '',
          trial_days: data.trial_days?.toString() || '30',
        })
      }
      setLoading(false)
    }
    fetchSettings()
  }, [supabase])

  const handleSave = async () => {
    setSaving(true)
    
    const { error: globalError } = await supabase.from('global_settings').upsert({
      id: 1,
      whatsapp: settings.whatsapp_suporte,
      support_email: settings.email_contato,
      checkout_url: settings.checkout_url,
      trial_days: parseInt(settings.trial_days)
    })

    if (!globalError) {
      toast({ title: "Sucesso!", description: "Regras do Plano Único atualizadas." })
    } else {
      toast({ variant: "destructive", title: "Erro ao salvar", description: globalError.message })
    }
    setSaving(false)
  }

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-teal-600"/></div>

  return (
    <div className="p-6 space-y-8 bg-slate-50/50 min-h-screen">
      <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
        <Settings className="h-8 w-8 text-slate-700" />
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Configurações do SaaS</h1>
          <p className="text-slate-500">Controle os parâmetros do Plano Único Profissional.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Card de Suporte */}
        <Card className="border-none shadow-md rounded-2xl overflow-hidden">
          <CardHeader className="bg-white border-b border-slate-100">
            <CardTitle className="flex items-center gap-2 text-teal-600 text-lg">
              <MessageSquare className="h-5 w-5" /> Suporte e Contato
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6 bg-white">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase">WhatsApp (Ex: 5511999999999)</Label>
              <Input 
                value={settings.whatsapp_suporte}
                onChange={(e) => setSettings({...settings, whatsapp_suporte: e.target.value})}
                className="h-11 bg-slate-50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase">E-mail de Suporte</Label>
              <Input 
                value={settings.email_contato}
                onChange={(e) => setSettings({...settings, email_contato: e.target.value})}
                className="h-11 bg-slate-50"
              />
            </div>
          </CardContent>
        </Card>

        {/* Card de Regras de Negócio - Plano Único */}
        <Card className="border-none shadow-md rounded-2xl overflow-hidden">
          <CardHeader className="bg-white border-b border-slate-100">
            <CardTitle className="flex items-center gap-2 text-blue-600 text-lg">
              <CreditCard className="h-5 w-5" /> Regras do Plano Único
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6 bg-white">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase italic">Link de Pagamento (Stripe/Asaas)</Label>
              <Input 
                placeholder="https://buy.stripe.com/..."
                value={settings.checkout_url}
                onChange={(e) => setSettings({...settings, checkout_url: e.target.value})}
                className="h-11 bg-blue-50/50 border-blue-100 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                <Clock className="h-3 w-3" /> Dias de Trial Grátis
              </Label>
              <Input 
                type="number"
                value={settings.trial_days}
                onChange={(e) => setSettings({...settings, trial_days: e.target.value})}
                className="h-11 bg-slate-50"
              />
              <p className="text-[10px] text-slate-400">Padrão do mercado: 30 dias.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end pt-4 border-t border-slate-200">
        <Button onClick={handleSave} disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white px-10 h-12 font-black rounded-xl shadow-lg transition-all shadow-teal-100">
          {saving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
          SALVAR CONFIGURAÇÕES
        </Button>
      </div>
    </div>
  )
}