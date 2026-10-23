import { useEffect, useMemo, useState } from 'react';
import { useListas } from '../services/listas';
import { baixar, locais } from '../services/radios';

/** Compartilha o catálogo e seu cache entre Rádios e Favoritos. */
export function useRadios() {
  const { canais: link } = useListas();
  const [dados, setDados] = useState(() => ({ link, lista: locais() }));
  const lista = useMemo(() => dados.link === link ? dados.lista : locais(), [dados, link]);

  useEffect(() => {
    if (!link) return;
    let ativo = true;
    void baixar().then((novas) => {
      if (ativo && novas !== null) setDados({ link, lista: novas });
    });
    return () => { ativo = false; };
  }, [link]);

  return lista;
}
