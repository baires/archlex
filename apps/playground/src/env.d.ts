/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DOCS_URL?: string;
  readonly VITE_SHARE_ORIGIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
