import { useEffect, useState, type FormEvent } from 'react';
import { useConta } from '../contexts/ContaContext';
import './Conta.css';

interface ContaProps {
  onClose: () => void;
}

export function Conta({ onClose }: ContaProps) {
  const { user, loading, configurado, erroSincronizacao, entrar, cadastrar, sair } = useConta();
  const [modoCadastro, setModoCadastro] = useState(false);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [aviso, setAviso] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const erroVisivel = user?.email_confirmed_at && /email not confirmed/i.test(erro) ? '' : erro;

  useEffect(() => {
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const aoPressionarTecla = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', aoPressionarTecla);
    return () => {
      document.body.style.overflow = overflowAnterior;
      window.removeEventListener('keydown', aoPressionarTecla);
    };
  }, [onClose]);

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
    try {
      await sair();
      setAviso('Você saiu da conta. Os vídeos continuam disponíveis.');
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível sair da conta.');
    }
  };

  return (
    <div className="conta-dialog-fundo" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="conta-dialog" role="dialog" aria-modal="true" aria-labelledby="conta-titulo">
        <button className="conta-fechar" type="button" onClick={onClose} aria-label="Fechar conta">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
        </button>
        <h1 id="conta-titulo">Conta NvN.Plus</h1>
        <p className="conta-intro">Entre para sincronizar favoritos, progresso e preferências entre aparelhos. Assistir aos vídeos continua livre.</p>
        {aviso && <p className="conta-aviso" role="status">{aviso}</p>}
        {erroVisivel && <p className="conta-erro" role="alert">{erroVisivel}</p>}
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
            <p>Favoritos, histórico de filmes, progresso e configurações são sincronizados automaticamente ao entrar e sempre que você fizer alterações.</p>
            <div className="conta-acoes">
              <button className="conta-secundario" onClick={() => void sairDaConta()}>Sair da conta</button>
            </div>
          </section>
        ) : (
          <form className="conta-cartao conta-form" onSubmit={(event) => void submeter(event)}>
            <h2>{modoCadastro ? 'Criar conta' : 'Entrar'}</h2>
            <label>E-mail<input type="email" autoComplete="email" autoFocus required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
            <label>Senha<input type="password" autoComplete={modoCadastro ? 'new-password' : 'current-password'} minLength={8} required value={senha} onChange={(event) => setSenha(event.target.value)} /></label>
            <button type="submit" disabled={enviando}>{enviando ? 'Aguarde…' : modoCadastro ? 'Criar conta' : 'Entrar'}</button>
            <button className="conta-link" type="button" onClick={() => { setModoCadastro(!modoCadastro); setErro(''); setAviso(''); }}>
              {modoCadastro ? 'Já tenho uma conta' : 'Criar uma conta'}
            </button>
          </form>
        )}
        <p className="conta-privacidade">Os dados sincronizados pertencem à sua conta. Listas e vídeos continuam disponíveis sem login.</p>
      </section>
    </div>
  );
}
