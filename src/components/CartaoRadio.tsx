import { LogoRadio } from './LogoRadio';
import type { Radio } from '../services/radios';
import '../telas/Radios.css';

export function CartaoRadio({ radio, tocando, favorita, aoTocar, aoFavoritar }: Readonly<{
  radio: Radio;
  tocando: boolean;
  favorita: boolean;
  aoTocar: () => void;
  aoFavoritar: () => void;
}>) {
  const rotuloFavorita = `${favorita ? 'Remover' : 'Adicionar'} ${radio.nome} ${favorita ? 'das' : 'às'} favoritas`;
  return (
    <div className={`cartao-radio ${tocando ? 'tocando' : ''}`}>
      <button className="cartao-radio-tocar" onClick={aoTocar} title={radio.nome}>
        <div className="cartao-radio-logo">
          <LogoRadio radio={radio} />
          {tocando && <EqualizadorRadio />}
        </div>
        <strong>{radio.nome}</strong>
      </button>
      <button type="button" className={`radio-favoritar${favorita ? ' ativa' : ''}`}
        onClick={aoFavoritar} aria-label={rotuloFavorita} title={rotuloFavorita} aria-pressed={favorita}>
        <svg viewBox="0 0 24 24" fill={favorita ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
          <path d="m12 3 2.8 5.7 6.3.9-4.5 4.4 1.1 6.2-5.7-3-5.7 3 1.1-6.2L3.2 9.6l6.3-.9z" />
        </svg>
      </button>
    </div>
  );
}

export function EqualizadorRadio() {
  return <span className="equalizador" aria-label="Tocando"><i /><i /><i /><i /></span>;
}
