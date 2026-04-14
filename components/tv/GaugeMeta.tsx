'use client'

import { TOKENS, type TemaTV } from '@/components/tv/tema-tv'

interface GaugeMetaProps {
  readonly atingimentoPct: number
  readonly metaPecas: number
  readonly alcancadoMes: number
  readonly tema: TemaTV
}

// Coordenadas fixas do gauge
const CX = 100
const CY = 100
const RAIO = 78
const ESPESSURA = 16

// Ângulos em graus — convenção SVG: 0°=direita, 90°=baixo, 180°=esquerda, 270°=topo
// O arco vai de 180° (esquerda) a 360° (direita) no sentido horário da tela, passando pelo topo (270°)
const ANGULO_INICIO = 180
const ANGULO_FIM = 360

function ponto(thetaGraus: number): { x: number; y: number } {
  const rad = (thetaGraus * Math.PI) / 180
  return {
    x: CX + RAIO * Math.cos(rad),
    y: CY + RAIO * Math.sin(rad),
  }
}

// sweep-flag=1 = sentido horário na tela → de 180° a 360° passa pelo TOPO (270°) ✓
function caminhoArco(thetaInicio: number, thetaFim: number): string {
  const ini = ponto(thetaInicio)
  const fim = ponto(thetaFim)
  return `M ${ini.x.toFixed(2)} ${ini.y.toFixed(2)} A ${RAIO} ${RAIO} 0 0 1 ${fim.x.toFixed(2)} ${fim.y.toFixed(2)}`
}

function corProgresso(pct: number): string {
  if (pct >= 100) return '#10b981' // emerald
  if (pct >= 70) return '#6366f1'  // indigo
  if (pct >= 50) return '#f59e0b'  // amber
  return '#ef4444'                  // rose
}

function formatarNumero(valor: number): string {
  return new Intl.NumberFormat('pt-BR').format(valor)
}

export function GaugeMeta({ atingimentoPct, metaPecas, alcancadoMes, tema }: GaugeMetaProps) {
  const tokens = TOKENS[tema]
  const pct = Math.min(Math.max(atingimentoPct, 0), 100)
  const cor = corProgresso(pct)

  const trilha = caminhoArco(ANGULO_INICIO, ANGULO_FIM)
  const anguloFimProgresso = ANGULO_INICIO + pct * 1.8  // 1.8 = 180° / 100
  const progresso = pct >= 0.5 ? caminhoArco(ANGULO_INICIO, anguloFimProgresso) : null

  return (
    <div className="flex w-full flex-col items-center">
      <svg
        viewBox="0 0 200 115"
        aria-label={`Meta atingida: ${atingimentoPct.toFixed(1)}%`}
        className="w-full max-w-[260px]"
      >
        {/* Trilha de fundo */}
        <path
          d={trilha}
          fill="none"
          stroke={tokens.trilhaGaugeCor}
          strokeWidth={ESPESSURA}
          strokeLinecap="round"
        />

        {/* Arco de progresso */}
        {progresso && (
          <path
            d={progresso}
            fill="none"
            stroke={cor}
            strokeWidth={ESPESSURA}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 6px ${cor}88)` }}
          />
        )}

        {/* Percentual central */}
        <text
          x={CX}
          y={CY - 8}
          textAnchor="middle"
          dominantBaseline="auto"
          fontSize="26"
          fontWeight="700"
          fill={cor}
          fontFamily="inherit"
        >
          {pct.toFixed(1)}%
        </text>

        {/* Label ATINGIMENTO */}
        <text
          x={CX}
          y={CY + 12}
          textAnchor="middle"
          dominantBaseline="auto"
          fontSize="8.5"
          fontWeight="500"
          fill="#475569"
          fontFamily="inherit"
          letterSpacing="1.5"
        >
          ATINGIMENTO
        </text>

        {/* Label extremo esquerdo (0) */}
        <text
          x={ponto(ANGULO_INICIO).x - 2}
          y={ponto(ANGULO_INICIO).y + 14}
          textAnchor="middle"
          fontSize="8"
          fill="#334155"
          fontFamily="inherit"
        >
          0
        </text>

        {/* Label extremo direito (meta) */}
        <text
          x={ponto(ANGULO_FIM).x + 2}
          y={ponto(ANGULO_FIM).y + 14}
          textAnchor="middle"
          fontSize="8"
          fill="#334155"
          fontFamily="inherit"
        >
          {formatarNumero(metaPecas)}
        </text>
      </svg>

      <p className="mt-1 text-center text-xs text-slate-600">
        <span className="font-semibold" style={{ color: cor }}>
          {formatarNumero(alcancadoMes)}
        </span>{' '}
        de {formatarNumero(metaPecas)} peças
      </p>
    </div>
  )
}
