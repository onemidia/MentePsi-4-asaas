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
  const [statusFilter, setStatusFilter] = useState('todos')
  const [currentPage, setCurrentPage] = useState(0)
  const itemsPerPage = 10
  
  const supabase = createClient()
  const { toast } = useToast()

  async function fetchUsers() {
    setLoading(true)
    try {
      // 1. Busca Perfis (igual ao Dashboard Master) - Colunas explícitas
      const { data: profiles, error } = await supabase
        .from('professional_profile')
        .select('user_id, full_name, email, created_at')
        .order('created_at', { ascending: false })

      if (error) console.warn("Aviso ao buscar perfis:", error)

      // 2. Busca Assinaturas para unificar
      const { data: subs } = await supabase
        .from('subscriptions')
        .select('user_id, status, current_period_end, grace_period_until')
      
      if (profiles) {
        // 3. Unifica os dados em um só objeto, garantindo que todos tenham status
        const mergedData = profiles.map(profile => {
          const userSub = subs?.find(s => s.user_id === profile.user_id)
          return {
            ...profile,
            subscription_status: userSub?.status || 'trialing', // Default para 'trialing' para consistência
            current_period_end: userSub?.current_period_end || null,
            grace_period_until: userSub?.grace_period_until || null,
          }
        })
        setUsers(mergedData)
      }
    } catch (e) {
      console.warn("Aviso interno em fetchUsers:", e)
    } finally {
      setLoading(false)
    }
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

  async function handleGiveGracePeriod(userId: string) {
    setProcessingId(userId)
    
    // 1. Busca configuração de dias ou usa padrão
    const { data: config } = await supabase.from('saas_config').select('grace_period_days').single()
    const days = config?.grace_period_days || 10
    
    const graceDate = new Date()
    graceDate.setDate(graceDate.getDate() + days)

    // 2. Atualiza status para overdue e define data limite
    const { error } = await supabase
      .from('subscriptions')
      .update({ 
        status: 'overdue',
        grace_period_until: graceDate.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)

    if (!error) {
      toast({ title: "Carência Aplicada!", description: `Acesso liberado por mais ${days} dias (Status: Overdue).` })
      fetchUsers() 
    }
    setProcessingId(null)
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'todos' || user.subscription_status === statusFilter

    let matchesDate = true
    if (startDate || endDate) {
      const userDate = new Date(user.created_at)
      if (startDate && new Date(startDate) > userDate) matchesDate = false
      if (endDate && new Date(endDate + 'T23:59:59') < userDate) matchesDate = false
    }
    return matchesSearch && matchesDate && matchesStatus
  })

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage)
  const currentUsers = filteredUsers.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage)

  return (
    <div className="p-6 space-y-6 bg-slate-50/50 min-h-[100dvh]">
      {/* Header com Filtros Inteligentes */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center bg-white p-6 rounded-2xl border shadow-sm gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <ShieldAlert className="text-teal-600 h-8 w-8" /> Gestão de Licenças
          </h1>
          <p className="text-slate-500 font-medium">Controle de acesso ao Plano Único Profissional.</p>
        </div>
        
        <div className="flex flex-col xl:flex-row gap-3 w-full xl:w-auto items-center">
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

          <div className="flex gap-1 bg-white border rounded-xl p-1 shadow-sm w-full sm:w-auto">
            <Button size="sm" variant={statusFilter === 'todos' ? 'secondary' : 'ghost'} onClick={() => { setStatusFilter('todos'); setCurrentPage(0); }} className="text-xs h-7">Todos</Button>
            <Button size="sm" variant={statusFilter === 'active' ? 'secondary' : 'ghost'} onClick={() => { setStatusFilter('active'); setCurrentPage(0); }} className="text-xs h-7">Assinantes</Button>
            <Button size="sm" variant={statusFilter === 'trialing' ? 'secondary' : 'ghost'} onClick={() => { setStatusFilter('trialing'); setCurrentPage(0); }} className="text-xs h-7">Em Teste</Button>
            <Button size="sm" variant={statusFilter === 'canceled' ? 'secondary' : 'ghost'} onClick={() => { setStatusFilter('canceled'); setCurrentPage(0); }} className="text-xs h-7">Cancelados</Button>
          </div>
        </div>
      </div>

      {/* Tabela de Controle */}
      <div className="bg-white rounded-2xl border shadow-md overflow-hidden">
        <div className="overflow-x-auto">
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
            ) : currentUsers.map((user) => {
              const status = user.subscription_status
              const periodEnd = user.current_period_end

              const trialDate = periodEnd ? new Date(periodEnd) : null
              const isTrialExpired = trialDate && trialDate < new Date() && status === 'trialing'
              const graceDate = user.grace_period_until ? new Date(user.grace_period_until) : null
              const isInGracePeriod = graceDate && graceDate > new Date()

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
                        : isInGracePeriod
                        ? "bg-amber-50 text-amber-700 border border-amber-200 px-4 font-black"
                        : isTrialExpired
                        ? "bg-red-50 text-red-600 border border-red-100 px-4 font-black"
                        : "bg-blue-50 text-blue-600 border border-blue-100 px-4 font-black"
                    }>
                      {status === 'active' ? 'ASSINANTE' : isInGracePeriod ? 'EM CARÊNCIA' : isTrialExpired ? 'EXPIRADO' : 'EM TESTE'}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-slate-600 font-medium">
                    {trialDate ? (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-sm">
                          <CalendarDays className={`h-4 w-4 ${isTrialExpired ? 'text-red-400' : 'text-slate-300'}`} />
                          <span className={isTrialExpired ? 'text-red-600 font-bold' : ''}>
                            {trialDate.toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        {user.grace_period_until && (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 w-fit text-[10px] px-2">
                            Carência: {new Date(user.grace_period_until).toLocaleDateString('pt-BR')}
                          </Badge>
                        )}
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

                          <DropdownMenuItem onClick={() => handleGiveGracePeriod(user.user_id)} className="rounded-lg text-amber-600 font-bold focus:bg-amber-50 cursor-pointer">
                            <ShieldAlert className="mr-3 h-4 w-4" /> Dar +10 dias de Carência
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
        <div className="flex items-center justify-between p-4 border-t">
          <span className="text-xs text-slate-500">
            Total de <strong>{filteredUsers.length}</strong> usuários.
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0}>
              Anterior
            </Button>
            <span className="text-xs font-medium">Página {currentPage + 1} de {totalPages > 0 ? totalPages : 1}</span>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))} disabled={currentPage >= totalPages - 1}>
              Próximo
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}