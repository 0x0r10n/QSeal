import { BookOpen, Boxes, History, KeyRound, LayoutGrid, Plus, ScanLine, Settings } from 'lucide-react'

export const APP_NAV = [
  { to: '/app', label: 'Dashboard', icon: LayoutGrid, end: true },
  { to: '/app/new', label: 'New Request', icon: Plus },
  { to: '/app/history', label: 'History', icon: History },
  { to: '/app/verify', label: 'Verify Receipt', icon: ScanLine },
  { to: '/app/models', label: 'Models', icon: Boxes },
  { to: '/app/keys', label: 'Prepaid Keys', icon: KeyRound },
] as const

export const APP_NAV_SECONDARY = [
  { to: '/docs', label: 'API Docs', icon: BookOpen, end: false },
  { to: '/app/settings', label: 'Settings', icon: Settings, end: false },
] as const
