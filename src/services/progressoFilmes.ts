import { notificarDadosContaAlterados } from './supabase';

function chaveTempo(id: string): string { return `movie-progress-${id}`; }
function chaveAtualizacao(id: string): string { return `movie-progress-updated-${id}`; }

/** Guarda o ponto do filme e uma marca de atualização para resolver conflitos entre aparelhos. */
export function salvarProgressoFilme(id: string, tempo: number): void {
  localStorage.setItem(chaveTempo(id), String(tempo));
  localStorage.setItem(chaveAtualizacao(id), String(Date.now()));
  notificarDadosContaAlterados(true);
}

/** A marca fica salva para que a remoção também seja sincronizada com outros aparelhos. */
export function limparProgressoFilme(id: string): void {
  localStorage.removeItem(chaveTempo(id));
  localStorage.setItem(chaveAtualizacao(id), String(Date.now()));
  notificarDadosContaAlterados();
}
