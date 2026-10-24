import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim() || 'https://lurnykhvjgbrgelkwoma.supabase.co';
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
  || 'sb_publishable_bPEe-LRcsu-2qKsCuhfevA_Y7CGm-qY';

/** Só usa a chave publishable; a tabela de perfil fica protegida por RLS. */
export const supabase = url && publishableKey ? createClient(url, publishableKey) : null;
export const SUPABASE_CONFIGURADO = supabase !== null;
export const SUPABASE_URL_CONFIGURADA = Boolean(import.meta.env.VITE_SUPABASE_URL?.trim());

export const CHAVE_DADOS_CONTA = 'nvnplus-conta-dados-atualizados';
export const EVENTO_DADOS_REMOTOS = 'nvnplus-perfil-remoto-atualizado';

export function notificarDadosContaAlterados(frequente = false): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CHAVE_DADOS_CONTA, { detail: { frequente } }));
  }
}
