import { useState, useCallback } from 'react'
import * as api from '../api/picEditApi'

export function useProcessing() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState(null)   // { image_base64, output_size, process_time_ms }
  const [error, setError] = useState(null)

  const process = useCallback(async (tab, file, params) => {
    setIsLoading(true)
    setError(null)
    setResult(null)
    try {
      let data
      if (tab === 'removebg') data = await api.removeBg(file)
      else if (tab === 'upscale') data = await api.upscale(file, params.scale)
      else if (tab === 'resize') data = await api.resize(file, params)
      else if (tab === 'watermark') data = await api.watermark(file, params)
      setResult(data)
    } catch (e) {
      setError(e.message || '处理失败，请重试')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const clearResult = useCallback(() => {
    setResult(null)
    setError(null)
  }, [])

  return { isLoading, result, error, process, clearResult }
}
