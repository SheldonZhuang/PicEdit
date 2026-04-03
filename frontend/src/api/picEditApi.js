const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')

async function handleResponse(resp) {
  if (!resp.ok) {
    let msg = `HTTP ${resp.status}`
    try {
      const data = await resp.json()
      msg = data.detail || msg
    } catch {}
    throw new Error(msg)
  }
  return resp.json()
}

export const removeBg = (file) => {
  const form = new FormData()
  form.append('file', file)
  return fetch(`${BASE_URL}/api/remove-bg`, { method: 'POST', body: form }).then(handleResponse)
}

export const upscale = (file, scale = 2) => {
  const form = new FormData()
  form.append('file', file)
  form.append('scale', String(scale))
  return fetch(`${BASE_URL}/api/upscale`, { method: 'POST', body: form }).then(handleResponse)
}

export const resize = (file, params) => {
  const form = new FormData()
  form.append('file', file)
  form.append('mode', params.mode)
  if (params.mode === 'ratio') {
    form.append('ratio', String(params.ratio))
  } else {
    form.append('width', String(params.width))
    form.append('height', String(params.height))
    form.append('keep_aspect', String(params.keepAspect))
  }
  return fetch(`${BASE_URL}/api/resize`, { method: 'POST', body: form }).then(handleResponse)
}

export const watermark = (file, params) => {
  const form = new FormData()
  form.append('file', file)
  form.append('text', params.text)
  form.append('position', params.position)
  form.append('font_size', String(params.fontSize))
  form.append('opacity', String(params.opacity))
  form.append('color', params.color)
  form.append('margin', String(params.margin || 20))
  return fetch(`${BASE_URL}/api/watermark`, { method: 'POST', body: form }).then(handleResponse)
}

export const checkHealth = () =>
  fetch(`${BASE_URL}/health`).then(handleResponse)
