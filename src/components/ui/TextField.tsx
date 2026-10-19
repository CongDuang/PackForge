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
  type?: 'text' | 'password' | 'number'
  /** 输入框后的单位，例如「秒」 */
  suffix?: string
  /** 覆盖输入框宽度；默认撑满一行 */
  inputClassName?: string
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
  type = 'text',
  suffix,
  inputClassName = 'w-full',
}: TextFieldProps) {
  const fieldClass = [
    inputClassName,
    'rounded-md border border-[var(--border)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
  ].join(' ')

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
      ) : suffix ? (
        <div className="flex items-center gap-2">
          <input
            id={id}
            type={type}
            autoComplete="off"
            value={value}
            onChange={handleChange}
            onBlur={onBlur}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            className={`${fieldClass} font-mono`}
          />
          <span className="select-none text-sm text-[var(--text-muted)]">{suffix}</span>
        </div>
      ) : (
        <input
          id={id}
          type={type}
          autoComplete="off"
          value={value}
          onChange={handleChange}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className={`${fieldClass} font-mono`}
        />
      )}
      {hint ? <p className="select-none text-xs leading-5 text-[var(--text-muted)]">{hint}</p> : null}
    </div>
  )
}
