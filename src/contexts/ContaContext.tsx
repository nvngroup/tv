/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { CHAVE_DADOS_CONTA, EVENTO_DADOS_REMOTOS, SUPABASE_CONFIGURADO, supabase } from '../services/supabase';
import { recarregarListasDoArmazenamento } from '../services/listas';

const CHAVES = [
  'tv-favorites', 'tv-last-channel', 'nvnplus-vod-favoritos', 'nvnplus-radios-favoritas',
  'nvnplus-continuar', 'nvnplus-reproducao', 'nvnplus-ao-iniciar',
  'nvnplus-audio-inteligente', 'nvnplus-zero-delay', 'nvnplus-link-canais', 'nvnplus-link-filmes',
] as const;
const CHAVES_LISTA = new Set(['tv-favorites', 'nvnplus-radios-favoritas', 'nvnplus-vod-favoritos']);
const CHAVE_USUARIO = 'nvnplus-perfil-local-uid';
type Dados = Record<string, string>;

interface ContaContexto {
  user: User | null;
  loading: boolean;
  configurado: boolean;
  erroSincronizacao: string;
  sincronizar: () => Promise<void>;
  entrar: (email: string, senha: string) => Promise<void>;
  cadastrar: (email: string, senha: string) => Promise<boolean>;
  sair: () => Promise<void>;
}

const ContextoConta = createContext<ContaContexto | null>(null);

function lerDadosLocais(): Dados {
  const dados: Dados = {};
  for (const chave of CHAVES) {
    const valor = localStorage.getItem(chave);
    if (valor !== null) dados[chave] = valor;
  }
  return dados;
}

function unirValores(chave: string, local: string | undefined, remoto: string | undefined): string | undefined {
  if (local === undefined) return remoto;
  if (remoto === undefined) return local;
  if (CHAVES_LISTA.has(chave)) {
    try {
      const a = JSON.parse(local) as unknown[];
      const b = JSON.parse(remoto) as unknown[];
      const itens = new Map<string, unknown>();
      for (const item of [...b, ...a]) itens.set(JSON.stringify(item), item);
      return JSON.stringify([...itens.values()]);
    } catch { return remoto; }
  }
  if (chave === 'nvnplus-continuar') {
    try {
      const itens = new Map<string, { origem?: { titulo?: string }; quando?: number }>();
      for (const item of [...JSON.parse(remoto), ...JSON.parse(local)]) {
        const id = item?.origem?.titulo;
        if (!id) continue;
        const anterior = itens.get(id);
        if (!anterior || (item.quando ?? 0) > (anterior.quando ?? 0)) itens.set(id, item);
      }
      return JSON.stringify([...itens.values()].sort((a, b) => (b.quando ?? 0) - (a.quando ?? 0)).slice(0, 20));
    } catch { return remoto; }
  }
  if (chave === 'nvnplus-reproducao') {
    try {
      const a = JSON.parse(local) as { quando?: number };
      const b = JSON.parse(remoto) as { quando?: number };
      return (a.quando ?? 0) > (b.quando ?? 0) ? local : remoto;
    } catch { return remoto; }
  }
  // Configurações e fontes personalizadas da conta seguem o valor do servidor.
  return remoto;
}

function gravarLocal(dados: Dados): void {
  for (const chave of CHAVES) {
    const valor = dados[chave];
    if (valor === undefined) localStorage.removeItem(chave);
    else localStorage.setItem(chave, valor);
  }
  recarregarListasDoArmazenamento();
  window.dispatchEvent(new Event(EVENTO_DADOS_REMOTOS));
}

function ContaProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(SUPABASE_CONFIGURADO);
  const [erroSincronizacao, setErroSincronizacao] = useState('');
  const [userPronto, setUserPronto] = useState<string | null>(null);

  const carregarPerfil = useCallback(async (userId: string) => {
    if (!supabase) return;
    setLoading(true);
    setErroSincronizacao('');
    try {
      const { data: perfil, error } = await supabase.from('tv_profiles')
        .select('data').eq('user_id', userId).maybeSingle();
      if (error) throw error;

      const ultimoUsuario = localStorage.getItem(CHAVE_USUARIO);
      const local = ultimoUsuario && ultimoUsuario !== userId ? {} : lerDadosLocais();
      const remoto = (perfil?.data && typeof perfil.data === 'object' && !Array.isArray(perfil.data))
        ? perfil.data as Dados : {};
      const combinado: Dados = {};
      for (const chave of CHAVES) {
        const valor = perfil ? unirValores(chave, local[chave], remoto[chave]) : local[chave];
        if (valor !== undefined) combinado[chave] = valor;
      }

      gravarLocal(combinado);
      const { error: salvarErro } = await supabase.from('tv_profiles').upsert(
        { user_id: userId, data: combinado, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      );
      if (salvarErro) throw salvarErro;
      localStorage.setItem(CHAVE_USUARIO, userId);
      setUserPronto(userId);
    } catch (error) {
      setErroSincronizacao(error instanceof Error ? error.message : 'Falha ao sincronizar seus dados.');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const sincronizar = useCallback(async () => {
    if (user?.id) await carregarPerfil(user.id);
  }, [carregarPerfil, user]);

  useEffect(() => {
    if (!supabase) return;
    let ativo = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!ativo) return;
      const atual = data.session?.user ?? null;
      setUser(atual);
      if (atual) void carregarPerfil(atual.id).catch(() => setUserPronto(null));
      else setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const atual = session?.user ?? null;
      setUser(atual);
      setUserPronto(null);
      if (atual) window.setTimeout(() => { void carregarPerfil(atual.id).catch(() => setUserPronto(null)); }, 0);
      else setLoading(false);
    });
    return () => { ativo = false; subscription.unsubscribe(); };
  }, [carregarPerfil]);

  useEffect(() => {
    const client = supabase;
    if (!client || !user || userPronto !== user.id) return;
    let timer = 0;
    const salvar = (evento: Event) => {
      if (evento.type === 'storage') {
        const chave = (evento as StorageEvent).key;
        if (!chave || !CHAVES.includes(chave as typeof CHAVES[number])) return;
      }
      const frequente = (evento as CustomEvent<{ frequente?: boolean }>).detail?.frequente;
      const gravar = () => {
        timer = 0;
        const atual = lerDadosLocais();
        void client.from('tv_profiles').upsert(
          { user_id: user.id, data: atual, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' },
        ).then(({ error }) => setErroSincronizacao(error?.message ?? ''));
      };
      if (frequente) {
        if (!timer) timer = window.setTimeout(gravar, 30_000);
        return;
      }
      window.clearTimeout(timer);
      timer = window.setTimeout(gravar, 1_200);
    };
    window.addEventListener(CHAVE_DADOS_CONTA, salvar);
    window.addEventListener('storage', salvar);
    return () => {
      window.removeEventListener(CHAVE_DADOS_CONTA, salvar);
      window.removeEventListener('storage', salvar);
      window.clearTimeout(timer);
    };
  }, [user, userPronto]);

  const entrar = useCallback(async (email: string, senha: string) => {
    if (!supabase) throw new Error('Autenticação indisponível: configure as variáveis do Supabase.');
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) throw error;
  }, []);

  const cadastrar = useCallback(async (email: string, senha: string) => {
    if (!supabase) throw new Error('Autenticação indisponível: configure as variáveis do Supabase.');
    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) throw error;
    return !data.session;
  }, []);

  const sair = useCallback(async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const valor = useMemo(() => ({ user, loading, configurado: SUPABASE_CONFIGURADO, erroSincronizacao, sincronizar, entrar, cadastrar, sair }),
    [user, loading, erroSincronizacao, sincronizar, entrar, cadastrar, sair]);
  return <ContextoConta.Provider value={valor}>{children}</ContextoConta.Provider>;
}

export function useConta(): ContaContexto {
  const contexto = useContext(ContextoConta);
  if (!contexto) throw new Error('useConta deve ser usado dentro de ContaProvider.');
  return contexto;
}

export { ContaProvider };
