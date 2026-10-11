/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler
const cases = require('./fixtures/bedrockLegacyScoreboardIdentity.json')
const paths = require('../../../data/dataPaths.json').bedrock

describe('Bedrock legacy scoreboard identity entry branches', function () {
  for (const dir of new Set(Object.values(paths).map(p => p.protocol).filter(Boolean))) {
    const { types } = require(`../../../data/${dir}/protocol.json`)
    if (!types.ScoreboardIdentityEntries) continue
    it(`${dir} appends entity IDs only when registering identities`, function () {
      const proto = new ProtoDef(false)
      const [read, write, size] = proto.types.varint64
      const encode = n => (n << 1n) ^ (n >> 63n)
      const zz = [
        (buffer, offset) => { const r = read(buffer, offset); return { value: (r.value >> 1n) ^ -(r.value & 1n), size: r.size } },
        (value, buffer, offset) => write(encode(value), buffer, offset),
        value => size(encode(value))
      ]
      const definitions = { ScoreboardIdentityEntries: types.ScoreboardIdentityEntries, probe: types.packet_set_scoreboard_identity }
      const compiler = new ProtoDefCompiler()
      compiler.addTypes({ Read: { zigzag64: ['native', zz[0]] }, Write: { zigzag64: ['native', zz[1]] }, SizeOf: { zigzag64: ['native', zz[2]] } })
      compiler.addTypesToCompile(definitions)
      const codec = compiler.compileProtoDefSync()
      for (const c of cases) {
        const entries = c.entries.map(e => ({ ...e, scoreboard_id: BigInt(e.scoreboard_id), entity_unique_id: e.entity_unique_id === undefined ? undefined : BigInt(e.entity_unique_id) }))
        const action = c.action === 'register_identity' ? 'TYPE_REGISTER_IDENTITY' : 'TYPE_CLEAR_IDENTITY'
        const expected = { entries: { type: action, entries } }, wire = Buffer.from(c.body, 'hex')
        const parsed = codec.parsePacketBuffer('probe', wire)
        assert.strictEqual(parsed.metadata.size, wire.length, c.name)
        assert.deepStrictEqual(parsed.data, expected, c.name)
        assert.deepStrictEqual(codec.createPacketBuffer('probe', expected), wire, c.name)
      }
    })
  }
})
