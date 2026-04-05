'use client'

import type { ReactElement } from 'react'
import { useEffect, useRef, useState } from 'react'
import { ResponsiveContainer } from 'recharts'

interface ChartResponsiveContainerProps {
  minHeight: number
  children: ReactElement
}

export function ChartResponsiveContainer({
  minHeight,
  children,
}: ChartResponsiveContainerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [podeRenderizarGrafico, setPodeRenderizarGrafico] = useState(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    const atualizar = (largura: number, altura: number) => {
      setPodeRenderizarGrafico(largura > 0 && altura > 0)
    }

    atualizar(container.clientWidth, container.clientHeight)

    const observer = new ResizeObserver((entries) => {
      const entrada = entries[0]
      if (!entrada) {
        return
      }

      atualizar(entrada.contentRect.width, entrada.contentRect.height)
    })

    observer.observe(container)

    return () => {
      observer.disconnect()
    }
  }, [])

  return (
    <div ref={containerRef} className="h-full w-full min-w-0" style={{ minHeight }}>
      {podeRenderizarGrafico ? (
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={minHeight}>
          {children}
        </ResponsiveContainer>
      ) : null}
    </div>
  )
}
