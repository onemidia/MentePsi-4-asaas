'use client'

import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Loader2 } from "lucide-react"
import { createClient } from '@/lib/client'
import { useToast } from "@/hooks/use-toast"

interface NewPatientModalProps {
  onSuccess?: () => void
}

export function NewPatientModal({ onSuccess }: NewPatientModalProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    cpf: '',
    profession: '',
    emergency_contact: '',
    observations: '',
    session_value: '',
    status: 'Ativo'
  })

  // Máscaras
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    
    if (value.includes('+')) {
      value = value.replace(/[^\d+ \-()]/g, '');
      setFormData({ ...formData, phone: value.slice(0, 25) });
    } else {
      value = value.replace(/\D/g, ''); 
      value = value.replace(/^(\d{2})(\d)/g, '($1) $2'); 
      value = value.replace(/(\d)(\d{4})$/, '$1-$2'); 
      setFormData({ ...formData, phone: value.slice(0, 15) });
    }
  }

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '')
    value = value.replace(/(\d{3})(\d)/, '$1.$2')
    value = value.replace(/(\d{3})(\d)/, '$1.$2')
    value = value.replace(/(\d{3})(\d{1,2})/, '$1-$2')
    setFormData({ ...formData, cpf: value.slice(0, 14) })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()

    // 🔐 GARANTE USUÁRIO LOGADO
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      toast({
        variant: "destructive",
        title: "Erro de autenticação",
        description: "Usuário não autenticado."
      })
      setLoading(false)
      return
    }

    // 🔒 TRAVA DE PLANO: Validação de Assinatura Ativa
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('status, current_period_end')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const now = new Date()
    const expirationDate = subscription?.current_period_end ? new Date(subscription.current_period_end) : null
    const hasActivePlan = subscription?.status === 'active'
    const isTrialValid = subscription?.status === 'trialing' && expirationDate && expirationDate > now

    if (!hasActivePlan && !isTrialValid) {
      toast({ variant: "destructive", title: "Acesso Bloqueado", description: "Sua assinatura ou período de teste expirou. Regularize seu plano para continuar cadastrando pacientes." })
      setLoading(false)
      return
    }

    // 📦 PAYLOAD MULTI-TENANT SEGURO
    const payload = {
      ...formData,
      psychologist_id: user.id, // ⭐ ESSENCIAL PARA RLS
      session_value:
        formData.session_value === ''
          ? null
          : Number(formData.session_value)
    }

    const { error } = await supabase
      .from('patients')
      .insert([payload])

    if (error) {
      console.error("Erro detalhado:", error)

      toast({
        variant: "destructive",
        title: "Erro ao criar paciente",
        description: error.message
      })
    } else {
      toast({
        title: "Paciente criado!",
        description: `${formData.full_name} foi adicionado com sucesso.`
      })

      setOpen(false)
      // Garante a atualização da lista na tela pai (ex: fetchPatients)
      if (onSuccess) onSuccess()

      setFormData({
        full_name: '',
        email: '',
        phone: '',
        cpf: '',
        address: '',
        profession: '',
        emergency_contact: '',
        observations: '',
        session_value: '',
        status: 'Ativo'
      })
    }

    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 text-white shadow-sm">
          <Plus className="mr-2 h-4 w-4" /> Novo Paciente
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto bg-white !opacity-100 shadow-2xl border border-slate-200">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-slate-800">Cadastrar Novo Paciente</DialogTitle>
          <DialogDescription>
            Preencha os dados completos para o prontuário.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 py-4 w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            <div className="space-y-2 col-span-1 sm:col-span-2">
              <Label className="font-bold text-slate-700">Nome Completo *</Label>
              <Input
                required
                value={formData.full_name}
                onChange={e => setFormData({...formData, full_name: e.target.value})}
                className="bg-white border-slate-300 focus:bg-white focus:ring-2 focus:ring-teal-500/20"
                placeholder="Ex: João Silva"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-bold text-slate-700">CPF</Label>
              <Input
                placeholder="000.000.000-00"
                value={formData.cpf}
                onChange={handleCPFChange}
                className="bg-white border-slate-300 focus:bg-white focus:ring-2 focus:ring-teal-500/20"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-bold text-slate-700">Telefone / WhatsApp</Label>
              <Input
                placeholder="(00) 00000-0000 ou +1..."
                value={formData.phone}
                onChange={handlePhoneChange}
                className="bg-white border-slate-300 focus:bg-white focus:ring-2 focus:ring-teal-500/20"
              />
            </div>

            <div className="space-y-2 col-span-1 sm:col-span-2">
              <Label className="font-bold text-slate-700">Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="bg-white border-slate-300 focus:bg-white focus:ring-2 focus:ring-teal-500/20"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-bold text-slate-700">Profissão</Label>
              <Input
                value={formData.profession}
                onChange={e => setFormData({...formData, profession: e.target.value})}
                className="bg-white border-slate-300 focus:bg-white focus:ring-2 focus:ring-teal-500/20"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-bold text-slate-700">Contato de Emergência</Label>
              <Input
                placeholder="Nome e Telefone"
                value={formData.emergency_contact}
                onChange={e => setFormData({...formData, emergency_contact: e.target.value})}
                className="bg-white border-slate-300 focus:bg-white focus:ring-2 focus:ring-teal-500/20"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-bold text-slate-700">Valor da Sessão (R$)</Label>
              <Input
                type="number"
                placeholder="150,00"
                value={formData.session_value}
                onChange={e => setFormData({...formData, session_value: e.target.value})}
                className="bg-white border-slate-300 focus:bg-white font-semibold text-teal-700 focus:ring-2 focus:ring-teal-500/20"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-bold text-slate-700">Status inicial</Label>
              <Select
                value={formData.status}
                onValueChange={(val) => setFormData({...formData, status: val})}
              >
                <SelectTrigger className="bg-white border-slate-300">
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 shadow-xl z-[9999]">
                  <SelectItem value="Ativo">Ativo</SelectItem>
                  <SelectItem value="Inativo">Inativo</SelectItem>
                  <SelectItem value="Alta">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 col-span-1 sm:col-span-2">
              <Label className="font-bold text-slate-700">Observações Iniciais</Label>
              <Textarea
                value={formData.observations}
                onChange={e => setFormData({...formData, observations: e.target.value})}
                className="bg-white border-slate-300 focus:bg-white focus:ring-2 focus:ring-teal-500/20"
              />
            </div>

          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="h-12 rounded-xl border-slate-300">
              Cancelar
            </Button>

            <Button type="submit" disabled={loading} className="bg-teal-600 hover:bg-teal-700 text-white font-black px-8 h-12 rounded-xl shadow-lg shadow-teal-100">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Cadastro
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
