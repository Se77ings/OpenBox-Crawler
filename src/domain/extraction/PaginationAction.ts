/**
 * Como a extensão chega à próxima leva de produtos. Ela sempre usa a navegação do
 * próprio site (como um usuário faria) e nunca monta URLs de paginação.
 */
export type PaginationAction =
  { type: 'click'; selector: string } | { type: 'scroll'; itemSelector: string };
