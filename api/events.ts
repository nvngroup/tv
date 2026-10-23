/**
 * Publica a agenda no domínio da Vercel usando a mesma função do Cloudflare
 * Pages. Assim `/api/events` retorna os dados tanto no site principal quanto
 * no domínio `.pages.dev`.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { respostaEventos } from '../functions/api/events';

export const config = {
  runtime: 'nodejs',
};

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

  const resposta = await respostaEventos();

  res.statusCode = resposta.status;
  resposta.headers.forEach((valor, chave) => res.setHeader(chave, valor));
  res.end(req.method === 'HEAD' ? undefined : await resposta.text());
}
