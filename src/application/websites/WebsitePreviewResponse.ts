/** O que o dialog de cadastro mostra para o usuário confirmar, antes de salvar. */
export interface WebsitePreviewResponse {
  /** URL já normalizada, sem parâmetros de rastreamento. */
  openBoxUrl: string;
  baseUrl: string;
  name: string;
  logoUrl: string | null;
  /** `null` quando nenhum extrator sabe ler os produtos deste site. */
  extractor: { key: string; displayName: string } | null;
  /** Site já cadastrado com a mesma URL base, se houver. */
  alreadyRegistered: { id: string; name: string } | null;
}
