import type { VideoPlayerProps } from '../components/VideoPlayer';
import type { MoviePlayerProps } from '../components/MoviePlayer';
import type { Channel } from '../types/channel';
import type { Movie, SeriesEpisodeInfo } from '../types/movie';
import type { Radio } from './radios';
import { notificarDadosContaAlterados } from './supabase';
import { limparProgressoFilme, salvarProgressoFilme } from './progressoFilmes';
import { elementoEmTelaCheia, sairDaTelaCheia } from '../utils/telaCheia';

export const CHAVE_REPRODUCAO = 'nvnplus-reproducao';
type Progresso = { tempo: number; duracao: number; pausado: boolean; quando: number };
export type Lembranca = Progresso & (
  { tipo: 'canal'; canal: Channel } |
  { tipo: 'filme'; filme: Movie; serie: SeriesEpisodeInfo | null }
);
export type Pedido = { tipo: 'canal'; props: VideoPlayerProps } | { tipo: 'filme'; props: MoviePlayerProps } | { tipo: 'radio'; radio: Radio };

export function restrita(lembranca: Lembranca | null): boolean {
  const item = lembranca?.tipo === 'canal' ? lembranca.canal : lembranca?.filme;
  return !!item && (item.id.startsWith('restrito-') || /adult/i.test(item.category ?? ''));
}

export function lerReproducao(): Lembranca | null {
  try {
    const valor = JSON.parse(localStorage.getItem(CHAVE_REPRODUCAO) || 'null');
    if (!valor || !Number.isFinite(valor.tempo) || valor.tempo < 0) return null;
    const item = valor.tipo === 'canal' ? valor.canal : valor.tipo === 'filme' ? valor.filme : null;
    if (valor.tipo === 'filme' && item?.type === 'movie' && valor.duracao > 0 && valor.tempo / valor.duracao >= .95) return null;
    return item && typeof item.id === 'string' && typeof item.url === 'string' && typeof item.name === 'string' ? valor : null;
  } catch { return null; }
}

interface Sessao {
  lembranca: Lembranca | null;
  pedido: Pedido | null;
  slot: HTMLElement | null;
}
let sessao: Sessao = { lembranca: lerReproducao(), pedido: null, slot: null };
const ouvintes = new Set<() => void>();
let host: HTMLDivElement | null = null;
let miniSlot: HTMLElement | null = null;
let ultimoRegistro = 0;
let aguardandoMidia = true;

export function confirmarMidia() { aguardandoMidia = false; }
export function limparRadio() {
  if (sessao.pedido?.tipo === 'radio') publicar({ lembranca: null, pedido: null, slot: null });
}
export function montarRadio(radio: Radio) {
  publicar({ lembranca: null, pedido: { tipo: 'radio', radio }, slot: null });
  if (miniSlot) mover(miniSlot);
}

export const atual = () => sessao;
export function assinar(fn: () => void) { ouvintes.add(fn); return () => { ouvintes.delete(fn); }; }
function publicar(proxima: Sessao) { sessao = proxima; ouvintes.forEach((fn) => fn()); }

export function elementoPlayer(): HTMLDivElement {
  if (!host) { host = document.createElement('div'); host.className = 'reproducao-host'; }
  return host;
}

function mover(destino: HTMLElement) {
  const elemento = elementoPlayer();
  if (elemento.parentElement === destino) return;
  const video = elemento.querySelector('video');
  const tocando = video && !video.paused;
  // A movimentação atômica preserva o elemento de mídia nos navegadores que a suportam.
  const pai = destino as HTMLElement & { moveBefore?: (elemento: Node, antes: Node | null) => void };
  if (pai.moveBefore && elemento.isConnected && destino.isConnected) pai.moveBefore(elemento, null);
  else {
    destino.appendChild(elemento);
    if (tocando) void video.play().catch(() => { /* O botão de reproduzir continua disponível. */ });
  }
}

export function definirMiniSlot(slot: HTMLElement | null) {
  miniSlot = slot;
  if (slot && !sessao.slot && sessao.pedido) mover(slot);
}

function gravar(lembranca: Lembranca) {
  try {
    localStorage.setItem(CHAVE_REPRODUCAO, JSON.stringify(lembranca));
    if (lembranca.tipo === 'canal') localStorage.setItem('tv-last-channel', JSON.stringify(lembranca.canal.id));
    else if (lembranca.tempo > 0 && (!lembranca.duracao || lembranca.tempo / lembranca.duracao < .95)) {
      salvarProgressoFilme(lembranca.filme.id, lembranca.tempo);
    } else if (lembranca.tipo === 'filme' && lembranca.tempo > 0) {
      limparProgressoFilme(lembranca.filme.id);
    }
    notificarDadosContaAlterados(true);
  } catch { /* A reprodução continua se o armazenamento estiver cheio ou bloqueado. */ }
}

export function registrarTempo(forcar = false) {
  const video = host?.querySelector('video');
  if (!video || !sessao.lembranca || !sessao.pedido || aguardandoMidia || video.readyState === 0) return;
  if (!forcar && Date.now() - ultimoRegistro < 5000) return;
  ultimoRegistro = Date.now();
  const lembranca = { ...sessao.lembranca, tempo: Number.isFinite(video.currentTime) ? video.currentTime : 0,
    duracao: Number.isFinite(video.duration) ? video.duration : 0, pausado: video.paused, quando: Date.now() };
  gravar(lembranca);
  publicar({ ...sessao, lembranca });
}

export function montar(slot: HTMLElement | null, pedido: Pedido) {
  if (!slot || pedido.tipo === 'radio') return;
  const item = pedido.tipo === 'canal' ? pedido.props.channel : pedido.props.movie;
  if (!item) return;
  const anterior = sessao.lembranca;
  const mesmo = anterior?.tipo === pedido.tipo && (anterior.tipo === 'canal' ? anterior.canal.id : anterior.filme.id) === item.id;
  if (!mesmo) registrarTempo(true);
  const ativo = sessao.pedido;
  if (!ativo || !mesmo) aguardandoMidia = true;
  if (pedido.tipo === 'canal' && ativo?.tipo === 'canal' && JSON.stringify(pedido.props.channel) === JSON.stringify(ativo.props.channel)) {
    pedido = { ...pedido, props: { ...pedido.props, channel: ativo.props.channel } };
  } else if (pedido.tipo === 'filme' && ativo?.tipo === 'filme' && JSON.stringify(pedido.props.movie) === JSON.stringify(ativo.props.movie)) {
    pedido = { ...pedido, props: { ...pedido.props, movie: ativo.props.movie } };
  }
  const progresso = mesmo && anterior ? anterior : { tempo: 0, duracao: 0, pausado: false, quando: Date.now() };
  const lembranca: Lembranca = pedido.tipo === 'canal'
    ? { ...progresso, tipo: 'canal', canal: pedido.props.channel! }
    : { ...progresso, tipo: 'filme', filme: pedido.props.movie!, serie: pedido.props.seriesInfo ?? null };
  gravar(lembranca);
  publicar({ lembranca, pedido, slot });
  mover(slot);
}

export function minimizar(slot: HTMLElement | null) {
  if (!slot || sessao.slot !== slot) return;
  registrarTempo(true);
  const cheia = elementoEmTelaCheia();
  if (cheia && host?.contains(cheia)) void sairDaTelaCheia().catch(() => {});
  publicar({ ...sessao, slot: null });
  if (miniSlot) mover(miniSlot);
}

export function fechar() {
  registrarTempo(true);
  const cheia = elementoEmTelaCheia();
  if (cheia && host?.contains(cheia)) void sairDaTelaCheia().catch(() => {});
  host?.querySelector('video')?.pause();
  publicar({ lembranca: null, pedido: null, slot: null });
}

export function iniciarLembranca() {
  const lembranca = sessao.lembranca;
  if (!lembranca || !miniSlot) return;
  const pedido: Pedido = lembranca.tipo === 'canal'
    ? { tipo: 'canal', props: { channel: lembranca.canal, isTheaterMode: false, onOpenGuide: () => {} } }
    : { tipo: 'filme', props: { movie: lembranca.filme, seriesInfo: lembranca.serie, onBack: fechar } };
  montar(miniSlot, pedido);
  publicar({ ...sessao, slot: null });
}

export function trocarEpisodio(filme: Movie) {
  if (sessao.pedido?.tipo !== 'filme' || sessao.lembranca?.tipo !== 'filme') return;
  const serie = sessao.lembranca.serie;
  const pedido: Pedido = { tipo: 'filme', props: { ...sessao.pedido.props, movie: filme,
    seriesInfo: serie ? { ...serie, currentSeason: filme.seasonNumber ?? serie.currentSeason,
      currentEpisode: filme.episodeNumber ?? serie.currentEpisode } : null } };
  const slot = sessao.slot;
  montar(slot ?? miniSlot, pedido);
  if (!slot) publicar({ ...sessao, slot: null });
}
