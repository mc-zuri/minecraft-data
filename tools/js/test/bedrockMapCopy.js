/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler
const paths = require('../../../data/dataPaths.json').bedrock

describe('Bedrock locked map copies', function () {
  for (const dir of new Set(Object.values(paths).map(p => p.protocol).filter(Boolean))) {
    const { types } = require(`../../../data/${dir}/protocol.json`)
    const packet = types.packet_map_create_locked_copy
    if (!packet) continue
    it(`${dir} preserves both signed map IDs`, function () {
      const proto = new ProtoDef(false)
      const [read, write, size] = proto.types.varint64
      const encode = n => (n << 1n) ^ (n >> 63n)
      proto.addType('zigzag64', [
        (buffer, offset) => { const r = read(buffer, offset); return { value: (r.value >> 1n) ^ -(r.value & 1n), size: r.size } },
        (value, buffer, offset) => write(encode(value), buffer, offset),
        value => size(encode(value))
      ])
      proto.addType('probe', packet)
      const compiler = new ProtoDefCompiler()
      compiler.addTypesToCompile({ probe: packet })
      compiler.addTypes({ Read: { zigzag64: ['native', proto.types.zigzag64[0]] }, Write: { zigzag64: ['native', proto.types.zigzag64[1]] }, SizeOf: { zigzag64: ['native', proto.types.zigzag64[2]] } })
      const compiled = compiler.compileProtoDefSync()
      for (const [id, hex] of [[0n, '00'], [1n, '02'], [-1n, '01'], [63n, '7e'], [64n, '8001'], [-64n, '7f'], [-65n, '8101'], [8191n, 'fe7f'], [8192n, '808001'], [9007199254740992n, '8080808080808020'], [9223372036854775807n, 'feffffffffffffffff01'], [-9223372036854775808n, 'ffffffffffffffffff01']]) {
        for (const first of [true, false]) {
          const value = { original_map_id: first ? id : 1n, new_map_id: first ? 1n : id }
          const wire = Buffer.from(first ? hex + '02' : '02' + hex, 'hex')
          for (const codec of [proto, compiled]) {
            assert.deepStrictEqual(codec.createPacketBuffer('probe', value), wire)
            const parsed = codec.parsePacketBuffer('probe', wire)
            assert.deepStrictEqual(parsed.data, value)
            assert.strictEqual(parsed.metadata.size, wire.length)
          }
        }
      }
    })
  }
})
