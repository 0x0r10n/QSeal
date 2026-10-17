import { useState, type ReactNode } from 'react'
import { Check, Copy } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { highlight, type Lang, type Token } from '@/lib/highlight'
import { cn } from '@/lib/cn'

const colors: Record<Token['kind'], string> = {
  plain: 'text-steel-200',
  kw: 'text-steel-50 font-medium',
  str: 'text-[#c9d3c2]',
  com: 'text-steel-500 italic',
  num: 'text-[#d8c7a6]',
  fn: 'text-[#c3cbe0]',
  key: 'text-[#c3cbe0]',
  punc: 'text-steel-500',
  flag: 'text-[#d8c7a6]',
}

export function CopyButton({ value, className, label = 'Copy code', children }: { value: string; className?: string; label?: string; children?: ReactNode }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      /* clipboard unavailable */
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? 'Copied' : label}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 text-xs text-steel-300 transition hover:border-white/20 hover:text-steel-50',
        className,
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={copied ? 'y' : 'n'}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.6 }}
          transition={{ duration: 0.18 }}
          className="inline-flex"
        >
          {copied ? <Check className="size-3.5 text-ok" /> : <Copy className="size-3.5" />}
        </motion.span>
      </AnimatePresence>
      <span aria-live="polite" className="min-w-0 truncate">{copied ? 'Copied' : children ?? 'Copy'}</span>
    </button>
  )
}

export function Code({ code, lang, className, lineNumbers = true }: { code: string; lang: Lang; className?: string; lineNumbers?: boolean }) {
  const lines = highlight(code, lang)
  return (
    <pre className={cn('scrollbar-thin overflow-x-auto font-mono text-[12.5px] leading-[1.75]', className)}>
      <code>
        {lines.map((line, i) => (
          <span key={i} className="block">
            {lineNumbers && (
              <span aria-hidden className="mr-5 inline-block w-5 select-none text-right text-steel-600">
                {i + 1}
              </span>
            )}
            {line.map((t, j) => (
              <span key={j} className={colors[t.kind]}>
                {t.text}
              </span>
            ))}
            {line.length === 0 && ' '}
          </span>
        ))}
      </code>
    </pre>
  )
}
