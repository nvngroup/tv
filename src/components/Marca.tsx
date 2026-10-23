import simbolo from '../assets/nvnplus-icon.png';
import marca from '../assets/nvnplus-marca.webp';
import './Marca.css';

export function SimboloMarca({ className = '', destaque = false }: Readonly<{ className?: string; destaque?: boolean }>) {
  return <img className={`nvn-simbolo ${className}`} src={destaque ? marca : simbolo} width="48" height="48" alt="" aria-hidden="true" />;
}

export function CarregamentoMarca({ rotulo = 'Carregando…' }: Readonly<{ rotulo?: string }>) {
  return (
    <div className="nvn-carregamento" role="status" aria-live="polite">
      <div className="nvn-carregamento-icone"><SimboloMarca /></div>
      <span className="nvn-carregamento-texto">{rotulo}</span>
    </div>
  );
}
