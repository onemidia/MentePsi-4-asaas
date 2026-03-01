'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/client'
import { 
  CreditCard, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2,
  Search,
  Download,
  Loader2
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function AssinaturasPage() {
  const [loading, setLoading] = useState(true)
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const supabase = createClient()

  useEffect(() => {
    const fetchSubscriptions = async () => {
      setLoading(true)
      
      // ATUALIZAÇÃO CIRÚRGICA: Captura usuário logado
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Busca dados reais da tabela de perfis/assinaturas
      // Nota: Ajustado para filtrar pelo ID do usuário logado (Política de Privacidade)
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, selected_plan, plan_status, created_at')
        .eq('id', user.id) // <--- GARANTE QUE O USUÁRIO VEJA APENAS SUA ASSINATURA
      
      if (data) setSubscriptions(data)
      setLoading(false)
    }

    fetchSubscriptions()
  }, [])

  const filteredSubs = subscriptions.filter(sub => 
    sub.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="p-6 space-y-6 bg-slate-50/50 min-h-screen">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">Assinaturas</h1>
          <p className="text-slate-500">Gestão de planos e receita recorrente.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="text-slate-600"><Download className="mr-2 h-4 w-4"/> Exportar</Button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total de Assinaturas</CardTitle>
            <CreditCard className="h-4 w-4 text-teal-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{subscriptions.length}</div>
            <p className="text-xs text-slate-500 mt-1">Plano atual ativo</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Status da Conta</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">Profissional</div>
            <p className="text-xs text-slate-500 mt-1">Sua conta está regularizada</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Próxima Renovação</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">Mensal</div>
            <p className="text-xs text-slate-500 mt-1">Cobrança via cartão de crédito</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Assinaturas */}
      <Card className="border-none shadow-sm bg-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-bold text-slate-800">Detalhes da Assinatura</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Buscar..." 
              className="pl-8 bg-slate-50 border-slate-200" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-teal-600" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[300px]">Psicólogo</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Data Início</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubs.map((sub) => (
                  <TableRow key={sub.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-medium text-slate-900">{sub.full_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">
                        {sub.selected_plan || 'Profissional'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {new Date(sub.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge className={
                        sub.plan_status === 'active' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'
                      }>
                        {sub.plan_status === 'active' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                        {sub.plan_status === 'active' ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}