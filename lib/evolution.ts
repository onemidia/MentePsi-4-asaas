// lib/evolution.ts

const EVOLUTION_URL = process.env.NEXT_PUBLIC_EVOLUTION_URL;
const API_KEY = process.env.EVOLUTION_API_KEY;

/**
 * Função mestre para falar com a Evolution Go na Hostinger
 */
export async function evolutionApi(endpoint: string, options: RequestInit = {}) {
  const url = `${EVOLUTION_URL}${endpoint}`;
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'apikey': API_KEY as string,
  };

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error(`Erro Evolution [${response.status}]:`, errorData);
    throw new Error(errorData.message || 'Falha na comunicação com a API');
  }

  return response.json();
}