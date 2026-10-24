import { SimboloMarca } from './Marca';
import { useLocation, useNavigate } from 'react-router-dom';
import { EventsModal } from "./EventsModal";
import { useState, useEffect, memo } from 'react';
import { useListas } from '../services/listas';
import './AppHeader.css';

interface AppHeaderProps {
  transparent?: boolean;
  showBackButton?: boolean;
  onBack?: () => void;
  title?: string;
  isAdultUnlocked?: boolean;
}

export const AppHeader = memo(function AppHeader({ 
  transparent = false,
  showBackButton = false,
  onBack,
  title,
  isAdultUnlocked = false
}: AppHeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { canais } = useListas();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [showEventsModal, setShowEventsModal] = useState(false);

  // Detecta scroll para mudar aparência do header
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Header fica sólido após scroll
      setIsScrolled(currentScrollY > 50);
      
      // Hide/show header baseado na direção do scroll
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const handleLogoClick = () => {
    navigate('/');
  };

  const isHome = location.pathname === '/';
  const isTV = location.pathname === '/ao-vivo';
  const isMovies = location.pathname === '/movies';

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  // Não renderiza header na home
  if (isHome) return null;

  return (
    <>
      <header 
        className={`app-header ${transparent ? 'transparent' : ''} ${isScrolled ? 'scrolled' : ''} ${isVisible ? 'visible' : 'hidden'}`}
      >
        <div className="header-container">
          {/* Logo e Voltar */}
          <div className="header-left">
            {showBackButton ? (
              <button 
                className="header-back-btn" 
                onClick={handleBack}
                data-focusable="true"
                data-focus-key="header-back"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
              </button>
            ) : (
              <button 
                className="header-logo" 
                onClick={handleLogoClick}
                data-focusable="true"
                data-focus-key="header-logo"
              >
                <div className="logo-icon">
                  <SimboloMarca />
                </div>
                <span className="logo-text">NvN<span>.Plus</span></span>
                {isAdultUnlocked && <span className="adult-badge">+18</span>}
              </button>
            )}

            {title && <h1 className="header-title">{title}</h1>}
          </div>

            {/* Navegação Central */}
          <nav className="header-nav">
          <button 
            className={`nav-link ${isTV ? 'active' : ''}`}
            onClick={() => handleNavigation('/ao-vivo')}
            data-focusable="true"
            data-focus-key="nav-tv"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <path d="M8 21h8M12 17v4" />
            </svg>
            <span>TV ao Vivo</span>
          </button>
          
          <button 
            className={`nav-link ${isMovies ? 'active' : ''}`}
            onClick={() => handleNavigation('/movies')}
            data-focusable="true"
            data-focus-key="nav-movies"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="2" width="20" height="20" rx="2" />
              <path d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 17h5M17 7h5"/>
            </svg>
            <span>Filmes & Séries</span>
          </button>

          <button 
            className="nav-link events"
            onClick={() => setShowEventsModal(true)}
            data-focusable="true"
            data-focus-key="nav-events"
            style={{ color: '#fbbf24' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <circle cx="12" cy="13" r="5" />
              <path d="M12 8v5" />
            </svg>
            <span>Eventos</span>
          </button>

        </nav>

        {/* Ações da Direita */}
        <div className="header-right">

          {/* Onde a lista é publicada e onde se pede um canal que falta:
              o mesmo repositório e o mesmo grupo que o aplicativo aponta. */}
          <a
            className="header-link-btn discord"
            href="https://discord.gg/8DKqT3xJvD"
            target="_blank"
            rel="noreferrer noopener"
            title="Comunidade no Discord"
            aria-label="Comunidade no Discord"
            data-focusable="true"
            data-focus-key="header-discord"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M20.317 4.369A19.79 19.79 0 0 0 16.558 3c-.164.293-.355.686-.487.998a18.27 18.27 0 0 0-4.14 0A12.6 12.6 0 0 0 11.437 3a19.74 19.74 0 0 0-3.76 1.369C3.29 10.02 2.24 15.53 2.76 20.96a19.9 19.9 0 0 0 5.99 3.04c.484-.66.915-1.362 1.286-2.1a12.9 12.9 0 0 1-2.025-.973c.17-.124.336-.254.496-.388 3.9 1.79 8.12 1.79 11.973 0 .162.134.328.264.497.388-.647.38-1.325.706-2.03.974.372.737.802 1.439 1.286 2.099a19.86 19.86 0 0 0 5.994-3.04c.6-6.28-1.06-11.74-4.91-16.59ZM9.68 17.65c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.951-2.42 2.157-2.42 1.213 0 2.18 1.096 2.157 2.42 0 1.334-.951 2.42-2.157 2.42Zm7.64 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.951-2.42 2.157-2.42 1.213 0 2.18 1.096 2.157 2.42 0 1.334-.944 2.42-2.157 2.42Z" />
            </svg>
          </a>

          {canais && (
            <a
              className="header-link-btn github"
              href={`${canais}catalogo.txt`}
              target="_blank"
              rel="noreferrer noopener"
              title="Lista de canais (texto)"
              aria-label="Lista de canais (texto)"
              data-focusable="true"
              data-focus-key="header-github"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 .5C5.73.5.5 5.73.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2.1c-3.2.7-3.88-1.37-3.88-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.56-.29-5.25-1.28-5.25-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.12 3.05.74.81 1.18 1.84 1.18 3.1 0 4.43-2.69 5.4-5.26 5.69.41.36.78 1.06.78 2.15v3.19c0 .31.21.67.8.55A11.5 11.5 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5Z" />
              </svg>
            </a>
          )}

          <button 
            className="header-home-btn" 
            onClick={() => handleNavigation('/')}
            data-focusable="true"
            data-focus-key="nav-home"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </button>
        </div>
      </div>
    </header>


    {showEventsModal && (
      <EventsModal 
        onClose={() => setShowEventsModal(false)}
        onWatch={(slug) => navigate(`/ao-vivo/${slug}`)}
      />
    )}

  </>
  );
});
