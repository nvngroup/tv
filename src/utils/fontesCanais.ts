import type { Attempt } from './streamUrl';
import { notificarDadosContaAlterados } from '../services/supabase';

export const CHAVE_FONTES_CANAIS = 'nvnplus-fontes-canais-preferidas';

type FontesPreferidas = Record<string, string>;

function lerPreferencias(): FontesPreferidas {
  try {
    const valor = localStorage.getItem(CHAVE_FONTES_CANAIS);
    const dados: unknown = valor ? JSON.parse(valor) : {};
    return dados && typeof dados === 'object' && !Array.isArray(dados)
      ? dados as FontesPreferidas
      : {};
  } catch {
    return {};
  }
}

export function fontePrincipalDoCanal(canalId: string): string | undefined {
  return lerPreferencias()[canalId];
}

export function salvarFontePrincipalDoCanal(canalId: string, url: string): void {
  if (!canalId || !url) return;
  const preferencias = lerPreferencias();
  if (preferencias[canalId] === url) return;
  preferencias[canalId] = url;
  try {
    localStorage.setItem(CHAVE_FONTES_CANAIS, JSON.stringify(preferencias));
    notificarDadosContaAlterados();
  } catch {
    // Um bloqueio de armazenamento não deve interromper a reprodução.
  }
}

/** Move a fonte lembrada e suas tentativas de fallback para o início. */
export function priorizarFonteDoCanal<T extends Attempt>(tentativas: readonly T[], urlPreferida?: string): T[] {
  if (!urlPreferida) return [...tentativas];
  const preferidas = tentativas.filter((tentativa) => tentativa.source.url === urlPreferida);
  if (!preferidas.length) return [...tentativas];
  return [...preferidas, ...tentativas.filter((tentativa) => tentativa.source.url !== urlPreferida)];
}
