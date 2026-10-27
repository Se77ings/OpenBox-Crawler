/** Fonte do "agora", injetada para que os testes controlem o tempo. */
export interface IClock {
  now(): Date;
}
