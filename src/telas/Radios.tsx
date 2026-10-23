/**
 * Rádios: a lista do endereço de canais (`radios.txt`), em grades de ouvidas
 * por último e de A a Z. A que toca aparece no alto com o equalizador.
 * Toca num player só dela (um <audio>), e para ao sair da tela.
 */
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { BarraTopo } from '../components/BarraTopo';
import { LogoRadio } from '../components/LogoRadio';
import { CampoBusca, SemLista } from '../components/Telas';
import { useListas } from '../services/listas';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { baixar, chave, locais, recentes, type Radio } from '../services/radios';
import { assinar, atual as atualRadio, parar, tocar } from '../services/radioPlayer';
import './Radios.css';

function CartaoRadio({ radio, tocando, favorita, aoTocar, aoFavoritar }: Readonly<{
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
          {tocando && <Equalizador />}
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

function Equalizador() {
  return <span className="equalizador" aria-label="Tocando"><i /><i /><i /><i /></span>;
}

export function Radios() {
  const { canais: link } = useListas();
  const [lista, setLista] = useState<Radio[]>(locais);
  const [termo, setTermo] = useState('');
  const [favoritas, setFavoritas] = useLocalStorage<string[]>('nvnplus-radios-favoritas', []);
  const { radio: atual, estado } = useSyncExternalStore(assinar, atualRadio);
  const ouvidas = useMemo(() => {
    void atual;
    return recentes();
  }, [atual]);

  useEffect(() => {
    // Trocar ou apagar o endereço de canais troca ou esvazia a lista.
    setLista(locais());
    if (!link) return;
    let vivo = true;
    void baixar().then((l) => { if (vivo && l) setLista(l); });
    return () => { vivo = false; };
  }, [link]);

  const filtradas = useMemo(() => {
    const t = chave(termo.trim());
    return t ? lista.filter((r) => chave(r.nome).includes(t)) : lista;
  }, [lista, termo]);

  const recentesLista = useMemo(
    () => ouvidas.map((n) => lista.find((r) => r.nome === n)).filter((r): r is Radio => !!r), [ouvidas, lista]);

  const deAaZ = useMemo(() => [...filtradas].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')), [filtradas]);

  const favoritasLista = useMemo(() => deAaZ.filter((r) => favoritas.includes(r.nome)), [deAaZ, favoritas]);

  const alternarFavorita = (nome: string) => {
    setFavoritas((anteriores) => anteriores.includes(nome)
      ? anteriores.filter((n) => n !== nome)
      : [...anteriores, nome]);
  };

  const cartao = (r: Radio) => (
    <CartaoRadio key={r.nome} radio={r} tocando={atual?.nome === r.nome && estado !== 'erro'}
      favorita={favoritas.includes(r.nome)} aoFavoritar={() => alternarFavorita(r.nome)}
      aoTocar={() => (atual?.nome === r.nome && estado !== 'erro' ? parar() : tocar(r))} />
  );

  return (
    <div className="tela tela-com-barra">
      <BarraTopo />
      <div className="tela-miolo">
        <section className="radio-topo">
          <div className="radio-agora">
            {atual ? (
              <>
                <div className="radio-agora-logo">
                  <LogoRadio radio={atual} destaque />
                </div>
                <div>
                  <small>{estado === 'erro' ? 'Não foi possível tocar' : estado === 'carregando' ? 'Conectando…' : 'Tocando agora'}</small>
                  <h1>{atual.nome}</h1>
                  <p>Rádio</p>
                </div>
                {estado === 'tocando' && <Equalizador />}
                <button className="radio-parar" onClick={parar}>Parar</button>
              </>
            ) : (
              <div><small>Rádios</small><h1>Escolha uma rádio</h1><p>{lista.length} estações ao vivo</p></div>
            )}
          </div>
          <CampoBusca valor={termo} aoMudar={setTermo} placeholder="Buscar rádio" />
        </section>
      </div>

      {!link && <SemLista tipo="radios" />}
      {link && lista.length === 0 && <p className="tela-vazio">Carregando as rádios…</p>}
      {!termo && recentesLista.length > 0 && (
        <section className="radios-secao tela-miolo" aria-labelledby="radios-recentes">
          <h2 id="radios-recentes">Ouvidas por último</h2>
          <div className="radios-grade">{recentesLista.map(cartao)}</div>
        </section>
      )}
      {favoritasLista.length > 0 && (
        <section className="radios-secao tela-miolo" aria-labelledby="radios-favoritas">
          <h2 id="radios-favoritas">Favoritas</h2>
          <div className="radios-grade">{favoritasLista.map(cartao)}</div>
        </section>
      )}
      {deAaZ.length > 0 && (
        <section className="radios-secao tela-miolo" aria-labelledby="radios-todas">
          <h2 id="radios-todas">Todas, de A a Z</h2>
          <div className="radios-grade">{deAaZ.map(cartao)}</div>
        </section>
      )}
      {lista.length > 0 && filtradas.length === 0 && <p className="tela-vazio">Nenhuma rádio com “{termo}”.</p>}
    </div>
  );
}
