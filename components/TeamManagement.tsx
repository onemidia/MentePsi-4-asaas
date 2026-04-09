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
  const [assistantEmail, setAssistantEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()
  const { toast } = useToast()

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.id) {
        // Funcionalidade de equipe temporariamente desativada
        // const { data, error } = await supabase
        //   .from('clinic_team')
        //   .select('id, member_email, role, active, created_at')
        //   .eq('owner_id', user.id)
        // if (error) { console.warn(error) }
        
        setMembers([])
      }
    } catch (e) {
      console.warn("Aviso interno na gestão de equipe:", e)
    } finally {
      setLoading(false)
    }
  }, [supabase, toast])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  const handleSendInvite = async () => {
    if (!assistantEmail) return

    try {
      const { data: { user } } = await supabase.auth.getUser()

      const res = await fetch("/api/invite-assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: assistantEmail,
          ownerId: user?.id
        })
      })

      const result = await res.json()

      if (!res.ok) {
        alert(result.error)
        return
      }

      alert("Convite enviado!")
      setAssistantEmail("")

    } catch (err) {
      console.error(err)
      alert("Erro ao enviar convite")
    }
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
            <Input id="email" type="email" placeholder="email@exemplo.com" value={assistantEmail} onChange={(e) => setAssistantEmail(e.target.value)} />
          </div>
          <Button onClick={handleSendInvite} disabled={saving} className="w-full sm:w-auto text-white hover:brightness-90 transition-all font-bold border-0 h-10 px-6 rounded-xl" style={{ backgroundColor: 'var(--primary-color)' }}>
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