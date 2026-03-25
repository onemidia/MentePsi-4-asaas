'use client'

import React, { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/client'
import { 
  Search, 
  Phone,
  FileText,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Loader2
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
  
  // Estados de Paginação e Filtro
  const [currentPage, setCurrentPage] = useState(0)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [patientToDelete, setPatientToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const { toast } = useToast()

  const fetchPatients = useCallback(async () => {
      try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        return
      }

      const { data } = await supabase
        .from('patients')
        .select('*')
        .eq('psychologist_id', user.id)
        .order('full_name', { ascending: true })

      if (data) {
        setPatients(data)
      }
      } catch (error) {
        console.error("Erro na busca de pacientes:", error)
      } finally {
        setLoading(false)
      }
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
    try {
      setPatients(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p))
      const supabase = createClient()
      const { error } = await supabase.from('patients').update({ status: newStatus }).eq('id', id)
      if (error) {
        toast({ variant: "destructive", title: "Erro ao atualizar", description: error.message })
        fetchPatients()
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro de conexão", description: e.message })
    }
  }

  const handleDeletePatient = async () => {
    if (!patientToDelete) return
    
    setIsDeleting(true)
    try {
      const supabase = createClient()
      
      // 1. Limpeza em Cascata (Deleta dependências para evitar erro de Chave Estrangeira)
      await Promise.all([
        supabase.from('appointments').delete().eq('patient_id', patientToDelete),
        supabase.from('patient_documents').delete().eq('patient_id', patientToDelete),
        supabase.from('financial_transactions').delete().eq('patient_id', patientToDelete),
        supabase.from('emotion_journal').delete().eq('patient_id', patientToDelete),
        supabase.from('clinical_evolutions').delete().eq('patient_id', patientToDelete),
        supabase.from('portal_settings').delete().eq('patient_id', patientToDelete),
        supabase.from('therapeutic_materials').delete().eq('patient_id', patientToDelete)
      ])

      // 2. Execução Final: Deleta o paciente
      const { error } = await supabase.from('patients').delete().eq('id', patientToDelete)
      if (error) {
        toast({ variant: "destructive", title: "Erro ao excluir", description: error.message })
      } else {
        toast({ title: "Paciente excluído" })
        await fetchPatients()
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro de conexão", description: e.message })
    } finally {
      setIsDeleting(false)
      setPatientToDelete(null)
    }
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-8 bg-slate-100 min-h-[100dvh]">
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
          
          <NewPatientModal onSuccess={fetchPatients} />
        </div>
      </div>

      <Card className="border-slate-200 shadow-md bg-white">
        <CardHeader className="px-4 py-6">
          <div className="flex flex-col gap-4">
            <CardTitle>Listagem</CardTitle>
            
            <div className="flex flex-col md:flex-row items-center gap-4 w-full">
              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 gap-2 shadow-sm w-full md:w-auto">
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-9 border-none focus-visible:ring-0 text-xs w-[120px] bg-transparent px-1" />
                <span className="text-slate-300">|</span>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-9 border-none focus-visible:ring-0 text-xs w-[120px] bg-transparent px-1" />
              </div>

              <div className="w-full md:flex-1 relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Buscar por nome..." 
                  className="pl-9 w-full bg-white border-slate-300 rounded-xl h-9"
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
                        <select 
                          value={patient.status || 'Ativo'} 
                          onChange={(e) => handleStatusChange(patient.id, e.target.value)}
                          className={`w-[110px] h-8 text-xs font-bold border-none rounded-lg focus:ring-0 focus:outline-none cursor-pointer ${
                            patient.status === 'Ativo' ? 'bg-emerald-100 text-emerald-700' : 
                            patient.status === 'Inativo' ? 'bg-slate-100 text-slate-600' : 
                            'bg-amber-100 text-amber-700'
                          }`}
                        >
                          <option value="Ativo">Ativo</option>
                          <option value="Inativo">Inativo</option>
                          <option value="Pendente">Pendente</option>
                        </select>
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
            <DialogDescription className="sr-only">Confirme para apagar o registro do paciente.</DialogDescription>
            <DialogDescription>Tem certeza que deseja excluir este paciente? Esta ação não pode ser desfeita.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPatientToDelete(null)} disabled={isDeleting}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeletePatient} disabled={isDeleting}>
              {isDeleting ? <><Loader2 className="animate-spin mr-2 h-4 w-4" /> EXCLUINDO...</> : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}