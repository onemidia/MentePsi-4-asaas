'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/client'
import { 
  DollarSign, Clock, CheckCircle2, Search, Plus, ReceiptText, 
  Loader2, TrendingUp, AlertCircle, Download, 
  AlertTriangle, RotateCcw, MessageCircle, Check, FileText, Trash2
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { format, isAfter, isBefore, startOfDay, startOfMonth, endOfMonth, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function FinanceiroPage() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [appointments, setAppointments] = useState<any[]>([])
  const [filteredAppointments, setFilteredAppointments] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [totals, setTotals] = useState({ recebidoNoPeriodo: 0, pendenteNoPeriodo: 0, previsaoNoPeriodo: 0, creditoTotal: 0, recebidoMesAtual: 0 })
  
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'))
  const [searchTerm, setSearchTerm] = useState('')
  const [currentTab, setCurrentTab] = useState('todos')
  const [newTransactionOpen, setNewTransactionOpen] = useState(false)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  
  // PAGINAÇÃO (Estados Independentes)
  const [pageLancamentos, setPageLancamentos] = useState(0)
  const [pageHistorico, setPageHistorico] = useState(0)
  
  const [patientsList, setPatientsList] = useState<any[]>([])
  const [transactionFilter, setTransactionFilter] = useState('todos')
  const [selectedPatient, setSelectedPatient] = useState<string>('')
  const [transactionValue, setTransactionValue] = useState('')
  const [selectedApt, setSelectedApt] = useState<any>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<Set<string>>(new Set())
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false)
  const [professionalData, setProfessionalData] = useState<any>(null)

  const supabase = createClient()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isMounted, setIsMounted] = useState(false)
  const { toast } = useToast()

  const fetchFinanceiro = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    
    // 1. Busca Agendamentos (para a lista e pendências)
    const { data: apts } = await supabase.from('appointments').select('*, patients(*)').eq('psychologist_id', user.id).order('start_time', { ascending: false })
    if (apts) setAppointments(apts)

    // 2. Busca Transações Financeiras (para o cálculo real de caixa)
    const { data: trans } = await supabase.from('financial_transactions').select('*').eq('psychologist_id', user.id).order('created_at', { ascending: false })
    if (trans) {
      setTransactions(trans)
    }
  }, [supabase])

  const fetchPatients = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('patients').select('*').eq('psychologist_id', user.id).order('full_name')
    
    if (data) {
      setPatientsList(data)
      // 💉 CIRURGIA DE PRECISÃO: Soma ABSOLUTA de todos os créditos em haver no banco de dados
      const somaTotalHaverCents = data.reduce((acc, p) => acc + Math.round((Number(p.credit_balance) || 0) * 100), 0)
      setTotals(prev => ({ ...prev, creditoTotal: somaTotalHaverCents / 100 }))
    }
  }, [supabase])

  const refreshData = async () => {
    setRefreshing(true)
    await Promise.all([fetchFinanceiro(), fetchPatients()])
    setRefreshing(false)
  }

  useEffect(() => {
    const loadInitial = async () => {
      setLoading(true)
      await Promise.all([fetchFinanceiro(), fetchPatients()])
      setLoading(false)
    }
    loadInitial()
  }, [fetchFinanceiro, fetchPatients])

  useEffect(() => {
    const fetchProf = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('professional_profile').select('*').eq('id', user.id).single()
        setProfessionalData(data)
      }
    }
    fetchProf()
  }, [supabase])

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    const start = startOfDay(parseISO(startDate))
    const end = parseISO(endDate + "T23:59:59")
    const hoje = startOfDay(new Date())
    
    // 📅 Lógica para o Card "Recebido no Mês" (Fixo no mês atual)
    const startCurrentMonth = startOfMonth(hoje)
    const endCurrentMonth = endOfMonth(hoje)

    const appointmentsNoPeriodo = appointments.filter(a => {
      const date = new Date(a.start_time)
      return date >= start && date <= end
    })

    // 💰 CÁLCULO CONTÁBIL SEGURO (CENTAVOS) - Baseado em Transações Reais
    const transactionsNoPeriodo = transactions.filter(t => {
      const date = new Date(t.created_at)
      return date >= start && date <= end && t.type === 'income'
    })

    // Filtro específico para o mês corrente (Card de Destaque)
    const transactionsMesAtual = transactions.filter(t => {
      const date = new Date(t.created_at)
      return date >= startCurrentMonth && date <= endCurrentMonth && t.type === 'income'
    })

    const recebidoCents = transactionsNoPeriodo.reduce((acc, t) => acc + Math.round(Number(t.amount) * 100), 0)
    const recebidoMesAtualCents = transactionsMesAtual.reduce((acc, t) => acc + Math.round(Number(t.amount) * 100), 0)
    
    // 2. Corrigir Card de Dívida: Usa 'appointments' (Global) em vez de 'appointmentsNoPeriodo'
    // para somar pendências de sessões antigas que já foram Realizadas.
    const pendenteRealCents = appointments
      .filter(a => {
        const isPast = new Date(a.start_time) < new Date()
        const effectiveStatus = (a.status === 'Agendado' && isPast) ? 'Realizada' : a.status
        return effectiveStatus === 'Realizada' && a.payment_status !== 'Pago' && a.payment_status !== 'paid'
      })
      .reduce((acc, a) => {
        const price = Math.round(Number(a.price) * 100)
        const paid = Math.round(Number(a.amount_paid || 0) * 100)
        return acc + Math.max(0, price - paid)
      }, 0)

    let previsaoCents = appointmentsNoPeriodo
      .filter(a => isAfter(new Date(a.start_time), hoje) && a.status === 'Agendado')
      .reduce((acc, a) => acc + Math.round(Number(a.price) * 100), 0)

    const totalCreditCents = patientsList.reduce((acc, p) => acc + Math.round((Number(p.credit_balance) || 0) * 100), 0)
    previsaoCents = Math.max(0, previsaoCents - totalCreditCents)

    setTotals(prev => ({ 
      ...prev, 
      recebidoNoPeriodo: recebidoCents / 100, 
      pendenteNoPeriodo: pendenteRealCents / 100, 
      previsaoNoPeriodo: previsaoCents / 100,
      recebidoMesAtual: recebidoMesAtualCents / 100
    }))

    let result = [...appointmentsNoPeriodo]
    if (currentTab === 'pendentes') result = result.filter(a => a.payment_status !== 'Pago' && a.payment_status !== 'paid')
    else if (currentTab === 'pagos') result = result.filter(a => a.payment_status === 'Pago' || a.payment_status === 'paid')
    if (searchTerm) result = result.filter(a => a.patients?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()))
    setFilteredAppointments(result)
  }, [appointments, transactions, patientsList, currentTab, searchTerm, startDate, endDate])

  // 🔔 EFEITO: Aplica filtro vindo da URL (Dashboard)
  useEffect(() => {
    if (searchParams.get('filter') === 'pendentes') {
      setTransactionFilter('pendentes')
    }
  }, [searchParams])

  // 🔍 FILTRO DE TRANSAÇÕES (Status + Data)
  const filteredTransactions = transactions.filter(t => {
    const tDate = new Date(t.created_at)
    const start = startOfDay(parseISO(startDate))
    const end = parseISO(endDate + "T23:59:59")
    const dateMatch = tDate >= start && tDate <= end
    const statusMatch = transactionFilter === 'pendentes' ? t.status === 'pending_review' : true
    return dateMatch && statusMatch
  })

  // 💉 POLÍTICA CONTÁBIL DE SUCESSO (Integer Math)
  const handleProcessTransaction = async (patientId: string, amount: number, appointmentId?: string) => {
    setRefreshing(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return

    // 1. Registra a entrada do dinheiro
    const { error } = await supabase
      .from('financial_transactions')
      .insert([
        {
          psychologist_id: user.id,
          patient_id: patientId,
          appointment_id: appointmentId || null,
          amount: amount,
          type: 'income',
          category: 'Sessão',
          description: appointmentId ? 'Pagamento de Sessão (Baixa Manual)' : 'Recebimento de paciente (Lançamento Inteligente)',
          status: 'paid'
        }
      ])

    if (error) {
      console.error("Erro detalhado:", JSON.stringify(error, null, 2))
      toast({
        variant: "destructive",
        title: "Erro no financeiro",
        description: error.message
      })
    } else {
      if (appointmentId) {
        // 2.A. PAGAMENTO DE SESSÃO ESPECÍFICA (Baixa Manual)
        // 💰 LÓGICA DE PAGAMENTO PARCIAL:
        // Buscamos o valor já pago para somar, em vez de substituir.
        let currentPaid = 0
        let price = 0
        
        // Se temos o agendamento selecionado em memória, usamos ele. Senão, buscamos no banco.
        if (selectedApt && selectedApt.id === appointmentId) {
          currentPaid = Number(selectedApt.amount_paid || 0)
          price = Number(selectedApt.price || 0)
        } else {
          const { data: apt } = await supabase.from('appointments').select('amount_paid, price').eq('id', appointmentId).single()
          if (apt) { currentPaid = Number(apt.amount_paid || 0); price = Number(apt.price || 0) }
        }

        const newTotalPaid = currentPaid + amount
        const isFullyPaid = Math.round(newTotalPaid * 100) >= Math.round(price * 100)

        const { error: aptError } = await supabase
          .from('appointments')
          .update({ amount_paid: newTotalPaid, payment_status: isFullyPaid ? 'Pago' : 'Pendente' })
          .eq('id', appointmentId)

        if (aptError) {
          console.error("Erro ao atualizar agendamento:", aptError)
          toast({ variant: "destructive", title: "Erro", description: "Falha ao atualizar agendamento: " + aptError.message })
          setRefreshing(false)
          return
        }
      } else {
        // 2.B. AMORTIZAÇÃO AUTOMÁTICA (Lançamento Inteligente)
        // Distribui o valor entre as sessões mais antigas (FIFO)
        let remainingAmount = amount
        
        const { data: pendingApts } = await supabase
          .from('appointments')
          .select('*')
          .eq('patient_id', patientId)
          .not('payment_status', 'in', '("Pago","paid")')
          .order('start_time', { ascending: true }) // Mais antigas primeiro

        if (pendingApts) {
          for (const apt of pendingApts) {
            if (remainingAmount <= 0.01) break // Acabou o dinheiro

            const price = Number(apt.price)
            const paid = Number(apt.amount_paid || 0)
            const debt = price - paid

            if (debt > 0) {
              const payNow = Math.min(remainingAmount, debt)
              const newPaid = paid + payNow
              const isFullyPaid = Math.round(newPaid * 100) >= Math.round(price * 100)

              await supabase
                .from('appointments')
                .update({ 
                  amount_paid: newPaid, 
                  payment_status: isFullyPaid ? 'Pago' : 'Pendente' 
                })
                .eq('id', apt.id)

              remainingAmount -= payNow
            }
          }
        }

        // Se sobrou dinheiro após pagar tudo, vai para o Crédito
        if (remainingAmount > 0.01) {
           const { data: pat } = await supabase.from('patients').select('credit_balance').eq('id', patientId).single()
           const currentCredit = Number(pat?.credit_balance || 0)
           
           await supabase.from('patients').update({
             credit_balance: currentCredit + remainingAmount
           }).eq('id', patientId)
        }
      }

      // 🧾 GERAÇÃO AUTOMÁTICA DE RECIBO E ARMAZENAMENTO
      try {
        // Busca dados necessários se não estiverem em memória
        const patient = patientsList.find(p => p.id === patientId)
        const profName = professionalData?.full_name || "Alvino Buriti"
        const profCRP = professionalData?.crp || "CRP não informado"
        
        if (patient && user) {
           // 1. Contador de Recibos
           let receiptNumber = 1
           let { data: counter } = await supabase.from('receipt_counters').select('current_count').eq('psychologist_id', user.id).single()
           if (!counter) {
             const { data: newCounter } = await supabase.from('receipt_counters').insert({ psychologist_id: user.id, current_count: 0 }).select().single()
             counter = newCounter
           }
           receiptNumber = (counter?.current_count || 0) + 1
           await supabase.from('receipt_counters').update({ current_count: receiptNumber }).eq('psychologist_id', user.id)

           // 2. Gera o PDF em memória (Blob)
           const doc = new jsPDF()
           doc.setFontSize(16); doc.setTextColor(13, 148, 136);
           doc.text(`RECIBO DE PAGAMENTO Nº ${String(receiptNumber).padStart(3, '0')}`, 105, 20, { align: "center" })
           doc.setTextColor(0, 0, 0); doc.setFontSize(10);
           doc.text(profName, 105, 30, { align: "center" }); doc.text(`CRP: ${profCRP}`, 105, 35, { align: "center" })
           doc.setFontSize(12);
           doc.text(`Recebi de ${patient.full_name}, CPF ${patient.cpf || '...'}`, 14, 50)
           doc.text(`a importância de ${amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 14, 57)
           doc.text(`referente a serviços de psicologia.`, 14, 64)
           doc.text(`${professionalData?.city || "Local"}, ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`, 105, 120, { align: "center" })
           doc.setFontSize(8); doc.setTextColor(150);
           doc.text(`Documento emitido automaticamente por ${professionalData?.clinic_name || "Sistema de Gestão"}.`, 105, 140, { align: "center" })

           const pdfBlob = doc.output('blob')

           // 3. Upload para o Storage
           const fileName = `${patientId}/recibo_${receiptNumber}_${Date.now()}.pdf`
           const { error: uploadError } = await supabase.storage.from('patient-documents').upload(fileName, pdfBlob)
           
           if (!uploadError) {
             const { data: { publicUrl } } = supabase.storage.from('patient-documents').getPublicUrl(fileName)
             
             // 4. Salva referência na Ficha Clínica (Documentos)
             await supabase.from('patient_documents').insert({
               patient_id: patientId,
               psychologist_id: user.id,
               title: `Recibo Nº ${String(receiptNumber).padStart(3, '0')} - ${format(new Date(), 'dd/MM/yyyy')}`,
               file_url: publicUrl,
               status: 'Gerado'
             })
           }
        }
      } catch (err) { console.error("Erro ao gerar recibo automático:", err) }

      toast({ title: "Pagamento registrado com sucesso!" })
      await refreshData()
    }
    
    setRefreshing(false)
    setNewTransactionOpen(false)
    setPaymentModalOpen(false)
    setPaymentAmount('')
    setSelectedApt(null)
  }

  // 💰 NOVA LÓGICA: Usar Saldo em Haver
  const handleUseCredit = async () => {
    if (!selectedApt) return
    setRefreshing(true)
    
    const amountToPay = parseFloat(paymentAmount.replace(/\./g, '').replace(',', '.'))
    const currentCredit = Number(selectedApt.patients?.credit_balance || 0)

    if (amountToPay > currentCredit) {
      toast({ variant: "destructive", title: "Saldo insuficiente", description: "O valor a baixar é maior que o crédito disponível." })
      setRefreshing(false)
      return
    }

    // 💰 LÓGICA DE PAGAMENTO PARCIAL (CRÉDITO):
    const currentPaid = Number(selectedApt.amount_paid || 0)
    const price = Number(selectedApt.price || 0)
    const newTotalPaid = currentPaid + amountToPay
    const isFullyPaid = Math.round(newTotalPaid * 100) >= Math.round(price * 100)

    // 1. Atualiza o agendamento
    const { error: aptError } = await supabase.from('appointments').update({
      amount_paid: newTotalPaid,
      payment_status: isFullyPaid ? 'Pago' : 'Pendente'
    }).eq('id', selectedApt.id)

    if (aptError) {
      toast({ variant: "destructive", title: "Erro", description: aptError.message })
      setRefreshing(false)
      return
    }

    // 2. Subtrai do saldo do paciente
    await supabase.from('patients').update({
      credit_balance: currentCredit - amountToPay
    }).eq('id', selectedApt.patient_id)

    // 3. Gera log de uso (Não é receita, é uso de crédito)
    const { error: txError } = await supabase.from('financial_transactions').insert([{
      psychologist_id: selectedApt.psychologist_id,
      patient_id: selectedApt.patient_id,
      appointment_id: selectedApt.id,
      amount: amountToPay,
      type: 'income',
      category: 'Sessão (Crédito)',
      description: 'Abatimento manual via Saldo em Haver',
      status: 'paid'
    }])

    if (txError) {
      toast({ variant: "destructive", title: "Erro", description: txError.message })
      setRefreshing(false)
      return
    }

    toast({ title: "Saldo utilizado com sucesso!" })
    setPaymentModalOpen(false)
    setPaymentAmount('')
    setSelectedApt(null)
    await refreshData()
    setRefreshing(false)
  }

  const handleGenerateReceipt = (apt: any) => {
    const valor = Number(apt.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const dataSessao = format(new Date(apt.start_time), "dd/MM/yyyy");
    const text = `RECIBO\nRecebemos de ${apt.patients?.full_name} o valor de R$ ${valor} ref. à sessão de psicoterapia realizada em ${dataSessao}.`
    window.open(`https://wa.me/${apt.patients?.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank')
  }

  // ↩️ LÓGICA DE ESTORNO (REVERSÃO)
  const handleReverseTransaction = async (t: any) => {
    if (!confirm("Tem certeza que deseja estornar este lançamento? O saldo será revertido.")) return

    setRefreshing(true)
    const supabase = createClient()

    // 1. Remove a transação
    const { error } = await supabase.from('financial_transactions').delete().eq('id', t.id)
    
    if (error) {
      toast({ variant: "destructive", title: "Erro ao estornar", description: error.message })
      setRefreshing(false)
      return
    }

    // 2. Reverte os efeitos (Saldo e Status)
    if (t.appointment_id) {
      // Busca dados atuais do agendamento
      const { data: apt } = await supabase.from('appointments').select('amount_paid, price').eq('id', t.appointment_id).single()
      
      if (apt) {
        // Subtrai o valor estornado do total pago
        const newPaid = Math.max(0, Number(apt.amount_paid) - Number(t.amount))
        const isFullyPaid = Math.round(newPaid * 100) >= Math.round(Number(apt.price) * 100)

        await supabase.from('appointments').update({
          amount_paid: newPaid,
          payment_status: isFullyPaid ? 'Pago' : 'Pendente'
        }).eq('id', t.appointment_id)
      }

      // Se foi uso de crédito, devolve o saldo para o paciente
      if (t.type === 'usage') {
        const { data: pat } = await supabase.from('patients').select('credit_balance').eq('id', t.patient_id).single()
        if (pat) {
          await supabase.from('patients').update({
            credit_balance: Number(pat.credit_balance) + Number(t.amount)
          }).eq('id', t.patient_id)
        }
      }
    }

      // 🧾 GERAÇÃO AUTOMÁTICA DE RECIBO E ARMAZENAMENTO
      try {
        // Busca dados necessários se não estiverem em memória
        const patient = patientsList.find(p => p.id === patientId)
        const profName = professionalData?.full_name || "Alvino Buriti"
        const profCRP = professionalData?.crp || "CRP não informado"
        
        if (patient && user) {
           // 1. Contador de Recibos
           let receiptNumber = 1
           let { data: counter } = await supabase.from('receipt_counters').select('current_count').eq('psychologist_id', user.id).single()
           if (!counter) {
             const { data: newCounter } = await supabase.from('receipt_counters').insert({ psychologist_id: user.id, current_count: 0 }).select().single()
             counter = newCounter
           }
           receiptNumber = (counter?.current_count || 0) + 1
           await supabase.from('receipt_counters').update({ current_count: receiptNumber }).eq('psychologist_id', user.id)

           // 2. Gera o PDF em memória (Blob)
           const doc = new jsPDF()
           doc.setFontSize(16); doc.setTextColor(13, 148, 136);
           doc.text(`RECIBO DE PAGAMENTO Nº ${String(receiptNumber).padStart(3, '0')}`, 105, 20, { align: "center" })
           doc.setTextColor(0, 0, 0); doc.setFontSize(10);
           doc.text(profName, 105, 30, { align: "center" }); doc.text(`CRP: ${profCRP}`, 105, 35, { align: "center" })
           doc.setFontSize(12);
           doc.text(`Recebi de ${patient.full_name}, CPF ${patient.cpf || '...'}`, 14, 50)
           doc.text(`a importância de ${amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 14, 57)
           doc.text(`referente a serviços de psicologia.`, 14, 64)
           doc.text(`${professionalData?.city || "Local"}, ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`, 105, 120, { align: "center" })
           doc.setFontSize(8); doc.setTextColor(150);
           doc.text(`Documento emitido automaticamente por ${professionalData?.clinic_name || "Sistema de Gestão"}.`, 105, 140, { align: "center" })

           const pdfBlob = doc.output('blob')

           // 3. Upload para o Storage
           const fileName = `${patientId}/recibo_${receiptNumber}_${Date.now()}.pdf`
           const { error: uploadError } = await supabase.storage.from('patient-documents').upload(fileName, pdfBlob)
           
           if (!uploadError) {
             const { data: { publicUrl } } = supabase.storage.from('patient-documents').getPublicUrl(fileName)
             
             // 4. Salva referência na Ficha Clínica (Documentos)
             await supabase.from('patient_documents').insert({
               patient_id: patientId,
               psychologist_id: user.id,
               title: `Recibo Nº ${String(receiptNumber).padStart(3, '0')} - ${format(new Date(), 'dd/MM/yyyy')}`,
               file_url: publicUrl,
               status: 'Gerado'
             })
           }
        }
      } catch (err) { console.error("Erro ao gerar recibo automático:", err) }

    toast({ title: "Transação estornada com sucesso!" })
    await refreshData()
  }

  const pendingCount = transactions.filter(t => t.status === 'pending_review').length

  // ✅ APROVAÇÃO DE PAGAMENTO DO PORTAL
  const handleConfirmPendingTransaction = async (t: any) => {
    setRefreshing(true)
    const supabase = createClient()

    try {
      // 1. Atualiza status da transação para CONCLUIDO
      const { error: updateError } = await supabase
        .from('financial_transactions')
        .update({ status: 'paid' })
        .eq('id', t.id)

      if (updateError) throw updateError

      // 2. Amortização Automática (Lógica FIFO - Primeiro a entrar, primeiro a sair)
      let remainingAmount = Number(t.amount)
      
      const { data: pendingApts } = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_id', t.patient_id)
        .not('payment_status', 'in', '("Pago","paid")')
        .order('start_time', { ascending: true })

      if (pendingApts) {
        for (const apt of pendingApts) {
          if (remainingAmount <= 0.01) break

          const price = Number(apt.price)
          const paid = Number(apt.amount_paid || 0)
          const debt = price - paid

          if (debt > 0) {
            const payNow = Math.min(remainingAmount, debt)
            const newPaid = paid + payNow
            const isFullyPaid = Math.round(newPaid * 100) >= Math.round(price * 100)

            await supabase.from('appointments').update({ 
                amount_paid: newPaid, 
                payment_status: isFullyPaid ? 'Pago' : 'Pendente' 
              }).eq('id', apt.id)

            remainingAmount -= payNow
          }
        }
      }

      // 3. Sobra vai para crédito do paciente
      if (remainingAmount > 0.01) {
         const { data: pat } = await supabase.from('patients').select('credit_balance').eq('id', t.patient_id).single()
         await supabase.from('patients').update({ credit_balance: (Number(pat?.credit_balance) || 0) + remainingAmount }).eq('id', t.patient_id)
      }

      toast({ title: "Pagamento confirmado!", description: "Valores baixados e saldo atualizado." })
      await refreshData()
    } catch (error: any) { toast({ variant: "destructive", title: "Erro", description: error.message }) } finally { setRefreshing(false) }
  }

  const formatBRL = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const handleCurrencyInput = (value: string, setter: (v: string) => void) => {
    const cleanValue = value.replace(/\D/g, "");
    setter((Number(cleanValue) / 100).toFixed(2).replace('.', ','));
  }

  const handleExportExcel = () => {
    const data = filteredAppointments.map(apt => {
      const pendente = Number(apt.price) - Number(apt.amount_paid || 0)
      return {
        "Data": format(new Date(apt.start_time), "dd/MM/yyyy HH:mm"),
        "Paciente": apt.patients?.full_name || "N/A",
        "Valor (R$)": Number(apt.price),
        "Pago (R$)": Number(apt.amount_paid || 0),
        "Pendente (R$)": pendente,
        "Status": apt.payment_status
      }
    })

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Relatório Financeiro")
    
    const fileName = `Relatorio_Financeiro_${format(parseISO(startDate), 'MMMM_yyyy', { locale: ptBR })}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedItems)
    if (newSet.has(id)) newSet.delete(id)
    else newSet.add(id)
    setSelectedItems(newSet)
  }

  const toggleAll = () => {
    if (selectedItems.size === filteredAppointments.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(filteredAppointments.map(a => a.id)))
    }
  }

  // 🗑️ EXCLUSÃO EM MASSA
  const handleBulkDelete = async () => {
    setRefreshing(true)
    const ids = Array.from(selectedTransactionIds)
    const { error } = await supabase.from('financial_transactions').delete().in('id', ids)
    
    if (error) {
        toast({ variant: "destructive", title: "Erro", description: error.message })
    } else {
        toast({ title: "Transações excluídas" })
        setSelectedTransactionIds(new Set())
        await refreshData()
    }
    setRefreshing(false)
    setDeleteAlertOpen(false)
  }

  // ✅ SELEÇÃO DE TRANSAÇÕES
  const toggleTransactionSelection = (id: string) => {
    const newSet = new Set(selectedTransactionIds)
    if (newSet.has(id)) newSet.delete(id)
    else newSet.add(id)
    setSelectedTransactionIds(newSet)
  }

  const toggleAllTransactions = () => {
    const visibleIds = filteredTransactions.slice(pageHistorico * 10, (pageHistorico + 1) * 10).map(t => t.id)
    const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedTransactionIds.has(id))
    const newSet = new Set(selectedTransactionIds)
    if (allSelected) {
      visibleIds.forEach(id => newSet.delete(id))
    } else {
      visibleIds.forEach(id => newSet.add(id))
    }
    setSelectedTransactionIds(newSet)
  }

  const handleSendWhatsAppReceipt = async () => {
    const selected = filteredAppointments.filter(a => selectedItems.has(a.id))
    if (selected.length === 0) return

    const patient = selected[0].patients
    const dates = selected.map(a => format(new Date(a.start_time), "dd/MM")).join(", ")
    
    // Busca o número provável do próximo recibo (apenas visualização)
    const { data: { user } } = await supabase.auth.getUser()
    let nextNum = 1
    if (user) {
      const { data } = await supabase.from('receipt_counters').select('current_count').eq('psychologist_id', user.id).single()
      if (data) nextNum = (data.current_count || 0) + 1
    }
    const receiptNum = String(nextNum).padStart(3, '0')

    const message = `Olá ${patient?.full_name?.split(' ')[0]}, segue o seu Recibo Nº ${receiptNum} referente às sessões de ${dates}. (Arquivo em anexo)`
    
    window.open(`https://wa.me/${patient?.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank')
  }

  const handleGenerateBatchPDF = async () => {
    const selected = filteredAppointments.filter(a => selectedItems.has(a.id))
    if (selected.length === 0) return

    try {
    const firstPatientId = selected[0].patient_id
    const mixed = selected.some(a => a.patient_id !== firstPatientId)
    if (mixed) {
      toast({ variant: "destructive", title: "Erro no Recibo", description: "Selecione sessões de apenas um paciente." })
      return
    }

    const patient = selected[0].patients

    // Validação de Dados Obrigatórios
    if (!patient?.cpf) {
      toast({ variant: "destructive", title: "CPF Ausente", description: `O paciente ${patient?.full_name} não possui CPF cadastrado.` })
      return
    }

    // Dados do Profissional (Com Fallback para Alvino Buriti)
    const profName = professionalData?.full_name || "Alvino Buriti"
    const profCRP = professionalData?.crp || "CRP não informado"
    const profAddress = professionalData?.address || "Endereço não informado"

    // 🔢 LÓGICA DO CONTADOR DE RECIBOS
    // 1. Busca ou Cria o contador
    const { data: { user } } = await supabase.auth.getUser()
    let receiptNumber = 1
    
    if (user) {
      let { data: counter } = await supabase.from('receipt_counters').select('current_count').eq('psychologist_id', user.id).single()
      
      if (!counter) {
        const { data: newCounter } = await supabase.from('receipt_counters').insert({ psychologist_id: user.id, current_count: 0 }).select().single()
        counter = newCounter
      }
      
      receiptNumber = (counter?.current_count || 0) + 1
      
      // 2. Incrementa o contador no banco
      await supabase.from('receipt_counters').update({ current_count: receiptNumber }).eq('psychologist_id', user.id)
    }

    const doc = new jsPDF()
    
    // Header
    doc.setFontSize(16)
    doc.setTextColor(13, 148, 136) // Teal color
    doc.text(`RECIBO DE PAGAMENTO Nº ${String(receiptNumber).padStart(3, '0')}`, 105, 20, { align: "center" })
    
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(10)
    doc.text(profName, 105, 30, { align: "center" })
    doc.text(`CRP: ${profCRP} | ${profAddress}`, 105, 35, { align: "center" })

    // Body
    const total = selected.reduce((acc, curr) => acc + Number(curr.price), 0)
    
    doc.setFontSize(12)
    doc.text(`Recebi de ${patient.full_name}, CPF ${patient.cpf}`, 14, 50)
    doc.text(`a importância de ${total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 14, 57)
    doc.text(`referente aos serviços de psicoterapia listados abaixo:`, 14, 64)

    // Table
    const tableData = selected.map(a => [
      format(new Date(a.start_time), "dd/MM/yyyy"),
      "Sessão de Psicoterapia",
      Number(a.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    ])

    autoTable(doc, {
      startY: 70,
      head: [['Data', 'Descrição', 'Valor']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [13, 148, 136] }
    })

    // Footer
    const finalY = (doc as any).lastAutoTable.finalY + 40
    doc.text("________________________________________________", 105, finalY, { align: "center" })
    doc.text("Assinatura do Profissional", 105, finalY + 5, { align: "center" })
    doc.text(`${professionalData?.city || "Local"}, ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`, 105, finalY + 15, { align: "center" })

    // ⚖️ RODAPÉ ÉTICO
    doc.setFontSize(8)
    doc.setTextColor(150)
    doc.text("Documento emitido em conformidade com a Resolução CFP nº 010/05. Contém dados sensíveis sob sigilo profissional.", 105, 285, { align: "center" })

    doc.save('Recibo_MentePsi.pdf')
    } catch (error: any) {
      console.error(error)
      alert('Erro ao gerar PDF: ' + error.message)
    }
  }

  if (!isMounted) return null

  return (
    <div className="p-6 space-y-6 bg-slate-100 min-h-screen">
      
      {/* ⚠️ BANNER DE ALERTA FINANCEIRO */}
      {pendingCount > 0 && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-3 text-amber-800">
            <AlertTriangle className="h-6 w-6 text-amber-600" />
            <p className="font-bold text-sm sm:text-base">⚠️ Você tem <span className="text-lg">{pendingCount}</span> novos comprovantes do Portal aguardando conferência.</p>
          </div>
          <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-sm" onClick={() => setTransactionFilter('pendentes')}>Ver e Aprovar</Button>
        </div>
      )}

      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div><div className="flex items-center gap-2"><h1 className="text-3xl font-black text-slate-800 tracking-tight">Financeiro</h1>{refreshing && <Loader2 className="animate-spin text-teal-600 h-5 w-5" />}</div><p className="text-slate-500 font-medium text-sm">Gestão por período e lançamentos inteligentes.</p></div>
        <div className="flex flex-col sm:flex-row gap-2 w-full xl:w-auto">
          {selectedItems.size > 0 && (
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto font-bold border-green-200 bg-green-50 text-green-700 shadow-sm hover:bg-green-100 rounded-2xl h-10" onClick={handleSendWhatsAppReceipt}>
                <MessageCircle className="mr-2 h-4 w-4"/> Enviar WhatsApp
              </Button>
              <Button variant="outline" className="w-full sm:w-auto font-bold border-teal-200 bg-teal-50 text-teal-700 shadow-sm hover:bg-teal-100 rounded-2xl h-10" onClick={handleGenerateBatchPDF}>
                <ReceiptText className="mr-2 h-4 w-4"/> Gerar Recibo ({selectedItems.size})
              </Button>
            </div>
          )}
          <Button variant="outline" className="w-full sm:w-auto font-bold border-slate-200 text-slate-600 shadow-sm rounded-2xl h-10" onClick={handleExportExcel}><Download className="mr-2 h-4 w-4"/> Exportar Excel</Button>
          <Button className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 font-bold shadow-sm hover:shadow-md text-white rounded-2xl h-10" onClick={() => setNewTransactionOpen(true)}><Plus className="mr-2 h-4 w-4"/> Lançar Recebimento</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* 🌟 NOVO CARD DE DESTAQUE */}
        <StatCard title="Recebido no Mês" value={totals.recebidoMesAtual} icon={<DollarSign/>} color="emerald" subtitle={format(new Date(), 'MMMM/yyyy', { locale: ptBR })} />
        
        <StatCard title="Recebido no Período" value={totals.recebidoNoPeriodo} icon={<CheckCircle2/>} color="teal" subtitle="Filtro selecionado" />
        <StatCard title="Valores a Receber" value={totals.pendenteNoPeriodo} icon={<AlertCircle/>} color="red" subtitle="Sessões já realizadas" />
        <StatCard title="Projeção do Período" value={totals.previsaoNoPeriodo} icon={<TrendingUp/>} color="blue" subtitle="Agendamentos futuros" />
        {/* 💉 CARD CORRIGIDO: Agora reflete os R$ 95,00 ou R$ 1.150,00 dependendo do saldo do banco */}
        <StatCard title="Crédito Clientes" value={totals.creditoTotal} icon={<Clock/>} color="amber" subtitle="Total acumulado em haver" />
      </div>

      <Card className="border border-slate-200 shadow-md overflow-hidden bg-white rounded-[24px]">
        <CardHeader className="flex flex-col xl:flex-row items-start xl:items-center justify-between border-b gap-4 p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full xl:w-auto">
            <CardTitle className="text-lg font-black text-slate-800">Lançamentos</CardTitle>
            <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-1 rounded-xl border px-3">
              <Label className="text-[10px] font-black text-slate-400 uppercase">De:</Label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent border-none text-xs font-bold focus:ring-0 h-8" />
              <div className="w-px h-4 bg-slate-200 mx-1" />
              <Label className="text-[10px] font-black text-slate-400 uppercase">Até:</Label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent border-none text-xs font-bold focus:ring-0 h-8" />
            </div>
          </div>
          <div className="relative w-full md:w-64"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" /><Input placeholder="Buscar paciente..." className="pl-9 bg-white h-9 rounded-xl border-slate-300" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs defaultValue="todos" onValueChange={setCurrentTab}>
            <TabsList className="m-4 bg-slate-100 w-auto flex-wrap h-auto rounded-xl"><TabsTrigger value="todos" className="flex-1 rounded-lg">Todos</TabsTrigger><TabsTrigger value="pendentes" className="flex-1 rounded-lg">Pendentes</TabsTrigger><TabsTrigger value="pagos" className="flex-1 rounded-lg">Pagos</TabsTrigger></TabsList>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/50 text-slate-500 uppercase text-[10px] font-black tracking-widest border-y">
                  <tr><th className="p-4 w-[50px]"><input type="checkbox" onChange={toggleAll} checked={filteredAppointments.length > 0 && selectedItems.size === filteredAppointments.length} className="rounded border-slate-300 text-teal-600 focus:ring-teal-500" /></th><th className="p-4 text-left">Data</th><th className="p-4 text-left">Paciente</th><th className="p-4 text-left">Valor</th><th className="p-4 text-left hidden md:table-cell">Pendente</th><th className="p-4 text-left hidden md:table-cell">Status</th><th className="p-4 text-right">Ação</th></tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {loading ? (<tr><td colSpan={7} className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-teal-600"/></td></tr>) : filteredAppointments?.slice(pageLancamentos * 10, (pageLancamentos + 1) * 10).map(apt => {
                    const pendente = Number(apt.price) - Number(apt.amount_paid || 0);
                    const isPaid = apt.payment_status === 'Pago' || apt.payment_status === 'paid';
                    return (
                      <tr key={apt.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4"><input type="checkbox" checked={selectedItems.has(apt.id)} onChange={() => toggleSelection(apt.id)} className="rounded border-slate-300 text-teal-600 focus:ring-teal-500" /></td>
                        <td className="p-4 text-slate-600">{format(new Date(apt.start_time), "dd/MM/yyyy HH:mm")}</td>
                        <td className="p-4"><span className="font-bold text-slate-700">{apt.patients?.full_name}</span></td>
                        <td className="p-4 font-bold">{formatBRL(Number(apt.price))}</td>
                        <td className="p-4 hidden md:table-cell"><span className={pendente > 0.01 ? "text-red-600 font-black" : "text-slate-400"}>{formatBRL(pendente)}</span></td>
                        <td className="p-4 hidden md:table-cell"><Badge variant="outline" className={isPaid ? 'bg-teal-50 text-teal-700 border-teal-200' : 'bg-amber-50 text-amber-700 border-amber-200'}>{isPaid ? 'Pago' : 'Pendente'}</Badge></td>
                        <td className="p-4 text-right flex justify-end gap-2">
                          <Button size="icon" variant="ghost" className="text-slate-400 hover:text-teal-600" onClick={() => handleGenerateReceipt(apt)}><ReceiptText size={16}/></Button>
                          {!isPaid && (
                            <Button size="sm" variant="outline" className="h-7 text-[10px] font-bold border-teal-600 text-teal-600 hover:bg-teal-600 hover:text-white rounded-lg" onClick={() => {
                              setSelectedApt(apt);
                              setPaymentAmount((Number(apt.price) - Number(apt.amount_paid || 0)).toFixed(2).replace('.', ','));
                              setPaymentModalOpen(true);
                            }}>Baixar</Button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            
            {/* CONTROLES DE PAGINAÇÃO - LANÇAMENTOS */}
            <div className="flex items-center justify-between p-4 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setPageLancamentos(p => Math.max(0, p - 1))} disabled={pageLancamentos === 0}>Anterior</Button>
              <span className="text-xs text-slate-500 font-medium">Página {pageLancamentos + 1} de {Math.max(1, Math.ceil((filteredAppointments?.length || 0) / 10))}</span>
              <Button variant="outline" size="sm" onClick={() => setPageLancamentos(p => p + 1)} disabled={(pageLancamentos + 1) * 10 >= (filteredAppointments?.length || 0)}>Próximo</Button>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* TABELA DE HISTÓRICO DE TRANSAÇÕES (PARA ESTORNO) */}
      <Card className="border border-slate-200 shadow-md overflow-hidden bg-white mt-6 rounded-[24px]">
        <CardHeader className="border-b p-6">
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
            <div className="flex items-center gap-4">
              <CardTitle className="text-lg font-black text-slate-800 flex items-center gap-2">
                <ReceiptText className="h-5 w-5 text-slate-500"/> Histórico de Transações
              </CardTitle>
              
              {/* BOTÃO DE EXCLUSÃO EM MASSA */}
              {selectedTransactionIds.size > 0 && (
                <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="h-8 text-xs font-bold animate-in fade-in zoom-in">
                      <Trash2 className="mr-2 h-3 w-3" /> Excluir ({selectedTransactionIds.size})
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir Transações?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Você está prestes a excluir {selectedTransactionIds.size} transações permanentemente. Isso afetará o saldo do caixa.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleBulkDelete} className="bg-red-600 hover:bg-red-700">Confirmar Exclusão</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-center w-full xl:w-auto">
              {/* FILTRO DE DATA NO HISTÓRICO */}
              <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border px-3 w-full sm:w-auto">
                <Label className="text-[10px] font-black text-slate-400 uppercase">Período:</Label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent border-none text-xs font-bold focus:ring-0 h-8 w-24" />
                <span className="text-slate-300">|</span>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent border-none text-xs font-bold focus:ring-0 h-8 w-24" />
              </div>

              <div className="flex gap-2 bg-slate-50 p-1 rounded-xl w-full sm:w-auto">
                <Button variant={transactionFilter === 'todos' ? 'secondary' : 'ghost'} size="sm" onClick={() => setTransactionFilter('todos')} className="text-xs font-bold rounded-lg h-8 flex-1 sm:flex-none">Todos</Button>
                <Button variant={transactionFilter === 'pendentes' ? 'secondary' : 'ghost'} size="sm" onClick={() => setTransactionFilter('pendentes')} className="text-xs font-bold rounded-lg h-8 text-amber-600 flex-1 sm:flex-none">
                  Pendentes {transactions.filter(t => t.status === 'pending_review').length > 0 && `(${transactions.filter(t => t.status === 'pending_review').length})`}
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead className="bg-slate-50/50 text-slate-500 uppercase text-[10px] font-black tracking-widest border-y">
                <tr>
                  <th className="p-4 w-[50px]"><input type="checkbox" onChange={toggleAllTransactions} checked={filteredTransactions.slice(pageHistorico * 10, (pageHistorico + 1) * 10).length > 0 && filteredTransactions.slice(pageHistorico * 10, (pageHistorico + 1) * 10).every(t => selectedTransactionIds.has(t.id))} className="rounded border-slate-300 text-teal-600 focus:ring-teal-500" /></th>
                  <th className="p-4 text-left">Data</th>
                  <th className="p-4 text-left">Descrição</th>
                  <th className="p-4 text-left">Categoria</th>
                  <th className="p-4 text-left">Status</th>
                  <th className="p-4 text-left">Valor</th>
                  <th className="p-4 text-right">Comprovante / Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredTransactions?.slice(pageHistorico * 10, (pageHistorico + 1) * 10).map(t => (
                  <tr key={t.id} className={`hover:bg-slate-50/50 ${t.status === 'pending_review' ? 'bg-amber-50' : ''}`}>
                    <td className="p-4"><input type="checkbox" checked={selectedTransactionIds.has(t.id)} onChange={() => toggleTransactionSelection(t.id)} className="rounded border-slate-300 text-teal-600 focus:ring-teal-500" /></td>
                    <td className="p-4 text-slate-600">{format(new Date(t.created_at), "dd/MM/yyyy HH:mm")}</td>
                    <td className="p-4 font-medium text-slate-700">{t.description}</td>
                    <td className="p-4"><Badge variant="outline">{t.category}</Badge></td>
                    <td className="p-4">
                      {t.status === 'pending_review' ? (
                        <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">Aguardando Aprovação</Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-500 border-slate-200">Concluído</Badge>
                      )}
                    </td>
                    <td className={`p-4 font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {t.type === 'income' ? '+' : '-'}{formatBRL(Number(t.amount))}
                    </td>
                    <td className="p-4 text-right flex justify-end items-center gap-2">
                      {t.receipt_url && (
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm h-8 text-xs" asChild>
                          <Link href={`/pacientes/${t.patient_id}?tab=portal`}>
                            <FileText className="mr-2 h-4 w-4"/> VER COMPROVANTE
                          </Link>
                        </Button>
                      )}
                      {t.status === 'pending_review' ? (
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs font-bold shadow-sm" asChild>
                          <Link href={`/pacientes/${t.patient_id}?tab=portal`}>
                            <Check className="h-3 w-3 mr-1"/> Ver e Aprovar
                          </Link>
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 text-xs font-bold rounded-lg" onClick={() => handleReverseTransaction(t)}>
                          <RotateCcw className="h-3 w-3 mr-2"/> Estornar
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr><td colSpan={7} className="p-10 text-center text-slate-400 italic">Nenhuma transação encontrada.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* CONTROLES DE PAGINAÇÃO - HISTÓRICO */}
          <div className="flex items-center justify-between p-4 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setPageHistorico(p => Math.max(0, p - 1))} disabled={pageHistorico === 0}>Anterior</Button>
            <span className="text-xs text-slate-500 font-medium">Página {pageHistorico + 1} de {Math.max(1, Math.ceil((filteredTransactions?.length || 0) / 10))}</span>
            <Button variant="outline" size="sm" onClick={() => setPageHistorico(p => p + 1)} disabled={(pageHistorico + 1) * 10 >= (filteredTransactions?.length || 0)}>Próximo</Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Baixar Sessão</DialogTitle>
            <DialogDescription className="sr-only">Confirme a baixa do pagamento.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Label className="text-xs font-bold text-slate-400 uppercase text-center block">Valor a Baixar (R$)</Label>
            <Input value={paymentAmount} onChange={e => handleCurrencyInput(e.target.value, setPaymentAmount)} className="text-2xl font-black text-teal-600 text-center rounded-xl border-slate-300" />
            
            {/* DECISÃO DE FONTE DE PAGAMENTO */}
            {(Number(selectedApt?.patients?.credit_balance) || 0) > 0 ? (
              <div className="grid gap-2 pt-2">
                <Button variant="outline" className="w-full border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 font-bold text-xs h-10 rounded-xl" onClick={handleUseCredit}>
                  [USAR CRÉDITO] - Saldo: {formatBRL(Number(selectedApt?.patients?.credit_balance || 0))}
                </Button>
                <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold h-10 text-xs rounded-xl" onClick={() => {
                   const amount = parseFloat(paymentAmount.replace(/\./g, '').replace(',', '.'))
                   handleProcessTransaction(selectedApt.patient_id, amount, selectedApt.id)
                }}>
                  [NOVO PAGAMENTO] - Entrada de Caixa
                </Button>
              </div>
            ) : (
              <Button className="w-full bg-teal-600 font-bold h-12 rounded-2xl" onClick={() => {
                 const amount = parseFloat(paymentAmount.replace(/\./g, '').replace(',', '.'))
                 handleProcessTransaction(selectedApt.patient_id, amount, selectedApt.id)
              }}>Confirmar Baixa</Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={newTransactionOpen} onOpenChange={setNewTransactionOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Lançamento Inteligente</DialogTitle>
            <DialogDescription className="sr-only">Registre uma nova transação.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label className="font-bold">Paciente</Label><Select onValueChange={setSelectedPatient}><SelectTrigger className="rounded-xl border-slate-300"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{patientsList.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label className="font-bold text-teal-600">Valor Recebido (R$)</Label><Input value={transactionValue} onChange={e => handleCurrencyInput(e.target.value, setTransactionValue)} className="text-2xl font-black h-14 rounded-xl border-slate-300" /></div>
            <Button className="w-full bg-teal-600 hover:bg-teal-700 font-bold h-14 rounded-2xl" onClick={() => handleProcessTransaction(selectedPatient, parseFloat(transactionValue.replace(/\./g, '').replace(',', '.')))}>Abater Dívidas</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatCard({ title, value, icon, color, subtitle }: any) {
  const colorMap: any = { 
    teal: 'text-teal-600 bg-teal-50 border-teal-200', 
    amber: 'text-amber-600 bg-amber-50 border-amber-200', 
    blue: 'text-blue-600 bg-blue-50 border-blue-200', 
    red: 'text-red-600 bg-red-50 border-red-200',
    emerald: 'text-emerald-600 bg-emerald-50 border-emerald-200'
  }
  return (
    <Card className="border border-slate-200 shadow-md bg-white rounded-[24px]"><CardContent className="p-6"><div className="flex justify-between items-start mb-3"><div className={`p-3 rounded-2xl border ${colorMap[color]}`}>{icon}</div>{color === 'red' && value > 0 && <div className="h-2 w-2 bg-red-500 rounded-full animate-ping"/>}</div><div><p className="text-[10px] uppercase font-black text-slate-500 tracking-widest">{title}</p><h3 className="text-2xl font-black text-slate-800 mt-1">{value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</h3>{subtitle && <p className="text-[10px] text-slate-400 mt-1.5 font-medium italic">{subtitle}</p>}</div></CardContent></Card>
  )
}