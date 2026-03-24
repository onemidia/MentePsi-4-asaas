'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image' // 🟢 Next.js Image
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/client'
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Loader2, Save, Image as ImageIcon, AlertTriangle, Download } from 'lucide-react'

// ⚡ PERFORMANCE: Carrega o componente de equipe apenas se necessário (Code Splitting)
const TeamManagement = dynamic(() => import('@/components/TeamManagement').then(mod => mod.TeamManagement), { loading: () => <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-teal-600" /></div> })

// Define the type for the profile data
type ProfileData = {
  full_name: string;
  crp: string;
  specialty: string;
  phone: string;
  logo_url: string;
  pix_key: string;
  bank: string;
  agency: string;
  bank_account: string; // Nome exato da coluna no banco
  account_type: string;
  default_session_value: number | string;
  default_session_duration: number | string;
  clinic_name: string;
  address: string;
  cep: string;
  city: string;
  state: string;
  work_hours_start: string;
  work_hours_end: string;
  whatsapp_reminders_enabled: boolean;
  reminder_lead_time: number;
  reminder_template: string;
  birthday_message_template: string;
  cpf: string;
  rg: string;
  genero: string;
  estado_civil: string;
  occupation_type: string;
}

type PaymentHistory = {
  id: string;
  amount: number;
  plan_name: string;
  status: string;
  payment_date: string;
}

const initialProfileState: Partial<ProfileData> = {
  full_name: '',
  crp: '',
  specialty: '',
  phone: '',
  logo_url: '',
  pix_key: '',
  bank: '',
  agency: '',
  bank_account: '',
  account_type: 'Corrente',
  default_session_value: 0,
  default_session_duration: 50,
  clinic_name: '',
  address: '',
  cep: '',
  city: '',
  state: '',
  work_hours_start: '08:00',
  work_hours_end: '18:00',
  whatsapp_reminders_enabled: true,
  reminder_lead_time: 24,
  reminder_template: 'Olá, {paciente}! Passando para lembrar que nossa próxima sessão está agendada para: 🗓️ Data: {data} | 🕒 Horário: {horario}. Caso precise remarcar, por favor, me avise com antecedência. Até lá! 👋',
  birthday_message_template: 'Olá, {paciente}! Hoje o dia é todo seu. 🎂 Desejo que seu novo ciclo seja repleto de saúde, leveza e muitas conquistas. Que você continue trilhando seu caminho com muita coragem e autoconhecimento. Feliz aniversário! ✨',
  cpf: '',
  rg: '',
  genero: '',
  estado_civil: '',
  occupation_type: 'psicologo'
};

export default function SettingsPage() {
  const [profile, setProfile] = useState(initialProfileState);
  const [subscription, setSubscription] = useState<{ status: string | null, current_period_end: string | null, created_at?: string | null } | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    setIsMounted(true);
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user?.id) {
          console.warn("Usuário não autenticado ou ID ausente.");
          return;
        }

        const userId = user.id;

        // 1. Busca os dados profissionais com tratamento de erro isolado
        const { data: profData, error: profError } = await supabase
          .from('professional_profile')
          .select(`
            user_id, full_name, crp, specialty, phone, logo_url, pix_key, bank, 
            agency, bank_account, account_type, default_session_value, default_session_duration, 
            clinic_name, address, cep, city, state, work_hours_start, work_hours_end, 
            whatsapp_reminders_enabled, reminder_lead_time, reminder_template, 
            birthday_message_template, cpf, rg, genero, estado_civil, occupation_type
          `)
          .eq('user_id', userId)
          .maybeSingle();
        
        if (profError) {
          console.warn("Aviso (professional_profile):", profError.message, profError.details);
        }
        
        // 2. Busca o status da assinatura na tabela subscriptions
        const { data: subData, error: subError } = await supabase
          .from('subscriptions')
          .select('status, current_period_end, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (subError) console.warn("Aviso (subscriptions):", subError.message);
        if (subData) setSubscription(subData);

        // 3. Busca o histórico de pagamentos do usuário
        const { data: historyData, error: historyError } = await supabase
          .from('payment_history')
          .select('*')
          .eq('user_id', userId)
          .order('payment_date', { ascending: false });

        if (historyError) console.warn("Aviso (payment_history):", historyError.message);
        if (historyData && historyData.length > 0) setPaymentHistory(historyData);

        // Aplica os dados apenas se a requisição for bem sucedida e retornar algo
        if (profData) {
          setProfile(prev => ({ 
            ...prev, 
            ...profData,
            full_name: profData.full_name || '',
            clinic_name: profData.clinic_name || '',
            pix_key: profData.pix_key || '',
            bank_account: profData.bank_account || '', 
            logo_url: profData.logo_url || '',
            reminder_template: profData.reminder_template || initialProfileState.reminder_template,
            birthday_message_template: profData.birthday_message_template || initialProfileState.birthday_message_template,
            occupation_type: profData.occupation_type || 'psicologo',
          }));
        }
      } catch (error) {
        console.warn("Aviso interno ao carregar configurações:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setProfile(prev => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (id: string, value: string | number) => {
    setProfile(prev => ({ ...prev, [id]: value }));
  };
  
  const handleSwitchChange = (id: string, checked: boolean) => {
    setProfile(prev => ({ ...prev, [id]: checked }));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingLogo(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/logo_${Date.now()}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage.from('logos').upload(fileName, file, { upsert: true })

      if (uploadError) {
        toast({ variant: 'destructive', title: 'Erro no upload', description: uploadError.message })
      } else {
        const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(fileName)
        setProfile(prev => ({ ...prev, logo_url: publicUrl }))
        toast({ title: 'Logo carregada!', description: 'Clique em Salvar Alterações para confirmar.' })
      }
    }
    setUploadingLogo(false)
  }

  const handleSave = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Usuário não autenticado.' });
      setSaving(false);
      return;
    }

    const formData = {
      user_id: user.id,
      full_name: profile.full_name?.trim() || '',
      email: user.email || '',
      phone: profile.phone?.replace(/\D/g, '') || '',
      cpf: String(profile.cpf || '').replace(/\D/g, ''),
      rg: profile.rg?.trim() || '',
      crp: profile.crp?.trim() || '',
      specialty: profile.specialty?.trim() || '',
      genero: profile.genero || '',
      estado_civil: profile.estado_civil || '',
      clinic_name: profile.clinic_name?.trim() || '',
      address: profile.address?.trim() || '',
      cep: profile.cep?.replace(/\D/g, '') || '',
      city: profile.city?.trim() || '',
      state: profile.state?.trim() || '',
      work_hours_start: profile.work_hours_start || '08:00',
      work_hours_end: profile.work_hours_end || '18:00',
      whatsapp_reminders_enabled: !!profile.whatsapp_reminders_enabled,
      reminder_lead_time: Number(profile.reminder_lead_time) || 0,
      reminder_template: profile.reminder_template || '',
      birthday_message_template: profile.birthday_message_template || '',
      bank: profile.bank?.trim() || '',
      agency: profile.agency?.trim() || '',
      bank_account: profile.bank_account?.trim() || '',
      account_type: profile.account_type || 'Corrente',
      default_session_value: Number(String(profile.default_session_value).replace(',', '.')) || 0,
      default_session_duration: Number(profile.default_session_duration) || 0,
      logo_url: profile.logo_url || '',
      pix_key: profile.pix_key?.trim() || '',
      occupation_type: profile.occupation_type || 'psicologo',
      updated_at: new Date().toISOString()
    };

    try {
      const { error } = await supabase
        .from('professional_profile')
        .upsert(formData, { onConflict: 'user_id' }); // Conflito baseado no user_id

      if (error) {
        console.error('Erro detalhado:', error);
        toast({ variant: 'destructive', title: 'Erro ao salvar', description: error.message });
      } else {
        toast({ title: 'Sucesso!', description: 'Configurações salvas permanentemente.' });
      }
    } catch (e) {
      console.error("Erro interno:", e);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelSubscription = async () => {
    setCancelling(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Atualiza o status na tabela 'subscriptions'
      const { error } = await supabase
        .from('subscriptions')
        .update({ 
          status: 'canceled'
        })
        .eq('user_id', user.id);

      if (error) {
        toast({ variant: 'destructive', title: 'Erro ao cancelar', description: error.message });
      } else {
        toast({ 
          title: 'Assinatura cancelada', 
          description: 'Sua assinatura permanecerá ativa até o fim do ciclo atual.' 
        });
        setProfile(prev => ({ ...prev, subscription_status: 'canceled', plan_type: 'starter' }));
        setIsCancelModalOpen(false);
      }
    }
    setCancelling(false);
  };

  const handleExportBackup = async () => {
    try {
      setExporting(true);
      toast({ title: "Preparando backup...", description: "Isso pode levar alguns segundos dependendo do volume de dados." });
      
      const res = await fetch('/api/backup/export');
      if (!res.ok) throw new Error('Erro ao gerar o arquivo de backup.');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_mentepsi_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      toast({ variant: 'destructive', title: "Erro na Exportação", description: error.message });
    } finally {
      setExporting(false);
    }
  };

  if (!isMounted) return null;

  const registryLabel = profile.occupation_type === 'psiquiatra' ? 'CRM' : profile.occupation_type === 'nutricionista' ? 'CRN' : profile.occupation_type === 'fonoaudiologo' ? 'CRFa' : profile.occupation_type === 'fisioterapeuta' ? 'CREFITO' : profile.occupation_type === 'terapeuta_holistico' ? 'CRT' : profile.occupation_type === 'psicanalista' ? 'Registro Profissional (RNTP / RP)' : profile.occupation_type === 'psicopedagogo' ? 'Registro Profissional (ABPp / CBO)' : profile.occupation_type === 'outro' ? 'Registro Profissional' : 'CRP';

  return (
    <div className="container mx-auto p-6 space-y-8 bg-slate-100 min-h-[100dvh]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Configurações</h1>
          <p className="text-slate-500">Gerencie seu perfil profissional, consultório e automações.</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 text-white">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Salvar Alterações
        </Button>
      </div>

      <Tabs defaultValue="perfil" className="w-full">
        <TabsList className="flex flex-wrap h-auto w-full justify-start gap-2 bg-slate-100 p-1 rounded-xl mb-8">
          <TabsTrigger value="perfil" className="flex-1 min-w-[100px]">Perfil</TabsTrigger>
          <TabsTrigger value="consultorio" className="flex-1 min-w-[100px]">Consultório</TabsTrigger>
          <TabsTrigger value="pagamentos" className="flex-1 min-w-[100px]">Pagamentos</TabsTrigger>
          <TabsTrigger value="lembretes" className="flex-1 min-w-[100px]">Lembretes</TabsTrigger>
          <TabsTrigger value="plano" className="flex-1 min-w-[100px]">Plano</TabsTrigger>
          <TabsTrigger value="equipe" className="flex-1 min-w-[100px]">Equipe</TabsTrigger>
        </TabsList>

        <TabsContent value="perfil" className="mt-6">
          <Card className="border-slate-200 shadow-md bg-white">
            <CardHeader>
              <CardTitle>Perfil Profissional</CardTitle>
              <CardDescription>Informações que aparecerão em seus documentos e relatórios.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center sm:flex-row gap-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="relative h-24 w-24 shrink-0 rounded-xl overflow-hidden border-2 border-white shadow-sm bg-white flex items-center justify-center">
                  {profile.logo_url ? (
                    <Image 
                      src={profile.logo_url} 
                      alt="Logo da Clínica" 
                      fill 
                      className="object-contain" 
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      unoptimized={true} // Necessário para URLs externos do Supabase Storage
                    />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-slate-300" />
                  )}
                  {uploadingLogo && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><Loader2 className="animate-spin text-white h-6 w-6"/></div>}
                </div>
                <div className="space-y-2 flex-1">
                  <Label htmlFor="logo-upload" className="font-bold text-slate-700">Logotipo da Clínica</Label>
                  <p className="text-xs text-slate-500">Recomendado: 150x150px (PNG ou JPG). Será exibido no cabeçalho dos recibos e documentos.</p>
                  <div className="flex items-center gap-2"><Input id="logo-upload" type="file" accept="image/*" onChange={handleLogoUpload} className="text-xs file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100" disabled={uploadingLogo} /></div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Nome Profissional</Label>
                  <Input id="full_name" value={profile.full_name || ''} onChange={handleInputChange} className="border-slate-300" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="occupation_type">Profissão</Label>
                  <Select value={profile.occupation_type || 'psicologo'} onValueChange={(value) => handleSelectChange('occupation_type', value)}>
                    <SelectTrigger className="border-slate-300"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="psicologo">Psicólogo(a)</SelectItem>
                      <SelectItem value="psiquiatra">Psiquiatra</SelectItem>
                      <SelectItem value="psicanalista">Psicanalista</SelectItem>
                      <SelectItem value="psicopedagogo">Psicopedagogo(a)</SelectItem>
                      <SelectItem value="nutricionista">Nutricionista</SelectItem>
                      <SelectItem value="fonoaudiologo">Fonoaudiólogo(a)</SelectItem>
                      <SelectItem value="fisioterapeuta">Fisioterapeuta</SelectItem>
                      <SelectItem value="terapeuta_holistico">Terapeuta Holístico(a)</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="crp">{registryLabel}</Label>
                  <Input id="crp" placeholder={`Digite seu ${registryLabel}...`} value={profile.crp || ''} onChange={handleInputChange} className="border-slate-300" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF</Label>
                  <Input 
                    id="cpf" 
                    value={profile.cpf || ''} 
                    onChange={(e) => {
                      let value = e.target.value.replace(/\D/g, ''); // Remove tudo que não é número
                      
                      // Aplica a máscara 000.000.000-00 conforme digita
                      if (value.length <= 11) {
                        value = value
                          .replace(/(\d{3})(\d)/, '$1.$2')
                          .replace(/(\d{3})(\d)/, '$1.$2')
                          .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                        
                        setProfile(prev => ({ ...prev, cpf: value }));
                      }
                    }} 
                    placeholder="000.000.000-00" 
                    maxLength={14} // Trava o campo para não deixar digitar mais que o necessário
                    className="border-slate-300" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rg">RG</Label>
                  <Input id="rg" value={profile.rg || ''} onChange={handleInputChange} className="border-slate-300" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="genero">Gênero</Label>
                  <Select value={profile.genero || ''} onValueChange={(value) => handleSelectChange('genero', value)}>
                    <SelectTrigger className="border-slate-300"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Feminino">Feminino</SelectItem>
                      <SelectItem value="Masculino">Masculino</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                      <SelectItem value="Prefiro não informar">Prefiro não informar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estado_civil">Estado Civil</Label>
                  <Select value={profile.estado_civil || ''} onValueChange={(value) => handleSelectChange('estado_civil', value)}>
                    <SelectTrigger className="border-slate-300"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Solteiro(a)">Solteiro(a)</SelectItem>
                      <SelectItem value="Casado(a)">Casado(a)</SelectItem>
                      <SelectItem value="Divorciado(a)">Divorciado(a)</SelectItem>
                      <SelectItem value="Viúvo(a)">Viúvo(a)</SelectItem>
                      <SelectItem value="União Estável">União Estável</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="specialty">Especialidade</Label>
                <Input id="specialty" placeholder="Ex: Psicologia Clínica, Terapia Cognitivo-Comportamental" value={profile.specialty || ''} onChange={handleInputChange} className="border-slate-300" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone/WhatsApp</Label>
                  <Input id="phone" type="tel" value={profile.phone || ''} onChange={handleInputChange} className="border-slate-300" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="default_session_value">Valor Padrão da Sessão (R$)</Label>
                  <Input id="default_session_value" type="text" value={profile.default_session_value ?? ''} onChange={handleInputChange} className="border-slate-300" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="default_session_duration">Duração Padrão (min)</Label>
                  <Input id="default_session_duration" type="text" value={profile.default_session_duration ?? ''} onChange={handleInputChange} className="border-slate-300" />
                </div>
              </div>

              {/* EXPORTAÇÃO DE DADOS (LGPD) */}
              <div className="pt-6 border-t border-slate-100 mt-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 p-4 sm:p-6 rounded-xl border border-slate-200">
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-900">Exportação de Dados (LGPD)</h3>
                    <p className="text-sm text-slate-500">Faça o download de todos os seus pacientes, prontuários, financeiro e links de documentos em um formato <b>.zip</b> seguro.</p>
                  </div>
                  <Button variant="outline" onClick={handleExportBackup} disabled={exporting} className="bg-white border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900 w-full sm:w-auto shrink-0">
                    {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                    Gerar Backup Completo
                  </Button>
                </div>
              </div>

            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consultorio" className="mt-6">
          <Card className="border-slate-200 shadow-md bg-white">
            <CardHeader>
              <CardTitle>Dados do Consultório</CardTitle>
              <CardDescription>Informações sobre o local de atendimento.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="clinic_name">Nome da Clínica</Label>
                <Input id="clinic_name" value={profile.clinic_name || ''} onChange={handleInputChange} className="border-slate-300" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="cep">CEP</Label>
                  <Input 
                    id="cep" 
                    value={profile.cep || ''} 
                    onChange={(e) => {
                      let value = e.target.value.replace(/\D/g, '')
                      value = value.replace(/^(\d{5})(\d)/, '$1-$2')
                      setProfile(prev => ({ ...prev, cep: value.slice(0, 9) }))
                    }}
                    placeholder="00000-000"
                    className="border-slate-300" 
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="address">Endereço</Label>
                  <Input id="address" value={profile.address || ''} onChange={handleInputChange} className="border-slate-300" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input id="city" value={profile.city || ''} onChange={handleInputChange} className="border-slate-300" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">Estado</Label>
                  <Input id="state" value={profile.state || ''} onChange={handleInputChange} className="border-slate-300" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="work_hours_start">Horário de Início</Label>
                  <Input id="work_hours_start" type="time" value={profile.work_hours_start || '08:00'} onChange={handleInputChange} className="border-slate-300" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="work_hours_end">Horário de Término</Label>
                  <Input id="work_hours_end" type="time" value={profile.work_hours_end || '18:00'} onChange={handleInputChange} className="border-slate-300" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pagamentos" className="mt-6">
          <Card className="border-slate-200 shadow-md bg-white">
            <CardHeader>
              <CardTitle>Dados Bancários e Pagamentos</CardTitle>
              <CardDescription>Configure suas informações para recebimento e chaves PIX.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="pix_key">Chave Pix Principal</Label>
                <Input id="pix_key" placeholder="CPF, Email, Telefone ou Chave Aleatória" value={profile.pix_key || ''} onChange={handleInputChange} className="border-slate-300" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="bank">Banco</Label>
                  <Input id="bank" placeholder="Ex: Nubank, Itaú, Bradesco" value={profile.bank || ''} onChange={handleInputChange} className="border-slate-300" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account_type">Tipo de Conta</Label>
                  <Select 
                    value={profile.account_type || 'Corrente'} 
                    onValueChange={(value) => handleSelectChange('account_type', value)}
                  >
                    <SelectTrigger className="border-slate-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Corrente">Conta Corrente</SelectItem>
                      <SelectItem value="Poupanca">Conta Poupança</SelectItem>
                      <SelectItem value="Pagamento">Conta de Pagamento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agency">Agência</Label>
                  <Input id="agency" value={profile.agency || ''} onChange={handleInputChange} className="border-slate-300" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bank_account">Conta com Dígito</Label>
                  <Input id="bank_account" value={profile.bank_account || ''} onChange={handleInputChange} className="border-slate-300" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lembretes" className="mt-6">
          <Card className="border-slate-200 shadow-md bg-white">
            <CardHeader>
              <CardTitle>Lembretes Automáticos</CardTitle>
              <CardDescription>Configure o envio de mensagens via WhatsApp para seus pacientes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                  <div className="flex items-center space-x-2">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        id="whatsapp_reminders_enabled"
                        className="sr-only peer" 
                        checked={profile.whatsapp_reminders_enabled} 
                        onChange={(e) => handleSwitchChange('whatsapp_reminders_enabled', e.target.checked)} 
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-teal-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                    </label>
                    <Label htmlFor="whatsapp_reminders_enabled">Ativar lembretes automáticos via WhatsApp</Label>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="reminder_lead_time">Enviar com antecedência de</Label>
                    <Select 
                      value={String(profile.reminder_lead_time || 24)} 
                      onValueChange={(value) => handleSelectChange('reminder_lead_time', Number(value))}
                    >
                      <SelectTrigger className="w-[280px] border-slate-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="24">2 horas</SelectItem>
                        <SelectItem value="48">6 horas</SelectItem>
                        <SelectItem value="72">12 horas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="reminder_template">Modelo da Mensagem</Label>
                    <Textarea 
                      id="reminder_template" 
                      value={profile.reminder_template || ''} 
                      onChange={handleInputChange}
                      className="min-h-[150px] border-slate-300"
                    />
                    <p className="text-xs text-slate-500">
                      Use as tags: <code className="bg-slate-100 px-1 rounded">{'{paciente}'}</code>, <code className="bg-slate-100 px-1 rounded">{'{data}'}</code>, <code className="bg-slate-100 px-1 rounded">{'{horario}'}</code>.
                    </p>
                  </div>

                  {/* A MENSAGEM DE ANIVERSÁRIO VOLTOU AQUI! */}
                  <div className="space-y-4 pt-6 border-t border-slate-100">
                    <h3 className="text-base font-bold text-slate-900">Personalização de Mensagens</h3>
                    
                    <div className="space-y-3">
                      <Label htmlFor="birthday_message_template">Mensagem Padrão de Aniversário</Label>
                      
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-sm text-amber-800">
                          <strong>Atenção:</strong> Não altere ou apague o termo <code className="bg-amber-100 px-1 rounded font-bold">{'{paciente}'}</code>. O sistema utiliza esse código para inserir automaticamente o nome do aniversariante no momento do envio.
                        </p>
                      </div>

                      <Textarea 
                        id="birthday_message_template" 
                        value={profile.birthday_message_template || ''} 
                        onChange={handleInputChange}
                        className="min-h-[100px] border-slate-300"
                        placeholder="Digite a mensagem de parabéns..."
                      />
                    </div>
                  </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plano" className="mt-6">
          <Card className="border-slate-200 shadow-md bg-white">
            <CardHeader>
              <CardTitle>Gerenciar Assinatura</CardTitle>
              <CardDescription>Consulte os detalhes do seu plano e histórico de pagamentos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border bg-slate-50 space-y-1">
                  <Label className="text-slate-500 text-xs uppercase tracking-wider">Plano Atual</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-slate-900 capitalize">
                      {subscription?.status === 'trialing' ? 'Plano Profissional (Teste Grátis)' : 'Plano Profissional'}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      subscription?.status?.toLowerCase() === 'active' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {subscription?.status?.toLowerCase() === 'active' ? 'Ativo' : subscription?.status === 'trialing' ? 'Em teste' : 'Inativo'}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl border bg-slate-50 space-y-1">
                  <Label className="text-slate-500 text-xs uppercase tracking-wider">Status Financeiro</Label>
                  <p className="text-xl font-bold text-teal-700 capitalize">
                    {subscription?.status === 'active' ? 'Assinatura Regular' : 'Aguardando Ativação'}
                  </p>
                </div>
              </div>

              {/* BOTÃO SÓ APARECE SE NÃO ESTIVER ATIVO */}
              {subscription?.status?.toLowerCase() !== 'active' && (
                <div className="p-6 rounded-xl border-2 border-dashed border-teal-200 bg-teal-50 flex flex-col items-center text-center space-y-4">
                  <div className="space-y-1">
                    <h4 className="font-bold text-teal-900">Ative sua conta profissional</h4>
                    <p className="text-sm text-teal-700">Identificamos que seu plano ainda não consta como ativo em nosso sistema.</p>
                  </div>
                  <Button 
                    onClick={() => window.location.href = '/planos'} 
                    className="bg-teal-600 hover:bg-teal-700 text-white"
                  >
                    Ir para Pagamento
                  </Button>
                </div>
              )}

              {/* ZONA DE PERIGO / CANCELAMENTO (MOVIDO PARA CÁ) */}
              {subscription?.status?.toLowerCase() === 'active' && (
                <div className="flex justify-center pt-2">
                  <Dialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        className="text-slate-400 hover:text-red-600 hover:bg-red-50 text-xs"
                      >
                        Deseja cancelar sua assinatura?
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px] bg-white dark:bg-slate-900">
                      <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-slate-900">Tem certeza que deseja nos deixar?</DialogTitle>
                        <DialogDescription>
                          Sentiremos sua falta. Gostaríamos de entender o motivo para continuarmos melhorando.
                        </DialogDescription>
                      </DialogHeader>

                      {/* Seção 1: Aversão à Perda */}
                      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3 items-start mt-2">
                        <div className="bg-amber-100 p-2 rounded-full shrink-0">
                          <AlertTriangle className="h-5 w-5 text-amber-600" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-amber-900">O que você vai perder:</h4>
                          <ul className="text-xs text-amber-800 list-disc list-inside space-y-0.5">
                            <li>Acesso dos pacientes ao Portal.</li>
                            <li>Lembretes automáticos de WhatsApp desativados.</li>
                            <li>Histórico financeiro e relatórios bloqueados.</li>
                          </ul>
                        </div>
                      </div>

                      {/* Seção 2: Feedback */}
                      <div className="space-y-3 py-4">
                        <Label className="text-sm font-semibold text-slate-700">Qual o motivo do cancelamento?</Label>
                        <div className="space-y-2">
                          {[
                            "O sistema está caro para o meu momento",
                            "Faltam funcionalidades que eu preciso",
                            "Vou fechar meu consultório/pausar",
                            "Outro motivo"
                          ].map((reason) => (
                            <div key={reason} className="flex items-center space-x-2">
                              <input 
                                type="radio" 
                                id={reason} 
                                name="cancelReason" 
                                value={reason}
                                checked={cancelReason === reason}
                                onChange={(e) => setCancelReason(e.target.value)}
                                className="h-4 w-4 border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                              />
                              <label htmlFor={reason} className="text-sm text-slate-600 cursor-pointer select-none">
                                {reason}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Oferta Dinâmica de Retenção */}
                      {cancelReason === "O sistema está caro para o meu momento" && (
                        <div className="bg-green-50 border border-green-100 rounded-xl p-4 animate-in fade-in slide-in-from-top-2 mb-2">
                          <p className="text-sm text-green-800 font-medium">
                            💡 <strong>Dica:</strong> Que tal fazer um downgrade para o <strong>Plano Iniciante</strong>? 
                            Você mantém seus dados e paga muito menos.
                          </p>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="mt-2 w-full border-green-200 text-green-700 hover:bg-green-100"
                            onClick={() => window.location.href = '/planos'}
                          >
                            Ver Plano Iniciante
                          </Button>
                        </div>
                      )}

                      <DialogFooter className="flex-col sm:flex-col gap-2 sm:space-x-0">
                        <Button 
                          className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold h-12 shadow-md"
                          onClick={() => setIsCancelModalOpen(false)}
                        >
                          Mudei de ideia, manter minha assinatura
                        </Button>
                        <Button 
                          variant="ghost" 
                          className="w-full text-slate-400 hover:text-red-600 hover:bg-red-50"
                          onClick={handleCancelSubscription}
                          disabled={cancelling || !cancelReason}
                        >
                          {cancelling ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                          Confirmar Cancelamento
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              )}

              {/* --- INÍCIO: BLOCO DE HISTÓRICO DE PAGAMENTOS --- */}
              <div className="pt-6 mt-6 border-t border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">Histórico de Pagamentos</h3>
                  {/* Futuramente podemos colocar um botão de 'Atualizar' aqui */}
                </div>
                
                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-500">
                      <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Data</th>
                          <th className="px-4 py-3 font-semibold">Descrição</th>
                          <th className="px-4 py-3 font-semibold">Valor</th>
                          <th className="px-4 py-3 font-semibold">Status</th>
                          <th className="px-4 py-3 font-semibold text-right">Recibo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paymentHistory.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                              Nenhum histórico de pagamento encontrado no momento.
                            </td>
                          </tr>
                        ) : (
                          paymentHistory.map((payment) => (
                            <tr key={payment.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                              <td className="px-4 py-3 text-slate-700">
                                {new Date(payment.payment_date).toLocaleDateString('pt-BR')}
                              </td>
                              <td className="px-4 py-3 capitalize text-slate-700">
                                {payment.plan_name === 'professional' ? 'Plano Profissional' : payment.plan_name}
                              </td>
                              <td className="px-4 py-3 font-medium text-slate-900">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payment.amount)}
                              </td>
                              <td className="px-4 py-3">
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full">
                                  {payment.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="text-xs text-slate-400">Recibo</span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              {/* --- FIM: BLOCO DE HISTÓRICO DE PAGAMENTOS --- */}
            </CardContent>
          </Card>
        </TabsContent>

        {/* NOVA ABA DE EQUIPE */}
        <TabsContent value="equipe" className="mt-6">
          <TeamManagement />
        </TabsContent>
      </Tabs>
    </div>
  )
}
