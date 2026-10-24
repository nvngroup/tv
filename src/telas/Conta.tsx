import { useEffect, useState, type FormEvent } from 'react';
import { useConta } from '../contexts/ContaContext';
import { useAdultMode } from '../contexts/adultoContexto';
import { notificarDadosContaAlterados } from '../services/supabase';
import { criarHashSenhaAdulto, verificarSenhaAdulto } from '../services/senhaAdulto';
import './Conta.css';

const CHAVE_SENHA_ADULTO = 'nvnplus-senha-adulto-v1';

interface ContaProps {
  onClose: () => void;
}

export function Conta({ onClose }: ContaProps) {
  const { user, loading, erroSincronizacao, entrar, cadastrar, sair } = useConta();
  const { isAdultUnlocked, unlockAdult, lockAdult } = useAdultMode();
  const [modoCadastro, setModoCadastro] = useState(false);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [aviso, setAviso] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [senhaAdultoConfigurada, setSenhaAdultoConfigurada] = useState(() => Boolean(localStorage.getItem(CHAVE_SENHA_ADULTO)));
  const [pedirSenhaAdulto, setPedirSenhaAdulto] = useState(false);
  const [senhaAdulto, setSenhaAdulto] = useState('');
  const [confirmarSenhaAdulto, setConfirmarSenhaAdulto] = useState('');
  const [erroSenhaAdulto, setErroSenhaAdulto] = useState('');
  const [salvandoSenhaAdulto, setSalvandoSenhaAdulto] = useState(false);
  const erroVisivel = user?.email_confirmed_at && /email not confirmed/i.test(erro) ? '' : erro;

  useEffect(() => {
    if (!loading) setSenhaAdultoConfigurada(Boolean(localStorage.getItem(CHAVE_SENHA_ADULTO)));
  }, [loading]);

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

  const submeterSenhaAdulto = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErroSenhaAdulto('');
    setSalvandoSenhaAdulto(true);
    try {
      if (senhaAdultoConfigurada) {
        const registro = localStorage.getItem(CHAVE_SENHA_ADULTO) ?? '';
        if (!await verificarSenhaAdulto(senhaAdulto, registro)) {
          setErroSenhaAdulto('Senha incorreta. Tente novamente.');
          setSenhaAdulto('');
          return;
        }
      } else {
        if (senhaAdulto.length < 8) {
          setErroSenhaAdulto('Use pelo menos 8 caracteres.');
          return;
        }
        if (senhaAdulto !== confirmarSenhaAdulto) {
          setErroSenhaAdulto('As senhas não coincidem.');
          return;
        }
        const hash = await criarHashSenhaAdulto(senhaAdulto);
        localStorage.setItem(CHAVE_SENHA_ADULTO, hash);
        notificarDadosContaAlterados();
        setSenhaAdultoConfigurada(true);
        setAviso('Senha do modo adulto criada.');
      }
      unlockAdult();
      setPedirSenhaAdulto(false);
      setSenhaAdulto('');
      setConfirmarSenhaAdulto('');
    } catch (e) {
      setErroSenhaAdulto(e instanceof Error ? e.message : 'Não foi possível salvar a senha.');
    } finally {
      setSalvandoSenhaAdulto(false);
    }
  };

  const alternarModoAdulto = () => {
    if (isAdultUnlocked) {
      lockAdult();
      setPedirSenhaAdulto(false);
      setSenhaAdulto('');
      setConfirmarSenhaAdulto('');
      setErroSenhaAdulto('');
    } else {
      setPedirSenhaAdulto(true);
      setErroSenhaAdulto('');
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

        {loading ? (
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
        <section className="conta-cartao conta-modo-adulto">
          <div>
            <h2>Modo adulto (+18)</h2>
            <p>{isAdultUnlocked
              ? 'Desbloqueado enquanto este app estiver aberto.'
              : senhaAdultoConfigurada
                ? 'Informe sua senha para acessar as categorias e os títulos para maiores de 18 anos.'
                : 'Crie uma senha para proteger o acesso às categorias e aos títulos para maiores de 18 anos.'}</p>
          </div>
          {isAdultUnlocked ? (
            <button className="conta-adulto-botao" type="button" onClick={alternarModoAdulto}>Bloquear modo adulto</button>
          ) : pedirSenhaAdulto ? (
            <form className="conta-form conta-adulto-form" onSubmit={(event) => void submeterSenhaAdulto(event)}>
              <label>{senhaAdultoConfigurada ? 'Senha do modo adulto' : 'Criar senha'}
                <input
                  type="password"
                  autoComplete="off"
                  name="senha-modo-adulto"
                  minLength={senhaAdultoConfigurada ? undefined : 8}
                  autoFocus
                  required
                  value={senhaAdulto}
                  onChange={(event) => { setSenhaAdulto(event.target.value); setErroSenhaAdulto(''); }}
                />
              </label>
              {!senhaAdultoConfigurada && (
                <label>Confirmar senha
                  <input
                    type="password"
                    autoComplete="new-password"
                    name="confirmar-senha-modo-adulto"
                    minLength={8}
                    required
                    value={confirmarSenhaAdulto}
                    onChange={(event) => { setConfirmarSenhaAdulto(event.target.value); setErroSenhaAdulto(''); }}
                  />
                </label>
              )}
              {!senhaAdultoConfigurada && <small className="conta-adulto-ajuda">Use pelo menos 8 caracteres.</small>}
              {erroSenhaAdulto && <p className="conta-erro" role="alert">{erroSenhaAdulto}</p>}
              <div className="conta-acoes">
                <button className="conta-adulto-botao" type="submit" disabled={salvandoSenhaAdulto || senhaAdulto.length < (senhaAdultoConfigurada ? 1 : 8) || (!senhaAdultoConfigurada && confirmarSenhaAdulto.length === 0)}>
                  {salvandoSenhaAdulto ? senhaAdultoConfigurada ? 'Verificando…' : 'Criando…' : senhaAdultoConfigurada ? 'Desbloquear' : 'Criar senha e desbloquear'}
                </button>
                <button className="conta-adulto-cancelar" type="button" onClick={() => { setPedirSenhaAdulto(false); setSenhaAdulto(''); setConfirmarSenhaAdulto(''); setErroSenhaAdulto(''); }}>Cancelar</button>
              </div>
            </form>
          ) : (
            <button className="conta-adulto-botao" type="button" onClick={alternarModoAdulto} disabled={loading}>
              {loading ? 'Sincronizando conta…' : senhaAdultoConfigurada ? 'Desbloquear modo adulto' : 'Criar senha do modo adulto'}
            </button>
          )}
          {senhaAdultoConfigurada && !loading && <small className="conta-adulto-ajuda">Sua senha fica protegida e é sincronizada com a conta quando você entra.</small>}
        </section>
        <p className="conta-privacidade">Os dados sincronizados pertencem à sua conta. Listas e vídeos continuam disponíveis sem login.</p>
      </section>
    </div>
  );
}
