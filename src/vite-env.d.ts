/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Registered id in src/data/source.ts. Defaults to "tcgdex". */
  readonly VITE_CARD_SOURCE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
