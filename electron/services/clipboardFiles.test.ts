import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { filenamesPlistXml } from './filenamesPlist.ts'

describe('filenamesPlistXml', () => {
  it('serializes paths into a plist array', () => {
    const xml = filenamesPlistXml(['/tmp/a.apk', '/tmp/b & c.aab'])
    assert.match(xml, /<!DOCTYPE plist/)
    assert.match(xml, /<string>\/tmp\/a\.apk<\/string>/)
    assert.match(xml, /<string>\/tmp\/b &amp; c\.aab<\/string>/)
    assert.match(xml, /<\/plist>/)
  })
})
