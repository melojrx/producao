import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const arquivosOperacionais = [
  'components/apontamentos/PainelApontamentosSupervisor.tsx',
  'components/apontamentos/PainelQualidadeSupervisor.tsx',
  'components/dashboard/DashboardVisaoOperacionalTab.tsx',
  'components/dashboard/KanbanOperacionalTurno.tsx',
  'components/dashboard/ModalDetalhesOpTurno.tsx',
  'components/dashboard/ModalDetalhesSecaoTurno.tsx',
  'components/dashboard/ModalDetalhesSetorTurno.tsx',
  'components/dashboard/ResumoOpTurnoCard.tsx',
  'components/dashboard/ResumoSetorTurnoCard.tsx',
  'components/scanner/ConfirmacaoRegistro.tsx',
  'components/scanner/ScannerPageClient.tsx',
  'components/scanner/SelecaoDemandaScanner.tsx',
  'components/scanner/SelecaoOperacaoScanner.tsx',
] as const

const rotulosAntigos = [
  'Backlog vivo',
  'Plano do dia',
  'Disponível agora',
  'Disponível Agora',
  'Concluído',
  'Concluido',
  'Excedente',
] as const

const rotulosOperacionais = [
  'Peças da OP',
  'Capacidade',
  'Disponível',
  'Produzido',
  'Saldo',
] as const

function caminhoRaiz(relativo: string): string {
  return fileURLToPath(new URL(`../../${relativo}`, import.meta.url))
}

function escaparRegex(valor: string): string {
  return valor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function contemRotuloVisivel(conteudo: string, rotulo: string): boolean {
  const padrao = new RegExp(`(^|[^A-Za-zÀ-ÿ])${escaparRegex(rotulo)}([^A-Za-zÀ-ÿ]|$)`)
  return padrao.test(conteudo)
}

test('superfícies operacionais usam nomenclatura do chão de fábrica nos cards setoriais', () => {
  const conteudoOperacional = arquivosOperacionais
    .map((arquivo) => readFileSync(caminhoRaiz(arquivo), 'utf8'))
    .join('\n')

  for (const rotuloAntigo of rotulosAntigos) {
    assert.equal(
      contemRotuloVisivel(conteudoOperacional, rotuloAntigo),
      false,
      `Rótulo antigo ainda aparece: ${rotuloAntigo}`
    )
  }

  for (const rotuloOperacional of rotulosOperacionais) {
    assert.equal(
      contemRotuloVisivel(conteudoOperacional, rotuloOperacional),
      true,
      `Rótulo operacional ausente: ${rotuloOperacional}`
    )
  }
})
