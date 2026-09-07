export type CompactOption = string | { value: string; label: string }

type CompactSelectProps = {
  id: string
  label: string
  value: string
  options: CompactOption[]
  disabled?: boolean
  onChange: (value: string) => void
}

function optionValue(option: CompactOption): string {
  return typeof option === 'string' ? option : option.value
}

function optionLabel(option: CompactOption): string {
  return typeof option === 'string' ? option : option.label
}

export default function CompactSelect({
  id,
  label,
  value,
  options,
  disabled,
  onChange,
}: CompactSelectProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm text-[var(--text-primary)]">
        {label}
      </label>
      <div className="relative inline-block max-w-full">
        <select
          id={id}
          value={value}
          disabled={disabled || options.length === 0}
          onChange={(event) => onChange(event.target.value)}
          className="field-sizing-content w-max max-w-full appearance-none rounded-md border border-[var(--border)] bg-[var(--bg-base)] py-2 pr-8 pl-3 font-mono text-sm text-[var(--text-primary)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50"
        >
          {options.length === 0 ? (
            <option value="">—</option>
          ) : (
            options.map((option) => (
              <option key={optionValue(option)} value={optionValue(option)}>
                {optionLabel(option)}
              </option>
            ))
          )}
        </select>
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-[var(--text-muted)]"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M2.5 4.5 6 8l3.5-3.5"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>
    </div>
  )
}
