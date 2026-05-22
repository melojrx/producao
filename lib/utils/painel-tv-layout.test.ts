import assert from 'node:assert/strict'
import test from 'node:test'

import {
  ALTURA_BASE_PAINEL_TV,
  LARGURA_BASE_PAINEL_TV,
  calcularEscalaPainelTv,
} from './painel-tv-layout.ts'

test('calcula escala do palco 16:9 para caber no viewport da TV sem rolagem', () => {
  const escala = calcularEscalaPainelTv({ larguraViewport: 960, alturaViewport: 540 })

  assert.equal(escala, 0.75)
  assert.equal(LARGURA_BASE_PAINEL_TV * escala, 960)
  assert.equal(ALTURA_BASE_PAINEL_TV * escala, 540)
})

test('usa a altura como limite quando o navegador da TV tem barra ou viewport baixo', () => {
  const escala = calcularEscalaPainelTv({ larguraViewport: 1280, alturaViewport: 640 })

  assert.equal(Number(escala.toFixed(3)), 0.889)
  assert.ok(ALTURA_BASE_PAINEL_TV * escala <= 640)
  assert.ok(LARGURA_BASE_PAINEL_TV * escala <= 1280)
})

test('retorna escala neutra quando o viewport ainda nao foi medido', () => {
  const escala = calcularEscalaPainelTv({ larguraViewport: 0, alturaViewport: 0 })

  assert.equal(escala, 1)
})
