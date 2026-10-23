import { useEffect, useState } from 'react';
import { ehTv } from '../plataforma/tv';
import { SimboloMarca } from './Marca';
import './Abertura.css';

const CHAVE_ABERTURA = 'nvnplus-abertura-vista';
let exibidaNestaPagina = false;

function jaExibida(): boolean {
  if (exibidaNestaPagina) return true;
  try { return sessionStorage.getItem(CHAVE_ABERTURA) === '1'; } catch { return false; }
}

export function Abertura() {
  const [fim, setFim] = useState(() => jaExibida() || ehTv() || window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    if (fim) return;
    exibidaNestaPagina = true;
    try { sessionStorage.setItem(CHAVE_ABERTURA, '1'); } catch { /* Mantém a marca em memória se o armazenamento estiver indisponível. */ }
    const fechar = () => setFim(true);
    const timer = window.setTimeout(fechar, 1800);
    window.addEventListener('keydown', fechar);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', fechar);
    };
  }, [fim]);
  if (fim) return null;
  return (
    <button className="nvn-abertura" onClick={() => setFim(true)} aria-label="NvN.Plus TV — pular abertura">
      <span className="nvn-abertura-marca">
        <SimboloMarca destaque />
        <strong>NvN<span>.Plus</span></strong>
        <span className="nvn-abertura-tv">TV · AO VIVO E ON DEMAND</span>
      </span>
      <span className="nvn-abertura-pular">Clique ou pressione uma tecla para continuar</span>
    </button>
  );
}
