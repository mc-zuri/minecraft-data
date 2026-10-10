/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler
const paths = require('../../../data/dataPaths.json').bedrock

describe('Bedrock armor slot bitset', function () {
  for (const dir of new Set(Object.values(paths).map(p => p.protocol).filter(Boolean))) {
    const { types } = require(`../../../data/${dir}/protocol.json`)
    const field = types.packet_hurt_armor?.[1].find(f => f.name === 'armor_slots')
    if (!field) continue // The mask was introduced in 1.17.30.
    it(`${dir} preserves unsigned slot bits without ZigZag`, function () {
      assert.strictEqual(field.type, 'varint64')
      const definitions = { probe: ['container', [field]] }
      const proto = new ProtoDef(false)
      proto.addTypes(definitions)
      const compiler = new ProtoDefCompiler()
      compiler.addTypesToCompile(definitions)
      const compiled = compiler.compileProtoDefSync()
      // High values are wire-boundary probes, not existing equipment slots.
      for (const [mask, hex] of [[0n, '00'], [1n, '01'], [2n, '02'], [4n, '04'], [8n, '08'], [16n, '10'], [31n, '1f'], [127n, '7f'], [128n, '8001'], [16383n, 'ff7f'], [16384n, '808001'], [9007199254740991n, 'ffffffffffffff0f'], [9007199254740992n, '8080808080808010'], [18446744073709551615n, 'ffffffffffffffffff01']]) {
        const value = { armor_slots: mask }
        const wire = Buffer.from(hex, 'hex')
        for (const codec of [proto, compiled]) {
          assert.deepStrictEqual(codec.createPacketBuffer('probe', value), wire)
          const parsed = codec.parsePacketBuffer('probe', wire)
          assert.deepStrictEqual(parsed.data, value)
          assert.strictEqual(parsed.metadata.size, wire.length)
        }
      }
    })
  }
})
