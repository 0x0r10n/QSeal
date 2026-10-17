import { request } from './client'

export interface TrialStatus {
  identifier: string
  remaining: number
  used: number
  total: number
}

export async function getTrialStatus(walletAddress?: string): Promise<TrialStatus> {
  const query = walletAddress ? `?wallet=${encodeURIComponent(walletAddress)}` : ''
  const res = await request<TrialStatus>(`/v1/trial/status${query}`, { method: 'GET', auth: false })
  return res.data
}
