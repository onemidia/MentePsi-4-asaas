import { NextResponse } from "next/server";
import { Mistral } from '@mistralai/mistralai';

const apiKey = process.env.MISTRAL_API_KEY;
const client = new Mistral({ apiKey });

export async function POST(req: Request) {
  try {
    const { tipo, dadosPaciente, evolucoes, instrucoes, instrucaoEspecial } = await req.json();

    // Compatibilidade: usa instrucaoEspecial (novo) ou instrucoes (antigo)
    const instructionToUse = instrucaoEspecial || instrucoes || "Nenhuma";

    const historicoFormatado = evolucoes
      .map((e: any) => `Data: ${e.date}\nConteúdo: ${e.content}`)
      .join("\n\n");

    const prompt = `Você é um Psicólogo Clínico Perito especializado na Resolução CFP nº 06/2019.
      Redija um ${tipo} profissional e ético.

      DADOS DO PACIENTE: 
      ${dadosPaciente}

      HISTÓRICO DE SESSÕES: 
      ${historicoFormatado}

      SOLICITAÇÃO ADICIONAL DO PROFISSIONAL: 
      "${instructionToUse}"

      REGRAS CRUCIALMENTE OBRIGATÓRIAS:
      1. NÃO USE ASTERISCOS (**) EM NENHUMA PARTE DO TEXTO.
      2. NÃO USE SÍMBOLOS DE MARKDOWN (como #, __ ou ---).
      3. PARA TÍTULOS E SUBTÍTULOS, USE APENAS LETRAS MAIÚSCULAS.
      4. Use linguagem técnica, formal e impessoal.
      5. Retorne APENAS o texto do documento, sem introduções ou saudações.`;

    // Chamada oficial para o modelo Mistral Small
    const result = await client.chat.complete({
      model: "mistral-small-latest",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2, // Mantém o texto mais técnico e menos criativo
    });

    // @ts-ignore - Extraindo o conteúdo
    let textoGerado = result.choices[0].message.content || "";

    // LIMPEZA FINAL VIA CÓDIGO (Garantia de que nenhum asterisco passará)
    // Remove todos os asteriscos e limpa espaços extras no início/fim
    textoGerado = textoGerado.replace(/\*/g, '').trim();

    return NextResponse.json({ content: textoGerado });

  } catch (error: any) {
    console.error("Erro na Mistral:", error);
    return NextResponse.json({ 
      error: "Falha na comunicação com a Mistral AI",
      details: error.message 
    }, { status: 500 });
  }
}