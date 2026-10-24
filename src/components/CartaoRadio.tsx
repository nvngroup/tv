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
          <path d="M12 21s-8-4.9-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6.1-8 11-8 11z" />
        </svg>
      </button>
    </div>
  );
}

export function EqualizadorRadio() {
  return <span className="equalizador" aria-label="Tocando"><i /><i /><i /><i /></span>;
}
