# ❤️ Sistema de Favoritos

## 🎯 Objetivo

Implementar um sistema de favoritos que permite ao usuário salvar filmes e séries, com persistência no localStorage e uma categoria dedicada exibida antes das tendências na tela `/movies`.

---

## 📁 Arquivos Criados

### `src/services/favoritesService.ts`

Novo serviço que gerencia os favoritos do usuário com persistência no localStorage.

#### Funções Exportadas

| Função | Descrição |
|--------|-----------|
| `isFavorite(itemId)` | Verifica se um item está nos favoritos |
| `addToFavorites(itemId)` | Adiciona um item aos favoritos |
| `removeFromFavorites(itemId)` | Remove um item dos favoritos |
| `toggleFavorite(itemId)` | Alterna o estado de favorito |
| `getFavorites()` | Retorna todos os itens favoritos com dados completos |
| `getFavoritesCount()` | Retorna a quantidade de favoritos |
| `clearAllFavorites()` | Limpa todos os favoritos |
| `exportFavorites()` | Exporta favoritos como JSON (backup) |
| `importFavorites(json)` | Importa favoritos de JSON (restaurar) |

#### Estrutura de Dados no localStorage

```typescript
// Chave: 'tv-nvnplus-favorites'
interface FavoriteItem {
  id: string;      // ID do item no catálogo
  addedAt: number; // Timestamp de quando foi adicionado
}
```

#### Eventos Disparados

O serviço dispara eventos customizados quando há mudanças:

```typescript
window.dispatchEvent(new CustomEvent('favorites-changed', {
  detail: { action: 'add' | 'remove' | 'clear' | 'import', itemId?: string }
}));
```

---

## 📁 Arquivos Modificados

### `src/components/MovieCatalogV2.tsx`

#### 1. Novo Import

```typescript
import { isFavorite, toggleFavorite, getFavorites } from '../services/favoritesService';
```

#### 2. Novos Estados e Funções

```typescript
// Estado de favoritos
const [favorites, setFavorites] = useState<EnrichedMovie[]>([]);

// Função para atualizar favoritos
const refreshFavorites = useCallback(() => {
  setFavorites(getFavorites());
}, []);
```

#### 3. Carregamento Inicial + Listener

```typescript
// Na inicialização
refreshFavorites();

// Listener para mudanças (inclui outras abas)
useEffect(() => {
  const handleFavoritesChange = () => {
    refreshFavorites();
  };

  window.addEventListener('favorites-changed', handleFavoritesChange);
  return () => window.removeEventListener('favorites-changed', handleFavoritesChange);
}, [refreshFavorites]);
```

#### 4. Modal de Detalhes - Botão de Favorito

```tsx
const MovieDetailsModal = memo(function MovieDetailsModal({
  // ... outros props
  onFavoriteChange
}: {
  // ... outros tipos
  onFavoriteChange?: () => void;
}) {
  const [isFav, setIsFav] = useState(() => isFavorite(item.id));

  const handleToggleFavorite = () => {
    const newState = toggleFavorite(item.id);
    setIsFav(newState);
    onFavoriteChange?.();
  };

  // Botão no JSX
  <button
    className={`modal-favorite ${isFav ? 'active' : ''}`}
    onClick={handleToggleFavorite}
  >
    <svg viewBox="0 0 24 24" fill={isFav ? 'currentColor' : 'none'}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  </button>
});
```

#### 5. Categoria de Favoritos na Tela Principal

```tsx
{/* Favoritos - Aparece primeiro se houver */}
{favorites.length > 0 && (
  <CategoryCarousel
    title="❤️ Meus Favoritos"
    items={favorites.slice(0, 20)}
    onSelect={handleSelectItem}
  />
)}
```

---

### `src/components/MovieCatalogV2.css`

#### Estilos do Botão de Favorito

```css
/* Modal Top Buttons (Favorite + Close) */
.modal-top-buttons {
  position: absolute;
  top: 16px;
  right: 16px;
  display: flex;
  gap: 12px;
  z-index: 10;
}

.modal-favorite {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  border: none;
  border-radius: 50%;
  color: white;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.modal-favorite:hover {
  background: rgba(0, 0, 0, 0.8);
  transform: scale(1.1);
}

.modal-favorite.active {
  color: #ff4757;
  background: rgba(255, 71, 87, 0.2);
}

.modal-favorite.active svg {
  animation: heartBeat 0.3s ease-out;
}

@keyframes heartBeat {
  0% { transform: scale(1); }
  50% { transform: scale(1.3); }
  100% { transform: scale(1); }
}
```

---

## 🎨 Resultado Visual

### Modal de Filme/Série

```
┌─────────────────────────────────────────┐
│                           [❤️] [✕]      │  ← Botões no topo
│  ╔═══════════════════════════════════╗  │
│  ║           BACKDROP                ║  │
│  ╚═══════════════════════════════════╝  │
│  ┌────┐                                 │
│  │    │  Título do Filme                │
│  │PSTR│  ⭐ 8.5  |  2024  |  2h 15min   │
│  └────┘  Sinopse...                     │
│                                         │
│  [▶ Assistir Agora]                     │
└─────────────────────────────────────────┘
```

### Tela /movies (ordem de exibição)

```
┌─────────────────────────────────────────┐
│           🎬 HERO BANNER                │
├─────────────────────────────────────────┤
│  ❤️ Meus Favoritos          ← PRIMEIRO! │
│  [Card] [Card] [Card] [Card] [Card] →   │
├─────────────────────────────────────────┤
│  🔥 Tendências de Hoje                  │
│  [Card] [Card] [Card] [Card] [Card] →   │
├─────────────────────────────────────────┤
│  📅 Tendências da Semana                │
│  [Card] [Card] [Card] [Card] [Card] →   │
├─────────────────────────────────────────┤
│  📺 Netflix                             │
│  📺 Prime Video                         │
│  ... demais categorias                  │
└─────────────────────────────────────────┘
```

---

## ⚡ Características Técnicas

| Recurso | Implementação |
|---------|--------------|
| **Persistência** | localStorage com chave `tv-nvnplus-favorites` |
| **Sincronização** | Eventos customizados para atualização em tempo real |
| **Ordenação** | Mais recentes primeiro (LIFO) |
| **Performance** | Usa `findById()` para recuperar dados completos |
| **UX** | Animação de coração ao favoritar |
| **Visual** | Botão muda de cor quando ativo (vermelho) |
| **Ocultação** | Seção não aparece se não houver favoritos |

---

## 🔄 Fluxo de Funcionamento

```
1. Usuário clica no botão ❤️ no modal
         ↓
2. toggleFavorite(itemId) é chamado
         ↓
3. Estado é salvo no localStorage
         ↓
4. Evento 'favorites-changed' é disparado
         ↓
5. refreshFavorites() atualiza o estado
         ↓
6. Categoria "Meus Favoritos" é renderizada/atualizada
```

---

## 🧪 Como Testar

1. Acesse a tela `/movies`
2. Clique em qualquer filme ou série para abrir o modal
3. Clique no botão de coração (❤️) no canto superior direito
4. Observe a animação de "batimento cardíaco"
5. Feche o modal
6. A categoria "❤️ Meus Favoritos" deve aparecer no topo (antes das tendências)
7. Abra novamente o modal - o coração deve estar preenchido (vermelho)
8. Clique novamente para desfavoritar
9. Recarregue a página - os favoritos devem persistir

---

## 📝 Funcionalidades Extras

O serviço inclui funcionalidades adicionais para uso futuro:

```typescript
// Exportar favoritos para backup
const backup = exportFavorites();
console.log(backup); // JSON string

// Importar favoritos de backup
importFavorites(backup);

// Limpar todos os favoritos
clearAllFavorites();

// Verificar quantidade
const count = getFavoritesCount();
```

---

## 📅 Data da Implementação

**18 de Janeiro de 2026**
