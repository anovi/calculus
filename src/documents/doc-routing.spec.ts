import assert from 'node:assert'
import { readDocumentIdFromHash } from './doc-routing'

describe('doc-routing', () => {
  it('reads a document id from a valid hash', () => {
    assert.strictEqual(readDocumentIdFromHash('#doc=abc-123'), 'abc-123')
    assert.strictEqual(readDocumentIdFromHash('#doc=hello%2Fworld'), 'hello/world')
  })

  it('returns null for invalid hashes', () => {
    assert.strictEqual(readDocumentIdFromHash(''), null)
    assert.strictEqual(readDocumentIdFromHash('#foo=bar'), null)
    assert.strictEqual(readDocumentIdFromHash('#doc='), null)
    assert.strictEqual(readDocumentIdFromHash('#doc=%E0%A4%A'), null)
  })
})
