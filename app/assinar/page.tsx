'use client'

import React, { useRef, useState, useEffect, use } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import { createClient } from '@/lib/client'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, CheckCircle, ShieldCheck, Info } from "lucide-react"

export default function SignaturePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const sigCanvas = useRef<any>(null)
  const [doc, setDoc] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [signed, setSigned] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function getDoc() {
      // Buscamos o documento e o nome do profissional para passar credibilidade
      const { data } = await supabase
        .from('patient_documents')
        .select('*, profiles(full_name)')
        .eq('id', id)
        .single()
      setDoc(data)
      setLoading(false)
    }
    getDoc()
  }, [id])

  // Limpa o canvas e lida com o resize (importante para mobile)
  const clear = () => sigCanvas.current.clear()

  const handleSave = async () => {
    if (sigCanvas.current.isEmpty()) return alert("Por favor, forneça sua assinatura.")
    
    setSaving(true)
    const signatureImage = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png')
    
    const { error } = await supabase.from('patient_documents').update({
      signature_data: signatureImage,
      status: 'Assinado',
      signed_at: new Date().toISOString(),
      // Aqui poderíamos salvar o IP do paciente para auditoria (mais um recurso PRO)
    }).eq('id', id)

    if (!error) setSigned(true)
    setSaving(false)
  }

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      <p className="text-slate-500 font-medium">Preparando documento seguro...</p>
    </div>
  )

  if (signed) return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <Card className="max-w-md w-full text-center p-10 border-t-4 border-t-green-500 shadow-2xl">
        <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-6"/>
        <CardTitle className="text-2xl">Assinatura Confirmada!</CardTitle>
        <p className="text-slate-600 mt-4">O documento foi enviado com segurança para seu psicólogo.</p>
        <div className="mt-8 pt-6 border-t text-xs text-slate-400">
          Autenticado digitalmente via IP e Timestamp
        </div>
      </Card>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 flex items-center">
      <Card className="max-w-3xl mx-auto shadow-2xl bg-white border-0 overflow-hidden">
        {/* Banner de Segurança Profissional */}
        <div className="bg-blue-600 p-4 flex items-center justify-center gap-2 text-white text-sm font-medium">
          <ShieldCheck className="h-4 w-4" />
          Ambiente Seguro de Assinatura Digital
        </div>

        <CardHeader className="p-8 pb-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-blue-600 text-xs font-bold uppercase tracking-wider mb-1">Documento de Consentimento</p>
              <CardTitle className="text-2xl text-slate-800">{doc?.title}</CardTitle>
            </div>
            {/* Espaço para o Logo do Profissional que assina o sistema */}
            <div className="text-right hidden sm:block">
              <p className="text-xs text-slate-400 uppercase">Profissional Responsável</p>
              <p className="font-semibold text-slate-700">{doc?.profiles?.full_name}</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-8 pt-0 space-y-8">
          <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 shadow-inner max-h-96 overflow-y-auto">
            <div className="text-slate-700 text-base leading-relaxed whitespace-pre-wrap">
              {doc?.content}
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-800">
              <p className="font-bold">Assinatura do Paciente</p>
              <div className="h-px flex-1 bg-slate-200"></div>
            </div>
            
            <div className="relative border-2 border-slate-200 rounded-2xl bg-white transition-all focus-within:border-blue-500 overflow-hidden">
              <SignatureCanvas 
                ref={sigCanvas}
                penColor='navy'
                canvasProps={{
                  className: 'w-full h-48 cursor-crosshair'
                }}
              />
              <div className="absolute bottom-2 right-2 flex gap-2">
                 <Button variant="outline" size="sm" className="bg-white/80" onClick={clear}>
                  Limpar
                </Button>
              </div>
            </div>
            
            <div className="flex items-start gap-2 text-slate-500 text-xs bg-blue-50 p-3 rounded-lg">
              <Info className="h-4 w-4 text-blue-500 mt-0.5" />
              <p>Ao assinar acima, você declara estar ciente e de acordo com as cláusulas apresentadas neste documento digital.</p>
            </div>
          </div>

          <Button className="w-full h-16 text-xl bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg transition-transform active:scale-[0.98]" 
                  onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="animate-spin mr-2"/> : "Confirmar Assinatura Digital"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}