# 🎬 Sistema de Player de Vídeo - Documentação Técnica

## Visão Geral

O player de vídeo do Free TV é responsável pela reprodução de streams HLS (HTTP Live Streaming) de canais de TV ao vivo. Utiliza a biblioteca **HLS.js** para navegadores que não suportam HLS nativamente.

---

## Dependências

```json
{
  "hls.js": "^1.x.x"
}
```

```typescript
import Hls from 'hls.js';
```

---

## Arquitetura do Player

### Componente Principal

```typescript
// src/components/VideoPlayer.tsx

interface VideoPlayerProps {
  channel: Channel | null;        // Canal a ser reproduzido
  isTheaterMode: boolean;         // Se está em modo teatro
  onToggleTheater: () => void;    // Callback para alternar modo teatro
  onOpenGuide: () => void;        // Callback para abrir guia
}
```

### Refs Utilizadas

```typescript
const videoRef = useRef<HTMLVideoElement>(null);      // Elemento <video>
const containerRef = useRef<HTMLDivElement>(null);    // Container do player
const hlsRef = useRef<Hls | null>(null);              // Instância HLS.js
const intentionalPauseRef = useRef(false);            // Controle de pausa manual
```

---

## Inicialização do HLS

### Fluxo de Inicialização

```
Canal selecionado
       ↓
Verifica suporte HLS.js
       ↓
    ┌──────────────────────────────────────┐
    │         Hls.isSupported()?           │
    └──────────────────────────────────────┘
        │                      │
       SIM                    NÃO
        ↓                      ↓
   Usa HLS.js         Verifica suporte nativo
        │                      │
        │              Safari? iOS?
        │                      ↓
        └──────────► Reprodução via src
```

### Código de Inicialização

```typescript
useEffect(() => {
  if (!channel || !videoRef.current) return;

  const video = videoRef.current;
  setIsLoading(true);
  setError(null);

  // Limpa instância anterior
  if (hlsRef.current) {
    hlsRef.current.destroy();
    hlsRef.current = null;
  }

  if (Hls.isSupported()) {
    // Chrome, Firefox, Edge, etc
    const hls = new Hls({
      enableWorker: true,       // Usa Web Worker
      lowLatencyMode: true,     // Modo baixa latência
      backBufferLength: 90,     // Buffer de 90 segundos
    });

    hls.loadSource(channel.url);
    hls.attachMedia(video);

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      setIsLoading(false);
      video.volume = volumeRef.current;
      video.muted = false;

      // Tenta autoplay com som
      video.play().catch(() => {
        // Se falhar, tenta mutado (política de autoplay)
        video.muted = true;
        setIsMuted(true);
        setPendingUnmute(true);
        video.play();
      });
    });

    hls.on(Hls.Events.ERROR, (_, data) => {
      if (data.fatal) {
        handleHlsError(data);
      }
    });

    hlsRef.current = hls;

  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    // Safari - suporte nativo HLS
    video.src = channel.url;
    video.addEventListener('loadedmetadata', () => {
      setIsLoading(false);
      video.play();
    });
  } else {
    setError('Navegador não suporta HLS');
  }

  return () => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  };
}, [channel]);
```

---

## Configurações do HLS.js

### Opções Utilizadas

```typescript
const hlsConfig = {
  enableWorker: true,          // Processamento em background
  lowLatencyMode: true,        // Reduz latência
  backBufferLength: 90,        // Segundos de buffer atrás
  maxBufferLength: 30,         // Máximo buffer à frente
  maxMaxBufferLength: 600,     // Máximo absoluto
  startLevel: -1,              // Auto-select qualidade inicial
  capLevelToPlayerSize: true,  // Limita qualidade ao tamanho do player
};
```

### Níveis de Qualidade

```typescript
// Acessar níveis disponíveis
const levels = hls.levels;
// [{height: 1080, bitrate: 5000000}, {height: 720, bitrate: 3000000}, ...]

// Forçar nível específico
hls.currentLevel = 2;  // Índice do nível

// Auto-select
hls.currentLevel = -1;
```

---

## Tratamento de Erros

### Tipos de Erro HLS

```typescript
hls.on(Hls.Events.ERROR, (_, data) => {
  if (data.fatal) {
    switch (data.type) {
      case Hls.ErrorTypes.NETWORK_ERROR:
        // Erro de rede - tentar reconectar
        console.log('Network error, attempting recovery...');
        hls.startLoad();
        break;

      case Hls.ErrorTypes.MEDIA_ERROR:
        // Erro de mídia - tentar recuperar
        console.log('Media error, attempting recovery...');
        hls.recoverMediaError();
        break;

      default:
        // Erro irrecuperável
        console.log('Fatal error, destroying HLS');
        hls.destroy();
        setError('Erro ao carregar o canal');
        break;
    }
  }
});
```

### Botão de Retry

```typescript
const retryLoad = useCallback(() => {
  if (hlsRef.current && channel) {
    setError(null);
    setIsLoading(true);
    hlsRef.current.loadSource(channel.url);
  }
}, [channel]);
```

---

## Controles de Reprodução

### Play/Pause

```typescript
const togglePlay = useCallback(() => {
  const video = videoRef.current;
  if (!video) return;

  if (video.paused) {
    intentionalPauseRef.current = false;
    video.play();
  } else {
    intentionalPauseRef.current = true;  // Marca como pausa intencional
    video.pause();
  }
}, []);
```

### Volume

```typescript
const [volume, setVolume] = useState(() => {
  // Recupera volume salvo
  const saved = localStorage.getItem('tv-volume');
  return saved ? Number.parseFloat(saved) : 1;
});

const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
  const newVolume = Number.parseFloat(e.target.value);
  setVolume(newVolume);
  if (newVolume > 0) {
    setIsMuted(false);
  }
}, []);

// Sincroniza com o elemento video
useEffect(() => {
  if (videoRef.current) {
    videoRef.current.volume = volume;
    videoRef.current.muted = isMuted;
  }
  localStorage.setItem('tv-volume', volume.toString());
}, [volume, isMuted]);
```

### Mute/Unmute

```typescript
const toggleMute = useCallback(() => {
  setPendingUnmute(false);
  setIsMuted((prev) => !prev);
}, []);
```

---

## Tela Cheia (Fullscreen)

### Implementação

```typescript
const toggleFullscreen = useCallback(async () => {
  const container = containerRef.current;
  if (!container) return;

  try {
    if (!document.fullscreenElement) {
      await container.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  } catch (err) {
    console.error('Fullscreen error:', err);
  }
}, []);

// Listener para mudanças de fullscreen
useEffect(() => {
  const handleFullscreenChange = () => {
    setIsFullscreen(!!document.fullscreenElement);
  };

  document.addEventListener('fullscreenchange', handleFullscreenChange);
  return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
}, []);
```

---

## Picture-in-Picture (PiP)

### Implementação

```typescript
const togglePiP = useCallback(async () => {
  const video = videoRef.current;
  if (!video) return;

  try {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
    } else if (document.pictureInPictureEnabled) {
      await video.requestPictureInPicture();
    }
  } catch (err) {
    console.error('PiP error:', err);
  }
}, []);

// Listeners para eventos PiP
useEffect(() => {
  const video = videoRef.current;
  if (!video) return;

  const handlePiPEnter = () => setIsPiP(true);
  const handlePiPLeave = () => setIsPiP(false);

  video.addEventListener('enterpictureinpicture', handlePiPEnter);
  video.addEventListener('leavepictureinpicture', handlePiPLeave);

  return () => {
    video.removeEventListener('enterpictureinpicture', handlePiPEnter);
    video.removeEventListener('leavepictureinpicture', handlePiPLeave);
  };
}, []);
```

---

## Espelhamento de Vídeo

### CSS Transform

```typescript
const toggleMirror = useCallback(() => {
  setIsMirrored((prev) => !prev);
}, []);
```

```css
.video-element.mirrored {
  transform: scaleX(-1);
}
```

---

## Detecção de Resolução

```typescript
useEffect(() => {
  const video = videoRef.current;
  if (!video) return;

  const updateResolution = () => {
    if (video.videoWidth && video.videoHeight) {
      const height = video.videoHeight;
      let label = '';

      if (height >= 2160) label = '4K';
      else if (height >= 1440) label = '2K';
      else if (height >= 1080) label = '1080p';
      else if (height >= 720) label = '720p';
      else if (height >= 480) label = '480p';
      else if (height >= 360) label = '360p';
      else label = `${height}p`;

      setVideoResolution(label);
    }
  };

  video.addEventListener('loadedmetadata', updateResolution);
  video.addEventListener('resize', updateResolution);

  // Atualiza periodicamente (resolução pode mudar durante stream)
  const interval = setInterval(updateResolution, 2000);

  return () => {
    video.removeEventListener('loadedmetadata', updateResolution);
    video.removeEventListener('resize', updateResolution);
    clearInterval(interval);
  };
}, [channel]);
```

---

## Auto-Play e Política de Navegadores

### Problema

Navegadores modernos bloqueiam autoplay com áudio por padrão.

### Solução

```typescript
// Tenta reproduzir com som
video.play().catch(() => {
  // Se falhar, inicia mutado
  video.muted = true;
  setIsMuted(true);
  setPendingUnmute(true);  // Marca para desmutar na próxima interação
  video.play();
});

// Auto-unmute na primeira interação do usuário
useEffect(() => {
  if (!pendingUnmute) return;

  const handleUserInteraction = () => {
    const video = videoRef.current;
    if (video && pendingUnmuteRef.current) {
      video.muted = false;
      setIsMuted(false);
      setPendingUnmute(false);
    }
  };

  document.addEventListener('click', handleUserInteraction, { once: true });
  document.addEventListener('keydown', handleUserInteraction, { once: true });
  document.addEventListener('touchstart', handleUserInteraction, { once: true });

  return () => {
    document.removeEventListener('click', handleUserInteraction);
    document.removeEventListener('keydown', handleUserInteraction);
    document.removeEventListener('touchstart', handleUserInteraction);
  };
}, [pendingUnmute]);
```

---

## Auto-Hide dos Controles

```typescript
const controlsTimeoutRef = useRef<number | null>(null);

const resetControlsTimeout = useCallback(() => {
  setShowControls(true);

  if (controlsTimeoutRef.current) {
    clearTimeout(controlsTimeoutRef.current);
  }

  controlsTimeoutRef.current = window.setTimeout(() => {
    if (isPlayingRef.current) {
      setShowControls(false);
    }
  }, 5000); // 5 segundos
}, []);

// Mostra controles ao mover mouse
<div
  className="video-player-container"
  onMouseMove={resetControlsTimeout}
  onMouseLeave={() => isPlaying && setShowControls(false)}
>
```

---

## Eventos do Vídeo

```typescript
useEffect(() => {
  const video = videoRef.current;
  if (!video) return;

  const handlePlay = () => {
    setIsPlaying(true);
    intentionalPauseRef.current = false;
  };

  const handlePause = () => {
    setIsPlaying(false);
    // Auto-resume se não foi pausa intencional
    if (!intentionalPauseRef.current && channel) {
      video.play().catch(() => {});
    }
  };

  const handleWaiting = () => setIsLoading(true);

  const handleCanPlay = () => {
    setIsLoading(false);
    // Garante que está reproduzindo
    if (video.paused && channel && !intentionalPauseRef.current) {
      video.play().catch(() => {});
    }
  };

  video.addEventListener('play', handlePlay);
  video.addEventListener('pause', handlePause);
  video.addEventListener('waiting', handleWaiting);
  video.addEventListener('canplay', handleCanPlay);

  return () => {
    video.removeEventListener('play', handlePlay);
    video.removeEventListener('pause', handlePause);
    video.removeEventListener('waiting', handleWaiting);
    video.removeEventListener('canplay', handleCanPlay);
  };
}, [channel]);
```

---

## Estrutura do Elemento Video

```tsx
<video
  ref={videoRef}
  className={`video-element ${isMirrored ? 'mirrored' : ''}`}
  playsInline                    // Importante para iOS
  onClick={handleVideoClick}
  onDoubleClick={handleVideoDoubleClick}
/>
```

### Atributos Importantes

| Atributo | Propósito |
|----------|-----------|
| `playsInline` | Permite reprodução inline no iOS |
| `autoplay` | NÃO usado (controlamos via JS) |
| `muted` | Controlado via state |
| `controls` | NÃO usado (controles customizados) |

---

## Implementação para React Native

### Usando react-native-video

```typescript
import Video from 'react-native-video';

const VideoPlayer = ({ channel }) => {
  const videoRef = useRef(null);

  return (
    <Video
      ref={videoRef}
      source={{ uri: channel.url, type: 'm3u8' }}
      style={styles.video}
      resizeMode="contain"
      onLoad={() => console.log('Loaded')}
      onError={(e) => console.log('Error:', e)}
      onBuffer={({ isBuffering }) => setIsLoading(isBuffering)}
      // iOS
      allowsExternalPlayback={true}
      pictureInPicture={true}
      // Android
      useTextureView={true}
    />
  );
};
```

---

## Implementação para Flutter

### Usando video_player

```dart
import 'package:video_player/video_player.dart';

class VideoPlayerWidget extends StatefulWidget {
  final String url;

  @override
  _VideoPlayerWidgetState createState() => _VideoPlayerWidgetState();
}

class _VideoPlayerWidgetState extends State<VideoPlayerWidget> {
  late VideoPlayerController _controller;

  @override
  void initState() {
    super.initState();
    _controller = VideoPlayerController.network(
      widget.url,
      videoPlayerOptions: VideoPlayerOptions(mixWithOthers: true),
    )
      ..initialize().then((_) {
        setState(() {});
        _controller.play();
      });
  }

  @override
  Widget build(BuildContext context) {
    return AspectRatio(
      aspectRatio: _controller.value.aspectRatio,
      child: VideoPlayer(_controller),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }
}
```

---

## Considerações de Performance

1. **Use Web Workers** (`enableWorker: true`)
2. **Limite o buffer** para reduzir uso de memória
3. **Destrua a instância HLS** ao trocar de canal
4. **Use `memo`** para evitar re-renders desnecessários
5. **Refs ao invés de state** para valores que não precisam re-render
