/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Proxy de streaming fora da Cloudflare; vazio usa a própria origem. */
  readonly VITE_PROXY_BASE?: string;
  /** Endereço do projeto dedicado à conta NvN.Plus TV. */
  readonly VITE_SUPABASE_URL?: string;
  /** Chave publishable pública; nunca usar service_role no navegador. */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module 'smoothscroll-polyfill' {
  const smoothscroll: { polyfill: () => void };
  export default smoothscroll;
}
