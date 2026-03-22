import { NextResponse } from "next/server";
import { Mistral } from '@mistralai/mistralai';

const apiKey = process.env.MISTRAL_API_KEY;
const client = new Mistral({ apiKey });

export async function POST(req: Request) {
  try {
    const { notes, patientName } = await req.json();

    if (!notes) {
      return NextResponse.json({ error: "Notas não fornecidas" }, { status: 400 });
    }

    if (!apiKey) {
      return NextResponse.json({ error: "Chave de API do Mistral não configurada" }, { status: 500 });
    }

    const prompt = `
      Você é um assistente especializado em psicologia clínica.
      Transforme estas notas brutas de sessão em um parágrafo técnico de evolução clínica psicológica, mantendo a ética e o vocabulário profissional.
      
      Regras:
      1. Use terminologia técnica (ex: em vez de "ele está triste", use "apresenta humor hipotímico").
      2. Mantenha o sigilo: não invente diagnósticos, apenas descreva o que foi anotado.
      3. Estruture em: (I) Relato do Paciente, (II) Análise Técnica e (III) Conduta/Planejamento.
      4. Nome do Paciente: ${patientName}.
      5. Responda em Markdown formatado para facilitar a leitura.
      
      ANOTAÇÕES BRUTAS:
      ${notes}
    `;

    const result = await client.chat.complete({
      model: "mistral-small-latest",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2, // Mantém o texto mais técnico e menos criativo
    });

    const choiceContent = result.choices?.[0]?.message?.content;
    const text = typeof choiceContent === 'string' ? choiceContent : "";

    return NextResponse.json({ text });
  } catch (error: any) {
    console.error("Erro na IA:", error);

    if (error.message?.includes('429') || error.message?.includes('Quota') || error.message?.includes('Overloaded')) {
      return NextResponse.json({ error: "A IA está muito ocupada no momento. Por favor, tente novamente em instantes." }, { status: 503 });
    }

    return NextResponse.json({ error: "Falha ao gerar evolução" }, { status: 500 });
  }
}