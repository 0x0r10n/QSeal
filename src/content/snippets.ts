import type { Lang } from '@/lib/highlight'

/**
 * Illustrative samples. They assume the OpenAI-compatible request shape for
 * POST /v1/chat/completions and have NOT been run against a live service.
 * The Authorization header is a placeholder until the auth scheme is confirmed.
 */
export const SNIPPETS: Array<{ id: string; label: string; file: string; lang: Lang; code: string }> = [
  {
    id: 'curl',
    label: 'cURL',
    file: 'request.sh',
    lang: 'bash',
    code: `# Illustrative — confirm fields and auth in the API reference.
curl "$QSEAL_API_URL/v1/chat/completions" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $QSEAL_KEY" \\
  -d '{
    "model": "<model id from /v1/models>",
    "messages": [
      { "role": "user", "content": "Summarise this contract." }
    ]
  }'`,
  },
  {
    id: 'ts',
    label: 'TypeScript',
    file: 'request.ts',
    lang: 'ts',
    code: `// Illustrative — confirm fields and auth in the API reference.
const res = await fetch(\`\${process.env.QSEAL_API_URL}/v1/chat/completions\`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: \`Bearer \${process.env.QSEAL_KEY}\`,
  },
  body: JSON.stringify({
    model: "<model id from /v1/models>",
    messages: [{ role: "user", content: "Summarise this contract." }],
  }),
})

const completion = await res.json()`,
  },
  {
    id: 'python',
    label: 'Python',
    file: 'request.py',
    lang: 'python',
    code: `# Illustrative — confirm fields and auth in the API reference.
import os, httpx

res = httpx.post(
    f"{os.environ['QSEAL_API_URL']}/v1/chat/completions",
    headers={"Authorization": f"Bearer {os.environ['QSEAL_KEY']}"},
    json={
        "model": "<model id from /v1/models>",
        "messages": [{"role": "user", "content": "Summarise this contract."}],
    },
)

completion = res.json()`,
  },
]
