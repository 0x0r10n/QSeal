import crypto from 'crypto';
import { config, hasUpstream } from '../config.js';
import { upstreamModelFor } from '../catalogue.js';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CompletionRequest {
  model?: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stream?: boolean;
}

export interface CompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: { role: 'assistant'; content: string };
    finish_reason: string;
  }>;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  provider?: string;
}

export class UpstreamError extends Error {
  constructor(message: string, readonly status = 502) {
    super(message);
  }
}

const estimateTokens = (s: string) => Math.max(1, Math.ceil(s.length / 4));

export class ModelRouter {
  public static async execute(request: CompletionRequest): Promise<{ response: CompletionResponse; content: string }> {
    const requestedModel = request.model || config.defaultModel;
    const upstreamModel = upstreamModelFor(requestedModel);
    if (!upstreamModel) throw new UpstreamError(`Model not available: ${requestedModel}`, 400);

    if (!hasUpstream()) {
      if (config.allowDevBypass) return this.devEngine(request.messages, requestedModel);
      throw new UpstreamError('No model provider is configured on this gateway', 503);
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.upstreamApiKey}`,
    };
    if (config.upstreamProvider === 'openrouter') {
      headers['HTTP-Referer'] = process.env.PUBLIC_URL || 'https://qseal.ai';
      headers['X-Title'] = 'QSeal';
    }

    let res: Response;
    try {
      res = await fetch(`${config.upstreamBaseUrl!.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers,
        signal: AbortSignal.timeout(config.upstreamTimeoutMs),
        body: JSON.stringify({
          model: upstreamModel,
          messages: request.messages,
          ...(request.temperature !== undefined ? { temperature: request.temperature } : {}),
          ...(request.max_tokens !== undefined ? { max_tokens: request.max_tokens } : {}),
          ...(request.top_p !== undefined ? { top_p: request.top_p } : {}),
          stream: false,
        }),
      });
    } catch (err: any) {
      // Never log request content; the error message carries no prompt text.
      console.warn(`[ModelRouter] Upstream ${config.upstreamProvider} unreachable: ${err?.name || 'error'}`);
      throw new UpstreamError(err?.name === 'TimeoutError' ? 'Model provider timed out' : 'Model provider unreachable', 502);
    }

    if (!res.ok) {
      console.warn(`[ModelRouter] Upstream ${config.upstreamProvider} returned ${res.status}`);
      throw new UpstreamError(
        res.status === 429 ? 'Model provider is rate limiting requests; try again shortly' : `Model provider error (${res.status})`,
        res.status === 429 ? 503 : 502,
      );
    }

    const data = (await res.json()) as any;
    const text: string = data?.choices?.[0]?.message?.content ?? '';
    const promptTokens = data?.usage?.prompt_tokens ?? estimateTokens(JSON.stringify(request.messages));
    const completionTokens = data?.usage?.completion_tokens ?? estimateTokens(text);

    return {
      content: text,
      response: {
        id: data?.id || `chatcmpl-${crypto.randomUUID().replace(/-/g, '')}`,
        object: 'chat.completion',
        created: data?.created || Math.floor(Date.now() / 1000),
        model: requestedModel,
        choices: [
          { index: 0, message: { role: 'assistant', content: text }, finish_reason: data?.choices?.[0]?.finish_reason || 'stop' },
        ],
        usage: {
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: data?.usage?.total_tokens ?? promptTokens + completionTokens,
        },
        provider: config.upstreamProvider,
      },
    };
  }

  /** Development only: a clearly labelled echo so the full flow can run without a provider. */
  private static devEngine(messages: ChatMessage[], model: string) {
    const last = messages[messages.length - 1]?.content ?? '';
    const content =
      `[QSeal dev engine: no model provider is configured, so this is not a model response.]\n\n` +
      `Model requested: ${model}\nYour last message (${last.length} characters) was received and processed.`;
    const promptTokens = estimateTokens(messages.map((m) => m.content).join(' '));
    const completionTokens = estimateTokens(content);
    const response: CompletionResponse = {
      id: `chatcmpl-${crypto.randomUUID().replace(/-/g, '')}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }],
      usage: { prompt_tokens: promptTokens, completion_tokens: completionTokens, total_tokens: promptTokens + completionTokens },
      provider: 'dev-engine',
    };
    return { response, content };
  }
}
