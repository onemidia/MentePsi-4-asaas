'use client'

import React, { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/client'
import { getPlanLimit } from '@/lib/planLimits'
import { 
  Search, 
  Phone,
  FileText,
  Calendar,
  AlertTriangle,
  Lock,
  ChevronLeft,
  ChevronRight,
  Trash2
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { NewPatientModal } from '@/app/dashboard/new-patient-modal'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"

export default function PatientsPage() {

  const [patients, setPatients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [planLimit, setPlanLimit] = useState(0)
  const [isLimitReached, setIsLimitReached] = useState(false)
  
  // Estados de Paginação e Filtro
  const [currentPage, setCurrentPage] = useState(0)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [patientToDelete, setPatientToDelete] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchPatients = useCallback(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        return
      }

      // Busca Pacientes e Dados do Plano em paralelo
      const [patientsRes, profileRes] = await Promise.all([
        supabase
          .from('patients')
          .select('*')
          .eq('psychologist_id', user.id)
          .order('full_name', { ascending: true }),
        
        supabase
          .from('profiles')
          .select('plan_type, subscription_status, created_at, trial_ends_at')
          .eq('id', user.id)
          .single()
      ])

      if (patientsRes.data) {
        setPatients(patientsRes.data)
        
        // Lógica de Feature Gating
        const currentCount = patientsRes.data.length
        const limit = getPlanLimit(profileRes.data, 'maxPatients')
        setPlanLimit(limit)
        setIsLimitReached(currentCount >= limit)
      }
      setLoading(false)
  }, [])

  useEffect(() => {
    fetchPatients()
  }, [fetchPatients])

  // Resetar página ao filtrar
  useEffect(() => {
    setCurrentPage(0)
  }, [searchTerm, startDate, endDate])

  const filteredPatients = patients.filter(p => {
    const matchesSearch = p.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    let matchesDate = true
    if (startDate || endDate) {
      const createdAt = new Date(p.created_at)
      if (startDate && new Date(startDate) > createdAt) matchesDate = false
      if (endDate && new Date(endDate + 'T23:59:59') < createdAt) matchesDate = false
    }
    return matchesSearch && matchesDate
  })

  const handleStatusChange = async (id: string, newStatus: string) => {
    setPatients(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p))
    const supabase = createClient()
    const { error } = await supabase.from('patients').update({ status: newStatus }).eq('id', id)
    if (error) {
      toast({ variant: "destructive", title: "Erro ao atualizar", description: error.message })
      fetchPatients()
    }
  }

  const handleDeletePatient = async () => {
    if (!patientToDelete) return
    const supabase = createClient()
    const { error } = await supabase.from('patients').delete().eq('id', patientToDelete)
    if (error) {
      toast({ variant: "destructive", title: "Erro ao excluir", description: error.message })
    } else {
      toast({ title: "Paciente excluído" })
      setPatients(prev => prev.filter(p => p.id !== patientToDelete))
    }
    setPatientToDelete(null)
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-8 bg-slate-100 min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Pacientes</h1>
          <p className="text-slate-500">Gerencie seus pacientes e prontuários.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Button variant="outline" asChild className="w-full sm:w-auto border-teal-600 text-teal-600 hover:bg-teal-50 font-semibold">
            <Link href="/agenda?new=true">
              <Calendar className="mr-2 h-4 w-4" />
              AGENDAR CONSULTA
            </Link>
          </Button>
          
          {/* BLOQUEIO DE FEATURE: NOVO PACIENTE */}
          {isLimitReached ? (
            <Button disabled variant="secondary" className="w-full sm:w-auto opacity-80 cursor-not-allowed gap-2 bg-slate-200 text-slate-500">
              <Lock className="h-4 w-4" />
              Novo Paciente
            </Button>
          ) : (
            <NewPatientModal onSuccess={fetchPatients} />
          )}
        </div>
      </div>

      {/* BANNER DE LIMITE ATINGIDO */}
      {isLimitReached && !loading && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 rounded-full text-amber-700 mt-1 sm:mt-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-amber-900">Limite de Pacientes Atingido ({patients.length}/{planLimit})</h3>
              <p className="text-sm text-amber-800 mt-1">
                Sua assinatura não está ativa. Para cadastrar novos pacientes, por favor, regularize seu plano.
              </p>
            </div>
          </div>
          <Button asChild size="sm" className="bg-amber-600 hover:bg-amber-700 text-white whitespace-nowrap shadow-sm">
            <Link href="/planos">Fazer Upgrade</Link>
          </Button>
        </div>
      )}

      <Card className="border-slate-200 shadow-md bg-white">
        <CardHeader className="px-4 py-6">
          <div className="flex flex-col gap-4">
            <CardTitle>Listagem</CardTitle>
            
            <div className="flex flex-col md:flex-row items-end gap-4 w-full">
              <div className="w-full md:w-auto space-y-1">
                <Label className="text-xs font-bold text-slate-500">Início</Label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-white border-slate-300 w-full md:w-[150px]" />
              </div>

              <div className="w-full md:w-auto space-y-1">
                <Label className="text-xs font-bold text-slate-500">Fim</Label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-white border-slate-300 w-full md:w-[150px]" />
              </div>

              <div className="w-full md:flex-1 relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Buscar por nome..." 
                  className="pl-9 w-full bg-white border-slate-300"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome Completo</TableHead>
                <TableHead>Ficha</TableHead>
                <TableHead>Valor Sessão</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">Carregando...</TableCell>
                </TableRow>
              ) : filteredPatients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24 text-slate-500">Nenhum paciente encontrado.</TableCell>
                </TableRow>
              ) : (
                filteredPatients.slice(currentPage * 10, (currentPage + 1) * 10).map((patient) => (
                  <TableRow key={patient.id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{patient.full_name}</span>
                        <span className="text-xs text-slate-500">{patient.cpf}</span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Button variant="default" size="sm" className="bg-teal-600 hover:bg-teal-700 text-white font-bold h-8 shadow-sm" asChild>
                        <Link href={`/pacientes/${patient.id}`}>
                          <FileText className="h-4 w-4 mr-2" /> Ficha
                        </Link>
                      </Button>
                    </TableCell>

                    {/* 💉 CIRURGIA: FORMATAÇÃO PARA 150,00 */}
                    <TableCell className="font-semibold text-slate-700">
                      R$ {patient.session_value ? 
                        Number(patient.session_value).toLocaleString('pt-BR', { 
                          minimumFractionDigits: 2, 
                          maximumFractionDigits: 2 
                        }) : '0,00'}
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        {(patient.whatsapp || patient.phone) && <Phone className="h-3 w-3" />}
                        {patient.whatsapp || patient.phone || '-'}
                      </div>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Select value={patient.status || 'Ativo'} onValueChange={(v) => handleStatusChange(patient.id, v)}>
                          <SelectTrigger className={`w-[110px] h-8 text-xs font-bold border-none rounded-lg focus:ring-0 ${
                            patient.status === 'Ativo' ? 'bg-emerald-100 text-emerald-700' : 
                            patient.status === 'Inativo' ? 'bg-slate-100 text-slate-600' : 
                            'bg-amber-100 text-amber-700'
                          }`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Ativo">Ativo</SelectItem>
                            <SelectItem value="Inativo">Inativo</SelectItem>
                            <SelectItem value="Pendente">Pendente</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg" onClick={() => setPatientToDelete(patient.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>

          {/* Controles de Paginação */}
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-slate-100 gap-4">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0} className="w-full sm:w-auto">
              <ChevronLeft className="h-4 w-4 mr-2" /> Anterior
            </Button>
            <span className="text-xs text-slate-500 font-medium">Página {currentPage + 1} de {Math.max(1, Math.ceil(filteredPatients.length / 10))}</span>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => p + 1)} disabled={(currentPage + 1) * 10 >= filteredPatients.length} className="w-full sm:w-auto">
              Próximo <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!patientToDelete} onOpenChange={() => setPatientToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Paciente?</DialogTitle>
            <DialogDescription>Tem certeza que deseja excluir este paciente? Esta ação não pode ser desfeita.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPatientToDelete(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeletePatient}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}