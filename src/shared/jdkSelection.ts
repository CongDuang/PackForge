/** 工程有仍在登记里的记录就用它，否则用全局默认。失效记录不在这里改写。 */
export function resolveProjectJdk(
  cachedId: string | undefined,
  installs: { id: string }[],
  defaultId: string | null,
): string {
  if (cachedId && installs.some((item) => item.id === cachedId)) return cachedId
  if (defaultId && installs.some((item) => item.id === defaultId)) return defaultId
  return ''
}
