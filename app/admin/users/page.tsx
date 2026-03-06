'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/client'
import { 
  MoreHorizontal, 
  UserCheck, 
  UserX, 
  Loader2,
  Search,
  ShieldAlert,
  CalendarDays,
  KeyRound,
  Filter,
  History,
  Mail
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"

export default function GestaoPsicologos() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [processingId, setProcessingId] = useState<string | null>(null)
  
  const supabase = createClient()
  const { toast } = useToast()

  async function fetchUsers() {
    setLoading(true)
    // Query Unificada
    const { data, error } = await supabase
      .from('professional_profile')
      .select('*, subscriptions(status, current_period_end)')
      .order('created_at', { ascending: false })
    
    if (data) {
      setUsers(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  async function handleUpdateSubscription(userId: string, newStatus: string) {
    setProcessingId(userId)
    const { error } = await supabase
      .from('subscriptions')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)

    if (!error) {
      toast({ title: "Status atualizado!", description: `Usuário agora está como ${newStatus}.` })
      fetchUsers() 
    } else {
      toast({ variant: "destructive", title: "Erro", description: error.message })
    }
    setProcessingId(null)
  }

  async function handleExtendTrial(userId: string) {
    setProcessingId(userId)
    const newTrialDate = new Date()
    newTrialDate.setDate(newTrialDate.getDate() + 30)

    const { error } = await supabase
      .from('subscriptions')
      .update({ 
        status: 'trialing',
        current_period_end: newTrialDate.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)

    if (!error) {
      toast({ title: "Trial Renovado!", description: "Mais 30 dias de cortesia." })
      fetchUsers() 
    }
    setProcessingId(null)
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    
    let matchesDate = true
    if (startDate || endDate) {
      const userDate = new Date(user.created_at)
      if (startDate && new Date(startDate) > userDate) matchesDate = false
      if (endDate && new Date(endDate + 'T23:59:59') < userDate) matchesDate = false
    }
    return matchesSearch && matchesDate
  })

  return (
    <div className="p-6 space-y-6 bg-slate-50/50 min-h-screen">
      {/* Header com Filtros Inteligentes */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center bg-white p-6 rounded-2xl border shadow-sm gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <ShieldAlert className="text-teal-600 h-8 w-8" /> Gestão de Licenças
          </h1>
          <p className="text-slate-500 font-medium">Controle de acesso ao Plano Único Profissional.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
          <div className="flex items-center bg-slate-100/50 border border-slate-200 rounded-xl px-3 gap-2 shadow-inner">
            <Filter size={14} className="text-slate-400" />
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-9 border-none bg-transparent focus-visible:ring-0 text-xs w-[115px]" />
            <span className="text-slate-300">|</span>
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-9 border-none bg-transparent focus-visible:ring-0 text-xs w-[115px]" />
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Nome ou e-mail..." 
              className="pl-10 bg-white border-slate-200 w-full rounded-xl shadow-sm focus:ring-teal-500" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>
        </div>
      </div>

      {/* Tabela de Controle */}
      <div className="bg-white rounded-2xl border shadow-md overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow className="hover:bg-transparent">
              <TableHead className="font-bold text-slate-700 py-4 px-6">Psicólogo</TableHead>
              <TableHead className="font-bold text-slate-700 text-center">Status de Acesso</TableHead>
              <TableHead className="font-bold text-slate-700">Trial / Expiração</TableHead>
              <TableHead className="font-bold text-slate-700 text-right px-8">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4} className="text-center py-24"><Loader2 className="animate-spin h-8 w-8 text-teal-600 mx-auto"/></TableCell></TableRow>
            ) : filteredUsers.map((user) => {
              const sub = Array.isArray(user.subscriptions) ? user.subscriptions[0] : user.subscriptions
              const status = sub?.status || 'inactive'
              const periodEnd = sub?.current_period_end

              const trialDate = periodEnd ? new Date(periodEnd) : null
              const isTrialExpired = trialDate && trialDate < new Date() && status === 'trialing'

              return (
                <TableRow key={user.user_id} className="hover:bg-slate-50/50 transition-colors border-b last:border-0">
                  <TableCell className="py-4 px-6">
                    <div className="font-black text-slate-800">{user.full_name || 'Cadastro Incompleto'}</div>
                    <div className="text-xs text-slate-400 flex items-center gap-1 font-medium italic">
                       <Mail size={12}/> {user.email}
                    </div>
                  </TableCell>
                  
                  <TableCell className="text-center">
                    <Badge className={
                      status === 'active' 
                        ? "bg-emerald-50 text-emerald-600 border border-emerald-100 px-4 font-black" 
                        : isTrialExpired
                        ? "bg-red-50 text-red-600 border border-red-100 px-4 font-black"
                        : "bg-blue-50 text-blue-600 border border-blue-100 px-4 font-black"
                    }>
                      {status === 'active' ? 'ASSINANTE' : isTrialExpired ? 'EXPIRADO' : 'EM TESTE'}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-slate-600 font-medium">
                    {trialDate ? (
                      <div className="flex items-center gap-2 text-sm">
                        <CalendarDays className={`h-4 w-4 ${isTrialExpired ? 'text-red-400' : 'text-slate-300'}`} />
                        <span className={isTrialExpired ? 'text-red-600 font-bold' : ''}>
                           {trialDate.toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-300 text-xs">Assinatura Vitalícia/Ativa</span>
                    )}
                  </TableCell>

                  <TableCell className="text-right px-6">
                    {processingId === user.user_id ? (
                      <Loader2 className="h-5 w-5 animate-spin text-teal-600 ml-auto" />
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-9 w-9 p-0 hover:bg-slate-100 rounded-full"><MoreHorizontal className="h-5 w-5" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64 bg-white shadow-2xl border-slate-200 rounded-2xl p-2 z-50">
                          <DropdownMenuLabel className="text-[10px] uppercase font-black text-slate-400 px-2 py-1 tracking-widest">Controle Master</DropdownMenuLabel>
                          
                          <DropdownMenuItem onClick={() => handleUpdateSubscription(user.user_id, 'active')} className="rounded-lg text-emerald-600 font-bold focus:bg-emerald-50 focus:text-emerald-700 cursor-pointer">
                            <UserCheck className="mr-3 h-4 w-4" /> Validar Pagamento
                          </DropdownMenuItem>

                          <DropdownMenuItem onClick={() => handleExtendTrial(user.user_id)} className="rounded-lg text-blue-600 font-bold focus:bg-blue-50 cursor-pointer">
                            <History className="mr-3 h-4 w-4" /> Dar +30 Dias Grátis
                          </DropdownMenuItem>

                          <DropdownMenuSeparator className="my-2" />

                          <DropdownMenuItem className="rounded-lg font-medium cursor-pointer">
                            <KeyRound className="mr-3 h-4 w-4 text-slate-400"/> Enviar Link de Senha
                          </DropdownMenuItem>

                          <DropdownMenuItem onClick={() => handleUpdateSubscription(user.user_id, 'canceled')} className="rounded-lg text-red-500 font-bold focus:bg-red-50 cursor-pointer">
                            <UserX className="mr-3 h-4 w-4" /> Revogar Acesso
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}