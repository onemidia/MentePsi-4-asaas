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
  member_email: string; // ✅ CORRETO: Nome da coluna no seu banco
  role: string;
  active: boolean;      // ✅ CORRETO: Tipo boolean no seu banco
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
        toast({ variant: 'destructive', title: 'Erro ao carregar', description: error.message })
      } else if (data) {
        setMembers(data as TeamMember[])
      }
    }
    setLoading(false)
  }, [supabase, toast])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  const handleSendInvite = async () => {
    if (!formData.email) return
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setSaving(false)
      return
    }

    const response = await fetch("/api/invite-assistant", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: formData.email,
        ownerId: user.id
      })
    })

    const result = await response.json()

    if (!response.ok) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: result.error
      })
    } else {
      toast({
        title: "Convite enviado",
        description: "O assistente receberá um email para criar senha."
      })

      setFormData({ email: "" })
      await fetchMembers()
    }

    setSaving(false)
  }

  const handleDeleteMember = async (memberId: string) => {
    if (!window.confirm("Remover este membro?")) return
    setSaving(true)
    const { error } = await supabase.from('clinic_team').delete().eq('id', memberId)
    if (!error) await fetchMembers()
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
            <Input id="email" type="email" placeholder="email@exemplo.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
          </div>
          <Button onClick={handleSendInvite} disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white">
            {saving ? <Loader2 className="animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
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
                {/* ✅ EXIBIÇÃO CORRIGIDA PARA member_email */}
                <p className="text-sm font-medium text-slate-700">{member.member_email}</p>
                <Button onClick={() => handleDeleteMember(member.id)} variant="ghost" size="sm" className="text-red-500"><Trash2 size={14} /></Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}