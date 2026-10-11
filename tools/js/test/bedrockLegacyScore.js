/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler
const cases = require('./fixtures/bedrockLegacyScore.json')
const paths = require('../../../data/dataPaths.json').bedrock

describe('Bedrock legacy scoreboard entry branches', function () {
  for (const dir of new Set(Object.values(paths).map(p => p.protocol).filter(Boolean))) {
    const { types } = require(`../../../data/${dir}/protocol.json`)
    if (!types.ScoreEntries) continue
    it(`${dir} appends identity data only when changing scores`, function () {
      const proto = new ProtoDef(false)
      const [read, write, size] = proto.types.varint64
      const encode = n => (n << 1n) ^ (n >> 63n)
      const zz = [
        (buffer, offset) => { const r = read(buffer, offset); return { value: (r.value >> 1n) ^ -(r.value & 1n), size: r.size } },
        (value, buffer, offset) => write(encode(value), buffer, offset),
        value => size(encode(value))
      ]
      const definitions = { string: types.string, ScoreEntries: types.ScoreEntries, probe: types.packet_set_score }
      const compiler = new ProtoDefCompiler()
      compiler.addTypes({ Read: { zigzag64: ['native', zz[0]] }, Write: { zigzag64: ['native', zz[1]] }, SizeOf: { zigzag64: ['native', zz[2]] } })
      compiler.addTypesToCompile(definitions)
      const codec = compiler.compileProtoDefSync()
      for (const c of cases) {
        const entries = c.entries.map(e => ({ ...e, scoreboard_id: BigInt(e.scoreboard_id), ...(c.action === 'change' ? {
          entity_unique_id: e.entity_unique_id === undefined ? undefined : BigInt(e.entity_unique_id), custom_name: e.custom_name
        } : {}) }))
        const expected = { entries: { type: c.action, entries } }, wire = Buffer.from(c.body, 'hex')
        const parsed = codec.parsePacketBuffer('probe', wire)
        assert.strictEqual(parsed.metadata.size, wire.length, c.name)
        assert.deepStrictEqual(parsed.data, expected, c.name)
        assert.deepStrictEqual(codec.createPacketBuffer('probe', expected), wire, c.name)
      }
    })
  }
})
