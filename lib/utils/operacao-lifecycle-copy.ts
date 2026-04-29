export type AcaoCicloVidaOperacao = 'desativar' | 'excluir'

interface ConteudoConfirmacaoOperacaoParams {
  acao: AcaoCicloVidaOperacao
  codigo: string
  executando: boolean
}

export interface ConteudoConfirmacaoOperacao {
  aviso: string
  descricao: string
  rotuloConfirmacao: string
  titulo: string
}

export function obterConteudoConfirmacaoOperacao({
  acao,
  codigo,
  executando,
}: ConteudoConfirmacaoOperacaoParams): ConteudoConfirmacaoOperacao {
  if (acao === 'desativar') {
    return {
      titulo: 'Desativar operação',
      descricao: `A operação "${codigo}" será desativada e deixará de aparecer como opção ativa, mas todo o histórico será preservado.`,
      aviso: 'Use esta ação quando a operação não deve mais ser utilizada em novos roteiros, mantendo a rastreabilidade do histórico.',
      rotuloConfirmacao: executando ? 'Desativando operação...' : 'Confirmar desativação',
    }
  }

  return {
    titulo: 'Excluir permanentemente',
    descricao: `A operação "${codigo}" será removida permanentemente apenas se estiver sem dependências.`,
    aviso: 'Esta ação é excepcional. Se a operação estiver em roteiro ou histórico de produção, o sistema bloqueará a exclusão.',
    rotuloConfirmacao: executando ? 'Excluindo operação...' : 'Confirmar exclusão',
  }
}
