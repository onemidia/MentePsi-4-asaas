'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/client'
import { 
  DollarSign, Clock, CheckCircle2, Search, Plus, ReceiptText, 
  Loader2, TrendingUp, TrendingDown, AlertCircle, Download, 
  AlertTriangle, RotateCcw, MessageCircle, Check, FileText, Trash2, Paperclip, Landmark
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
import { getLabels } from '@/lib/labels'

export default function FinanceiroPage() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [appointments, setAppointments] = useState<any[]>([])
  const [filteredAppointments, setFilteredAppointments] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [totals, setTotals] = useState({ recebidoNoPeriodo: 0, pendenteNoPeriodo: 0, previsaoNoPeriodo: 0, creditoTotal: 0, recebidoMesAtual: 0, despesasMesAtual: 0, lucroMesAtual: 0, despesasNoPeriodo: 0, lucroNoPeriodo: 0 })
  
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(() => {
    const future = new Date()
    future.setDate(future.getDate() + 30)
    return format(future, 'yyyy-MM-dd')
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [currentTab, setCurrentTab] = useState('todos')
  const [newTransactionOpen, setNewTransactionOpen] = useState(false)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [confirmPendingModalOpen, setConfirmPendingModalOpen] = useState(false)
  const [pendingTxToConfirm, setPendingTxToConfirm] = useState<any>(null)
  const [confirmPendingAmount, setConfirmPendingAmount] = useState('')
  const [pendingPortalDocs, setPendingPortalDocs] = useState<any[]>([])
  
  // ESTADOS DE DESPESAS
  const [mainTab, setMainTab] = useState('receitas')
  const [expenses, setExpenses] = useState<any[]>([])
  const [newExpenseOpen, setNewExpenseOpen] = useState(false)
  const [expenseForm, setExpenseForm] = useState({
    description: '', amount: '', date: format(new Date(), 'yyyy-MM-dd'), category: 'Operacional'
  })
  
  // PAGINAÇÃO E FILTROS DE DESPESAS (Independente)
  const [expenseStartDate, setExpenseStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [expenseEndDate, setExpenseEndDate] = useState(() => {
    const future = new Date()
    future.setDate(future.getDate() + 30)
    return format(future, 'yyyy-MM-dd')
  })
  const [pageDespesas, setPageDespesas] = useState(0)
  const [totalDespesasCount, setTotalDespesasCount] = useState(0)
  const [paginatedExpenses, setPaginatedExpenses] = useState<any[]>([])
  const [expenseTotalPeriodo, setExpenseTotalPeriodo] = useState(0)

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
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [lastPaymentTime, setLastPaymentTime] = useState<number>(0)

  const supabase = createClient()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isMounted, setIsMounted] = useState(false)
  const { toast } = useToast()

  const fetchFinanceiro = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.id) return
      
      // 1. Busca Agendamentos (para a lista e pendências)
      const { data: apts } = await supabase.from('appointments').select('*, patients(*)').eq('psychologist_id', user.id).order('start_time', { ascending: false })
      if (apts) setAppointments(apts)
  
      // 2. Busca Transações Financeiras (para o cálculo real de caixa)
      const { data: trans } = await supabase.from('financial_transactions').select('*, patients!inner(id)').eq('psychologist_id', user.id).order('created_at', { ascending: false })
      if (trans) {
        setTransactions(trans)
      }

      // 3. NOVO: Busca documentos pendentes do portal
      const { data: docs } = await supabase
        .from('patient_documents')
        .select('*, patients(full_name)')
        .ilike('title', '%Comprovante%')
        .eq('status', 'Pendente')
        .eq('psychologist_id', user.id);
      setPendingPortalDocs(docs || []);
    } catch (e) {
      console.warn("Aviso ao buscar financeiro:", e)
    }
  }, [supabase])

  const fetchExpenses = useCallback(async (start: string, end: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.id) return
      
      const { data: expData } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: false });
      if (expData) setExpenses(expData);
    } catch (e) {
      console.warn("Aviso ao buscar despesas:", e)
    }
  }, [supabase])

  const fetchPaginatedExpenses = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.id) return
      
      const start = expenseStartDate
      const end = expenseEndDate
      const from = pageDespesas * 10
      const to = from + 9
      
      // Busca apenas 10 itens para a tabela (Alta Performance)
      const { data, count } = await supabase
        .from('expenses')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: false })
        .range(from, to)
        
      if (data) setPaginatedExpenses(data)
      if (count !== null) setTotalDespesasCount(count)
      
      // Busca as somas no banco sem trazer os objetos completos para o Front-end
      const { data: sumData } = await supabase.from('expenses').select('amount').eq('user_id', user.id).gte('date', start).lte('date', end)
        
      if (sumData) {
        const sum = sumData.reduce((acc, curr) => acc + Math.round(Number(curr.amount) * 100), 0) / 100
        setExpenseTotalPeriodo(sum)
      }
    } catch (e) {
      console.warn("Aviso ao buscar despesas paginadas:", e)
    }
  }, [supabase, expenseStartDate, expenseEndDate, pageDespesas])

  const fetchPatients = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.id) return
      const { data } = await supabase.from('patients').select('*').eq('psychologist_id', user.id).order('full_name')
      
      if (data) {
        setPatientsList(data)
        const somaTotalHaverCents = data.reduce((acc, p) => acc + Math.round((Number(p.credit_balance) || 0) * 100), 0)
        setTotals(prev => ({ ...prev, creditoTotal: somaTotalHaverCents / 100 }))
      }
    } catch (e) {
      console.warn("Aviso ao buscar pacientes:", e)
    }
  }, [supabase])

  const refreshData = async () => {
    setRefreshing(true)
    await Promise.all([fetchFinanceiro(), fetchPatients(), fetchExpenses(startDate, endDate), fetchPaginatedExpenses()])
    setRefreshing(false)
  }

  useEffect(() => {
    const loadInitial = async () => {
      setLoading(true)
      await Promise.all([fetchFinanceiro(), fetchPatients(), fetchExpenses(startDate, endDate), fetchPaginatedExpenses()])
      setLoading(false)
    }
    loadInitial()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchFinanceiro, fetchPatients, fetchExpenses, fetchPaginatedExpenses])

  useEffect(() => {
    if (isMounted) {
      fetchExpenses(startDate, endDate)
    }
  }, [startDate, endDate, fetchExpenses, isMounted])

  useEffect(() => {
    if (isMounted) {
      fetchPaginatedExpenses()
    }
  }, [expenseStartDate, expenseEndDate, pageDespesas, fetchPaginatedExpenses, isMounted])

  useEffect(() => {
    const fetchProf = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.id) {
          const { data } = await supabase.from('professional_profile')
            .select('full_name, crp, city, clinic_name, address, specialty, appointment_label')
            .eq('user_id', user.id)
            .maybeSingle()
          setProfessionalData(data)
        }
      } catch (e) {
        console.warn("Aviso ao buscar perfil profissional:", e)
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
      if (currentTab === 'pendentes') {
        // Aba Pendentes ignora o endDate para exibir TUDO no futuro sem travas
        return date >= start
      }
      return date >= start && date <= end
    })

    // 💰 CÁLCULO CONTÁBIL SEGURO (CENTAVOS) - Baseado em Transações Reais
    const transactionsNoPeriodo = transactions.filter(t => {
      const date = new Date(t.created_at)
      return date >= start && date <= end && t.type === 'income' && (t.status === 'CONCLUIDO' || t.status === 'paid')
    })

    // Filtro específico para o mês corrente (Card de Destaque)
    const transactionsMesAtual = transactions.filter(t => {
      const date = new Date(t.created_at)
      return date >= startCurrentMonth && date <= endCurrentMonth && t.type === 'income' && (t.status === 'CONCLUIDO' || t.status === 'paid')
    })

    const recebidoCents = transactionsNoPeriodo.reduce((acc, t) => acc + Math.round(Number(t.amount) * 100), 0)
    const recebidoMesAtualCents = transactionsMesAtual.reduce((acc, t) => acc + Math.round(Number(t.amount) * 100), 0)
    
    // Despesas no Período Filtrado
    const expensesNoPeriodo = expenses.filter(e => {
      const eDate = startOfDay(parseISO(e.date))
      return eDate >= start && eDate <= end
    })
    const despesasNoPeriodoCents = expensesNoPeriodo.reduce((acc, e) => acc + Math.round(Number(e.amount) * 100), 0)
    
    // 2. Lógica de Pendência (Valores a Receber)
    // GLOBAL: Ignora filtro de data da tela para que o totalizador reflita a realidade absoluta do consultório
    const pendenteRealCents = appointments
      .filter(a => {
        const effectiveStatus = a.status?.toLowerCase() || ''
        return ['agendado', 'confirmado', 'pendente', 'realizada'].includes(effectiveStatus) && a.payment_status !== 'Pago' && a.payment_status !== 'paid'
      })
      .reduce((acc, a) => {
        const price = Math.round(Number(a.price) * 100)
        const paid = Math.round(Number(a.amount_paid || 0) * 100)
        return acc + Math.max(0, price - paid)
      }, 0)

    let previsaoCents = appointmentsNoPeriodo
      .filter(a => isAfter(new Date(a.start_time), hoje) && ['Agendado', 'Confirmado', 'Pendente'].includes(a.status))
      .reduce((acc, a) => acc + Math.round(Number(a.price) * 100), 0)

    const totalCreditCents = patientsList.reduce((acc, p) => acc + Math.round((Number(p.credit_balance) || 0) * 100), 0)
    previsaoCents = Math.max(0, previsaoCents - totalCreditCents)

    setTotals(prev => ({ 
      ...prev, 
      recebidoNoPeriodo: recebidoCents / 100, 
      pendenteNoPeriodo: pendenteRealCents / 100, 
      previsaoNoPeriodo: previsaoCents / 100,
      recebidoMesAtual: recebidoMesAtualCents / 100,
      despesasNoPeriodo: despesasNoPeriodoCents / 100,
      lucroNoPeriodo: (recebidoCents - despesasNoPeriodoCents) / 100
    }))

    let result = [...appointmentsNoPeriodo]
    if (currentTab === 'pendentes') result = result.filter(a => a.payment_status !== 'Pago' && a.payment_status !== 'paid')
    else if (currentTab === 'pagos') result = result.filter(a => a.payment_status === 'Pago' || a.payment_status === 'paid')
    if (searchTerm) result = result.filter(a => a.patients?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()))

    // ↕️ ORDENAÇÃO INTELIGENTE
    result.sort((a, b) => {
      if (currentTab === 'pendentes') {
        return new Date(a.start_time).getTime() - new Date(b.start_time).getTime() // Antigas/Atrasadas primeiro
      }
      return new Date(b.start_time).getTime() - new Date(a.start_time).getTime() // Recentes primeiro
    })

    setFilteredAppointments(result)
  }, [appointments, transactions, patientsList, expenses, currentTab, searchTerm, startDate, endDate])

  // 🔔 EFEITO: Aplica filtro vindo da URL (Dashboard)
  useEffect(() => {
    if (searchParams.get('filter') === 'pendentes' || searchParams.get('pending_receipt') === 'true') {
      setTransactionFilter('pendentes')
      setCurrentTab('pendentes')
      refreshData() // GATILHO QUE FALTAVA
      setTimeout(() => {
        document.getElementById('lancamentos-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 500)
    }
  }, [searchParams])

  // 🔍 FILTRO DE TRANSAÇÕES (Status + Data)
  const filteredTransactions = transactions.filter(t => {
    const tDate = new Date(t.created_at)
    const start = startOfDay(parseISO(startDate))
    const end = parseISO(endDate + "T23:59:59")
    // Se for pendente de revisão, ignora o filtro de data para sempre alertar a Alinne
    const dateMatch = t.status === 'pending_review' ? true : (tDate >= start && tDate <= end)
    const statusMatch = transactionFilter === 'pendentes' ? t.status === 'pending_review' : true
    return dateMatch && statusMatch
  })

  // 💉 POLÍTICA CONTÁBIL DE SUCESSO (Integer Math)
  const handleProcessTransaction = async (patientId: string, amount: number, appointmentId?: string) => {
    const now = Date.now()
    if (isProcessingPayment || (now - lastPaymentTime < 2000)) {
      return
    }

    setIsProcessingPayment(true)
    setLastPaymentTime(now)
    setRefreshing(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return

      // 🛑 VERIFICAÇÃO DE ESTADO (Idempotência)
      if (appointmentId) {
        const { data: aptCheck } = await supabase.from('appointments').select('amount_paid, price, payment_status').eq('id', appointmentId).maybeSingle()
        
        if (aptCheck && (aptCheck.payment_status === 'Pago' || aptCheck.payment_status === 'paid' || Math.round(Number(aptCheck.amount_paid) * 100) >= Math.round(Number(aptCheck.price) * 100))) {
          toast({ variant: "destructive", title: "Atenção", description: "Este agendamento já foi baixado." })
          setNewTransactionOpen(false)
          setPaymentModalOpen(false)
          setSelectedApt(null)
          return
        }
      }

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
            status: 'CONCLUIDO'
          }
        ])

      if (error) {
        console.warn("Aviso detalhado na transação:", error)
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
            console.warn("Aviso ao atualizar agendamento:", aptError)
            toast({ variant: "destructive", title: "Erro", description: "Falha ao atualizar agendamento: " + aptError.message })
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

              // 🛑 VERIFICAÇÃO EXTRA DE CONCORRÊNCIA DENTRO DO LOOP
              const { data: freshApt } = await supabase.from('appointments').select('payment_status, amount_paid, price').eq('id', apt.id).maybeSingle()
              
              if (freshApt && (freshApt.payment_status === 'Pago' || freshApt.payment_status === 'paid' || Math.round(Number(freshApt.amount_paid || 0) * 100) >= Math.round(Number(freshApt.price) * 100))) {
                continue // Pula este agendamento, pois já foi processado concorrentemente
              }

              const price = Number(freshApt?.price ?? apt.price)
              const paid = Number(freshApt?.amount_paid ?? apt.amount_paid ?? 0)
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

             // ⚡ PERFORMANCE: Importação dinâmica sob demanda
             const { jsPDF } = (await import('jspdf')).default ? await import('jspdf') : { jsPDF: (await import('jspdf')).jsPDF };

             // 2. Gera o PDF em memória (Blob)
             const doc = new jsPDF()
             doc.setFontSize(16); doc.setTextColor(13, 148, 136);
             doc.text(`RECIBO DE PAGAMENTO Nº ${String(receiptNumber).padStart(3, '0')}`, 105, 20, { align: "center" })
             doc.setTextColor(0, 0, 0); doc.setFontSize(10);
             doc.text(profName, 105, 30, { align: "center" }); doc.text(`CRP: ${profCRP}`, 105, 35, { align: "center" })
             doc.setFontSize(12);
             const labels = getLabels(professionalData?.appointment_label);
             const servicoDesc = `${labels.singular} de ${professionalData?.specialty || 'Atendimento Clínico'}`;
             doc.text(`Recebi de ${patient.full_name}, CPF ${patient.cpf || '...'}`, 14, 50)
             doc.text(`a importância de ${amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 14, 57)
             doc.text(`referente a ${servicoDesc.toLowerCase()}.`, 14, 64)
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
        } catch (err) { console.warn("Aviso ao gerar recibo automático:", err) }

        toast({ title: 'Baixa efetuada e totais atualizados' })
        await refreshData()
      }
      
      setNewTransactionOpen(false)
      setPaymentModalOpen(false)
      setPaymentAmount('')
      setSelectedApt(null)
    } catch (e: any) {
      console.error("Erro inesperado:", e)
      toast({ variant: "destructive", title: "Erro", description: "Ocorreu um erro inesperado." })
    } finally {
      setIsProcessingPayment(false)
      setRefreshing(false)
    }
  }

  // 💰 NOVA LÓGICA: Usar Saldo em Haver
  const handleUseCredit = async () => {
    if (!selectedApt) return
    
    const now = Date.now()
    if (isProcessingPayment || (now - lastPaymentTime < 2000)) {
      return
    }

    setIsProcessingPayment(true)
    setLastPaymentTime(now)
    setRefreshing(true)
    
    try {
      const amountToPay = parseFloat(paymentAmount.replace(/\./g, '').replace(',', '.'))
      const currentCredit = Number(selectedApt.patients?.credit_balance || 0)

      if (amountToPay > currentCredit) {
        toast({ variant: "destructive", title: "Saldo insuficiente", description: "O valor a baixar é maior que o crédito disponível." })
        return
      }

      // 🛑 VERIFICAÇÃO DE ESTADO (Idempotência)
      const { data: aptCheck } = await supabase.from('appointments').select('amount_paid, price, payment_status').eq('id', selectedApt.id).maybeSingle()
      
      if (aptCheck && (aptCheck.payment_status === 'Pago' || aptCheck.payment_status === 'paid' || Math.round(Number(aptCheck.amount_paid) * 100) >= Math.round(Number(aptCheck.price) * 100))) {
        toast({ variant: "destructive", title: "Atenção", description: "Este agendamento já foi baixado." })
        setPaymentModalOpen(false)
        setSelectedApt(null)
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
        status: 'CONCLUIDO'
      }])

      if (txError) {
        toast({ variant: "destructive", title: "Erro", description: txError.message })
        return
      }

      toast({ title: "Saldo utilizado com sucesso!" })
      setPaymentModalOpen(false)
      setPaymentAmount('')
      setSelectedApt(null)
      await refreshData()
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e.message })
    } finally {
      setIsProcessingPayment(false)
      setRefreshing(false)
    }
  }

  const handleGenerateReceipt = (apt: any) => {
    const valor = Number(apt.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const dataSessao = format(new Date(apt.start_time), "dd/MM/yyyy");
    const labels = getLabels(professionalData?.appointment_label);
    const servicoDesc = `${labels.singular} de ${professionalData?.specialty || 'Atendimento Clínico'}`;
    const text = `RECIBO\nRecebemos de ${apt.patients?.full_name} o valor de R$ ${valor} ref. à ${servicoDesc.toLowerCase()} realizada em ${dataSessao}.`
    const fone = apt.patients?.phone?.replace(/[^\d+]/g, '') || ''
    const finalPhone = fone.startsWith('+') ? fone.replace('+', '') : (fone.startsWith('55') ? fone : `55${fone}`)
    window.open(`https://wa.me/${finalPhone}?text=${encodeURIComponent(text)}`, '_blank')
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

    toast({ title: "Transação estornada com sucesso!" })
    await refreshData()
  }

  const openConfirmPending = (t: any) => {
    setPendingTxToConfirm(t)
    setConfirmPendingAmount(Number(t.amount).toFixed(2).replace('.', ','))
    setConfirmPendingModalOpen(true)
  }

  // ✅ APROVAÇÃO DE PAGAMENTO DO PORTAL
  const handleConfirmPendingTransaction = async (t: any, finalAmount: number) => {
    const now = Date.now()
    if (isProcessingPayment || (now - lastPaymentTime < 2000)) {
      return
    }

    setIsProcessingPayment(true)
    setLastPaymentTime(now)
    setRefreshing(true)
    const supabase = createClient()

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado.");

      const isDocument = !!t.file_url;
      const receiptUrl = isDocument ? t.file_url : t.receipt_url;

      if (isDocument) {
        // 1. Grava no Financeiro
        const { error: insertError } = await supabase.from('financial_transactions').insert({ 
          psychologist_id: user.id, 
          patient_id: t.patient_id, 
          amount: finalAmount, 
          type: 'income', 
          category: 'Sessão', 
          description: 'Pagamento via Portal', 
          status: 'CONCLUIDO', 
          receipt_url: receiptUrl 
        });
        if (insertError) throw insertError;

        if (t.doc_id) {
          // 1. Precise DB UPDATE com verificação de contagem
          const { error: docError, count } = await supabase
            .from('patient_documents')
            .update({ status: 'Confirmado' }, { count: 'exact' }) // Adicionei 'count' para diagnosticar
            .eq('id', t.doc_id); // PRECISÃO ABSOLUTA NO ID

          if (docError) throw docError;

          // LOG DIAGNÓSTICO (Crucial para sabermos se o banco aceitou a ordem)
          if (count === 0) {
            console.warn('Alerta Técnico: O banco de dados NÃO encontrou o documento com ID:', t.doc_id, 'para atualizar. O banner persistirá no F5.');
          } else {
            console.log('Sucesso:', count, 'documento(s) carimbado(s) como confirmado.');
          }
        } else {
          console.error('Erro Técnico: ID do documento não foi passado para a função de confirmação.');
        }
      } else {
        // Fallback para aprovar as transações pendentes geradas pela versão antiga do sistema
        const { error: updateError } = await supabase.from('financial_transactions').update({ status: 'CONCLUIDO', amount: finalAmount }).eq('id', t.id)
        if (updateError) throw updateError
        
        if (receiptUrl) {
          await supabase.from('patient_documents').update({ status: 'Confirmado' }).eq('file_url', receiptUrl)
        }
      }

      // Fallback global de segurança para limpar a fila
      await supabase
         .from('patient_documents')
         .update({ status: 'Confirmado' })
         .eq('patient_id', t.patient_id)
         .ilike('title', '%Comprovante%')
         .eq('status', 'Pendente')

      // 2. Amortização Automática (Lógica FIFO - Primeiro a entrar, primeiro a sair)
      let remainingAmount = finalAmount
      
      const { data: pendingApts } = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_id', t.patient_id)
        .not('payment_status', 'in', '("Pago","paid")')
        .order('start_time', { ascending: true })

      if (pendingApts) {
        for (const apt of pendingApts) {
          if (remainingAmount <= 0.01) break

          // 🛑 VERIFICAÇÃO EXTRA DE CONCORRÊNCIA DENTRO DO LOOP
          const { data: freshApt } = await supabase.from('appointments').select('payment_status, amount_paid, price').eq('id', apt.id).maybeSingle()
          
          if (freshApt && (freshApt.payment_status === 'Pago' || freshApt.payment_status === 'paid' || Math.round(Number(freshApt.amount_paid || 0) * 100) >= Math.round(Number(freshApt.price) * 100))) {
            continue
          }

          const price = Number(freshApt?.price ?? apt.price)
          const paid = Number(freshApt?.amount_paid ?? apt.amount_paid ?? 0)
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

      // 4. Geração Automática de Recibo
      try {
        const patient = patientsList.find(p => p.id === t.patient_id)
        const profName = professionalData?.full_name || "Alvino Buriti"
        const profCRP = professionalData?.crp || "CRP não informado"
        
        if (patient && user) {
           let receiptNumber = 1
           let { data: counter } = await supabase.from('receipt_counters').select('current_count').eq('psychologist_id', user.id).single()
           if (!counter) {
             const { data: newCounter } = await supabase.from('receipt_counters').insert({ psychologist_id: user.id, current_count: 0 }).select().single()
             counter = newCounter
           }
           receiptNumber = (counter?.current_count || 0) + 1
           await supabase.from('receipt_counters').update({ current_count: receiptNumber }).eq('psychologist_id', user.id)

           const { jsPDF } = (await import('jspdf')).default ? await import('jspdf') : { jsPDF: (await import('jspdf')).jsPDF };

           const doc = new jsPDF()
           doc.setFontSize(16); doc.setTextColor(13, 148, 136);
           doc.text(`RECIBO DE PAGAMENTO Nº ${String(receiptNumber).padStart(3, '0')}`, 105, 20, { align: "center" })
           doc.setTextColor(0, 0, 0); doc.setFontSize(10);
           doc.text(profName, 105, 30, { align: "center" }); doc.text(`CRP: ${profCRP}`, 105, 35, { align: "center" })
           doc.setFontSize(12);
           const labels = getLabels(professionalData?.appointment_label);
           const servicoDesc = `${labels.singular} de ${professionalData?.specialty || 'Atendimento Clínico'}`;
           doc.text(`Recebi de ${patient.full_name}, CPF ${patient.cpf || '...'}`, 14, 50)
           doc.text(`a importância de ${finalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 14, 57)
           doc.text(`referente a ${servicoDesc.toLowerCase()}.`, 14, 64)
           doc.text(`${professionalData?.city || "Local"}, ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`, 105, 120, { align: "center" })
           doc.setFontSize(8); doc.setTextColor(150);
           doc.text(`Documento emitido automaticamente por ${professionalData?.clinic_name || "Sistema de Gestão"}.`, 105, 140, { align: "center" })

           const pdfBlob = doc.output('blob')
           const fileName = `${t.patient_id}/recibo_${receiptNumber}_${Date.now()}.pdf`
           const { error: uploadError } = await supabase.storage.from('patient-documents').upload(fileName, pdfBlob)
           
           if (!uploadError) {
             const { data: { publicUrl } } = supabase.storage.from('patient-documents').getPublicUrl(fileName)
             await supabase.from('patient_documents').insert({
               patient_id: t.patient_id, psychologist_id: user.id, title: `Recibo Nº ${String(receiptNumber).padStart(3, '0')} - ${format(new Date(), 'dd/MM/yyyy')}`, file_url: publicUrl, status: 'Gerado'
             })
           }
        }
      } catch (err) { console.warn("Aviso ao gerar recibo automático:", err) }

      toast({ title: 'Baixa efetuada e totais atualizados' })
      
      // Limpeza Imediata da Tela e do Modal
      setConfirmPendingModalOpen(false)
      setPendingTxToConfirm(null)
      
      await fetchFinanceiro() 
      await refreshData()

      // 3. Atualiza a tela e limpa a fila
      if (isDocument) {
        setPendingPortalDocs(prev => prev.filter(d => d.id !== t.doc_id && d.id !== t.id));
      } else {
        setPendingPortalDocs(prev => prev.filter(d => d.patient_id !== t.patient_id));
      }

      // Grito global para o banner sumir
      window.dispatchEvent(new Event('atualizar_notificacoes'));
    } catch (error: any) { 
      toast({ variant: "destructive", title: "Erro", description: error.message }) 
    } finally { 
      setIsProcessingPayment(false)
      setLastPaymentTime(0)
      setConfirmPendingModalOpen(false)
      setPendingTxToConfirm(null) // Garante a limpeza em caso de erro
      setRefreshing(false) 
    }
  }

  const formatBRL = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const handleCurrencyInput = (value: string, setter: (v: string) => void) => {
    const cleanValue = value.replace(/\D/g, "");
    setter((Number(cleanValue) / 100).toFixed(2).replace('.', ','));
  }

  // 🖨️ FUNÇÃO PARA GERAR O RELATÓRIO GERAL DA TELA EM PDF
  const gerarPDFRelatorio = () => {
    const janela = window.open('', '', 'width=900,height=700');
    if (!janela) return toast({ variant: "destructive", title: "Aviso", description: "Permita os pop-ups do navegador." });

    let html = `
      <html><head><title>Relatório Financeiro</title>
      <style>
        body { font-family: sans-serif; padding: 30px; color: #333; }
        h1 { color: #0f172a; font-size: 24px; text-align: center; border-bottom: 2px solid #eee; padding-bottom: 15px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border-bottom: 1px solid #eee; padding: 10px; text-align: left; font-size: 13px; }
        th { background-color: #f8fafc; color: #666; }
      </style></head><body>
      <h1>Relatório Financeiro - MentePsi</h1>
      <table>
        <thead><tr><th>Data</th><th>Paciente</th><th>Valor</th><th>Pago</th><th>Pendente</th><th>Status</th></tr></thead>
        <tbody>
    `;

    filteredAppointments.forEach(item => {
      const data = new Date(item.start_time).toLocaleDateString('pt-BR');
      const pac = item.patients?.full_name || 'N/A';
      const valor = Number(item.price || 0).toFixed(2).replace('.', ',');
      const pago = Number(item.amount_paid || 0).toFixed(2).replace('.', ',');
      const pend = (Number(item.price || 0) - Number(item.amount_paid || 0)).toFixed(2).replace('.', ',');
      html += `<tr><td>${data}</td><td>${pac}</td><td>R$ ${valor}</td><td>R$ ${pago}</td><td>R$ ${pend}</td><td>${item.payment_status}</td></tr>`;
    });

    html += `</tbody></table></body></html>`;
    janela.document.write(html);
    janela.document.close();
    janela.focus();
    setTimeout(() => { janela.print(); janela.close(); }, 500);
  };

  const handleExportExcel = async () => {
    const XLSX = await import('xlsx')
    const data = filteredAppointments.map(a => ({
      Data: format(new Date(a.start_time), "dd/MM/yyyy"),
      Paciente: a.patients?.full_name,
      Valor: a.price,
      Pago: a.amount_paid || 0,
      Pendente: Number(a.price) - Number(a.amount_paid || 0),
      Status: a.payment_status
    }))

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Relatório Financeiro")
    
    const fileName = `Relatorio_Financeiro_${format(parseISO(startDate), 'MMMM_yyyy', { locale: ptBR })}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  const handleSaveExpense = async () => {
    if (!expenseForm.description || !expenseForm.amount || !expenseForm.date) {
      toast({ variant: "destructive", title: "Erro", description: "Preencha todos os campos obrigatórios." })
      return
    }

    setRefreshing(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast({ variant: "destructive", title: "Erro de Autenticação", description: "Usuário não encontrado." })
        return
      }
      
      const numericAmount = parseFloat(expenseForm.amount.replace(/\./g, '').replace(',', '.'))
      
      const { error } = await supabase.from('expenses').insert({
        user_id: user.id, 
        description: expenseForm.description, 
        amount: numericAmount, 
        date: expenseForm.date, 
        category: expenseForm.category
      })
      
      if (error) throw error
      
      toast({ title: "Despesa lançada com sucesso!" })
      setNewExpenseOpen(false)
      setExpenseForm({ description: '', amount: '', date: format(new Date(), 'yyyy-MM-dd'), category: 'Operacional' })
      await fetchExpenses(startDate, endDate)
      await fetchPaginatedExpenses()
    } catch (e: any) {
      console.error("Erro detalhado ao salvar despesa no Supabase:", e)
      toast({ variant: "destructive", title: "Erro", description: e.message })
    } finally {
      setRefreshing(false)
    }
  }

  const handleDeleteExpense = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta despesa?")) return
    setRefreshing(true)
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id)
      if (error) throw error
      toast({ title: "Despesa excluída." })
      await fetchExpenses(startDate, endDate)
      await fetchPaginatedExpenses()
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e.message })
    } finally {
      setRefreshing(false)
    }
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
    
    const fone = patient?.phone?.replace(/[^\d+]/g, '') || ''
    const finalPhone = fone.startsWith('+') ? fone.replace('+', '') : (fone.startsWith('55') ? fone : `55${fone}`)
    window.open(`https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`, '_blank')
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

      // 🛑 CORREÇÃO 1: CPF agora é opcional. Se não tiver, não trava o sistema!
      const patientCpf = patient?.cpf || "Não informado"

      const profName = professionalData?.full_name || "Alvino Buriti"
      const profCRP = professionalData?.crp || "CRP não informado"
      const profAddress = professionalData?.address || "Endereço não informado"

      // Contador de Recibos
      const { data: { user } } = await supabase.auth.getUser()
      let receiptNumber = 1
      if (user) {
        let { data: counter } = await supabase.from('receipt_counters').select('current_count').eq('psychologist_id', user.id).single()
        if (!counter) {
          const { data: newCounter } = await supabase.from('receipt_counters').insert({ psychologist_id: user.id, current_count: 0 }).select().single()
          counter = newCounter
        }
        receiptNumber = (counter?.current_count || 0) + 1
        await supabase.from('receipt_counters').update({ current_count: receiptNumber }).eq('psychologist_id', user.id)
      }

      // 🛑 CORREÇÃO 2: Removida a biblioteca "autotable" que estava travando o botão
      const { jsPDF } = (await import('jspdf')).default ? await import('jspdf') : { jsPDF: (await import('jspdf')).jsPDF };
      const doc = new jsPDF()
      
      doc.setFontSize(16)
      doc.setTextColor(13, 148, 136)
      doc.text(`RECIBO DE PAGAMENTO Nº ${String(receiptNumber).padStart(3, '0')}`, 105, 20, { align: "center" })
      
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(10)
      doc.text(profName, 105, 30, { align: "center" })
      doc.text(`CRP: ${profCRP} | ${profAddress}`, 105, 35, { align: "center" })

      const total = selected.reduce((acc, curr) => acc + Number(curr.price), 0)
      
      const labels = getLabels(professionalData?.appointment_label);
      const servicoDesc = `${labels.singular} de ${professionalData?.specialty || 'Atendimento Clínico'}`;

      doc.setFontSize(12)
      doc.text(`Recebi de ${patient.full_name}, CPF: ${patientCpf}`, 14, 50)
      doc.text(`a importância de ${total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 14, 57)
      doc.text(`referente aos serviços de ${servicoDesc.toLowerCase()} listados abaixo:`, 14, 64)

      // Desenha a tabela manualmente (Super seguro, nunca trava)
      let y = 75;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Data", 14, y);
      doc.text("Descrição", 60, y);
      doc.text("Valor", 150, y);
      y += 2;
      doc.line(14, y, 196, y); 
      y += 8;

      doc.setFont("helvetica", "normal");
      selected.forEach(a => {
         doc.text(format(new Date(a.start_time), "dd/MM/yyyy"), 14, y);
         doc.text(servicoDesc, 60, y);
         doc.text(Number(a.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 150, y);
         y += 8;
      });

      y += 20;
      doc.text("________________________________________________", 105, y, { align: "center" })
      doc.text("Assinatura do Profissional", 105, y + 5, { align: "center" })
      doc.text(`${professionalData?.city || "Local"}, ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`, 105, y + 15, { align: "center" })

      doc.setFontSize(8)
      doc.setTextColor(150)
      doc.text("Documento emitido em conformidade com a Resolução CFP nº 010/05.", 105, 285, { align: "center" })

      doc.save(`Recibo_MentePsi_${receiptNumber}.pdf`)
    } catch (error: any) {
      console.warn("Erro ao gerar PDF:", error)
      toast({ variant: "destructive", title: "Erro", description: 'Erro ao gerar PDF: ' + error.message })
    }
  }

  if (!isMounted) return null

  return (
    <div className="p-6 space-y-6 bg-slate-100 min-h-[100dvh]">
      
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Financeiro</h1>
            {refreshing && <Loader2 className="animate-spin text-teal-600 h-5 w-5" />}
          </div>
          <p className="text-slate-500 font-medium text-sm">Gestão por período e lançamentos inteligentes.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 w-full xl:w-auto">
          {/* Botões que só aparecem quando seleciona um paciente */}
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
          
          {/* --- NOVO BOTÃO DE PDF AQUI --- */}
          <Button variant="outline" className="w-full sm:w-auto font-bold border-red-200 text-red-600 shadow-sm hover:bg-red-50 rounded-2xl h-10" onClick={gerarPDFRelatorio}>
            <FileText className="mr-2 h-4 w-4"/> Relatório PDF
          </Button>
          
          <Button variant="outline" className="w-full sm:w-auto font-bold border-slate-200 text-slate-600 shadow-sm rounded-2xl h-10" onClick={handleExportExcel}>
            <Download className="mr-2 h-4 w-4"/> Exportar Excel
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full sm:w-auto font-bold border-blue-200 text-blue-700 shadow-sm hover:bg-blue-50 rounded-2xl h-10" 
            onClick={() => window.open('https://cav.receita.fazenda.gov.br/autenticacao/login', '_blank')}
            title="Link externo para emissão oficial e declaração de rendimentos na Receita Federal."
          >
            <Landmark className="mr-2 h-4 w-4"/> Carnê-Leão (e-CAC)
          </Button>
          
          {mainTab === 'receitas' ? (
            <Button className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 font-bold shadow-sm hover:shadow-md text-white rounded-2xl h-10" onClick={() => setNewTransactionOpen(true)}>
              <Plus className="mr-2 h-4 w-4"/> Lançar Recebimento
            </Button>
          ) : (
            <Button className="w-full sm:w-auto bg-red-600 hover:bg-red-700 font-bold shadow-sm hover:shadow-md text-white rounded-2xl h-10" onClick={() => setNewExpenseOpen(true)}>
              <Plus className="mr-2 h-4 w-4"/> Nova Despesa
            </Button>
          )}
        </div>
      </div>

      <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
        <TabsList className="mb-6 bg-slate-200/50 rounded-xl p-1 w-full max-w-sm">
          <TabsTrigger value="receitas" className="flex-1 rounded-lg font-bold">Receitas</TabsTrigger>
          <TabsTrigger value="despesas" className="flex-1 rounded-lg font-bold">Despesas</TabsTrigger>
        </TabsList>
        
        <TabsContent value="receitas" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatCard title="Lucro Líquido Real (Período)" value={totals.lucroNoPeriodo} icon={<DollarSign/>} color="teal" subtitle="Recebido - Despesas no período" />
            <StatCard title="Total de Despesas (Período)" value={totals.despesasNoPeriodo} icon={<TrendingDown/>} color="red" subtitle="Soma de todos os custos filtrados" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* 🌟 NOVO CARD DE DESTAQUE */}
        <StatCard title="Recebido no Mês" value={totals.recebidoMesAtual} icon={<DollarSign/>} color="emerald" subtitle={format(new Date(), 'MMMM/yyyy', { locale: ptBR })} />
        
        <StatCard title="Recebido no Período" value={totals.recebidoNoPeriodo} icon={<CheckCircle2/>} color="teal" subtitle="Filtro selecionado" />
        <StatCard title="Valores a Receber" value={totals.pendenteNoPeriodo} icon={<AlertCircle/>} color="red" subtitle="Total geral acumulado" />
        <StatCard title="Projeção do Período" value={totals.previsaoNoPeriodo} icon={<TrendingUp/>} color="blue" subtitle="Agendamentos futuros" />
        {/* 💉 CARD CORRIGIDO: Agora reflete os R$ 95,00 ou R$ 1.150,00 dependendo do saldo do banco */}
        <StatCard title="Crédito Clientes" value={totals.creditoTotal} icon={<Clock/>} color="amber" subtitle="Total acumulado em haver" />
      </div>

      <Card id="lancamentos-table" className="border border-slate-200 shadow-md overflow-hidden bg-white rounded-[24px]">
        <CardHeader className="flex flex-col xl:flex-row items-start xl:items-center justify-between border-b gap-4 p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full xl:w-auto">
            <CardTitle className="text-lg font-black text-slate-800">Lançamentos</CardTitle>
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 gap-2 shadow-sm">
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-9 border-none focus-visible:ring-0 text-xs w-[120px] bg-transparent" />
              <span className="text-slate-300">|</span>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-9 border-none focus-visible:ring-0 text-xs w-[120px] bg-transparent" />
            </div>
            
            {/* NOVO: Fila de Recibos Global no topo da tabela */}
            {pendingPortalDocs.length > 0 && (
              <Button className="bg-amber-500 hover:bg-amber-600 text-white font-bold animate-pulse shadow-sm" onClick={() => {
                const firstDoc = pendingPortalDocs[0];
                setPendingTxToConfirm({ ...firstDoc, doc_id: firstDoc.id }); // Pega o primeiro da fila e garante o preenchimento do doc_id
                setConfirmPendingAmount('');
                setConfirmPendingModalOpen(true);
              }}>
                <Paperclip className="h-4 w-4 mr-2"/> Avaliar Recibos ({pendingPortalDocs.length})
              </Button>
            )}
          </div>
          <div className="relative w-full md:w-64"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" /><Input placeholder="Buscar paciente..." className="pl-9 bg-white h-9 rounded-xl border-slate-300" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs defaultValue="todos" onValueChange={setCurrentTab}>
            <TabsList className="m-4 bg-slate-100 w-auto flex-wrap h-auto rounded-xl"><TabsTrigger value="todos" className="flex-1 rounded-lg">Todos</TabsTrigger><TabsTrigger value="pendentes" className="flex-1 rounded-lg">Pendentes</TabsTrigger><TabsTrigger value="pagos" className="flex-1 rounded-lg">Pagos</TabsTrigger></TabsList>
            <div className="overflow-x-auto w-full">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/50 text-slate-500 uppercase text-[10px] font-black tracking-widest border-y">
                  <tr><th className="p-4 w-[50px]"><input type="checkbox" onChange={toggleAll} checked={filteredAppointments.length > 0 && selectedItems.size === filteredAppointments.length} className="rounded border-slate-300 text-teal-600 focus:ring-teal-500" /></th><th className="p-4 text-left">Data</th><th className="p-4 text-left">Paciente</th><th className="p-4 text-left">Valor</th><th className="p-4 text-left hidden md:table-cell">Pendente</th><th className="p-4 text-left hidden md:table-cell">Status</th><th className="p-4 text-right">Ação</th></tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {loading ? (<tr><td colSpan={7} className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-teal-600"/></td></tr>) : filteredAppointments?.slice(pageLancamentos * 10, (pageLancamentos + 1) * 10).map(apt => {
                    const pendente = Number(apt.price) - Number(apt.amount_paid || 0);
                    const isPaid = apt.payment_status === 'Pago' || apt.payment_status === 'paid';
                    const isOverdue = !isPaid && new Date(apt.start_time) < new Date();
                    
                    
                    return (
                      <tr key={apt.id} className={`hover:bg-slate-50/50 transition-colors ${isOverdue && currentTab === 'pendentes' ? 'bg-red-50/40' : ''}`}>
                        <td className="p-4"><input type="checkbox" checked={selectedItems.has(apt.id)} onChange={() => toggleSelection(apt.id)} className="rounded border-slate-300 text-teal-600 focus:ring-teal-500" /></td>
                        <td className={`p-4 ${isOverdue && currentTab === 'pendentes' ? 'text-red-700 font-bold' : 'text-slate-600'}`}>
                          <div className="flex items-center gap-1.5">
                            {format(new Date(apt.start_time), "dd/MM/yyyy HH:mm")}
                            {isOverdue && currentTab === 'pendentes' && <AlertCircle className="h-4 w-4 text-red-500 animate-pulse" title="Pagamento Atrasado" />}
                          </div>
                        </td>
                        <td className="p-4"><span className="font-bold text-slate-700">{apt.patients?.full_name}</span></td>
                        <td className={`p-4 font-bold ${isOverdue && currentTab === 'pendentes' ? 'text-red-600' : ''}`}>{formatBRL(Number(apt.price))}</td>
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
              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 gap-2 shadow-sm w-full sm:w-auto">
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-9 border-none focus-visible:ring-0 text-xs w-[120px] bg-transparent" />
                <span className="text-slate-300">|</span>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-9 border-none focus-visible:ring-0 text-xs w-[120px] bg-transparent" />
              </div>

              <div className="flex flex-col sm:flex-row gap-2 bg-slate-50 p-1 rounded-xl w-full sm:w-auto">
                <Button variant={transactionFilter === 'todos' ? 'secondary' : 'ghost'} size="sm" onClick={() => setTransactionFilter('todos')} className="text-xs font-bold rounded-lg h-8 flex-1 sm:flex-none">Todos</Button>
                <Button variant={transactionFilter === 'pendentes' ? 'secondary' : 'ghost'} size="sm" onClick={() => setTransactionFilter('pendentes')} className="text-xs font-bold rounded-lg h-8 text-amber-600 flex-1 sm:flex-none">
                  Pendentes {transactions.filter(t => t.status === 'pending_review').length > 0 && `(${transactions.filter(t => t.status === 'pending_review').length})`}
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto w-full">
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
                      {t.status === 'pending_review' ? (
                        <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white h-8 text-xs font-bold shadow-sm animate-pulse" onClick={() => openConfirmPending(t)}>
                          {t.receipt_url ? <Paperclip className="h-3 w-3 mr-1"/> : <Check className="h-3 w-3 mr-1"/>} Conferir e Baixar
                        </Button>
                      ) : (
                        <>
                          {t.receipt_url && (
                            <Button size="sm" variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50 h-8 text-xs font-bold shadow-sm" onClick={() => window.open(t.receipt_url, '_blank')}>
                              <Paperclip className="mr-2 h-4 w-4"/> Comprovante
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 text-xs font-bold rounded-lg" onClick={() => handleReverseTransaction(t)}>
                            <RotateCcw className="h-3 w-3 mr-2"/> Estornar
                          </Button>
                        </>
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
      </TabsContent>

      <TabsContent value="despesas" className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard title="Total de Despesas (Período)" value={expenseTotalPeriodo} icon={<TrendingDown/>} color="red" subtitle="Soma das despesas no período filtrado" />
        </div>

        <Card className="border border-slate-200 shadow-md overflow-hidden bg-white rounded-[24px]">
          <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between border-b gap-4 p-6">
            <CardTitle className="text-lg font-black text-slate-800">Histórico de Despesas</CardTitle>
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 gap-2 shadow-sm">
              <Input type="date" value={expenseStartDate} onChange={e => { setExpenseStartDate(e.target.value); setPageDespesas(0); }} className="h-9 border-none focus-visible:ring-0 text-xs w-[120px] bg-transparent" />
              <span className="text-slate-300">|</span>
              <Input type="date" value={expenseEndDate} onChange={e => { setExpenseEndDate(e.target.value); setPageDespesas(0); }} className="h-9 border-none focus-visible:ring-0 text-xs w-[120px] bg-transparent" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/50 text-slate-500 uppercase text-[10px] font-black tracking-widest border-y">
                  <tr>
                    <th className="p-4 text-left">Data</th>
                    <th className="p-4 text-left">Descrição</th>
                    <th className="p-4 text-left">Categoria</th>
                    <th className="p-4 text-left">Valor</th>
                    <th className="p-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {paginatedExpenses.length === 0 ? (
                    <tr><td colSpan={5} className="p-10 text-center text-slate-400 italic font-medium">Nenhuma despesa encontrada para este período.</td></tr>
                  ) : paginatedExpenses.map(exp => (
                    <tr key={exp.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 text-slate-600">{format(parseISO(exp.date), "dd/MM/yyyy")}</td>
                      <td className="p-4 font-bold text-slate-700">{exp.description}</td>
                      <td className="p-4"><Badge variant="outline">{exp.category}</Badge></td>
                      <td className="p-4 font-bold text-red-600">- {formatBRL(Number(exp.amount))}</td>
                      <td className="p-4 text-right">
                        <Button size="icon" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg" onClick={() => handleDeleteExpense(exp.id)}>
                          <Trash2 size={16}/>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between p-4 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setPageDespesas(p => Math.max(0, p - 1))} disabled={pageDespesas === 0}>Anterior</Button>
              <span className="text-xs text-slate-500 font-medium">Página {pageDespesas + 1} de {Math.max(1, Math.ceil(totalDespesasCount / 10))}</span>
              <Button variant="outline" size="sm" onClick={() => setPageDespesas(p => p + 1)} disabled={(pageDespesas + 1) * 10 >= totalDespesasCount}>Próximo</Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>

      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent aria-describedby={undefined} className="max-w-xs">
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
                <Button disabled={isProcessingPayment || refreshing} variant="outline" className="w-full border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 font-bold text-xs h-10 rounded-xl" onClick={handleUseCredit}>
                  {(isProcessingPayment || refreshing) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  [USAR CRÉDITO] - Saldo: {formatBRL(Number(selectedApt?.patients?.credit_balance || 0))}
                </Button>
                <Button disabled={isProcessingPayment || refreshing} className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold h-10 text-xs rounded-xl" onClick={() => {
                   const amount = parseFloat(paymentAmount.replace(/\./g, '').replace(',', '.'))
                   handleProcessTransaction(selectedApt.patient_id, amount, selectedApt.id)
                }}>
                  {(isProcessingPayment || refreshing) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  [NOVO PAGAMENTO] - Entrada de Caixa
                </Button>
              </div>
            ) : (
              <Button disabled={isProcessingPayment || refreshing} className="w-full bg-teal-600 font-bold h-12 rounded-2xl" onClick={() => {
                 const amount = parseFloat(paymentAmount.replace(/\./g, '').replace(',', '.'))
                 handleProcessTransaction(selectedApt.patient_id, amount, selectedApt.id)
              }}>
                {(isProcessingPayment || refreshing) ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processando...</> : "Confirmar Baixa"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmPendingModalOpen} onOpenChange={setConfirmPendingModalOpen}>
        <DialogContent aria-describedby={undefined} className="max-w-[95vw] md:max-w-4xl rounded-[24px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-teal-700">Conferência de Recebimento</DialogTitle>
            <DialogDescription>
              {pendingTxToConfirm?.patients?.full_name ? (
                <>Comprovante enviado por <strong>{pendingTxToConfirm.patients.full_name}</strong>. Verifique e confirme o valor exato a ser baixado.</>
              ) : "Verifique o comprovante enviado pelo paciente e confirme o valor exato a ser baixado."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            {/* Lado Esquerdo: Comprovante */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 flex items-center justify-center min-h-[300px] md:h-[400px]">
              {(pendingTxToConfirm?.file_url || pendingTxToConfirm?.receipt_url) ? (
                (pendingTxToConfirm?.file_url || pendingTxToConfirm?.receipt_url).toLowerCase().includes('.pdf') ? (
                  <iframe src={pendingTxToConfirm.file_url || pendingTxToConfirm.receipt_url} className="w-full h-full min-h-[300px]" />
                ) : (
                  <img src={pendingTxToConfirm.file_url || pendingTxToConfirm.receipt_url} alt="Comprovante" className="max-w-full max-h-[400px] object-contain p-2" />
                )
              ) : (
                <div className="flex flex-col items-center text-slate-400">
                  <FileText className="h-10 w-10 mb-2 opacity-50" />
                  <p className="text-sm font-medium">Nenhum comprovante anexado</p>
                </div>
              )}
            </div>
            
            {/* Lado Direito: Confirmação */}
            <div className="flex flex-col justify-center space-y-6 px-2 md:px-4">
              <div className="space-y-2 text-center">
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Valor Efetivo (R$)</Label>
                <Input value={confirmPendingAmount} onChange={e => handleCurrencyInput(e.target.value, setConfirmPendingAmount)} className="text-4xl font-black text-teal-600 text-center rounded-xl border-slate-300 h-16 bg-teal-50/30" />
                <p className="text-[10px] text-slate-500 font-medium mt-2">O sistema amortizará as sessões pendentes mais antigas usando o valor confirmado.</p>
              </div>
              <Button onClick={() => {
                 const amt = parseFloat(confirmPendingAmount.replace(/\./g, '').replace(',', '.'))
                 handleConfirmPendingTransaction(pendingTxToConfirm, amt)
              }} disabled={isProcessingPayment || refreshing} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-14 rounded-xl shadow-md text-base transition-all hover:scale-[1.02]">
                {(isProcessingPayment || refreshing) ? <><Loader2 className="animate-spin mr-2 h-5 w-5" /> Processando...</> : "Confirmar e Dar Baixa"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={newTransactionOpen} onOpenChange={setNewTransactionOpen}>
        <DialogContent aria-describedby={undefined} className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Lançamento Inteligente</DialogTitle>
            <DialogDescription className="sr-only">Registre uma nova transação.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="font-bold">Paciente</Label>
              <select value={selectedPatient} onChange={(e) => setSelectedPatient(e.target.value)} className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer">
                <option value="" disabled>Selecione</option>
                {patientsList.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
            </div>
            <div className="space-y-2"><Label className="font-bold text-teal-600">Valor Recebido (R$)</Label><Input value={transactionValue} onChange={e => handleCurrencyInput(e.target.value, setTransactionValue)} className="text-2xl font-black h-14 rounded-xl border-slate-300" /></div>
            <Button disabled={isProcessingPayment || refreshing} className="w-full bg-teal-600 hover:bg-teal-700 font-bold h-14 rounded-2xl" onClick={() => handleProcessTransaction(selectedPatient, parseFloat(transactionValue.replace(/\./g, '').replace(',', '.')))}>
              {(isProcessingPayment || refreshing) ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processando...</> : "Abater Dívidas"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={newExpenseOpen} onOpenChange={setNewExpenseOpen}>
        <DialogContent aria-describedby={undefined} className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-800">Nova Despesa</DialogTitle>
            <DialogDescription className="sr-only">Registre uma nova despesa do consultório.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="font-bold">Descrição</Label>
              <Input value={expenseForm.description} onChange={e => setExpenseForm({...expenseForm, description: e.target.value})} placeholder="Ex: Aluguel, Sistema, Material, Café..." className="h-10 rounded-xl border-slate-300" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-bold">Data</Label>
                <Input type="date" value={expenseForm.date} onChange={e => setExpenseForm({...expenseForm, date: e.target.value})} className="h-10 rounded-xl border-slate-300" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold">Categoria</Label>
                <select value={expenseForm.category} onChange={e => setExpenseForm({...expenseForm, category: e.target.value})} className="flex h-10 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer">
                  <option value="Operacional">Operacional</option>
                  <option value="Impostos">Impostos / Taxas</option>
                  <option value="Marketing">Marketing / Ads</option>
                  <option value="Equipamentos">Equipamentos</option>
                  <option value="Pessoal">Pessoal / Salários</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="font-bold text-red-600">Valor (R$)</Label>
              <Input value={expenseForm.amount} onChange={e => handleCurrencyInput(e.target.value, (val) => setExpenseForm({...expenseForm, amount: val}))} className="text-2xl font-black h-14 rounded-xl border-slate-300 text-red-600" />
            </div>
            <Button disabled={refreshing} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold h-14 rounded-2xl" onClick={handleSaveExpense}>
              {refreshing ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Salvando...</> : "Registrar Despesa"}
            </Button>
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