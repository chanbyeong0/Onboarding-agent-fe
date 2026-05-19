import { useEffect, useRef, useState } from 'react'
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from 'pdfjs-dist'
import { getStoredTokens } from '../../../lib/tokenStorage'

GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).toString()

type PdfPageViewerProps = {
  fileUrl: string | null
  pageNumber: number
  onLoaded: (pageCount: number) => void
}

export default function PdfPageViewer({ fileUrl, pageNumber, onLoaded }: PdfPageViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!fileUrl) {
      setPdf(null)
      onLoaded(0)
      return
    }

    const { accessToken } = getStoredTokens()
    const loadingTask = getDocument({
      url: fileUrl,
      httpHeaders: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    })

    loadingTask.promise
      .then((loadedPdf) => {
        setPdf(loadedPdf)
        setError(null)
        onLoaded(loadedPdf.numPages)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'PDF를 불러오지 못했습니다.')
        setPdf(null)
        onLoaded(0)
      })

    return () => {
      void loadingTask.destroy()
    }
  }, [fileUrl, onLoaded])

  useEffect(() => {
    if (!pdf || !canvasRef.current) {
      return
    }

    let cancelled = false

    void pdf.getPage(pageNumber).then(async (page) => {
      if (cancelled || !canvasRef.current) {
        return
      }

      const viewport = page.getViewport({ scale: 1.4 })
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')
      if (!context) {
        return
      }

      canvas.width = viewport.width
      canvas.height = viewport.height
      await page.render({ canvas, canvasContext: context, viewport }).promise
    })

    return () => {
      cancelled = true
    }
  }, [pdf, pageNumber])

  if (error) {
    return <p className="error-text">{error}</p>
  }

  return <canvas ref={canvasRef} className="pdf-canvas" />
}
