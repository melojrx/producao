'use client'

import { useRef } from 'react'
import QRCode from 'react-qr-code'
import { Download } from 'lucide-react'

interface QRCodeDisplayProps {
  valor: string
  titulo: string
  tamanho?: number
}

export function QRCodeDisplay({ valor, titulo, tamanho = 160 }: QRCodeDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  function baixarPNG() {
    const svg = containerRef.current?.querySelector('svg')
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new Image()
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)

    img.onload = () => {
      canvas.width = tamanho * 2
      canvas.height = tamanho * 2
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)

      const link = document.createElement('a')
      link.download = `qr-${titulo.toLowerCase().replace(/\s+/g, '-')}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    }

    img.src = url
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div ref={containerRef} className="bg-white p-3 rounded-lg border border-gray-200">
        <QRCode value={valor} size={tamanho} />
      </div>
      <button
        type="button"
        onClick={baixarPNG}
        aria-label={`Baixar QR Code de ${titulo}`}
        title={`Baixar QR Code de ${titulo} em PNG`}
        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 transition-colors"
      >
        <Download size={16} />
        Baixar PNG
      </button>
    </div>
  )
}
