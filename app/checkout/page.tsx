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
  const [needsInfo, setNeedsInfo] = useState(false);
  const [infoData, setInfoData] = useState({ cpf: '', phone: '', name: '' });
  const [userId, setUserId] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const supabase = createClient();

  // Função isolada para processar o pagamento
  const executeCharge = async (userData: any, extraData: any = {}) => {
    try {
      const params = Object.fromEntries(searchParams.entries());
      
      // Prevenir Loop Infinito (Timeout de 15s)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      // Limpeza de dados (remove máscaras) e garante que os dados do formulário tenham prioridade
      const cleanCpf = (extraData.cpf || userData.cpf || '').replace(/\D/g, '');
      const cleanPhone = (extraData.phone || userData.phone || '').replace(/\D/g, '');

      const response = await fetch('/api/asaas/create-charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Garante que os dados corretos sejam enviados
          userId: userData.id || userId,
          email: userData.email || userEmail,
          name: extraData.name || userData.full_name, // Prioriza nome do formulário
          cpf: cleanCpf,
          phone: cleanPhone,
          ...params
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha na comunicação com o servidor.');
      }

      const data = await response.json();
      console.log('✅ [Checkout] Sucesso:', data);
      setStatus('success');
      
      if (data.invoiceUrl) {
           window.location.href = data.invoiceUrl;
      } else {
           toast({ title: 'Sucesso', description: 'Cobrança gerada com sucesso.' });
      }

    } catch (error: any) {
      console.error('❌ [Checkout] Erro:', error);
      setStatus('error');
      setErrorMessage(error.message || 'Erro desconhecido.');
    }
  };

  useEffect(() => {
    // Debug de Parâmetros
    const params = Object.fromEntries(searchParams.entries());
    console.log('🔍 [Checkout] Search Params:', params);

    const processCheckout = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          throw new Error('Usuário não autenticado.');
        }

        setUserId(user.id);
        setUserEmail(user.email || '');

        // Verifica se tem perfil completo
        const { data: profile } = await supabase
          .from('professional_profile')
          .select('cpf, phone, full_name')
          .eq('user_id', user.id)
          .single();

        // Se faltar CPF ou Telefone, pede para preencher
        if (!profile?.cpf || !profile?.phone) {
          setInfoData(prev => ({
            ...prev,
            cpf: profile?.cpf || '',
            phone: profile?.phone || '',
            name: profile?.full_name || user.user_metadata?.full_name || ''
          }));
          setStatus('waiting_info');
          return;
        }

        // Se tiver tudo, processa direto
        await executeCharge({ id: user.id, email: user.email, ...profile });

      } catch (error: any) {
        console.error('❌ [Checkout] Erro:', error);
        setStatus('error');
        setErrorMessage(error.message);
      }
    };

    // Executa apenas uma vez na montagem
    if (status === 'processing') {
        processCheckout();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('processing');
    
    // Salva no perfil para não pedir de novo
    await supabase.from('professional_profile').upsert({
      user_id: userId,
      cpf: infoData.cpf,
      phone: infoData.phone,
      full_name: infoData.name,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });

    // Executa a cobrança com os dados do formulário
    await executeCharge({ id: userId, email: userEmail }, infoData);
  };

  if (status === 'waiting_info') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md shadow-xl border-teal-100">
          <CardHeader className="text-center">
            <div className="mx-auto bg-teal-50 p-3 rounded-full w-fit mb-2 text-teal-600">
              <ShieldCheck size={32} />
            </div>
            <CardTitle>Finalizar Cadastro</CardTitle>
            <CardDescription>Precisamos de alguns dados para emitir sua nota fiscal.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInfoSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome Completo</Label>
                <Input 
                  value={infoData.name} 
                  onChange={e => setInfoData({...infoData, name: e.target.value})} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label>CPF</Label>
                <Input 
                  value={infoData.cpf} 
                  onChange={e => setInfoData({...infoData, cpf: e.target.value})} 
                  placeholder="000.000.000-00"
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label>Celular / WhatsApp</Label>
                <Input 
                  value={infoData.phone} 
                  onChange={e => setInfoData({...infoData, phone: e.target.value})} 
                  placeholder="(00) 00000-0000"
                  required 
                />
              </div>
              <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 font-bold mt-4">
                Continuar para Pagamento
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center space-y-4 bg-slate-50 p-4">
        <div className="bg-red-100 p-4 rounded-full">
          <AlertCircle className="h-8 w-8 text-red-600" />
        </div>
        <h1 className="text-xl font-bold text-slate-800">Não foi possível concluir</h1>
        <p className="text-slate-500 text-center max-w-md">{errorMessage}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  if (status === 'success') {
      return (
        <div className="flex h-screen w-screen flex-col items-center justify-center space-y-4 bg-slate-50">
            <Loader2 className="h-12 w-12 animate-spin text-teal-600" />
            <p className="text-slate-500">Redirecionando para pagamento...</p>
        </div>
      )
  }

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center space-y-4 bg-slate-50">
      <Loader2 className="h-12 w-12 animate-spin text-teal-600" />
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-800">Processando Checkout...</h1>
        <p className="text-slate-500">Aguarde, estamos preparando seu ambiente.</p>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-teal-600" /></div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}