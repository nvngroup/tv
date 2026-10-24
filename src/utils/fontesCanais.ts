import type { Attempt } from './streamUrl';
import { supabase } from '../services/supabase';

const LEGACY_KEY = 'nvnplus-fontes-canais-preferidas';
const preferencias = new Map<string, string>();

function preferenciaLegada(canalId: string): string | undefined {
  try {
    const valor = localStorage.getItem(LEGACY_KEY);
    const dados: unknown = valor ? JSON.parse(valor) : null;
    if (!dados || typeof dados !== 'object' || Array.isArray(dados)) return undefined;
    const fonte = (dados as Record<string, unknown>)[canalId];
    return typeof fonte === 'string' ? fonte : undefined;
  } catch {
    return undefined;
  }
}

function urlDeFonteValida(url: string): boolean {
  try {
    const fonte = new URL(url);
    return ['http:', 'https:'].includes(fonte.protocol) && url.length <= 2048;
  } catch {
    return false;
  }
}

async function persistir(canalId: string, url: string): Promise<void> {
  if (!supabase) return;
  try {
    const { data: { session }, error: erroSessao } = await supabase.auth.getSession();
    if (erroSessao || !session) return;
    await supabase.from('tv_channel_source_preferences').upsert(
      { channel_id: canalId, source_url: url },
      { onConflict: 'channel_id' },
    );
  } catch {
    // Uma falha no registro global nunca interrompe a reprodução.
  }
}

/** Lê do banco a fonte que está compartilhada entre todos os usuários. */
export async function carregarFontePrincipalDoCanal(canalId: string): Promise<string | undefined> {
  if (!canalId) return undefined;
  if (!supabase) return preferencias.get(canalId);

  const { data, error } = await supabase
    .from('tv_channel_source_preferences')
    .select('source_url')
    .eq('channel_id', canalId)
    .maybeSingle();

  if (!error) {
    if (data?.source_url) {
      preferencias.set(canalId, data.source_url);
      return data.source_url;
    }
    preferencias.delete(canalId);
    const antiga = preferenciaLegada(canalId);
    if (antiga && urlDeFonteValida(antiga)) {
      preferencias.set(canalId, antiga);
      void persistir(canalId, antiga);
      return antiga;
    }
    return undefined;
  }

  return preferencias.get(canalId) ?? preferenciaLegada(canalId);
}

/** Atualiza a fonte global somente depois que o player confirma reprodução. */
export function salvarFontePrincipalDoCanal(canalId: string, url: string): void {
  if (!canalId || canalId.length > 200 || !urlDeFonteValida(url)) return;
  if (preferencias.get(canalId) === url) return;
  preferencias.set(canalId, url);
  void persistir(canalId, url);
}

/** Move a fonte lembrada e suas tentativas de fallback para o início. */
export function priorizarFonteDoCanal<T extends Attempt>(tentativas: readonly T[], urlPreferida?: string): T[] {
  if (!urlPreferida) return [...tentativas];
  const preferidas = tentativas.filter((tentativa) => tentativa.source.url === urlPreferida);
  if (!preferidas.length) return [...tentativas];
  return [...preferidas, ...tentativas.filter((tentativa) => tentativa.source.url !== urlPreferida)];
}
