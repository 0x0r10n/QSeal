import { motion } from 'motion/react'
import { useHealth, useReceiptStats } from '@/hooks/useGateway'
import { useModels } from '@/hooks/useModels'
import { backendMode } from '@/lib/env'
import { EASE } from '@/lib/motion'

const usdc = (n: number) => `${n < 0.01 ? n.toFixed(4).replace(/0+$/, '') : n.toFixed(2)} USDC`

/**
 * The hero's facts strip. With a connected gateway every value is live;
 * otherwise it describes the product instead of showing numbers.
 */
export function LiveFacts() {
  const health = useHealth()
  const models = useModels()
  const stats = useReceiptStats()
  const live = backendMode === 'live' && health.isSuccess

  const prices = (models.data ?? []).map((m) => m.priceUsdc).filter((p): p is number => p !== undefined)
  const from = prices.length ? Math.min(...prices) : health.data?.solana.price_per_request_usdc

  const facts: Array<[string, string]> = live
    ? [
        ['Network', `Solana ${health.data!.solana.network === 'mainnet-beta' ? 'mainnet' : 'devnet'} · x402`],
        ['Price', from !== undefined ? `From ${usdc(from)} per request` : 'Per request, in USDC'],
        ['Receipts', stats.data ? `${stats.data.totalReceiptsIssued.toLocaleString()} signed with ML-DSA-65` : 'ML-DSA-65 signed'],
      ]
    : [
        ['Interface', 'OpenAI-compatible endpoints'],
        ['Records', 'ML-DSA-65 signed receipts'],
        ['Payment', 'USDC on Solana · x402'],
      ]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.4, ease: EASE, delay: 1.2 }}
      className="mt-14 hidden max-w-[640px] border-t border-white/[0.07] pt-6 md:block"
    >
      {live && (
        <p className="eyebrow mb-4 flex items-center gap-2 !text-[10px]">
          <span className="size-1.5 animate-pulse-soft rounded-full bg-ok" aria-hidden /> Live from the gateway
        </p>
      )}
      <dl className="grid grid-cols-3 gap-8">
        {facts.map(([k, v]) => (
          <div key={k}>
            <dt className="eyebrow !text-[10px]">{k}</dt>
            <dd className="mt-2 text-[13.5px] leading-snug text-steel-200">{v}</dd>
          </div>
        ))}
      </dl>
    </motion.div>
  )
}
