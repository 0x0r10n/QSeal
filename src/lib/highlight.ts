/**
 * A tiny, dependency-free highlighter for the handful of languages shown in
 * code samples. It is intentionally simple: strings, comments, keywords,
 * numbers, and a few punctuation classes.
 */
export type Lang = 'bash' | 'ts' | 'python' | 'json'
export interface Token {
  text: string
  kind: 'plain' | 'kw' | 'str' | 'com' | 'num' | 'fn' | 'key' | 'punc' | 'flag'
}

const KW: Record<Lang, Set<string>> = {
  ts: new Set('const let var await async function return import from export new if else true false null undefined'.split(' ')),
  python: new Set('import from def return await async with as if else True False None for in'.split(' ')),
  bash: new Set(['curl', 'export']),
  json: new Set(['true', 'false', 'null']),
}

const RULES: Array<[RegExp, Token['kind'] | ((m: string, lang: Lang) => Token['kind'])]> = [
  [/^(#[^\n]*|\/\/[^\n]*)/, (m, lang) => (lang === 'json' ? 'plain' : m.startsWith('//') && lang === 'bash' ? 'plain' : 'com')],
  [/^("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`)/, 'str'],
  [/^\s--?[a-zA-Z][\w-]*/, 'flag'],
  [/^\d+(\.\d+)?/, 'num'],
  [/^[A-Za-z_$][\w$]*(?=\s*\()/, 'fn'],
  [/^[A-Za-z_$][\w$]*/, 'plain'],
  [/^[{}[\]().,:;=\\]/, 'punc'],
  [/^\s+/, 'plain'],
  [/^./, 'plain'],
]

export function highlight(src: string, lang: Lang): Token[][] {
  return src.split('\n').map((line) => {
    const out: Token[] = []
    let rest = line
    while (rest.length) {
      for (const [re, kind] of RULES) {
        const m = re.exec(rest)
        if (!m) continue
        let k = typeof kind === 'function' ? kind(m[0], lang) : kind
        if (k === 'plain' && KW[lang].has(m[0])) k = 'kw'
        if (k === 'str' && lang === 'json' && /^\s*:/.test(rest.slice(m[0].length))) k = 'key'
        out.push({ text: m[0], kind: k })
        rest = rest.slice(m[0].length)
        break
      }
    }
    return out
  })
}
