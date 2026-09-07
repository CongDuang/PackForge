import type { ChangeEvent, KeyboardEvent } from 'react'

type TextFieldProps = {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  placeholder?: string
  multiline?: boolean
  hint?: string
}

export default function TextField({
  id,
  label,
  value,
  onChange,
  onBlur,
  onKeyDown,
  placeholder,
  multiline,
  hint,
}: TextFieldProps) {
  const fieldClass =
    'w-full rounded-md border border-[var(--border)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]'

  function handleChange(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    onChange(event.target.value)
  }

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm text-[var(--text-primary)]">
        {label}
      </label>
      {multiline ? (
        <textarea
          id={id}
          rows={3}
          value={value}
          onChange={handleChange}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className={`${fieldClass} resize-y font-mono`}
        />
      ) : (
        <input
          id={id}
          type="text"
          value={value}
          onChange={handleChange}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className={`${fieldClass} font-mono`}
        />
      )}
      {hint ? <p className="text-xs leading-5 text-[var(--text-muted)]">{hint}</p> : null}
    </div>
  )
}
