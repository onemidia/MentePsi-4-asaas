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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

  const supabase = createClient()

  useEffect(() => {
    async function fetchFinanceData() {
      setLoading(true)
      // Query Unificada
      const { data } = await supabase
        .from('professional_profile')
        .select('*, subscriptions(status, saas_plans(price_monthly, name))')
        .order('created_at', { ascending: false })

      if (data) {
        const formattedData = data.map(profile => {
          const sub = Array.isArray(profile.subscriptions) ? profile.subscriptions[0] : profile.subscriptions
          return {
            ...profile,
            id: profile.user_id,
            subscription_status: sub?.status || 'trialing',
            plan_price: sub?.saas_plans?.price_monthly || 49.90
          }
        })
        setProfiles(formattedData)
      }
      
      setLoading(false)
    }
    fetchFinanceData()
  }, [])

  // Lógica de Filtro (Busca + Data)
  const filteredProfiles = profiles.filter(profile => {
    const matchesSearch = 
      profile.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profile.email?.toLowerCase().includes(searchTerm.toLowerCase())
    
    let matchesDate = true
    if (startDate || endDate) {
      const createdAt = new Date(profile.created_at)
      if (startDate && new Date(startDate) > createdAt) matchesDate = false
      if (endDate && new Date(endDate + 'T23:59:59') < createdAt) matchesDate = false
    }
    
    return matchesSearch && matchesDate
  })

  // Cálculos baseados nos dados filtrados
  const stats = {
    activeCount: filteredProfiles.filter(p => p.subscription_status === 'active').length,
    pendingCount: filteredProfiles.filter(p => p.subscription_status === 'past_due' || p.subscription_status === 'canceled').length,
    trialCount: filteredProfiles.filter(p => p.subscription_status === 'trialing').length,
  }

  // Cálculo de MRR: Usa o preço vindo da tabela de planos para cada usuário ativo
  const mrr = filteredProfiles.filter(p => p.subscription_status === 'active').reduce((acc, curr) => acc + (curr.plan_price || 0), 0)
  // Cálculo de Pendente: Usa o preço vindo da tabela de planos para inadimplentes (assumindo preço do plano que tentaram assinar)
  const pendingRev = filteredProfiles.filter(p => p.subscription_status === 'past_due' || p.subscription_status === 'canceled').reduce((acc, curr) => acc + (curr.plan_price || 0), 0)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  return (
    <div className="p-6 space-y-8 bg-slate-50/50 min-h-screen">
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
                ) : filteredProfiles.map((profile) => (
                  <TableRow key={profile.id} className="hover:bg-slate-50 transition-colors border-b">
                    <TableCell className="py-4">
                      <div className="font-bold text-slate-800">{profile.full_name || 'Usuário Incompleto'}</div>
                      <div className="text-[11px] text-slate-400 font-medium uppercase tracking-tighter">{profile.email}</div>
                    </TableCell>
                    <TableCell>
                      <Badge className={
                        profile.subscription_status === 'active' 
                          ? "bg-emerald-100 text-emerald-700 border-none px-3 font-bold" 
                          : profile.subscription_status === 'trialing'
                          ? "bg-blue-100 text-blue-700 border-none px-3 font-bold"
                          : "bg-red-50 text-red-600 border border-red-100 px-3 font-bold"
                      }>
                        {profile.subscription_status === 'trialing' ? 'PERÍODO DE TESTE' : profile.subscription_status === 'active' ? 'ASSINANTE ATIVO' : profile.subscription_status?.toUpperCase() || 'SEM STATUS'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-black text-slate-700">
                      {profile.subscription_status === 'active' ? formatCurrency(profile.plan_price) : '---'}
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
      </Card>
    </div>
  )
}