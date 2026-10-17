import type { Lang } from '@/lib/highlight'

/**
 * Code samples shown on the site. Each one was run against the gateway in
 * backend/ with a prepaid key. Keep them in sync with backend/src/routes.
 */
export const SNIPPETS: Array<{ id: string; label: string; file: string; lang: Lang; code: string }> = [
  {
    id: 'ts',
    label: 'OpenAI SDK',
    file: 'qseal.ts',
    lang: 'ts',
    code: `import OpenAI from "openai"

const qseal = new OpenAI({
  baseURL: \`\${process.env.QSEAL_API_URL}/v1\`,
  apiKey: process.env.QSEAL_KEY, // your prepaid key (qseal_sk_…)
})

const completion = await qseal.chat.completions.create({
  model: "qseal-quantum-70b",
  messages: [{ role: "user", content: "Summarise this contract." }],
})

console.log(completion.choices[0].message.content)
console.log(completion.qseal_receipt.id) // signed ML-DSA-65 + Ed25519 receipt`,
  },
  {
    id: 'python',
    label: 'Python',
    file: 'qseal.py',
    lang: 'python',
    code: `import os
from openai import OpenAI

qseal = OpenAI(
    base_url=f"{os.environ['QSEAL_API_URL']}/v1",
    api_key=os.environ["QSEAL_KEY"],  # your prepaid key (qseal_sk_…)
)

completion = qseal.chat.completions.create(
    model="qseal-quantum-70b",
    messages=[{"role": "user", "content": "Summarise this contract."}],
)

print(completion.choices[0].message.content)
print(completion.model_extra["qseal_receipt"]["id"])  # signed receipt`,
  },
  {
    id: 'curl',
    label: 'cURL',
    file: 'request.sh',
    lang: 'bash',
    code: `curl "$QSEAL_API_URL/v1/chat/completions" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $QSEAL_KEY" \\
  -d '{
    "model": "qseal-quantum-70b",
    "messages": [
      { "role": "user", "content": "Summarise this contract." }
    ]
  }'

# Verify the receipt that comes back
curl -X POST "$QSEAL_API_URL/v1/receipts/verify" \\
  -H "Content-Type: application/json" \\
  -d '{ "receipt_id": "rcpt_…" }'`,
  },
]
