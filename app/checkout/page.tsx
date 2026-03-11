'use client'

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, AlertCircle, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createClient } from '@/lib/client';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const dynamic = 'force-dynamic';

function CheckoutContent() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [status, setStatus] = useState('processing');
  const [errorMessage, setErrorMessage] = useState('');
  const [infoData, setInfoData] = useState({ cpf: '', phone: '', name: '' });
  const [userId, setUserId] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const supabase = createClient();

  const executeCharge = async (userData: any, extraData: any = {}) => {
    try {
      const params = Object.fromEntries(searchParams.entries());
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s para assinaturas

      const response = await fetch('/api/asaas/create-charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userData.id || userId,
          email: userData.email || userEmail,
          name: extraData.name || userData.full_name,
          cpf: (extraData.cpf || userData.cpf || '').replace(/\D/g, ''),
          phone: (extraData.phone || userData.phone || '').replace(/\D/g, ''),
          ...params
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Falha ao processar assinatura.');
      }

      console.log('✅ [Checkout] Resposta da API:', data);

      // 🔥 CAPTURA DE URL MULTI-CAMPO (Para PIX ou Assinatura)
      const finalUrl = data.invoiceUrl || data.checkoutUrl || data.paymentUrl;

      if (finalUrl) {
        setStatus('success');
        window.location.href = finalUrl;
      } else {
        // Caso o Asaas demore a gerar a fatura da assinatura
        throw new Error('Assinatura criada, mas o link de pagamento ainda não está disponível. Verifique seu e-mail ou tente em instantes.');
      }

    } catch (error: any) {
      console.error('❌ [Checkout] Erro:', error);
      setStatus('error');
      setErrorMessage(error.message || 'Erro inesperado no checkout.');
      toast({ 
        variant: "destructive", 
        title: "Erro no processamento", 
        description: error.message 
      });
    }
  };

  useEffect(() => {
    const processCheckout = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuário não autenticado.');

        setUserId(user.id);
        setUserEmail(user.email || '');

        const { data: profile } = await supabase
          .from('professional_profile')
          .select('full_name, email, cpf, phone')
          .eq('user_id', user.id)
          .single();

        if (!profile?.cpf || !profile?.phone) {
          setInfoData({
            cpf: profile?.cpf || '',
            phone: profile?.phone || '',
            name: profile?.full_name || user.user_metadata?.full_name || ''
          });
          setStatus('waiting_info');
          return;
        }

        await executeCharge({ 
            id: user.id, 
            email: profile.email || user.email, 
            full_name: profile.full_name,
            cpf: profile.cpf,
            phone: profile.phone
        });

      } catch (error: any) {
        setStatus('error');
        setErrorMessage(error.message);
      }
    };

    if (status === 'processing') processCheckout();
  }, []);

  const handleInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('processing');
    try {
      // Salva dados no perfil para evitar nova solicitação
      await supabase.from('professional_profile').upsert({
        user_id: userId,
        cpf: infoData.cpf,
        phone: infoData.phone,
        full_name: infoData.name,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

      await executeCharge({ id: userId, email: userEmail }, infoData);
    } catch (error: any) {
       setStatus('error');
       setErrorMessage(error.message);
    }
  };

  // UI de Espera por Informações
  if (status === 'waiting_info') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md shadow-xl border-teal-100">
          <CardHeader className="text-center">
            <div className="mx-auto bg-teal-50 p-3 rounded-full w-fit mb-2 text-teal-600">
              <ShieldCheck size={32} />
            </div>
            <CardTitle>Dados de Faturamento</CardTitle>
            <CardDescription>Confirme seus dados para ativar o plano recorrente.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInfoSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome Completo</Label>
                <Input value={infoData.name} onChange={e => setInfoData({...infoData, name: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>CPF</Label>
                <Input value={infoData.cpf} onChange={e => setInfoData({...infoData, cpf: e.target.value})} placeholder="000.000.000-00" required />
              </div>
              <div className="space-y-2">
                <Label>Celular</Label>
                <Input value={infoData.phone} onChange={e => setInfoData({...infoData, phone: e.target.value})} placeholder="(00) 00000-0000" required />
              </div>
              <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 font-bold mt-4">Pagar Assinatura</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // UI de Erro
  if (status === 'error') {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center space-y-4 bg-slate-50 p-4">
        <AlertCircle className="h-12 w-12 text-red-600" />
        <h1 className="text-xl font-bold text-slate-800">Erro no Checkout</h1>
        <p className="text-slate-500 text-center max-w-sm">{errorMessage}</p>
        <Button onClick={() => window.location.reload()} variant="outline">Tentar Novamente</Button>
      </div>
    );
  }

  // UI de Sucesso / Carregamento
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center space-y-4 bg-slate-50">
      <Loader2 className="h-12 w-12 animate-spin text-teal-600" />
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-800">
          {status === 'success' ? 'Redirecionando...' : 'Finalizando sua Assinatura...'}
        </h1>
        <p className="text-slate-500">Estamos conectando com o Asaas...</p>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="flex h-screen w-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-teal-600" /></div>}>
      <CheckoutContent />
    </Suspense>
  );
}