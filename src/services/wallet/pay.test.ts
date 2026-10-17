import { beforeEach, describe, expect, it, vi } from 'vitest'
import { preparePayment } from '../api/gateway'
import { signAndSend } from './wallet'
import { payFromWallet } from './pay'

vi.mock('../api/gateway', () => ({ preparePayment: vi.fn() }))
vi.mock('./wallet', () => ({ signAndSend: vi.fn() }))

const prepared = (n: number) => ({ transaction: `tx${n}`, reference: `ref${n}`, amount_usdc: 0.001, wallet_chain: 'solana:mainnet' })

beforeEach(() => {
  vi.mocked(preparePayment).mockReset().mockResolvedValueOnce(prepared(1) as never).mockResolvedValueOnce(prepared(2) as never)
  vi.mocked(signAndSend).mockReset()
})

describe('payFromWallet', () => {
  it('rebuilds and re-signs once when the transaction expired while the user was approving', async () => {
    vi.mocked(signAndSend).mockRejectedValueOnce(new Error('Blockhash not found')).mockResolvedValueOnce('sig2')
    await expect(payFromWallet('payer', { kind: 'request', model: 'm' })).resolves.toEqual({ signature: 'sig2', reference: 'ref2', amountUsdc: 0.001 })
    expect(signAndSend).toHaveBeenLastCalledWith('tx2', 'solana:mainnet')
  })

  it('does not retry a second expiry', async () => {
    vi.mocked(signAndSend).mockRejectedValue(new Error('TransactionExpiredBlockheightExceededError'))
    await expect(payFromWallet('payer', { kind: 'request', model: 'm' })).rejects.toThrow('The transaction expired before it was approved')
    expect(signAndSend).toHaveBeenCalledTimes(2)
  })

  it('does not retry when the user cancels or anything else fails', async () => {
    vi.mocked(signAndSend).mockRejectedValueOnce(new Error('Transaction cancelled in wallet'))
    await expect(payFromWallet('payer', { kind: 'request', model: 'm' })).rejects.toThrow('Transaction cancelled in wallet')
    expect(signAndSend).toHaveBeenCalledTimes(1)
    expect(preparePayment).toHaveBeenCalledTimes(1)
  })
})
