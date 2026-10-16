/**
 * DEVELOPMENT-ONLY sample data.
 *
 * Active only when `import.meta.env.DEV` and VITE_QSEAL_DEV_MOCKS=true and no
 * backend URL is set (see `backendMode`). Production builds can never reach
 * these code paths. Every value here is fictional and the UI labels it so.
 */
import type { ChatCompletionRequest, ChatCompletionResult, ModelInfo } from '@/types/api'
import { ApiError } from './errors'

const wait = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(t)
      reject(new ApiError('aborted', 'Request cancelled.'))
    })
  })

export async function mockModels(): Promise<ModelInfo[]> {
  await wait(400)
  return ['sample-model-small', 'sample-model-large'].map((id) => ({ id, ownedBy: 'sample', raw: { id, sample: true } }))
}

export async function mockChat(req: ChatCompletionRequest, signal?: AbortSignal): Promise<ChatCompletionResult> {
  await wait(1400, signal)
  const raw = {
    sample: true,
    note: 'Development sample response. No backend was contacted.',
    model: req.model,
    choices: [{ message: { role: 'assistant', content: 'This is sample output generated locally for UI development.' } }],
  }
  return { text: raw.choices[0].message.content, model: req.model, status: 200, headers: {}, raw, latencyMs: 1400 }
}
