import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import type { VideoPlayerProps } from './VideoPlayer';
import type { MoviePlayerProps } from './MoviePlayer';
import { CarregamentoMarca } from './Marca';
import { parar as pararRadio } from '../services/radioPlayer';
import { useAdultMode } from '../contexts/adultoContexto';
import * as reproducao from '../services/reproducao';
import './PlayerPersistente.css';

const Video = lazy(() => import('./VideoPlayer').then((m) => ({ default: m.VideoPlayer })));
const Filme = lazy(() => import('./MoviePlayer').then((m) => ({ default: m.MoviePlayer })));

function Slot({ pedido }: Readonly<{ pedido: reproducao.Pedido }>) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => { reproducao.montar(ref.current, pedido); }, [pedido]);
  useLayoutEffect(() => {
    const slot = ref.current;
    return () => reproducao.minimizar(slot);
  }, []);
  return <div ref={ref} className="reproducao-slot" />;
}

export function VideoPersistente(props: VideoPlayerProps) {
  if (!props.channel) return <Suspense fallback={<CarregamentoMarca />}><Video {...props} /></Suspense>;
  return <Slot pedido={{ tipo: 'canal', props }} />;
}

export function FilmePersistente(props: MoviePlayerProps) {
  return <Slot pedido={{ tipo: 'filme', props }} />;
}

function voltarDoFilme() {
  const sessao = reproducao.atual();
  if (sessao.slot && sessao.pedido?.tipo === 'filme') sessao.pedido.props.onBack();
  else reproducao.fechar();
}

function mudarEpisodio(filme: Parameters<NonNullable<MoviePlayerProps['onEpisodeChange']>>[0]) {
  const sessao = reproducao.atual();
  if (sessao.slot && sessao.pedido?.tipo === 'filme' && sessao.pedido.props.onEpisodeChange) sessao.pedido.props.onEpisodeChange(filme);
  else reproducao.trocarEpisodio(filme);
}

const tempo = (segundos: number) => `${Math.floor(segundos / 60)}:${String(Math.floor(segundos % 60)).padStart(2, '0')}`;

export function MiniPlayer() {
  const sessao = useSyncExternalStore(reproducao.assinar, reproducao.atual);
  const navigate = useNavigate();
  const miniSlot = useRef<HTMLDivElement>(null);
  const mini = !sessao.slot;
  const lembranca = sessao.lembranca;
  const pedido = sessao.pedido;
  const { isAdultUnlocked } = useAdultMode();
  const bloqueada = reproducao.restrita(lembranca) && !isAdultUnlocked;
  const host = reproducao.elementoPlayer();

  useLayoutEffect(() => {
    reproducao.definirMiniSlot(miniSlot.current);
    return () => reproducao.definirMiniSlot(null);
  }, []);

  useLayoutEffect(() => {
    host.classList.toggle('em-mini-player', mini);
    const ajustar = () => host.querySelectorAll('video').forEach((video) => { video.controls = mini; });
    ajustar();
    const observador = new MutationObserver(ajustar);
    observador.observe(host, { childList: true, subtree: true });
    return () => observador.disconnect();
  }, [host, mini]);

  useEffect(() => {
    const registrar = (e: Event) => {
      if (!(e.target instanceof HTMLVideoElement) || !host.contains(e.target)) return;
      if (e.type === 'loadedmetadata') { reproducao.confirmarMidia(); return; }
      reproducao.registrarTempo(e.type !== 'timeupdate');
    };
    const salvar = () => reproducao.registrarTempo(true);
    const fechar = () => reproducao.fechar();
    const eventos = ['timeupdate', 'pause', 'playing', 'seeked', 'loadedmetadata', 'ended'];
    eventos.forEach((evento) => document.addEventListener(evento, registrar, true));
    window.addEventListener('pagehide', salvar);
    window.addEventListener('beforeunload', salvar);
    window.addEventListener('nvnplus-radio-iniciada', fechar);
    return () => {
      salvar();
      eventos.forEach((evento) => document.removeEventListener(evento, registrar, true));
      window.removeEventListener('pagehide', salvar);
      window.removeEventListener('beforeunload', salvar);
      window.removeEventListener('nvnplus-radio-iniciada', fechar);
    };
  }, [host]);

  const identidade = pedido?.tipo === 'canal' ? pedido.props.channel?.id : pedido?.props.movie?.id;
  useEffect(() => { if (identidade) pararRadio(); }, [identidade]);
  useEffect(() => { if (bloqueada && pedido) reproducao.fechar(); }, [bloqueada, pedido]);

  const expandir = () => {
    const atual = reproducao.atual().lembranca;
    if (!atual) return;
    if (atual.tipo === 'canal') navigate(`/ao-vivo/${encodeURIComponent(atual.canal.id)}`);
    else navigate('/movies', { state: { retomarFilme: atual.filme, retomarSerie: atual.serie, retomarQuando: Date.now() } });
  };

  const titulo = lembranca?.tipo === 'canal' ? lembranca.canal.name : lembranca?.filme.name;

  return (
    <>
      <aside className="nvn-mini-player" aria-label="MiniPlayer" hidden={!mini || !lembranca || bloqueada}>
        <header>
          <strong title={titulo}>{titulo}</strong>
          <button type="button" onClick={expandir} aria-label="Abrir player completo" title="Abrir player completo">↗</button>
          <button type="button" onClick={reproducao.fechar} aria-label="Fechar MiniPlayer" title="Fechar MiniPlayer">×</button>
        </header>
        <div ref={miniSlot} className="nvn-mini-midia">
          {!pedido && lembranca && (
            <div className="nvn-mini-retomar">
              <span>{lembranca.tipo === 'canal' ? 'Último canal assistido' : `Continuar de ${tempo(lembranca.tempo)}`}</span>
              <button type="button" onClick={reproducao.iniciarLembranca}>Continuar assistindo</button>
            </div>
          )}
        </div>
        {pedido && <footer>{lembranca?.tipo === 'canal' ? 'Ao vivo' : tempo(lembranca?.tempo ?? 0)}</footer>}
      </aside>
      {pedido && createPortal(
        <>
          {!mini && <button className="reproducao-minimizar" type="button" onClick={() => navigate('/')} aria-label="Minimizar player">Minimizar</button>}
          <Suspense fallback={<CarregamentoMarca />}>
            {pedido.tipo === 'canal'
              ? <Video {...pedido.props} isTheaterMode={mini ? false : pedido.props.isTheaterMode}
                  isMultiScreen={mini ? false : pedido.props.isMultiScreen} forceMuted={mini ? false : pedido.props.forceMuted} />
              : <Filme key={pedido.props.movie?.id} {...pedido.props} onBack={voltarDoFilme} onEpisodeChange={mudarEpisodio} />}
          </Suspense>
        </>, host,
      )}
    </>
  );
}
