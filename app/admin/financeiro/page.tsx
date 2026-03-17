'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/client'
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  Download,
  Loader2,
  AlertCircle,
  Activity,
  Calendar,
  Search,
  Filter
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function FinanceiroGlobal() {
  const [loading, setLoading] = useState(true)
  const [profiles, setProfiles] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [currentPage, setCurrentPage] = useState(0)
  const itemsPerPage = 10
  
  const PLAN_PRICE = 49.90
  const supabase = createClient()

  useEffect(() => {
    async function fetchFinanceData() {
      setLoading(true)
      try {
        // 1. Busca Perfis - Colunas explícitas
        const { data: allProfiles, error } = await supabase
          .from('professional_profile')
          .select('user_id, full_name, email, created_at')
          .order('created_at', { ascending: false })
  
        if (error) console.warn("Aviso ao buscar perfis:", error)
  
        // 2. Busca Assinaturas para unificar status real
        const { data: subs } = await supabase
          .from('subscriptions')
          .select('user_id, status, current_period_end, grace_period_until')
  
        if (allProfiles) {
          const mergedData = allProfiles.map(profile => {
            const userSub = subs?.find(s => s.user_id === profile.user_id)
            const rawStatus = (userSub?.status || 'trialing').toLowerCase()
            const periodEnd = userSub?.current_period_end ? new Date(userSub.current_period_end) : null
            const graceEnd = userSub?.grace_period_until ? new Date(userSub.grace_period_until) : null
            const now = new Date()

            let finalStatus = 'PENDENTE'
            let badgeClass = 'bg-slate-50 text-slate-600 border border-slate-200'
            let filterCategory = 'trialing'

            if (rawStatus === 'active' || rawStatus === 'confirmed' || rawStatus === 'received') {
              finalStatus = 'ASSINANTE'
              badgeClass = 'bg-emerald-50 text-emerald-600 border border-emerald-100'
              filterCategory = 'active'
            } else if (rawStatus === 'trialing') {
              if (periodEnd && periodEnd < now) {
                finalStatus = 'VENCIDO'
                badgeClass = 'bg-red-50 text-red-600 border border-red-100'
                filterCategory = 'past_due'
              } else {
                finalStatus = 'EM TESTE'
                badgeClass = 'bg-blue-50 text-blue-600 border border-blue-100'
                filterCategory = 'trialing'
              }
            } else if (rawStatus === 'past_due' || rawStatus === 'overdue' || rawStatus === 'inadimplente') {
              if (graceEnd && graceEnd > now) {
                finalStatus = 'EM CARÊNCIA'
                badgeClass = 'bg-amber-50 text-amber-700 border border-amber-200'
                filterCategory = 'past_due'
              } else {
                finalStatus = 'INADIMPLENTE'
                badgeClass = 'bg-amber-50 text-amber-700 border border-amber-200'
                filterCategory = 'past_due'
              }
            } else if (rawStatus === 'canceled' || rawStatus === 'vencido') {
              finalStatus = 'VENCIDO'
              badgeClass = 'bg-red-50 text-red-600 border border-red-100'
              filterCategory = 'canceled'
            }
  
            return {
              ...profile,
              subscription_status: filterCategory,
              final_status: finalStatus,
              badge_class: badgeClass,
              current_period_end: userSub?.current_period_end || null
            }
          })
          setProfiles(mergedData)
        }
      } catch (e) {
        console.warn("Aviso interno em fetchFinanceData:", e)
      } finally {
        setLoading(false)
      }
    }
    fetchFinanceData()
  }, [])

  // Lógica de Filtro (Busca + Data)
  const filteredProfiles = profiles.filter(profile => {
    const matchesSearch = 
      profile.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profile.email?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'todos' || profile.subscription_status === statusFilter

    let matchesDate = true
    if (startDate || endDate) {
      const createdAt = new Date(profile.created_at)
      if (startDate && new Date(startDate) > createdAt) matchesDate = false
      if (endDate && new Date(endDate + 'T23:59:59') < createdAt) matchesDate = false
    }

    return matchesSearch && matchesDate && matchesStatus
  })

  const totalPages = Math.ceil(filteredProfiles.length / itemsPerPage)
  const currentProfiles = filteredProfiles.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage)

  // Cálculos baseados nos dados filtrados
  const stats = {
    activeCount: filteredProfiles.filter(p => p.subscription_status === 'active').length,
    pendingCount: filteredProfiles.filter(p => p.subscription_status === 'past_due' || p.subscription_status === 'canceled').length,
    trialCount: filteredProfiles.filter(p => p.subscription_status === 'trialing').length,
  }

  const mrr = stats.activeCount * PLAN_PRICE
  const pendingRev = stats.pendingCount * PLAN_PRICE

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  return (
    <div className="p-6 space-y-8 bg-slate-50/50 min-h-[100dvh]">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Saúde Financeira</h1>
          <p className="text-slate-500 font-medium">Relatórios e auditoria de assinantes.</p>
        </div>
        <Button className="bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-100 font-bold">
          <Download className="mr-2 h-4 w-4" /> Exportar Relatório
        </Button>
      </div>

      {/* Barra de Ferramentas (Busca e Filtro) */}
      <div className="flex flex-col lg:flex-row gap-4 items-center bg-white p-4 rounded-xl border shadow-sm">
        <div className="relative w-full lg:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Buscar por nome ou e-mail..." 
            className="pl-10 bg-slate-50 border-slate-200"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex gap-1 bg-white border rounded-xl p-1 shadow-sm w-full sm:w-auto">
          <Button size="sm" variant={statusFilter === 'todos' ? 'secondary' : 'ghost'} onClick={() => { setStatusFilter('todos'); setCurrentPage(0); }} className="text-xs h-7">Todos</Button>
          <Button size="sm" variant={statusFilter === 'active' ? 'secondary' : 'ghost'} onClick={() => { setStatusFilter('active'); setCurrentPage(0); }} className="text-xs h-7">Assinantes</Button>
          <Button size="sm" variant={statusFilter === 'trialing' ? 'secondary' : 'ghost'} onClick={() => { setStatusFilter('trialing'); setCurrentPage(0); }} className="text-xs h-7">Em Teste</Button>
          <Button size="sm" variant={statusFilter === 'past_due' ? 'secondary' : 'ghost'} onClick={() => { setStatusFilter('past_due'); setCurrentPage(0); }} className="text-xs h-7">Inadimplentes</Button>
          <Button size="sm" variant={statusFilter === 'canceled' ? 'secondary' : 'ghost'} onClick={() => { setStatusFilter('canceled'); setCurrentPage(0); }} className="text-xs h-7">Cancelados</Button>
        </div>
        
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-1 gap-2 shadow-inner">
            <Filter size={14} className="text-slate-400" />
            <Input 
              type="date" 
              className="h-8 border-none bg-transparent focus-visible:ring-0 text-xs w-[130px]" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span className="text-slate-300">até</span>
            <Input 
              type="date" 
              className="h-8 border-none bg-transparent focus-visible:ring-0 text-xs w-[130px]" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          {(startDate || endDate || searchTerm) && (
            <Button variant="ghost" size="sm" onClick={() => {setStartDate(''); setEndDate(''); setSearchTerm('')}} className="text-slate-400 hover:text-red-500">
              Limpar
            </Button>
          )}
        </div>
      </div>

      {/* Cards de Métricas (Dinâmicos) */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold text-slate-500 uppercase">MRR Filtrado</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">{formatCurrency(mrr)}</div>
            <p className="text-xs text-slate-400 mt-2 italic">{stats.activeCount} assinantes ativos</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold text-slate-500 uppercase">Projeção Anual</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">{formatCurrency(mrr * 12)}</div>
            <p className="text-xs text-blue-600 mt-2 font-bold uppercase">Baseado no filtro</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold text-slate-500 uppercase">Trial (Filtro)</CardTitle>
            <Activity className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">{stats.trialCount}</div>
            <p className="text-xs text-orange-600 mt-2 font-bold uppercase">Novos Leads</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold text-slate-500 uppercase">Risco/Perda</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">{formatCurrency(pendingRev)}</div>
            <p className="text-xs text-red-500 mt-2 font-bold uppercase">Inadimplentes</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Assinaturas */}
      <Card className="border-none shadow-md overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-bold text-slate-700">Psicólogo</TableHead>
                  <TableHead className="font-bold text-slate-700">Status</TableHead>
                  <TableHead className="font-bold text-slate-700">MRR</TableHead>
                  <TableHead className="text-right font-bold text-slate-700 px-8">Data Cadastro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-20"><Loader2 className="animate-spin h-8 w-8 text-teal-600 mx-auto" /></TableCell></TableRow>
                ) : filteredProfiles.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-20 text-slate-400 font-medium">Nenhum resultado encontrado para o filtro.</TableCell></TableRow>
                ) : currentProfiles.map((profile) => (
                  <TableRow key={profile.id} className="hover:bg-slate-50 transition-colors border-b">
                    <TableCell className="py-4">
                      <div className="font-bold text-slate-800">{profile.full_name || 'Usuário Incompleto'}</div>
                      <div className="text-[11px] text-slate-400 font-medium uppercase tracking-tighter">{profile.email}</div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${profile.badge_class} px-3 font-bold`}>
                        {profile.final_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-black text-slate-700">
                      {profile.final_status === 'ASSINANTE' ? formatCurrency(PLAN_PRICE) : '---'}
                    </TableCell>
                    <TableCell className="text-right px-8 text-slate-500 font-mono text-sm">
                      {new Date(profile.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="flex items-center justify-between p-4 border-t">
          <span className="text-xs text-slate-500">
            Total de <strong>{filteredProfiles.length}</strong> resultados.
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
        </CardFooter>
      </Card>
    </div>
  )
}