import type { JdkInstall } from '../shared/types'
import CompactSelect from './CompactSelect'

type JdkSelectProps = {
  installs: JdkInstall[]
  value: string
  disabled?: boolean
  onChange: (jdkId: string) => void
}

function lastPathSegment(homePath: string): string {
  return homePath.split(/[/\\]/).filter(Boolean).at(-1) ?? homePath
}

function jdkLabel(install: JdkInstall, installs: JdkInstall[]): string {
  const collided = installs.filter((item) => item.name === install.name).length > 1
  return collided ? `${install.name} · ${lastPathSegment(install.homePath)}` : install.name
}

export default function JdkSelect({ installs, value, disabled, onChange }: JdkSelectProps) {
  const empty = installs.length === 0
  return (
    <div className="space-y-1.5">
      <CompactSelect
        id="jdk-select"
        label="JDK"
        value={value}
        disabled={disabled || empty}
        options={installs.map((install) => ({
          value: install.id,
          label: jdkLabel(install, installs),
        }))}
        onChange={onChange}
      />
      {empty ? (
        <p className="text-xs leading-5 text-[var(--warn)]">请到 JDK 管理导入本机安装目录</p>
      ) : (
        <p className="truncate font-mono text-xs leading-5 text-[var(--text-muted)]" title={value}>
          {installs.find((item) => item.id === value)?.homePath ?? ''}
        </p>
      )}
    </div>
  )
}
