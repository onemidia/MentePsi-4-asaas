'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/client'
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, UserPlus, Trash2 } from 'lucide-react'

interface TeamMember {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
}

export function TeamManagement() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [formData, setFormData] = useState({ email: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()
  const { toast } = useToast()

  const fetchMembers = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data, error } = await supabase
        .from('clinic_team')
        .select('*')
        .eq('owner_id', user.id)

      if (error) {
        toast({ variant: 'destructive', title: 'Erro ao carregar equipe', description: error.message })
      } else if (data) {
        setMembers(data)
      }
    }
    setLoading(false)
  }, [supabase, toast])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  const handleSendInvite = async () => {
    if (!formData.email) {
      toast({ variant: 'destructive', title: 'E-mail é obrigatório' })
      return
    }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      toast({ variant: 'destructive', title: 'Sessão expirada.' })
      setSaving(false)
      return
    }

    // 🚀 CORREÇÃO CIRÚRGICA DE COLUNAS:
    const { error } = await supabase
      .from('clinic_team')
      .insert({
        owner_id: user.id,
        member_email: formData.email,
        active: true, // Mudar de 'status' para 'active' e de texto para true
        can_manage_calendar: true,
        can_edit_appointments: true
      })

    if (error) {
      console.error("Erro Supabase:", error)
      toast({ 
        variant: "destructive", 
        title: "Erro ao salvar no banco", 
        description: `Verifique se a coluna 'member_email' existe. Erro: ${error.message}` 
      })
    } else {
      toast({ title: "Assistente adicionado!", description: `${formData.email} agora faz parte da sua equipe.` })
      setFormData({ email: '' })
      await fetchMembers()
    }
    setSaving(false)
  }

  const handleDeleteMember = async (memberId: string) => {
    if (!window.confirm("Tem certeza que deseja remover este membro da equipe?")) return

    setSaving(true)
    const { error } = await supabase.from('clinic_team').delete().eq('id', memberId)
    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao remover membro', description: error.message })
    } else {
      toast({ title: 'Membro removido com sucesso!' })
      await fetchMembers()
    }
    setSaving(false)
  }

  return (
    <Card className="border-slate-200 shadow-md bg-white">
      <CardHeader>
        <CardTitle>Gestão de Equipe</CardTitle>
        <CardDescription>Convide assistentes para ajudar a gerenciar sua clínica.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-2 items-end p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div className="w-full space-y-1.5">
            <Label htmlFor="email">E-mail do Assistente</Label>
            <Input id="email" type="email" placeholder="email@exemplo.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="border-slate-300" />
          </div>
          <Button onClick={handleSendInvite} disabled={saving} className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 text-white">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
            Enviar Convite
          </Button>
        </div>

        <div className="space-y-2">
          <h4 className="font-semibold text-slate-800">Membros da Equipe</h4>
          {loading ? <Loader2 className="animate-spin text-slate-400" /> : members.length === 0 ? (
            <p className="text-sm text-slate-500 italic">Nenhum membro na equipe ainda.</p>
          ) : (
            members.map(member => (
              <div key={member.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-sm font-medium text-slate-700">{member.email}</p>
                <Button onClick={() => handleDeleteMember(member.id)} disabled={saving} variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50"><Trash2 size={14} /></Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}