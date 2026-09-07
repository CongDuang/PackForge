import { useMemo } from 'react'
import type { BuildKind, VariantDiscovery } from '../shared/types'
import { buildGradleTaskName, composeFlavorPart } from '../shared/taskName'
import Button from './ui/Button'
import CompactSelect from './CompactSelect'

type VariantConfigProps = {
  module: string
  discovery: VariantDiscovery | null
  kind: BuildKind
  buildType: string
  flavorByDimension: Record<string, string>
  loading?: boolean
  error?: string
  onKindChange: (kind: BuildKind) => void
  onBuildTypeChange: (buildType: string) => void
  onFlavorChange: (dimension: string, flavor: string) => void
  onRefresh: () => void
}

export default function VariantConfig({
  module,
  discovery,
  kind,
  buildType,
  flavorByDimension,
  loading,
  error,
  onKindChange,
  onBuildTypeChange,
  onFlavorChange,
  onRefresh,
}: VariantConfigProps) {
  const flavorPart = useMemo(() => {
    if (!discovery) return ''
    return composeFlavorPart(discovery.flavorDimensions.map((dim) => flavorByDimension[dim.name] ?? dim.flavors[0] ?? ''))
  }, [discovery, flavorByDimension])

  const taskName = useMemo(
    () =>
      buildGradleTaskName({
        module: module || 'app',
        kind,
        flavorPart,
        buildType: buildType || 'Release',
      }),
    [module, kind, flavorPart, buildType],
  )

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <span className="block text-sm text-[var(--text-primary)]">产物类型</span>
          <div className="flex gap-1 rounded-md border border-[var(--border)] bg-[var(--bg-base)] p-0.5">
            <KindButton active={kind === 'assemble'} onClick={() => onKindChange('assemble')}>
              APK
            </KindButton>
            <KindButton active={kind === 'bundle'} onClick={() => onKindChange('bundle')}>
              AAB
            </KindButton>
          </div>
        </div>
        <CompactSelect
          id="build-type"
          label="Build Type"
          value={buildType}
          options={discovery?.buildTypes ?? []}
          disabled={loading || !discovery}
          onChange={onBuildTypeChange}
        />
        {(discovery?.flavorDimensions ?? []).map((dim) => (
          <CompactSelect
            key={dim.name}
            id={`flavor-${dim.name}`}
            label={dim.name}
            value={flavorByDimension[dim.name] ?? dim.flavors[0] ?? ''}
            options={dim.flavors}
            disabled={loading}
            onChange={(value) => onFlavorChange(dim.name, value)}
          />
        ))}
        <Button className="shrink-0" disabled={loading} onClick={onRefresh}>
          {loading ? '发现中…' : '刷新变体'}
        </Button>
      </div>

      <div className="space-y-1">
        <p className="text-xs text-[var(--text-muted)]">任务预览</p>
        <p className="font-mono text-sm text-[var(--accent)]">{taskName}</p>
      </div>

      {discovery?.source === 'static' || discovery?.warning ? (
        <p className="text-xs leading-5 text-[var(--warn)]">
          {discovery.warning ?? '回退解析，请核对'}
        </p>
      ) : null}
      {error ? <p className="text-xs leading-5 text-[var(--danger)]">{error}</p> : null}
    </div>
  )
}

function KindButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded px-3 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
        active
          ? 'bg-[var(--accent)] text-[var(--bg-base)]'
          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]',
      ].join(' ')}
    >
      {children}
    </button>
  )
}
