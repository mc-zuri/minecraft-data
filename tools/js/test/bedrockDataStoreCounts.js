/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler
const paths = require('../../../data/dataPaths.json').bedrock

describe('Bedrock data store update counters', function () {
  for (const dir of new Set(Object.values(paths).map(p => p.protocol).filter(Boolean))) {
    const { types } = require(`../../../data/${dir}/protocol.json`)
    const packet = types.packet_serverbound_data_store
    if (!packet) continue
    it(`${dir} keeps update counters fixed-width and unsigned`, function () {
      const fields = packet[1].filter(f => ['update_count', 'path_update_count'].includes(f.name))
      assert.strictEqual(fields.length, dir.endsWith('/1.21.130') ? 1 : 2)
      const definitions = { probe: ['container', [...fields, { name: 'sentinel', type: 'u8' }]] }
      const proto = new ProtoDef(false)
      proto.addTypes(definitions)
      const compiler = new ProtoDefCompiler()
      compiler.addTypesToCompile(definitions)
      const compiled = compiler.compileProtoDefSync()
      for (const [value, hex] of [[0, '00000000'], [1, '01000000'], [0x12345678, '78563412'], [2147483648, '00000080'], [4294967294, 'feffffff']]) {
        // Change each counter independently to catch swapped fields as well
        // as VarInt widths, signed decoding, and incorrect endianness.
        for (const target of fields) {
          const input = Object.fromEntries(fields.map(f => [f.name, f === target ? value : 1]))
          input.sentinel = 0xa5
          const wire = Buffer.from(fields.map(f => f === target ? hex : '01000000').join('') + 'a5', 'hex')
          for (const codec of [proto, compiled]) {
            assert.deepStrictEqual(codec.createPacketBuffer('probe', input), wire)
            const parsed = codec.parsePacketBuffer('probe', wire)
            assert.deepStrictEqual(parsed.data, input)
            assert.strictEqual(parsed.metadata.size, wire.length)
          }
        }
      }
    })
  }
})
