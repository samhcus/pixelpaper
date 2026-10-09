export const sizes = {
  desktop: { width: 768, height: 512 },
  phone: { width: 512, height: 768 },
  square: { width: 512, height: 512 },
}
export class ProviderError extends Error {
  constructor(message, status = 502) { super(message); this.status = status }
}
export function createHorde({ fetchImpl = fetch, apiKey = process.env.HORDE_API_KEY || '0000000000' } = {}) {
  const base = 'https://aihorde.net/api/v2'
  async function request(endpoint, options = {}) {
    let response
    try {
      response = await fetchImpl(`${base}${endpoint}`, {
        ...options, signal: AbortSignal.timeout(30000),
        headers: { 'Content-Type': 'application/json', apikey: apiKey,
          'Client-Agent': 'pixelpaper:1.1:https://github.com/samhcus/wallpapers', ...options.headers },
      })
    } catch { throw new ProviderError('The free generator is temporarily unreachable. Please try again.') }
    if (!response.ok) {
      if (response.status === 404) throw new ProviderError('This generation has expired. Please generate it again.', 410)
      if (response.status === 429) throw new ProviderError('The free generator is busy. Wait a moment, then try again.', 429)
      const error = await response.json().catch(() => ({}))
      if (error.rc === 'KudosUpfront' || error.rc === 'AnonForbidden') {
        throw new ProviderError('Anonymous generation is limited right now. Please try again later.', 503)
      }
      if (response.status === 400 || response.status === 403) {
        throw new ProviderError('The generator could not accept this description. Try a different description or try again later.', 422)
      }
      throw new ProviderError('The free generator could not complete this request. Please try again.', 502)
    }
    return response.json()
  }
  return {
    async submit(prompt, orientation) {
      const result = await request('/generate/async', { method: 'POST', body: JSON.stringify({
        prompt, params: { ...sizes[orientation], steps: 20, n: 1, sampler_name: 'k_euler' },
        models: ['Dreamshaper', 'Deliberate'], nsfw: false, censor_nsfw: true,
        trusted_workers: true, r2: false, shared: apiKey === '0000000000',
      }) })
      if (!/^[0-9a-f-]{36}$/i.test(result.id || '')) throw new ProviderError('The generator did not return a valid request. Please try again.')
      return result.id
    },
    check: id => request(`/generate/check/${id}`),
    result: id => request(`/generate/status/${id}`),
    cancel: id => request(`/generate/status/${id}`, { method: 'DELETE' }),
  }
}
