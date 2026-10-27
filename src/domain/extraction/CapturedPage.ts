/** Página capturada pela extensão no navegador do usuário. */
export interface CapturedPage {
  url: string;
  /** HTML completo, já renderizado pelo navegador (`document.documentElement.outerHTML`). */
  html: string;
  capturedAt: Date;
  /** Começa em 1. */
  pageNumber: number;
}
