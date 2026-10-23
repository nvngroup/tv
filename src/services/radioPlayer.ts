/**
 * O player das rádios, único para o site todo: o áudio continua ao trocar de
 * tela e a barra do topo mostra o que está tocando. Abrir o Ao vivo para a
 * rádio (e o ao vivo volta), como no app do Mac.
 */
import Hls from 'hls.js';
import { needsProxy, proxyUrl } from '../utils/streamUrl';
import { ouviu, type Radio } from './radios';
import * as reproducao from './reproducao';

export type EstadoRadio = 'parado' | 'carregando' | 'tocando' | 'erro';

export interface SituacaoRadio {
  radio: Radio | null;
  estado: EstadoRadio;
}

let audio: HTMLAudioElement | null = null;
let hls: Hls | null = null;
let situacao: SituacaoRadio = { radio: null, estado: 'parado' };
const VOLUME_KEY = 'radio-volume';
const ouvintes = new Set<() => void>();

function mudar(proxima: SituacaoRadio) {
  situacao = proxima;
  ouvintes.forEach((fn) => fn());
}

function elemento(): HTMLAudioElement {
  if (audio) return audio;
  audio = new Audio();
  audio.preload = 'none';
  const salvo = Number(localStorage.getItem(VOLUME_KEY));
  audio.volume = Number.isFinite(salvo) && salvo >= 0 && salvo <= 1 ? salvo : 1;
  audio.addEventListener('playing', () => mudar({ ...situacao, estado: 'tocando' }));
  audio.addEventListener('error', () => { if (situacao.radio) mudar({ ...situacao, estado: 'erro' }); });
  return audio;
}

export const atual = (): SituacaoRadio => situacao;
export function elementoAudio(): HTMLAudioElement { return elemento(); }
export const volumeAtual = (): number => elemento().volume;
export function definirVolume(volume: number): void {
  const nivel = Math.max(0, Math.min(1, volume));
  elemento().volume = nivel;
  localStorage.setItem(VOLUME_KEY, String(nivel));
}

/** Avisa quando muda o que toca. Devolve quem cancela. */
export function assinar(fn: () => void): () => void {
  ouvintes.add(fn);
  return () => { ouvintes.delete(fn); };
}

export function parar(): void {
  hls?.destroy();
  hls = null;
  if (audio) { audio.pause(); audio.removeAttribute('src'); audio.load(); }
  if (situacao.radio || situacao.estado !== 'parado') mudar({ radio: null, estado: 'parado' });
}

export function tocar(radio: Radio): void {
  const slot = reproducao.elementoPlayer();
  const a = elemento();
  slot.replaceChildren(a);
  reproducao.montarRadio(radio);
  hls?.destroy();
  hls = null;
  mudar({ radio, estado: 'carregando' });
  const url = needsProxy({ url: radio.url }) ? proxyUrl({ url: radio.url }) : radio.url;
  if (/\.m3u8(\?|$)/i.test(radio.url) && !a.canPlayType('application/vnd.apple.mpegurl') && Hls.isSupported()) {
    const h = new Hls();
    hls = h;
    h.loadSource(url);
    h.attachMedia(a);
    h.on(Hls.Events.ERROR, (_e, d) => { if (d.fatal) mudar({ radio, estado: 'erro' }); });
  } else {
    a.src = url;
  }
  a.play().then(() => ouviu(radio.nome)).catch(() => mudar({ radio, estado: 'erro' }));
}
