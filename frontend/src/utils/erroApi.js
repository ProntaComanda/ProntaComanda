// Texto de erro para o usuário: primeiro detalhe de validação, senão a mensagem do
// servidor, senão o texto padrão da tela.
export function mensagemErro(err, padrao) {
  const resposta = err?.response?.data;
  const detalhe = resposta?.detalhes && Object.values(resposta.detalhes).flat()[0];
  return detalhe || resposta?.erro || padrao;
}
