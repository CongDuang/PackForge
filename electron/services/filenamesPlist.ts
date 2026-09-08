/** 生成 NSFilenamesPboardType 用的 plist XML（纯函数，便于单测）。 */
export function filenamesPlistXml(absolutePaths: string[]): string {
  const items = absolutePaths
    .map((file) => {
      const escaped = file
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
      return `\t\t<string>${escaped}</string>`
    })
    .join('\n')
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
    '<plist version="1.0">',
    '\t<array>',
    items,
    '\t</array>',
    '</plist>',
    '',
  ].join('\n')
}
