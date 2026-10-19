import type { ButtonHTMLAttributes, ReactNode } from 'react'

export type IconName = 'pin' | 'unpin' | 'trash' | 'copy' | 'clear' | 'collapse' | 'expand' | 'refresh'

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  label: string
  icon: IconName
  tone?: 'default' | 'danger' | 'plain'
}

const icons: Record<IconName, ReactNode> = {
  pin: (
    <>
      <path d="M12 17v5" />
      <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1z" />
    </>
  ),
  unpin: (
    <>
      <path d="M12 17v5" />
      <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1z" />
      <path d="M4 4 20 20" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </>
  ),
  clear: (
    <>
      <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
      <path d="M22 21H7" />
      <path d="m5 11 9 9" />
    </>
  ),
  collapse: <path d="m18 15-6-6-6 6" />,
  expand: <path d="m6 9 6 6 6-6" />,
  refresh: (
    <>
      <path d="M21 12a9 9 0 1 1-2.64-6.36L21 8" />
      <path d="M21 3v5h-5" />
    </>
  ),
}

export default function IconButton({
  label,
  icon,
  tone = 'default',
  className = '',
  type = 'button',
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      title={label}
      aria-label={label}
      className={[
        'inline-flex shrink-0 cursor-pointer items-center justify-center outline-none',
        'focus-visible:ring-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        tone === 'plain'
          ? 'h-6 w-6 text-[var(--text-muted)] hover:text-[var(--text-primary)] focus-visible:ring-[var(--accent)]'
          : tone === 'danger'
            ? 'h-8 w-8 rounded-md border border-[var(--danger)]/50 text-[var(--danger)] hover:bg-[var(--danger)]/10 focus-visible:ring-[var(--danger)]'
            : 'h-8 w-8 rounded-md border border-[var(--border)] bg-[var(--bg-panel)] text-[var(--text-primary)] hover:bg-[var(--bg-base)] focus-visible:ring-[var(--accent)]',
        className,
      ].join(' ')}
      {...props}
    >
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {icons[icon]}
      </svg>
    </button>
  )
}
