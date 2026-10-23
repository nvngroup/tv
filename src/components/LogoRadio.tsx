import { useState } from 'react';
import logos from '../data/logosRadios.json';
import type { Radio } from '../services/radios';

type LogoLocal = { arquivo: string; fonte: string; nome: string };

function ImagemRadio({ fontes, destaque }: Readonly<{ fontes: string[]; destaque: boolean }>) {
  const [indice, setIndice] = useState(0);
  const [carregou, setCarregou] = useState(false);
  const fonte = fontes[indice];
  return (
    <>
      {!carregou && (
        <svg className="radio-logo-placeholder" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m10 16 27-8" />
          <rect x="6" y="16" width="36" height="26" rx="6" />
          <circle cx="30" cy="29" r="7" />
          <path d="M12 24h6M12 30h6M12 36h3" />
        </svg>
      )}
      {fonte && (
        <img src={fonte} alt="" loading={destaque ? 'eager' : 'lazy'} referrerPolicy="no-referrer"
          className={`radio-logo-imagem${carregou ? ' carregada' : ''}`}
          onLoad={() => setCarregou(true)}
          onError={() => { setCarregou(false); setIndice((anterior) => anterior + 1); }} />
      )}
    </>
  );
}

export function LogoRadio({ radio, destaque = false }: Readonly<{ radio: Radio; destaque?: boolean }>) {
  // O endereço do stream identifica a emissora, evitando confundir nomes e frequências iguais.
  const local = (logos as Record<string, LogoLocal>)[radio.url];
  const fontes = [...new Set([
    local ? `${import.meta.env.BASE_URL}radios/${local.arquivo}` : '',
    radio.logo?.replace(/^http:/, 'https:') ?? '',
    local?.fonte ?? '',
  ].filter(Boolean))];
  return <ImagemRadio key={fontes.join('|')} fontes={fontes} destaque={destaque} />;
}
