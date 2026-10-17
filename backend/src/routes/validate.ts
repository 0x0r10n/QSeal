import { config } from '../config.js';
import { isAvailable } from '../catalogue.js';
import type { ChatMessage, CompletionRequest } from '../router/modelRouter.js';

const ROLES = new Set(['system', 'user', 'assistant']);
const MAX_MESSAGES = 200;
const MAX_CHARS = 400_000;

export type Validated = { ok: true; request: CompletionRequest & { model: string } } | { ok: false; status: number; message: string; type: string };

const optNum = (v: unknown, min: number, max: number): number | undefined | null => {
  if (v === undefined || v === null) return undefined;
  return typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : null;
};

/** Validate an OpenAI-style chat body before anything is charged. */
export function validateChatBody(body: any): Validated {
  const bad = (message: string, type = 'invalid_request_error', status = 400): Validated => ({ ok: false, status, message, type });
  if (!body || typeof body !== 'object') return bad('Request body must be a JSON object');

  const model = body.model ?? config.defaultModel;
  if (typeof model !== 'string' || !isAvailable(model)) {
    return bad(`Model not available: ${String(model)}. See GET /v1/models.`, 'model_not_found', 404);
  }

  const messages = body.messages;
  if (!Array.isArray(messages) || messages.length === 0) return bad('messages must be a non-empty array');
  if (messages.length > MAX_MESSAGES) return bad(`Too many messages (max ${MAX_MESSAGES})`);
  let chars = 0;
  for (const m of messages) {
    if (!m || typeof m !== 'object' || !ROLES.has(m.role) || typeof m.content !== 'string') {
      return bad('Each message needs a role (system, user or assistant) and string content');
    }
    chars += m.content.length;
  }
  if (chars > MAX_CHARS) return bad(`Messages are too long (max ${MAX_CHARS} characters in total)`, 'invalid_request_error', 413);

  const temperature = optNum(body.temperature, 0, 2);
  const max_tokens = optNum(body.max_tokens, 1, 32_768);
  const top_p = optNum(body.top_p, 0, 1);
  if (temperature === null) return bad('temperature must be a number between 0 and 2');
  if (max_tokens === null) return bad('max_tokens must be a number between 1 and 32768');
  if (top_p === null) return bad('top_p must be a number between 0 and 1');

  return {
    ok: true,
    request: {
      model,
      messages: messages.map((m: ChatMessage) => ({ role: m.role, content: m.content })),
      temperature,
      max_tokens: max_tokens === undefined ? undefined : Math.floor(max_tokens),
      top_p,
      stream: body.stream === true,
    },
  };
}
