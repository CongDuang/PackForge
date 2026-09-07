import type { SigningProfileMeta } from '../shared/types'
import CompactSelect from './CompactSelect'

type SigningSelectProps = {
  profiles: SigningProfileMeta[]
  value: string
  disabled?: boolean
  onChange: (profileId: string) => void
}

export default function SigningSelect({ profiles, value, disabled, onChange }: SigningSelectProps) {
  return (
    <div className="space-y-1.5">
      <CompactSelect
        id="signing-select"
        label="签名"
        value={value}
        disabled={disabled}
        options={[
          { value: '', label: '不使用签名注入' },
          ...profiles.map((profile) => ({
            value: profile.id,
            label: profile.name,
          })),
        ]}
        onChange={onChange}
      />
      {value ? (
        <p className="truncate font-mono text-xs leading-5 text-[var(--text-muted)]">
          {profiles.find((item) => item.id === value)?.storeFile ?? ''}
        </p>
      ) : (
        <p className="text-xs leading-5 text-[var(--text-muted)]">将不附加 android.injected.signing 参数</p>
      )}
    </div>
  )
}
