'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/client'
import { 
  History, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Wallet,
  Loader2
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface CreditLogProps {
  patientId: string;
  currentBalance: number;
}

export default function PatientCreditLog({ patientId, currentBalance }: CreditLogProps) {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true)
      // Buscamos transações que afetaram o crédito (entradas avulsas ou baixas automáticas)
      const { data, error } = await supabase
        .from('financial_transactions')
        .select('*')
        .eq('patient_id', patientId)
        .or('category.ilike.%Crédito%,description.ilike.%haver%')
        .order('created_at', { ascending: false })

      if (!error && data) setLogs(data)
      setLoading(false)
    }

    if (patientId) fetchLogs()
  }, [patientId, supabase])

  const formatBRL = (val: number) => 
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <Card className="border border-slate-100 shadow-sm bg-white rounded-[32px]">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-slate-400" />
          <CardTitle className="text-lg font-bold">Extrato de Crédito</CardTitle>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo Atual</span>
          <span className={`text-xl font-black ${currentBalance > 0 ? 'text-teal-600' : 'text-slate-400'}`}>
            {formatBRL(currentBalance)}
          </span>
        </div>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin text-teal-600" /></div>
        ) : logs.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm italic">
            Nenhuma movimentação de crédito encontrada.
          </div>
        ) : (
          <div className="space-y-4 mt-4">
            {logs.map((log) => {
              const isUsage = log.description.toLowerCase().includes('baixa') || log.category.toLowerCase().includes('uso');
              
              return (
                <div key={log.id} className="flex items-center justify-between p-3 rounded-xl border bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    {isUsage ? (
                      <ArrowDownCircle className="h-8 w-8 text-amber-500" />
                    ) : (
                      <ArrowUpCircle className="h-8 w-8 text-teal-500" />
                    )}
                    <div>
                      <p className="text-sm font-bold text-slate-700">{log.description}</p>
                      <p className="text-[10px] text-slate-500 font-medium">
                        {format(new Date(log.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-black ${isUsage ? 'text-amber-600' : 'text-teal-600'}`}>
                      {isUsage ? '-' : '+'}{formatBRL(Number(log.amount))}
                    </p>
                    <Badge variant="outline" className="text-[9px] uppercase font-bold">
                      {log.category}
                    </Badge>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}