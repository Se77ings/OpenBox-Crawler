/** O que o front repassa à extensão para ela abrir o site e capturar as páginas. */
export interface StartCrawlRunResponse {
  runId: string;
  url: string;
  /** Seletor que indica que os produtos foram renderizados; `null` = esperar o carregamento. */
  readySelector: string | null;
  maxPages: number;
}
