import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarraTopo } from '../components/BarraTopo';
import { useConta } from '../contexts/ContaContext';
import './Conta.css';

export function Conta() {
  const { user, loading, configurado, erroSincronizacao, entrar, cadastrar, sair, sincronizar } = useConta();
  const navigate = useNavigate();
  const [modoCadastro, setModoCadastro] = useState(false);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [aviso, setAviso] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (user) setErro('');
  }, [user]);

  const submeter = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAviso('');
    setErro('');
    setEnviando(true);
    try {
      if (modoCadastro) {
        const confirmarEmail = await cadastrar(email.trim(), senha);
        setAviso(confirmarEmail ? 'Confira seu e-mail para confirmar a conta.' : 'Conta criada e conectada.');
      } else {
        await entrar(email.trim(), senha);
        setAviso('Conta conectada. Seus dados estão sendo sincronizados.');
      }
      setSenha('');
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível conectar à conta.');
    } finally {
      setEnviando(false);
    }
  };

  const sairDaConta = async () => {
    setErro('');
    try { await sair(); setAviso('Você saiu da conta. Os vídeos continuam disponíveis.'); }
    catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível sair da conta.'); }
  };

  return (
    <div className="tela tela-com-barra">
      <BarraTopo />
      <main className="tela-miolo conta-pagina">
        <button className="conta-voltar" onClick={() => navigate(-1)}>Voltar</button>
        <h1 className="tela-titulo">Conta NvN.Plus</h1>
        <p className="conta-intro">A conta sincroniza favoritos, progresso e preferências entre aparelhos. Assistir aos vídeos continua livre, sem precisar entrar.</p>
        {aviso && <p className="conta-aviso" role="status">{aviso}</p>}
        {erro && <p className="conta-erro" role="alert">{erro}</p>}
        {erroSincronizacao && <p className="conta-erro" role="alert">A conta conectou, mas a sincronização falhou: {erroSincronizacao}</p>}

        {!configurado ? (
          <section className="conta-cartao">
            <h2>Conta indisponível neste ambiente</h2>
            <p>Configure <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> para habilitar o acesso.</p>
          </section>
        ) : loading ? (
          <section className="conta-cartao" aria-live="polite">Carregando sua conta e sincronizando os dados…</section>
        ) : user ? (
          <section className="conta-cartao">
            <h2>Conta conectada</h2>
            <p>{user.email}</p>
            <p>Seus favoritos, o “Continue assistindo” e algumas preferências são sincronizados automaticamente.</p>
            <div className="conta-acoes">
              <button onClick={() => { setErro(''); void sincronizar().then(() => setAviso('Sincronização concluída.')).catch((e) => setErro(e instanceof Error ? e.message : 'Falha na sincronização.')); }}>Sincronizar agora</button>
              <button className="conta-secundario" onClick={() => void sairDaConta()}>Sair da conta</button>
            </div>
          </section>
        ) : (
          <form className="conta-cartao conta-form" onSubmit={(e) => void submeter(e)}>
            <h2>{modoCadastro ? 'Criar conta' : 'Entrar'}</h2>
            <label>E-mail<input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
            <label>Senha<input type="password" autoComplete={modoCadastro ? 'new-password' : 'current-password'} minLength={8} required value={senha} onChange={(e) => setSenha(e.target.value)} /></label>
            <button type="submit" disabled={enviando}>{enviando ? 'Aguarde…' : modoCadastro ? 'Criar conta' : 'Entrar'}</button>
            <button className="conta-link" type="button" onClick={() => { setModoCadastro(!modoCadastro); setErro(''); setAviso(''); }}>
              {modoCadastro ? 'Já tenho uma conta' : 'Criar uma conta'}
            </button>
          </form>
        )}
        <p className="conta-privacidade">Os dados sincronizados pertencem à sua conta. As listas e o vídeo continuam sendo carregados normalmente mesmo sem login.</p>
      </main>
    </div>
  );
}
