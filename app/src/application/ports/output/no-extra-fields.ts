/**
 * Rejeita, em tempo de compilação, uma chave que a entrada do catálogo não
 * declara. A checagem nativa de propriedade excedente do TypeScript só alcança
 * literais recém-criados no ponto da chamada; esta forma também pega o objeto
 * montado antes, numa variável.
 */
export type NoExtraFields<TAllowed, TGiven> = TGiven &
  Record<Exclude<keyof TGiven, keyof TAllowed>, never>;
