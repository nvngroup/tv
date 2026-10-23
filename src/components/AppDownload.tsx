import { useNavigate } from 'react-router-dom';
import { SimboloMarca } from './Marca';
import './AppDownload.css';

/** Mantém links antigos válidos enquanto o aplicativo próprio é preparado. */
export function AppDownload() {
  const navigate = useNavigate();
  return (
    <main className="nvn-app-em-breve">
      <SimboloMarca />
      <span className="nvn-app-marca">NvN.Plus TV</span>
      <h1>Uma nova experiência vem aí.</h1>
      <p>O aplicativo próprio da NvN.Plus está em preparação. Enquanto isso, assista pelo site.</p>
      <button onClick={() => navigate('/')} data-focusable="true">Continuar no site</button>
    </main>
  );
}
