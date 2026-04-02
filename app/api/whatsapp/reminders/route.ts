import { createClient } from '@/utils/supabase/server';
import { headers } from 'next/headers'; // Adicione isso

export async function GET(request: Request) {
  // 🛡️ TRAVA DE SEGURANÇA: Verifica se a chamada vem da Vercel Cron ou tem a Secret
  const headersList = await headers();
  const authHeader = headersList.get('authorization');

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Não autorizado: Acesso bloqueado.', { status: 401 });
  }

  const supabase = await createClient();
  const apiKey = process.env.EVOLUTION_API_KEY;
  const baseUrl = process.env.NEXT_PUBLIC_EVOLUTION_URL;

  console.log("⏰ MentePsi Cron: Iniciando disparo inteligente...");

  // 1. Busca agendamentos com os dados do perfil (incluindo o tempo do seletor)
  const { data: appointments, error } = await supabase
    .from('appointments')
    .select(`
      id,
      appointment_date,
      appointment_time,
      psychologist_id,
      patients (full_name, phone),
      professional_profile (
        full_name, 
        reminder_template, 
        whatsapp_reminders_enabled,
        reminder_lead_time // <-- O nome que está no seu código da página Settings
      )
    `)
    .eq('reminder_sent', false)
    .eq('status', 'confirmed');

  if (error || !appointments || appointments.length === 0) {
    return Response.json({ message: "Sem lembretes pendentes." });
  }

  const now = new Date();
  const results = [];

  for (const appt of appointments) {
    const prof = appt.professional_profile;

    // Pula se o lembrete estiver desativado
    if (!prof?.whatsapp_reminders_enabled) continue;

    // --- 🎯 INÍCIO DA LÓGICA DO SELETOR ---
    const apptDateTime = new Date(`${appt.appointment_date}T${appt.appointment_time}`);
    const diffInMilliseconds = apptDateTime.getTime() - now.getTime();
    const diffInHours = diffInMilliseconds / (1000 * 60 * 60);

    // Pegamos o valor do seletor (2, 6, 12 ou 24). Se não tiver, usamos 24h como padrão.
    const leadTimeConfig = Number(prof.reminder_lead_time) || 24;

    // SÓ ENVIA SE: Estiver dentro da janela escolhida (ex: falta menos de 24h para a consulta)
    // E não envia se a consulta já passou (diff > 0)
    if (diffInHours > 0 && diffInHours <= leadTimeConfig) {
      
      const instanceName = `mentepsi_${appt.psychologist_id.slice(0, 8)}`;
      const patientPhone = appt.patients.phone.replace(/\D/g, '');
      
      const template = prof.reminder_template || 
        "Olá {paciente}, lembrete de sua consulta em {data} às {horario}.";
      
      const message = template
        .replace('{paciente}', appt.patients.full_name.split(' ')[0])
        .replace('{data}', new Date(appt.appointment_date).toLocaleDateString('pt-BR'))
        .replace('{horario}', appt.appointment_time.slice(0, 5));

      try {
        const response = await fetch(`${baseUrl}/message/sendText/${instanceName}`, {
          method: 'POST',
          headers: { 
            'apikey': apiKey!, 
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify({
            number: patientPhone,
            text: message,
            linkPreview: false,
            delay: 1200
          })
        });

        if (response.ok) {
          await supabase.from('appointments').update({ reminder_sent: true }).eq('id', appt.id);
          results.push({ id: appt.id, status: 'sent' });
        }
      } catch (err) {
        console.error(`❌ Erro ao enviar para ${patientPhone}:`, err);
      }
    }
    // --- 🎯 FIM DA LÓGICA DO SELETOR ---
  }

  return Response.json({ 
    processed: appointments.length, 
    sent: results.length 
  });
}