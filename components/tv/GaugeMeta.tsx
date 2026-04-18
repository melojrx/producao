'use client'

import { TOKENS, type TemaTV } from '@/components/tv/tema-tv'

interface GaugeMetaProps {
  readonly atingimentoPct: number
  readonly metaPecas: number
  readonly alcancadoMes: number
  readonly tema: TemaTV
  readonly label?: string
  readonly sublabel?: string
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

export function GaugeMeta({ atingimentoPct, metaPecas, alcancadoMes, tema, label = 'ATINGIMENTO', sublabel }: GaugeMetaProps) {
  const tokens = TOKENS[tema]
  const pct = Math.min(Math.max(atingimentoPct, 0), 100)
  const cor = corProgresso(pct)

  const trilha = caminhoArco(ANGULO_INICIO, ANGULO_FIM)
  const anguloFimProgresso = ANGULO_INICIO + pct * 1.8  // 1.8 = 180° / 100
  const progresso = pct >= 0.5 ? caminhoArco(ANGULO_INICIO, anguloFimProgresso) : null

  return (
    <div className="flex w-full flex-col items-center">
      {/* viewBox: top da trilha = CY - RAIO - ESPESSURA/2 = 100 - 78 - 8 = 14
           bottom da trilha = CY + ESPESSURA/2 = 100 + 8 = 108
           Adicionamos 4px de padding → top=10, height=102 */}
      <svg
        viewBox="0 10 200 102"
        aria-label={`Meta atingida: ${atingimentoPct.toFixed(1)}%`}
        className="w-full max-w-[240px]"
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

        {/* Label dinâmico */}
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
          {label}
        </text>
      </svg>

      <div className="mt-1 flex w-full items-center justify-between px-1 text-xs text-slate-500">
        <span>0</span>
        <span className="font-semibold" style={{ color: cor }}>
          {formatarNumero(alcancadoMes)}
        </span>
        <span>{formatarNumero(metaPecas)}</span>
      </div>
      {sublabel && (
        <p className="mt-0.5 text-center text-xs text-slate-500">{sublabel}</p>
      )}
    </div>
  )
}
