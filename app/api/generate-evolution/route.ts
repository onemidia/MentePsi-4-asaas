import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { notes, patientName } = await req.json();

    if (!notes) {
      return NextResponse.json({ error: "Notas não fornecidas" }, { status: 400 });
    }

    if (!process.env.GOOGLE_API_KEY) {
      return NextResponse.json({ error: "Chave de API do Google não configurada" }, { status: 500 });
    }
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      Você é um assistente especializado em psicologia clínica.
      Sua tarefa é transformar anotações de sessão em uma Evolução Clínica formal e técnica.
      
      Regras:
      1. Use terminologia técnica (ex: em vez de "ele está triste", use "apresenta humor hipotímico").
      2. Mantenha o sigilo: não invente diagnósticos, apenas descreva o que foi anotado.
      3. Estruture em: (I) Relato do Paciente, (II) Análise Técnica e (III) Conduta/Planejamento.
      4. Nome do Paciente: ${patientName}.
      5. Responda em Markdown formatado para facilitar a leitura.
      
      ANOTAÇÕES BRUTAS:
      ${notes}
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ text });
  } catch (error: any) {
    console.error("Erro na IA:", error);

    if (error.message?.includes('429') || error.message?.includes('Quota') || error.message?.includes('Overloaded')) {
      return NextResponse.json({ error: "A IA está muito ocupada no momento. Por favor, tente novamente em instantes." }, { status: 503 });
    }

    return NextResponse.json({ error: "Falha ao gerar evolução" }, { status: 500 });
  }
}