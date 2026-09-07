import TextField from './ui/TextField'

type ModuleSelectProps = {
  modules: string[]
  value: string
  parseWarning?: string
  disabled?: boolean
  onChange: (module: string) => void
}

export default function ModuleSelect({
  modules,
  value,
  parseWarning,
  disabled,
  onChange,
}: ModuleSelectProps) {
  const manual = modules.length === 0

  return (
    <div className="space-y-2">
      {manual ? (
        <TextField
          id="module-name"
          label="模块"
          value={value}
          placeholder="app"
          hint={parseWarning ?? '未能列出模块，请手动填写，例如 app 或 feature:login'}
          onChange={onChange}
        />
      ) : (
        <div className="space-y-1.5">
          <label htmlFor="module-select" className="block text-sm text-[var(--text-primary)]">
            模块
          </label>
          <div className="relative inline-block max-w-full">
            <select
              id="module-select"
              value={value}
              disabled={disabled}
              onChange={(event) => onChange(event.target.value)}
              className="field-sizing-content w-max max-w-full appearance-none rounded-md border border-[var(--border)] bg-[var(--bg-base)] py-2 pr-8 pl-3 font-mono text-sm text-[var(--text-primary)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50"
            >
              {modules.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-[var(--text-muted)]"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2.5 4.5 6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>
          {parseWarning ? (
            <p className="text-xs leading-5 text-[var(--warn)]">{parseWarning}</p>
          ) : (
            <p className="text-xs leading-5 text-[var(--text-muted)]">
              任务将使用 :{value || 'app'}:assemble… / :{value || 'app'}:bundle…
            </p>
          )}
        </div>
      )}
    </div>
  )
}
