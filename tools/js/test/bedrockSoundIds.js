/* eslint-env mocha */
const assert = require('assert')
const { ProtoDefCompiler } = require('protodef').Compiler
const paths = require('../../../data/dataPaths.json').bedrock

describe('Bedrock unnamed sound IDs retain their numeric identity', function () {
  for (const path of [...new Set(Object.values(paths).map(p => p.protocol))].filter(Boolean)) {
    const { types } = require(`../../../data/${path}/protocol.json`)
    if (types.SoundType?.[0] !== 'mapper') continue
    it(`${path} round-trips every mapped sound ID`, function () {
      const compiler = new ProtoDefCompiler()
      compiler.addTypesToCompile({ SoundType: types.SoundType })
      const codec = compiler.compileProtoDefSync()
      for (const [id, name] of Object.entries(types.SoundType[1].mappings)) {
        let n = Number(id)
        const bytes = []
        do { const next = n >>> 7; bytes.push((n & 127) | (next ? 128 : 0)); n = next } while (n)
        const raw = Buffer.from(bytes)
        const parsed = codec.parsePacketBuffer('SoundType', raw)
        assert.strictEqual(parsed.metadata.size, raw.length)
        assert.notStrictEqual(parsed.data, '_', `unnamed sound ${id} must retain its ID`)
        assert.strictEqual(parsed.data, /^\d+$/.test(name) ? Number(id) : name)
        assert.deepStrictEqual(codec.createPacketBuffer('SoundType', parsed.data), raw, `sound ${id}: ${name}`)
      }
    })
  }
})
