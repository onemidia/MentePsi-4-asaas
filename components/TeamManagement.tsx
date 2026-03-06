// c:\mentepsi-v4-ASA\components\TeamManagement.tsx
'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/client'
import { useToast } from "@/hooks/use-toast"
import { 
  Users, UserPlus, Shield, CheckCircle2, 
  Loader2, Trash2, Mail, AlertCircle 
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

export function TeamManagement() {
  const [team, setTeam] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [inviting, setInviting] = useState(false)
  const [inviteData, setInviteData] = useState({ name: '', email: '' })
  
  const { toast } = useToast()
  const supabase = createClient()

  const fetchTeam = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('clinic_team')
      .select('*')
      .eq('psychologist_id', user.id)
      .order('created_at', { ascending: false })

    if (data) setTeam(data)
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchTeam()
  }, [fetchTeam])

  const handleInvite = async () => {
    if (!inviteData.name || !inviteData.email) {
      toast({ variant: "destructive", title: "Campos obrigatórios", description: "Preencha nome e e-mail." })
      return
    }

    if (team.some(m => m.email === inviteData.email)) {
      toast({ variant: "destructive", title: "Duplicidade", description: "Este e-mail já faz parte da equipe." })
      return
    }

    setInviting(true)
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      // Cria o registro na tabela de equipe
      const { data, error } = await supabase.from('clinic_team').insert({
        psychologist_id: user.id,
        name: inviteData.name,
        email: inviteData.email,
        // Permissões padrão (apenas agenda e pacientes por segurança inicial)
        perm_patients: true,
        perm_agenda: true,
        perm_manage_schedule: true,
        perm_financial: false,
        perm_evolutions: false,
        perm_documents: false,
        perm_emotions: false,
        status: 'active'
      }).select().single()

      if (error) {
        toast({ variant: "destructive", title: "Erro ao convidar", description: error.message })
      } else {
        setTeam(prev => [data, ...prev])
        setInviteData({ name: '', email: '' })
        toast({ title: "Assistente adicionado!", description: "O acesso foi liberado para este e-mail." })
      }
    }
    setInviting(false)
  }

  const handleTogglePermission = async (memberId: string, field: string, currentValue: boolean) => {
    // Otimistic UI Update (Atualiza na tela antes do banco)
    setTeam(prev => prev.map(m => m.id === memberId ? { ...m, [field]: !currentValue } : m))

    const { error } = await supabase
      .from('clinic_team')
      .update({ [field]: !currentValue })
      .eq('id', memberId)

    if (error) {
      toast({ variant: "destructive", title: "Erro ao atualizar permissão", description: error.message })
      // Reverte se der erro
      setTeam(prev => prev.map(m => m.id === memberId ? { ...m, [field]: currentValue } : m))
    }
  }

  const handleRemoveMember = async (id: string) => {
    if (!confirm("Tem certeza que deseja remover este membro da equipe?")) return

    const { error } = await supabase.from('clinic_team').delete().eq('id', id)
    if (!error) {
      setTeam(prev => prev.filter(m => m.id !== id))
      toast({ title: "Membro removido com sucesso." })
    } else {
      toast({ variant: "destructive", title: "Erro ao remover", description: error.message })
    }
  }

  return (
    <div className="space-y-6">
      {/* CARD DE CONVITE */}
      <Card className="border-slate-200 shadow-md bg-white rounded-[24px]">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-teal-100 text-teal-600 rounded-xl"><UserPlus size={20}/></div>
            <div>
              <CardTitle className="text-lg font-black text-slate-800">Convidar Novo Membro</CardTitle>
              <CardDescription>Adicione secretários ou assistentes para ajudar na gestão.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="space-y-2 w-full">
              <Label className="font-bold text-slate-600">Nome Completo</Label>
              <Input 
                placeholder="Ex: Maria Silva" 
                value={inviteData.name} 
                onChange={e => setInviteData({...inviteData, name: e.target.value})}
                className="rounded-xl border-slate-300"
              />
            </div>
            <div className="space-y-2 w-full">
              <Label className="font-bold text-slate-600">E-mail de Acesso</Label>
              <Input 
                placeholder="email@exemplo.com" 
                type="email"
                value={inviteData.email} 
                onChange={e => setInviteData({...inviteData, email: e.target.value})}
                className="rounded-xl border-slate-300"
              />
            </div>
            <Button 
              onClick={handleInvite} 
              disabled={inviting}
              className="w-full md:w-auto bg-teal-600 hover:bg-teal-700 text-white font-bold h-10 rounded-xl shadow-sm"
            >
              {inviting ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <Mail className="mr-2 h-4 w-4"/>}
              Enviar Convite
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* LISTA DE MEMBROS */}
      <div className="grid gap-4">
        {loading ? (
          <div className="text-center py-10"><Loader2 className="animate-spin mx-auto text-teal-600"/></div>
        ) : team.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 rounded-[24px] border border-dashed border-slate-300">
            <Users className="h-10 w-10 text-slate-300 mx-auto mb-2"/>
            <p className="text-slate-500 font-medium">Nenhum membro na equipe ainda.</p>
          </div>
        ) : (
          team.map(member => (
            <Card key={member.id} className="border-slate-200 shadow-sm bg-white rounded-[24px] overflow-hidden transition-all hover:shadow-md">
              <div className="flex flex-col lg:flex-row">
                {/* COLUNA DE INFO */}
                <div className="p-6 bg-slate-50 border-b lg:border-b-0 lg:border-r border-slate-200 lg:w-1/3 flex flex-col justify-between">
                  <div className="flex items-center gap-4 mb-4">
                    <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                      <AvatarFallback className="bg-teal-100 text-teal-700 font-bold">{member.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-black text-slate-800 text-lg leading-tight">{member.name}</h3>
                      <p className="text-xs text-slate-500 font-medium">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold">
                      <CheckCircle2 className="h-3 w-3 mr-1"/> Ativo
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={() => handleRemoveMember(member.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50 h-8 w-8 p-0 rounded-lg">
                      <Trash2 size={16}/>
                    </Button>
                  </div>
                </div>

                {/* COLUNA DE PERMISSÕES */}
                <div className="p-6 lg:w-2/3">
                  <div className="flex items-center gap-2 mb-4">
                    <Shield className="h-4 w-4 text-teal-600"/>
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Controle de Acesso</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-8">
                    <PermissionToggle 
                      label="Pessoal" 
                      desc="Gerir Pacientes" 
                      checked={member.perm_patients} 
                      onChange={() => handleTogglePermission(member.id, 'perm_patients', member.perm_patients)} 
                      disabled={loading}
                    />
                    <PermissionToggle 
                      label="Visualizar Agenda" 
                      desc="Ver Calendário Completo" 
                      checked={member.perm_agenda} 
                      onChange={() => handleTogglePermission(member.id, 'perm_agenda', member.perm_agenda)} 
                      disabled={loading}
                    />
                    <PermissionToggle 
                      label="Gerenciar Agendamentos" 
                      desc="Criar, Editar e Cancelar" 
                      checked={member.perm_manage_schedule} 
                      onChange={() => handleTogglePermission(member.id, 'perm_manage_schedule', member.perm_manage_schedule)} 
                      disabled={loading}
                    />
                    <PermissionToggle 
                      label="Financeiro" 
                      desc="Ver e Baixar" 
                      checked={member.perm_financial} 
                      onChange={() => handleTogglePermission(member.id, 'perm_financial', member.perm_financial)} 
                      danger
                      disabled={loading}
                    />
                    <PermissionToggle 
                      label="Evoluções" 
                      desc="Ler Prontuários" 
                      checked={member.perm_evolutions} 
                      onChange={() => handleTogglePermission(member.id, 'perm_evolutions', member.perm_evolutions)} 
                      danger
                      disabled={loading}
                    />
                    <PermissionToggle 
                      label="Documentos" 
                      desc="Docs Legais" 
                      checked={member.perm_documents} 
                      onChange={() => handleTogglePermission(member.id, 'perm_documents', member.perm_documents)} 
                      disabled={loading}
                    />
                    <PermissionToggle 
                      label="Emoções" 
                      desc="Diário do Paciente" 
                      checked={member.perm_emotions} 
                      onChange={() => handleTogglePermission(member.id, 'perm_emotions', member.perm_emotions)} 
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

function PermissionToggle({ label, desc, checked, onChange, danger, disabled }: any) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="space-y-0.5">
        <Label className={`text-sm font-bold flex items-center gap-1 ${danger ? 'text-slate-700' : 'text-slate-700'}`}>
          {label}
          {danger && <AlertCircle size={12} className="text-amber-600" />}
        </Label>
        <p className="text-[10px] text-slate-400 font-medium">{desc}</p>
      </div>
      <label className={`relative inline-flex items-center cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
        <input 
          type="checkbox" 
          className="sr-only peer" 
          checked={checked} 
          onChange={(e) => !disabled && onChange(e.target.checked)} 
          disabled={disabled}
        />
        <div className={`w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-teal-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${danger ? "peer-checked:bg-amber-500" : "peer-checked:bg-teal-600"}`}></div>
      </label>
    </div>
  )
}
