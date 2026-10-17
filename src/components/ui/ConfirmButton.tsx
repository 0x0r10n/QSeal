import { useEffect, useState, type ReactNode } from 'react'
import { Button } from './Button'

/** Two-step destructive action: the first press arms it, the second confirms. */
export function ConfirmButton({
  children,
  confirmLabel = 'Click again to confirm',
  onConfirm,
  variant = 'ghost',
  disabled,
}: {
  children: ReactNode
  confirmLabel?: string
  onConfirm: () => void
  variant?: 'ghost' | 'danger'
  disabled?: boolean
}) {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), 4000)
    return () => clearTimeout(t)
  }, [armed])
  return (
    <Button
      variant={armed ? 'danger' : variant}
      size="sm"
      disabled={disabled}
      onClick={() => {
        if (armed) {
          setArmed(false)
          onConfirm()
        } else setArmed(true)
      }}
      onBlur={() => setArmed(false)}
    >
      <span aria-live="polite" className="inline-flex items-center gap-2">{armed ? confirmLabel : children}</span>
    </Button>
  )
}
