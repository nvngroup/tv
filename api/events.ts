/** Publica a agenda no domínio Vercel. */
import type { IncomingMessage, ServerResponse } from 'node:http';

export const config = {
  runtime: 'nodejs',
};

const EMBED = 'https://embedtv.cc/api/events';
const MONITOR = 'https://saimo-tv.pages.dev/eventos-extra.json';
const AGENTE =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function buscar(url: string, prazoMs: number): Promise<string | null> {
  const controle = new AbortController();
  const relogio = setTimeout(() => controle.abort(), prazoMs);
  try {
    const resposta = await fetch(url, {
      headers: { 'User-Agent': AGENTE },
      signal: controle.signal,
    });
    return resposta.ok ? await resposta.text() : null;
  } catch {
    return null;
  } finally {
    clearTimeout(relogio);
  }
}

async function buscarEventos(): Promise<Response> {
  const cabecalhos = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=60',
  };
  const [embed, monitor] = await Promise.all([
    buscar(EMBED, 5000),
    buscar(MONITOR, 8000),
  ]);
  const corpo = embed ?? monitor;
  if (corpo) return new Response(corpo, { headers: cabecalhos });
  return new Response(JSON.stringify({ error: 'sem agenda' }), {
    status: 502,
    headers: { ...cabecalhos, 'Cache-Control': 'no-store' },
  });
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.end();
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET, HEAD, OPTIONS');
    res.end();
    return;
  }

  const resposta = await buscarEventos();

  res.statusCode = resposta.status;
  resposta.headers.forEach((valor, chave) => res.setHeader(chave, valor));
  res.end(req.method === 'HEAD' ? undefined : await resposta.text());
}
