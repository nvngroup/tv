import { SimboloMarca } from './Marca';
import { Conta } from '../telas/Conta';
/**
 * A barra do topo, a mesma do app do Mac e da TV Box: o ícone, as abas
 * (Buscar, Favoritos, Início, TV, Rádio, Filmes e Séries, Eventos), a engrenagem
 * dos ajustes e o acesso à conta. A aba aberta é uma cápsula que desliza até a
 * escolhida; Alt+1 a Alt+8 levam às seções e aos ajustes (⌘ não serve: o navegador a usa).
 */
import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAdultMode } from '../contexts/adultoContexto';
import { assinar, atual as atualRadio, parar as pararRadio } from '../services/radioPlayer';
import { SUPABASE_URL_CONFIGURADA } from '../services/supabase';
import './AppHeader.css';
import './BarraTopo.css';

interface Aba {
  rota: string;
  rotulo: string;
  /** Caminhos que também deixam esta aba acesa. */
  prefixos?: string[];
  icone: React.ReactNode;
  destacada?: boolean;
  somenteIcone?: boolean;
}

const tr = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

const ABAS: Aba[] = [
  { rota: '/busca', rotulo: 'Buscar', somenteIcone: true, icone: <svg viewBox="0 0 24 24" {...tr}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg> },
  { rota: '/favoritos', rotulo: 'Favoritos', somenteIcone: true, icone: <svg viewBox="0 0 24 24" {...tr}><path d="M12 21s-8-4.9-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6.1-8 11-8 11z" /></svg> },
  { rota: '/', rotulo: 'Início', icone: <svg viewBox="0 0 24 24" {...tr}><path d="M3 11 12 3l9 8" /><path d="M5 10v10h14V10" /></svg> },
  { rota: '/ao-vivo', rotulo: 'TV', prefixos: ['/ao-vivo/'], icone: <svg viewBox="0 0 24 24" {...tr}><rect x="2" y="4" width="20" height="14" rx="2" /><path d="M8 21h8M12 18v3" /></svg> },
  { rota: '/radios', rotulo: 'Rádio', icone: <svg viewBox="0 0 24 24" {...tr}><rect x="3" y="8" width="18" height="12" rx="2" /><circle cx="15" cy="14" r="3" /><path d="M7 12h3M7 16h3M5 8l11-5" /></svg> },
  { rota: '/movies', rotulo: 'Filmes e Séries', icone: <svg viewBox="0 0 24 24" {...tr}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M7 3v18M17 3v18M3 8h4M3 16h4M17 8h4M17 16h4" /></svg> },
  { rota: '/eventos', rotulo: 'Eventos', icone: <svg viewBox="0 0 24 24" {...tr}><circle cx="12" cy="12" r="9" /><path d="m12 7 4 3-1.5 5h-5L8 10z" /></svg> },
];

const ativa = (a: Aba, caminho: string) =>
  caminho === a.rota || (a.prefixos?.some((p) => caminho.startsWith(p)) ?? false);

interface BarraTopoProps {
  /** Se `false`, força a barra a ficar oculta independente do mouse. Se omitido, auto-esconde apenas se estiver em rota com player. */
  visible?: boolean;
  /** Se `true`, auto-esconde quando o mouse se afasta. Se `false`, fica fixa na tela. Se omitido, auto-esconde apenas se estiver em rota de player (/ao-vivo). */
  autoHide?: boolean;
  /** Abre o guia de programação (EPG) na página TV */
  onOpenGuide?: () => void;
  /** Indica se o guia de programação está aberto */
  isGuideOpen?: boolean;
}

export const BarraTopo = memo(function BarraTopo({
  visible: visibleProp,
  autoHide,
  onOpenGuide,
  isGuideOpen,
}: BarraTopoProps = {}) {
  const { isAdultUnlocked } = useAdultMode();
  const navigate = useNavigate();
  const radio = useSyncExternalStore(assinar, atualRadio);
  const { pathname } = useLocation();
  const [contaAberta, setContaAberta] = useState(pathname === '/conta' && SUPABASE_URL_CONFIGURADA);
  const trilho = useRef<HTMLElement>(null);
  const [capsula, setCapsula] = useState<{ x: number; w: number } | null>(null);

  const fecharConta = useCallback(() => {
    setContaAberta(false);
    if (pathname === '/conta') void navigate('/', { replace: true });
  }, [navigate, pathname]);

  useEffect(() => {
    const aoAtalho = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || e.repeat || e.isComposing || e.defaultPrevented) return;
      const alvo = e.target;
      if (alvo instanceof HTMLElement && (alvo.isContentEditable || alvo.closest('input, textarea, select, [role="textbox"]'))) return;
      // O código físico também funciona quando Alt altera o caractere digitado.
      const digito = /^(?:Digit|Numpad)([1-8])$/.exec(e.code)?.[1] ?? (/^[1-8]$/.test(e.key) ? e.key : null);
      if (!digito) return;
      const indice = Number(digito) - 1;
      const rota = indice === ABAS.length ? '/ajustes' : ABAS[indice]?.rota;
      if (!rota) return;
      e.preventDefault();
      void navigate(rota);
    };
    window.addEventListener('keydown', aoAtalho);
    return () => window.removeEventListener('keydown', aoAtalho);
  }, [navigate]);

  // O nav bar só auto-esconde quando um player estiver sendo usado (/ao-vivo ou autoHide=true).
  // Fora isso (catálogos, início, busca, eventos, favoritos, rádios, etc.), ele fica fixo e visível na tela.
  const deveAutoEsconder = autoHide ?? pathname.startsWith('/ao-vivo');

  const [mouseNoTopo, setMouseNoTopo] = useState(() => !deveAutoEsconder);
  // Controle remoto (TV): sem mouse para chegar ao topo, a barra aparece quando o foco entra nela.
  const [focoDentro, setFocoDentro] = useState(false);
  const hoverRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!deveAutoEsconder) {
      setMouseNoTopo(true);
      return;
    }

    const limparTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      // Perto do topo: mouse nos primeiros 68px da tela ou sobre a barra
      const perto = (e.clientY >= 0 && e.clientY <= 68) || hoverRef.current;
      if (perto) {
        limparTimer();
        setMouseNoTopo(true);
      } else if (!timerRef.current) {
          timerRef.current = setTimeout(() => {
            setMouseNoTopo(false);
            timerRef.current = null;
          }, 300);
        }
    };

    const onMouseLeaveDoc = (e: MouseEvent) => {
      if (!e.relatedTarget) {
        limparTimer();
        timerRef.current = setTimeout(() => {
          setMouseNoTopo(false);
          timerRef.current = null;
        }, 350);
      }
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    document.addEventListener('mouseleave', onMouseLeaveDoc);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseleave', onMouseLeaveDoc);
      limparTimer();
    };
  }, [deveAutoEsconder]);

  // Quando o usuário clica em uma aba e a rota muda, se for tela com player, esconde após um breve delay
  useEffect(() => {
    hoverRef.current = false;
    if (deveAutoEsconder) {
      const t = window.setTimeout(() => {
        setMouseNoTopo(false);
      }, 1200);
      return () => window.clearTimeout(t);
    } else {
      setMouseNoTopo(true);
    }
  }, [pathname, deveAutoEsconder]);

  const isVisivel = visibleProp === false ? false : (deveAutoEsconder ? (mouseNoTopo || focoDentro) : true);

  useEffect(() => {
    if (!isVisivel) {
      document.body.classList.add('barra-topo-oculta');
    } else {
      document.body.classList.remove('barra-topo-oculta');
    }
    return () => {
      document.body.classList.remove('barra-topo-oculta');
    };
  }, [isVisivel]);

  // Fontes carregadas depois da primeira renderização também alteram a posição das abas.
  useLayoutEffect(() => {
    const nav = trilho.current;
    if (!nav) return;
    let ativo = true;
    const medir = () => {
      if (!ativo) return;
      const botao = nav.querySelector<HTMLElement>('[data-ativa="1"]');
      const caixa = botao?.getBoundingClientRect();
      const nova = caixa ? { x: caixa.left - nav.getBoundingClientRect().left, w: caixa.width } : null;
      setCapsula((anterior) => anterior?.x === nova?.x && anterior?.w === nova?.w ? anterior : nova);
    };
    medir();
    const observador = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(medir);
    observador?.observe(nav);
    nav.querySelectorAll('button').forEach((botao) => observador?.observe(botao));
    void document.fonts?.ready.then(medir);
    document.fonts?.addEventListener('loadingdone', medir);
    window.addEventListener('resize', medir);
    return () => {
      ativo = false;
      observador?.disconnect();
      document.fonts?.removeEventListener('loadingdone', medir);
      window.removeEventListener('resize', medir);
    };
  }, [pathname]);

  const aoClicarLogo = (e: React.MouseEvent<HTMLButtonElement>) => {
    (e.currentTarget as HTMLElement)?.blur();
    void navigate('/');
  };

  return (
    <>
      <header
        className={`barra-topo ${!isVisivel ? 'oculta' : ''}`}
        onFocus={() => setFocoDentro(true)}
        onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocoDentro(false); }}
        role="banner"
        onMouseEnter={() => {
          hoverRef.current = true;
          if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
          }
          setMouseNoTopo(true);
        }}
        onMouseLeave={() => {
          hoverRef.current = false;
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => {
            setMouseNoTopo(false);
            timerRef.current = null;
          }, 300);
        }}
      >
        <button className="barra-logo" onClick={aoClicarLogo} aria-label="NvN.Plus TV — início">
          <SimboloMarca />
          <span>NvN.Plus<b>TV</b></span>
          {isAdultUnlocked && <em className="adult-badge">+18</em>}
        </button>

        <nav className="barra-abas" ref={trilho} aria-label="Seções">
          {capsula && <span className="barra-capsula" style={{ transform: `translateX(${capsula.x}px)`, width: capsula.w }} />}
          {ABAS.map((a, i) => (
            <button
              key={a.rota}
              className={`${ativa(a, pathname) ? 'on' : ''} ${a.destacada ? 'destacada' : ''}`}
              data-ativa={ativa(a, pathname) ? '1' : '0'}
              onClick={(e) => {
                void navigate(a.rota);
                (e.currentTarget as HTMLElement)?.blur();
              }}
              title={`${a.rotulo} (Alt+${i + 1})`}
              aria-keyshortcuts={`Alt+${i + 1}`}
              aria-label={a.rotulo}
            >
              {a.icone}
              {!a.somenteIcone && <span>{a.rotulo}</span>}
              {a.destacada && <span className="barra-aba-dot" aria-hidden="true" />}
            </button>
          ))}
        </nav>

        <div className="barra-direita">
          {radio.radio && radio.estado !== 'erro' && (
            <div className="barra-radio" title={radio.radio.nome}>
              <button
                className="barra-radio-nome"
                onClick={(e) => {
                  (e.currentTarget as HTMLElement)?.blur();
                  void navigate('/radios');
                }}
              >
                <span className="equalizador"><i /><i /><i /></span>
                <span>{radio.radio.nome}</span>
              </button>
              <button className="barra-radio-parar" onClick={pararRadio} aria-label="Parar a rádio">■</button>
            </div>
          )}
          {onOpenGuide && (
            <button
              className={`barra-guia ${isGuideOpen ? 'on' : ''}`}
              onClick={(e) => {
                (e.currentTarget as HTMLElement)?.blur();
                onOpenGuide();
              }}
              title="Guia de programação"
              aria-label="Guia de programação"
              aria-expanded={isGuideOpen}
            >
              <svg viewBox="0 0 24 24" {...tr}>
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
                <circle cx="8" cy="15" r="1" fill="currentColor" />
                <circle cx="12" cy="15" r="1" fill="currentColor" />
                <circle cx="16" cy="15" r="1" fill="currentColor" />
              </svg>
            </button>
          )}
          <button
            className={`barra-engrenagem ${pathname === '/ajustes' ? 'on' : ''}`}
            onClick={(e) => {
              (e.currentTarget as HTMLElement)?.blur();
              void navigate('/ajustes');
            }}
            title="Ajustes (Alt+8)"
            aria-keyshortcuts="Alt+8"
            aria-label="Ajustes"
          >
            <svg viewBox="0 0 24 24" {...tr}>
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
            </svg>
          </button>
          {SUPABASE_URL_CONFIGURADA && (
            <button
              className={`barra-conta ${contaAberta || pathname === '/conta' ? 'on' : ''}`}
              onClick={(e) => {
                (e.currentTarget as HTMLElement)?.blur();
                setContaAberta(true);
              }}
              title="Entrar ou acessar conta"
              aria-label="Entrar ou acessar conta"
              aria-haspopup="dialog"
              aria-expanded={contaAberta}
            >
              <svg viewBox="0 0 24 24" {...tr}>
                <circle cx="12" cy="8" r="4" />
                <path d="M5 21a7 7 0 0 1 14 0" />
              </svg>
            </button>
          )}
        </div>
      </header>

      {contaAberta && <Conta onClose={fecharConta} />}

    </>
  );
});
