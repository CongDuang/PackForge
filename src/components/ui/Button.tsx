import type { ButtonHTMLAttributes } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost'
}

export default function Button({
  variant = 'ghost',
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  const skin =
    variant === 'primary'
      ? 'bg-[var(--accent)] text-[var(--bg-base)] hover:bg-[var(--accent-dim)]'
      : 'border border-[var(--border)] bg-[var(--bg-panel)] text-[var(--text-primary)] hover:bg-[var(--bg-base)]'

  return (
    <button
      type={type}
      className={[
        'rounded-md px-3 py-2 text-sm outline-none',
        'focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        skin,
        className,
      ].join(' ')}
      {...props}
    />
  )
}
