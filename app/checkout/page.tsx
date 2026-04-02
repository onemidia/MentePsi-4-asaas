'use client'

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  const router = useRouter();
  const { toast } = useToast();
  const [status, setStatus] = useState('processing');
  const [errorMessage, setErrorMessage] = useState('');
  const [infoData, setInfoData] = useState({ cpf: '', phone: '', name: '' });
  const [userId, setUserId] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [paymentUrl, setPaymentUrl] = useState('');
  const [subscriptionId, setSubscriptionId] = useState('');
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
          phone: (extraData.phone || userData.phone || '').replace(/[^\d+]/g, ''),
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

      const finalUrl = data.invoiceUrl || data.checkoutUrl || data.paymentUrl;
      const subId = data.subscriptionId;

      if (finalUrl && subId) {
        setPaymentUrl(finalUrl);
        setSubscriptionId(subId);
        setStatus('waiting_payment');
        window.open(finalUrl, '_blank'); // Abre o link de pagamento em uma nova aba
      } else {
        throw new Error('Não foi possível obter o link de pagamento ou o ID da assinatura. Verifique seu e-mail ou tente novamente.');
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
    if (status !== 'waiting_payment' || !subscriptionId) return;

    console.log(`[Polling] Iniciando monitoramento para a assinatura Asaas: ${subscriptionId}`);

    const intervalId = setInterval(async () => {
      try {
        // O webhook deve criar/atualizar um registro com este ID
        const { data: sub, error } = await supabase
          .from('subscriptions')
          .select('status')
          .eq('asaas_subscription_id', subscriptionId)
          .single();

        // PGRST116: "The result contains 0 rows" - normal enquanto o webhook não roda
        if (error && error.code !== 'PGRST116') {
          console.warn('[Polling] Erro ao buscar assinatura:', error.message);
          return;
        }
        
        if (sub) {
          console.log(`[Polling] Status atual: ${sub.status}`);
          const successStatuses = ['active', 'confirmed', 'received', 'pago'];
          if (successStatuses.includes(String(sub.status).toLowerCase())) {
            console.log('[Polling] Pagamento confirmado! Redirecionando para /success...');
            clearInterval(intervalId);
            clearTimeout(timeoutId);
            router.push('/success');
          }
        } else {
            console.log('[Polling] Assinatura ainda não encontrada no banco de dados. Aguardando webhook...');
        }

      } catch (e) {
        console.error('[Polling] Erro inesperado no intervalo:', e);
      }
    }, 5000); // Poll a cada 5 segundos

    const timeoutId = setTimeout(() => {
        console.log('[Polling] Tempo limite de monitoramento atingido.');
        clearInterval(intervalId);
        setStatus('error');
        setErrorMessage('O tempo para confirmação do pagamento expirou. Por favor, tente novamente ou verifique seu e-mail.');
    }, 10 * 60 * 1000); // Timeout de 10 minutos

    return () => { clearInterval(intervalId); clearTimeout(timeoutId); };
  }, [status, subscriptionId, supabase, router]);

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

        const cleanCpf = profile?.cpf ? profile.cpf.replace(/\D/g, '') : '';
        const cleanPhone = profile?.phone ? profile.phone.replace(/[^\d+]/g, '') : '';

        if (!cleanCpf || !cleanPhone) {
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

  // Máscara Dinâmica de CPF / CNPJ
  const handleCpfCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '').slice(0, 14);
    let formattedValue = rawValue;
    if (rawValue.length <= 11) {
      formattedValue = rawValue
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else {
      formattedValue = rawValue
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    }
    setInfoData({ ...infoData, cpf: formattedValue });
  };

  // Máscara de Telefone Celular
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    
    // Se tiver um '+' em qualquer lugar da string, ativa o modo internacional
    if (value.includes('+')) {
      // Formato Internacional: remove letras, mas permite +, números, espaços, hifens e parênteses
      value = value.replace(/[^\d+ \-()]/g, '');
      setInfoData(prev => ({ ...prev, phone: value.slice(0, 25) }));
    } else {
      // Formato Brasil: aplica a máscara (XX) XXXXX-XXXX
      value = value.replace(/\D/g, ''); // Tira tudo que não é número
      value = value.replace(/^(\d{2})(\d)/g, '($1) $2'); // Coloca parênteses
      value = value.replace(/(\d)(\d{4})$/, '$1-$2'); // Coloca hífen
      setInfoData(prev => ({ ...prev, phone: value.slice(0, 15) }));
    }
  };

  // Validações
  const cleanCpf = infoData.cpf.replace(/\D/g, '');
  const isValidCpf = cleanCpf.length === 11 || cleanCpf.length === 14;
  
  const cleanPhoneDigits = infoData.phone.replace(/\D/g, '');
  const dbPhone = infoData.phone.replace(/[^\d+]/g, '');
  const isInternational = infoData.phone.includes('+');
  const isValidPhone = isInternational ? cleanPhoneDigits.length >= 8 : (cleanPhoneDigits.length === 10 || cleanPhoneDigits.length === 11);

  const isFormValid = infoData.name.trim().length > 0 && isValidCpf && isValidPhone;

  const handleInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    setStatus('processing');
    try {
      // Salva dados no perfil para evitar nova solicitação
      await supabase.from('professional_profile').upsert({
        user_id: userId,
        cpf: cleanCpf,
        phone: dbPhone,
        full_name: infoData.name,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

      await executeCharge({ id: userId, email: userEmail }, { ...infoData, cpf: cleanCpf, phone: dbPhone });
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
                <Label>CPF ou CNPJ</Label>
                <Input 
                  value={infoData.cpf} 
                  onChange={handleCpfCnpjChange} 
                  inputMode="numeric"
                  placeholder="000.000.000-00 ou 00.000.000/0000-00" 
                  maxLength={18}
                  required 
                  className={!isValidCpf && infoData.cpf.length > 0 ? "border-red-500 focus-visible:ring-red-500" : ""}
                />
                {!isValidCpf && infoData.cpf.length > 0 && (
                  <p className="text-xs text-red-500 font-medium">Digite um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Celular</Label>
                <Input 
                  value={infoData.phone} 
                  onChange={handlePhoneChange} 
                  inputMode="numeric"
                  placeholder="(00) 00000-0000 ou +1..."
                  required 
                  className={!isValidPhone && infoData.phone.length > 0 ? "border-red-500 focus-visible:ring-red-500" : ""}
                />
                {!isValidPhone && infoData.phone.length > 0 && (
                  <p className="text-xs text-red-500 font-medium">Digite um celular válido com DDD.</p>
                )}
              </div>
              <Button type="submit" disabled={!isFormValid} className="w-full bg-teal-600 hover:bg-teal-700 font-bold mt-4">Pagar Assinatura</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // UI de Espera pelo Pagamento
  if (status === 'waiting_payment') {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center space-y-4 bg-slate-50 p-4">
        <Loader2 className="h-12 w-12 animate-spin text-teal-600" />
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800">
            Aguardando Confirmação
          </h1>
          <p className="text-slate-500 max-w-md mt-2">
            Sua janela de pagamento foi aberta. Após a confirmação, você será redirecionado automaticamente.
          </p>
          <Button asChild variant="outline" className="mt-6">
            <a href={paymentUrl} target="_blank" rel="noopener noreferrer">
              Abrir link de pagamento novamente
            </a>
          </Button>
        </div>
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