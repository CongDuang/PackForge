import type { ButtonHTMLAttributes } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'danger'
}

const skins = {
  primary: 'bg-[var(--accent)] text-[var(--bg-base)] hover:bg-[var(--accent-dim)]',
  danger: 'bg-[var(--danger)] text-[var(--bg-base)] hover:opacity-90',
  ghost: 'border border-[var(--border)] bg-[var(--bg-panel)] text-[var(--text-primary)] hover:bg-[var(--bg-base)]',
}

export default function Button({
  variant = 'ghost',
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={[
        'cursor-pointer rounded-md px-3 py-2 text-sm outline-none',
        'focus-visible:ring-2',
        variant === 'danger'
          ? 'focus-visible:ring-[var(--danger)]'
          : 'focus-visible:ring-[var(--accent)]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        skins[variant],
        className,
      ].join(' ')}
      {...props}
    />
  )
}
