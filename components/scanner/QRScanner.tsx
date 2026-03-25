'use client'

import { Camera, ScanLine, ShieldAlert, TriangleAlert } from 'lucide-react'
import { useEffect, useEffectEvent, useId, useRef, useState } from 'react'
import { parseQRCode } from '@/lib/utils/qrcode'
import type { QRScanResult } from '@/types'
import type { CameraDevice, Html5Qrcode, Html5QrcodeCameraScanConfig, Html5QrcodeResult } from 'html5-qrcode'

interface QRScannerProps {
  onScan: (resultado: QRScanResult) => void | Promise<void>
  onCodigoInvalido?: (valorLido: string) => void
  onErro?: (mensagem: string) => void
  ativa?: boolean
  className?: string
}

type StatusPermissaoCamera =
  | 'desconhecido'
  | 'prompt'
  | 'granted'
  | 'denied'
  | 'indisponivel'

type EstadoInicializacao = 'aguardando_acao' | 'iniciando' | 'ativo'

function extrairMensagemErro(error: unknown): string {
  if (error instanceof DOMException) {
    switch (error.name) {
      case 'NotAllowedError':
        return 'O navegador bloqueou o acesso à câmera. Verifique a permissão do site.'
      case 'NotFoundError':
        return 'Nenhuma câmera disponível foi encontrada neste dispositivo.'
      case 'NotReadableError':
        return 'A câmera está ocupada por outro aplicativo ou navegador.'
      case 'OverconstrainedError':
        return 'A câmera traseira solicitada não está disponível neste dispositivo.'
      default:
        return error.message || 'Não foi possível acessar a câmera do dispositivo.'
    }
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return 'Não foi possível acessar a câmera do dispositivo.'
}

function obterTextoPermissao(statusPermissao: StatusPermissaoCamera): string {
  switch (statusPermissao) {
    case 'prompt':
      return 'Aguardando autorização do navegador'
    case 'granted':
      return 'Permissão concedida'
    case 'denied':
      return 'Permissão bloqueada'
    case 'indisponivel':
      return 'API de câmera indisponível'
    default:
      return 'Permissão ainda não verificada'
  }
}

function obterInstrucaoPermissao(statusPermissao: StatusPermissaoCamera): string {
  switch (statusPermissao) {
    case 'denied':
      return 'Libere a câmera nas permissões do navegador e toque em "Ativar câmera" novamente.'
    case 'indisponivel':
      return 'Abra esta página no Safari ou Chrome com HTTPS para usar a câmera.'
    case 'prompt':
      return 'Ao tocar no botão, o navegador deve abrir o pedido de acesso à câmera.'
    case 'granted':
      return 'Permissão pronta. Toque no botão para iniciar a câmera traseira.'
    default:
      return 'Toque no botão abaixo para iniciar a câmera e verificar as permissões.'
  }
}

function selecionarCameraPreferencial(cameras: CameraDevice[]): CameraDevice | null {
  if (cameras.length === 0) {
    return null
  }

  const padraoCameraTraseira = /(back|rear|environment|traseira|traseiro)/i
  const cameraTraseira = cameras.find((camera) => padraoCameraTraseira.test(camera.label))

  if (cameraTraseira) {
    return cameraTraseira
  }

  return cameras[cameras.length - 1] ?? cameras[0] ?? null
}

function configurarVideoParaIOS(readerElementId: string) {
  const video = document.querySelector<HTMLVideoElement>(`#${readerElementId} video`)

  if (!video) {
    return
  }

  video.setAttribute('playsinline', 'true')
  video.setAttribute('webkit-playsinline', 'true')
  video.setAttribute('muted', 'true')
  video.muted = true
}

export function QRScanner({
  onScan,
  onCodigoInvalido,
  onErro,
  ativa = true,
  className,
}: QRScannerProps) {
  const readerElementId = useId().replace(/:/g, '')
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null)
  const processandoScanRef = useRef(false)
  const ultimoCodigoInvalidoRef = useRef(0)
  const [mensagemStatus, setMensagemStatus] = useState(
    'Toque em "Ativar câmera" para iniciar o scanner.'
  )
  const [erroCamera, setErroCamera] = useState<string | null>(null)
  const [statusPermissao, setStatusPermissao] =
    useState<StatusPermissaoCamera>('desconhecido')
  const [estadoInicializacao, setEstadoInicializacao] =
    useState<EstadoInicializacao>('aguardando_acao')
  const [contextoSeguroAtivo, setContextoSeguroAtivo] = useState(false)
  const [apiCameraDisponivel, setApiCameraDisponivel] = useState(false)
  const [cameraSelecionada, setCameraSelecionada] = useState<string | null>(null)
  const bloqueioInteracaoRef = useRef(0)

  const handleScan = useEffectEvent(async (resultado: QRScanResult) => {
    await onScan(resultado)
  })

  const handleCodigoInvalido = useEffectEvent((valorLido: string) => {
    onCodigoInvalido?.(valorLido)
  })

  const handleErro = useEffectEvent((mensagem: string) => {
    onErro?.(mensagem)
  })

  async function encerrarScannerAtivo() {
    const scanner = html5QrcodeRef.current

    processandoScanRef.current = false

    if (!scanner) {
      return
    }

    try {
      if (scanner.isScanning) {
        await scanner.stop()
      }
    } catch {
      // Não interrompe o fluxo se a lib já tiver derrubado o stream.
    }

    try {
      scanner.clear()
    } catch {
      // Ignora limpeza duplicada durante trocas rápidas de etapa.
    }

    html5QrcodeRef.current = null
  }

  useEffect(() => {
    async function verificarPermissaoInicial() {
      const possuiContextoSeguro = window.isSecureContext
      const possuiApiCamera = Boolean(navigator.mediaDevices?.getUserMedia)

      setContextoSeguroAtivo(possuiContextoSeguro)
      setApiCameraDisponivel(possuiApiCamera)

      if (!possuiContextoSeguro || !possuiApiCamera) {
        setStatusPermissao('indisponivel')
        setMensagemStatus('Este navegador não permite câmera neste contexto.')
        return
      }

      if (!navigator.permissions?.query) {
        setStatusPermissao('desconhecido')
        return
      }

      try {
        const permissao = await navigator.permissions.query({
          name: 'camera' as PermissionName,
        })

        setStatusPermissao(permissao.state as StatusPermissaoCamera)

        permissao.onchange = () => {
          setStatusPermissao(permissao.state as StatusPermissaoCamera)
        }
      } catch {
        setStatusPermissao('desconhecido')
      }
    }

    void verificarPermissaoInicial()

    return () => {
      void encerrarScannerAtivo()
    }
  }, [])

  useEffect(() => {
    if (!ativa) {
      void encerrarScannerAtivo()
      setEstadoInicializacao('aguardando_acao')
      setMensagemStatus('Câmera pausada.')
    }
  }, [ativa])

  async function solicitarAcessoCamera() {
    const agora = Date.now()

    if (agora - bloqueioInteracaoRef.current < 500) {
      return
    }

    bloqueioInteracaoRef.current = agora

    const possuiContextoSeguro = window.isSecureContext
    const possuiApiCamera = Boolean(navigator.mediaDevices?.getUserMedia)

    setContextoSeguroAtivo(possuiContextoSeguro)
    setApiCameraDisponivel(possuiApiCamera)

    if (!ativa) {
      setMensagemStatus('A câmera está pausada enquanto a tela processa a etapa atual.')
      return
    }

    if (!possuiContextoSeguro || !possuiApiCamera) {
      setStatusPermissao('indisponivel')
      setErroCamera('O navegador atual não expôs a API de câmera.')
      setMensagemStatus('Abra a página em um navegador compatível com HTTPS.')
      return
    }

    setErroCamera(null)
    setMensagemStatus('Botão acionado. Solicitando permissão da câmera...')
    setEstadoInicializacao('iniciando')

    try {
      const html5QrcodeModule = await import('html5-qrcode')
      const cameras = await html5QrcodeModule.Html5Qrcode.getCameras()
      const cameraPreferencial = selecionarCameraPreferencial(cameras)

      if (!cameraPreferencial) {
        throw new DOMException(
          'Nenhuma câmera disponível foi encontrada neste dispositivo.',
          'NotFoundError'
        )
      }

      await encerrarScannerAtivo()

      const scanner = new html5QrcodeModule.Html5Qrcode(readerElementId, {
        formatsToSupport: [html5QrcodeModule.Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      })

      const configuracaoScanner: Html5QrcodeCameraScanConfig = {
        fps: 10,
        aspectRatio: 1,
        disableFlip: false,
        qrbox(viewfinderWidth, viewfinderHeight) {
          const menorLado = Math.min(viewfinderWidth, viewfinderHeight)
          const tamanhoBase = Math.max(220, Math.floor(menorLado * 0.7))
          return {
            width: tamanhoBase,
            height: tamanhoBase,
          }
        },
      }

      html5QrcodeRef.current = scanner

      await scanner.start(
        { deviceId: { exact: cameraPreferencial.id } },
        configuracaoScanner,
        async (valorLido: string, resultadoBruto: Html5QrcodeResult) => {
          if (processandoScanRef.current) {
            return
          }

          const resultado = parseQRCode(valorLido)

          if (!resultado) {
            const agora = Date.now()

            if (agora - ultimoCodigoInvalidoRef.current > 1500) {
              ultimoCodigoInvalidoRef.current = agora
              setMensagemStatus('QR inválido. Use apenas os códigos do sistema.')
              handleCodigoInvalido(valorLido)
            }

            return
          }

          processandoScanRef.current = true
          setMensagemStatus('QR detectado. Processando leitura...')

          try {
            scanner.pause(true)
            await handleScan(resultado)
            setMensagemStatus('Leitura concluída. Aponte para o próximo QR Code.')
            scanner.resume()
          } catch (error) {
            const mensagem = extrairMensagemErro(error)
            setMensagemStatus(mensagem)
            handleErro(mensagem)
            scanner.resume()
          } finally {
            processandoScanRef.current = false
          }

          void resultadoBruto
        },
        () => {}
      )

      requestAnimationFrame(() => {
        configurarVideoParaIOS(readerElementId)
      })

      setStatusPermissao('granted')
      setCameraSelecionada(cameraPreferencial.label || 'Câmera padrão')
      setEstadoInicializacao('ativo')
      setMensagemStatus('Aponte a câmera para um QR Code.')
    } catch (error) {
      const mensagem = extrairMensagemErro(error)
      const bloqueouPermissao =
        error instanceof DOMException && error.name === 'NotAllowedError'

      setStatusPermissao(bloqueouPermissao ? 'denied' : 'prompt')
      setErroCamera(mensagem)
      setEstadoInicializacao('aguardando_acao')
      setMensagemStatus(mensagem)
      handleErro(mensagem)
    }
  }

  const exibirBotaoAtivacao = estadoInicializacao !== 'ativo'

  async function handleAtivarCamera() {
    if (navigator.vibrate) {
      navigator.vibrate(40)
    }

    await solicitarAcessoCamera()
  }

  return (
    <div className={className}>
      <div className="relative overflow-hidden rounded-[28px] border border-slate-800 bg-slate-950 shadow-[0_24px_80px_rgba(15,23,42,0.45)]">
        <div
          id={readerElementId}
          aria-label="Leitor de QR Code"
          className="min-h-[420px] bg-slate-950 [&_canvas]:hidden [&_video]:h-[420px] [&_video]:w-full [&_video]:object-cover"
        />

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/5 to-slate-950/80" />

        <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-slate-950/70 px-3 py-1.5 text-xs font-medium tracking-[0.24em] text-slate-100 uppercase backdrop-blur-md">
            <Camera size={14} />
            {cameraSelecionada ? cameraSelecionada : 'Câmera traseira'}
          </div>
        </div>

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6">
          <div className="relative h-[240px] w-[240px] max-h-[65vw] max-w-[65vw] rounded-[34px] border border-white/12 bg-white/4 shadow-[0_0_0_999px_rgba(2,6,23,0.28)] backdrop-blur-[1px]">
            <div className="absolute top-0 left-0 h-12 w-12 rounded-tl-[30px] border-t-4 border-l-4 border-emerald-400" />
            <div className="absolute top-0 right-0 h-12 w-12 rounded-tr-[30px] border-t-4 border-r-4 border-emerald-400" />
            <div className="absolute bottom-0 left-0 h-12 w-12 rounded-bl-[30px] border-b-4 border-l-4 border-emerald-400" />
            <div className="absolute right-0 bottom-0 h-12 w-12 rounded-br-[30px] border-r-4 border-b-4 border-emerald-400" />
            <div className="absolute inset-x-6 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-emerald-300 to-transparent opacity-80" />
            <div className="absolute inset-x-12 top-1/2 h-7 -translate-y-1/2 rounded-full bg-emerald-400/10 blur-md" />
          </div>
        </div>

        {exibirBotaoAtivacao ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-slate-950/72 px-6 text-center backdrop-blur-sm">
            <div className="rounded-full border border-white/10 bg-white/5 p-4">
              {statusPermissao === 'denied' ? (
                <ShieldAlert size={28} className="text-amber-300" />
              ) : (
                <Camera size={28} className="text-emerald-300" />
              )}
            </div>

            <div className="space-y-2">
              <p className="text-lg font-semibold text-white">Ativação manual da câmera</p>
              <p className="text-sm leading-6 text-slate-200">
                {obterInstrucaoPermissao(statusPermissao)}
              </p>
            </div>

            <button
              type="button"
              onClick={() => void handleAtivarCamera()}
              onTouchEnd={() => void handleAtivarCamera()}
              disabled={!ativa || estadoInicializacao === 'iniciando'}
              className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {estadoInicializacao === 'iniciando' ? 'Iniciando câmera...' : 'Ativar câmera'}
            </button>
          </div>
        ) : null}

        <div className="absolute inset-x-0 bottom-0 border-t border-white/10 bg-slate-950/84 px-4 py-4 backdrop-blur-md">
          <div className="flex items-start gap-3 text-sm text-slate-100">
            {erroCamera ? (
              <TriangleAlert size={18} className="mt-0.5 shrink-0 text-amber-400" />
            ) : (
              <ScanLine size={18} className="mt-0.5 shrink-0 text-emerald-400" />
            )}
            <p>{mensagemStatus}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
