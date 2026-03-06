'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/client'
import { Search, Link as LinkIcon, MessageCircle, Loader2, Smartphone, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { Label } from "@/components/ui/label"

export default function PortalManagementPage() {
  const [patients, setPatients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [currentPage, setCurrentPage] = useState(0)
  const [updatingId, setUpdatingId] = useState<string | null>(null) // ➕ Estado de feedback
  const supabase = createClient()
  const { toast } = useToast()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => { setIsMounted(true) }, [])

  const fetchPatients = async () => {
    setLoading(true)
    try {
      // 1. Obtém o usuário logado para garantir a segurança dos dados
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Busca usando os nomes REAIS das colunas: 'phone' em vez de 'whatsapp'
      // 2. Aplica o filtro obrigatório pelo ID do psicólogo
      const { data: pData } = await supabase.from('patients').select('id, full_name, phone, created_at').eq('psychologist_id', user.id)
      const { data: sData } = await supabase.from('portal_settings').select('*').eq('psychologist_id', user.id)

      if (pData) {
        const normalized = pData.map(p => ({
          ...p,
          // 🔧 MELHORIA: Retorna objeto vazio se não houver config, facilitando a criação
          portal_settings: sData?.find(s => s.patient_id === p.id) || { active: false, journal: false, financials: false, materials: false, documents: false }
        }))
        setPatients(normalized)
      }
    } catch (err) {
      console.error('Erro ao carregar:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPatients() }, [])

  const updatePortalConfig = async (patientId: string, key: string, value: boolean) => {
    setUpdatingId(patientId) // 🔄 Inicia feedback visual
    
    try {
      // 1. Captura o ID do Psicólogo (Obrigatório para criar o registro)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Usuário não autenticado")

      const patient = patients.find(p => p.id === patientId)
      
      // 2. Constrói o objeto limpo com apenas as colunas necessárias
      const newSettings = {
        active: patient.portal_settings?.active ?? false,
        journal: patient.portal_settings?.journal ?? false,
        financials: patient.portal_settings?.financials ?? false,
        materials: patient.portal_settings?.materials ?? false,
        documents: patient.portal_settings?.documents ?? false,
        [key]: value,
        patient_id: patientId,
        psychologist_id: user.id // 🔑 Chave para o upsert funcionar
      }

      const { error } = await supabase.from('portal_settings').upsert(newSettings, { onConflict: 'patient_id' })

      if (!error) {
        setPatients(prev => prev.map(p => p.id === patientId ? { ...p, portal_settings: { ...p.portal_settings, ...newSettings } } : p))
        toast({ title: "Configuração salva!" })
      } else {
        toast({ variant: "destructive", title: "Erro ao salvar", description: error.message })
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message })
    } finally {
      setUpdatingId(null) // ⏹️ Encerra feedback
    }
  }

  useEffect(() => { setCurrentPage(0) }, [searchTerm, startDate, endDate])

  const filteredPatients = patients.filter(p => {
    const matchesSearch = p.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    let matchesDate = true
    if (startDate || endDate) {
      const date = new Date(p.created_at)
      if (startDate && new Date(startDate) > date) matchesDate = false
      if (endDate && new Date(endDate + 'T23:59:59') < date) matchesDate = false
    }
    return matchesSearch && matchesDate
  })

  const itemsPerPage = 8

  if (!isMounted) return null

  return (
    <div className="p-6 space-y-6 bg-slate-100 min-h-screen">
      <div className="flex items-center gap-3">
        <Smartphone className="text-blue-600" size={32} />
        <h1 className="text-3xl font-bold text-slate-900">Portal do Cliente</h1>
      </div>

      <Card className="border border-slate-200 shadow-md bg-white">
        <CardHeader className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
          <CardTitle className="text-lg text-slate-700">Controle de Acessos</CardTitle>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
            <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border px-3 w-full sm:w-auto">
              <Label className="text-[10px] font-black text-slate-400 uppercase">Cadastro:</Label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent border-none text-xs font-bold focus:ring-0 h-8 w-24" />
              <span className="text-slate-300">|</span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent border-none text-xs font-bold focus:ring-0 h-8 w-24" />
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Buscar paciente..." 
                className="pl-9 bg-white border border-slate-300 w-full" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="font-bold">Paciente</TableHead>
                <TableHead className="text-center w-[100px]">Acesso</TableHead>
                <TableHead className="text-center w-[100px]">
                  <div className="flex items-center justify-center gap-1">
                    Diário
                  </div>
                </TableHead>
                <TableHead className="text-center w-[100px]">
                  <div className="flex items-center justify-center gap-1">
                    Financeiro
                  </div>
                </TableHead>
                <TableHead className="text-center w-[100px]">
                  <div className="flex items-center justify-center gap-1">
                    Materiais
                  </div>
                </TableHead>
                <TableHead className="text-center w-[100px]">
                  <div className="flex items-center justify-center gap-1">
                    Docs
                  </div>
                </TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-10"><Loader2 className="animate-spin inline mr-2"/> Carregando...</TableCell></TableRow>
              ) : filteredPatients.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-10 text-slate-500">Nenhum paciente encontrado.</TableCell></TableRow>
              ) : (
                filteredPatients?.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.full_name}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        {updatingId === p.id ? <Loader2 className="h-5 w-5 animate-spin text-teal-600"/> : (
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer" 
                              checked={p.portal_settings?.active} 
                              onChange={(e) => updatePortalConfig(p.id, 'active', e.target.checked)} 
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-teal-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                          </label>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={p.portal_settings?.journal} 
                            onChange={(e) => updatePortalConfig(p.id, 'journal', e.target.checked)} 
                            disabled={!p.portal_settings?.active || updatingId === p.id}
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-teal-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
                        </label>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={p.portal_settings?.financials} 
                            onChange={(e) => updatePortalConfig(p.id, 'financials', e.target.checked)} 
                            disabled={!p.portal_settings?.active || updatingId === p.id}
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-teal-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
                        </label>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={p.portal_settings?.materials} 
                            onChange={(e) => updatePortalConfig(p.id, 'materials', e.target.checked)} 
                            disabled={!p.portal_settings?.active || updatingId === p.id}
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-teal-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
                        </label>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={p.portal_settings?.documents} 
                            onChange={(e) => updatePortalConfig(p.id, 'documents', e.target.checked)} 
                            disabled={!p.portal_settings?.active || updatingId === p.id}
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-teal-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
                        </label>
                      </div>
                    </TableCell>
                    <TableCell className="text-right flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/portal/${p.id}`)
                        toast({ title: "Link Copiado!" })
                      }}><LinkIcon size={16} /></Button>
                      <Button size="sm" className="bg-green-500 text-white" onClick={() => {
                        const link = `${window.location.origin}/portal/${p.id}`
                        const msg = encodeURIComponent(`Olá ${p.full_name.split(' ')[0]}, aqui está seu link do Portal: ${link}`)
                        window.open(`https://wa.me/${p.phone?.replace(/\D/g, '')}?text=${msg}`, '_blank')
                      }}><MessageCircle size={16} /></Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>

          {/* Interface de Navegação */}
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-slate-100 gap-4 mt-4">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0} className="w-full sm:w-auto">
              <ChevronLeft className="h-4 w-4 mr-2" /> Anterior
            </Button>
            <span className="text-xs text-slate-500 font-medium">Página {currentPage + 1} de {Math.max(1, Math.ceil(filteredPatients.length / itemsPerPage))}</span>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => p + 1)} disabled={(currentPage + 1) * itemsPerPage >= filteredPatients.length} className="w-full sm:w-auto">
              Próximo <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}