import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')

// 🛡️ 1. Configuração de Headers CORS (Isso resolve o botão sem ação)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Resposta para o "preflight" do navegador
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { documentType, template, patientData, professionalData, evolutions, extraInstructions, contentToRefine } = await req.json()

    // 2. Lógica Inteligente: Se houver contentToRefine, focamos em REVISÃO
    const isRefinement = !!contentToRefine;

    const evolutionContext = evolutions?.map((e: any) => 
      `Data: ${new Date(e.created_at).toLocaleDateString('pt-BR')}\nNota: ${e.content}`
    ).join('\n\n') || "Sem histórico disponível.";

    // 3. Prompt Blindado (Foco em Ortografia e Termos Legais)
    const prompt = isRefinement 
      ? `Aja como um revisor oficial de documentos psicológicos. 
         TAREFA: Corrigir ortografia, gramática e aplicar terminologia técnica/legal ao texto abaixo.
         TEXTO ORIGINAL: ${contentToRefine}
         REGRAS: 
         1. Utilize termos formais como 'Em observância ao', 'Pelo presente parecer', 'Sintomatologia'.
         2. Mantenha o sentido original, mas eleve o tom para Documento Oficial.
         3. Retorne APENAS o texto revisado.`
      : `Você é um Perito Psicólogo Sênior. 
         Sua tarefa é REDIGIR um [${documentType}] oficial.
         
         HISTÓRICO DO PACIENTE: ${evolutionContext}
         DADOS: Paciente ${patientData.full_name}, CPF ${patientData.cpf}. Profissional ${professionalData.full_name}, CRP ${professionalData.crp}.
         
         MODELO BASE: ${template}

         REGRAS DE OURO:
         1. Substitua tags [NOME], [CPF], [DATA] por dados reais.
         2. Use gramática impecável e termos formais (Normas da ABNT e CFP).
         3. Não invente diagnósticos, baseie-se no histórico fornecido.
         4. Retorne APENAS o texto final do documento.`;

    // 4. Chamada para a API do Gemini
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    })

        // ... (código anterior do fetch)
    const data = await response.json()
    
    // 🚨 AJUSTE AQUI: Verifica se a resposta do Gemini é válida antes de ler
    if (!data.candidates || data.candidates.length === 0) {
      console.error("Erro da API Gemini:", JSON.stringify(data)); // Log detalhado no Supabase
      
      // Tenta extrair mensagem de erro do Google se existir
      const googleError = data.error?.message || "Resposta vazia ou bloqueada pelos filtros de segurança.";

      return new Response(
        JSON.stringify({ error: `Erro na IA: ${googleError}` }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const generatedText = data.candidates[0].content.parts[0].text

    return new Response(JSON.stringify({ content: generatedText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
