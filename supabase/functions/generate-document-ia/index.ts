import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { template, evolutions, contentToRefine } = await req.json()

    const isRefinement = !!contentToRefine;

    const evolutionContext = (Array.isArray(evolutions) ? evolutions : [])
      .map((e: any) => `Data: ${e.date || 'N/A'}\nNota: ${e.content || ''}`)
      .join('\n\n') || "Nenhum histórico de sessões encontrado.";

    const prompt = isRefinement
      ? `Revisão Técnica: Corrija gramática e aplique termos oficiais ao texto: ${contentToRefine}`
      : `Você é um Perito Psicólogo. Use o HISTÓRICO abaixo para preencher as lacunas '...' do MODELO BASE.
         
         HISTÓRICO: 
         ${evolutionContext}

         MODELO BASE:
         ${template}

         REGRAS: 
         1. Substitua [NOME], [CPF] e as reticências '...' por dados reais extraídos do HISTÓRICO.
         2. Use linguagem formal e técnica da psicologia clínica.
         3. Retorne APENAS o texto final do documento, sem explicações ou Markdown.`;

    // Chamada para a API da OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Modelo estável, rápido e barato
        messages: [
          { role: 'system', content: 'Você é um psicólogo perito em documentos clínicos.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
      }),
    });

    const data = await response.json()

    if (data.error) {
      throw new Error(`Erro OpenAI: ${data.error.message}`);
    }

    let generatedText = data.choices[0].message.content;
    
    // Limpeza de possíveis Markdowns
    generatedText = generatedText.replace(/```[a-z]*\n/g, '').replace(/```/g, '').trim();

    return new Response(JSON.stringify({ content: generatedText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});