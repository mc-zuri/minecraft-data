/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler
const paths = require('../../../data/dataPaths.json').bedrock

describe('Bedrock unsigned block synchronization IDs', function () {
  for (const version of [...new Set(Object.values(paths).map(p => p.protocol))].filter(p => /^bedrock\/1\./.test(p))) {
    it(`${version} preserves the entity ID in both synchronization layouts`, function () {
      const { types } = require(`../../../data/${version}/protocol.json`)
      const fields = [types.packet_update_block_synced[1].find(f => ['entity_unique_id', 'unknown0'].includes(f.name))]
      if (types.BlockUpdate) fields.push(types.BlockUpdate[1].find(f => f.name === 'entity_unique_id'))
      for (const field of fields) {
        assert.ok(field)
        const proto = new ProtoDef(false)
        const [read, write, size] = proto.types.varint64
        const encode = n => (n << 1n) ^ (n >> 63n)
        const zz = [(buffer, offset) => { const r = read(buffer, offset); return { value: (r.value >> 1n) ^ -(r.value & 1n), size: r.size } }, (value, buffer, offset) => write(encode(value), buffer, offset), value => size(encode(value))]
        proto.addType('zigzag64', zz)
        const definitions = { probe: field.type }
        proto.addTypes(definitions)
        const compiler = new ProtoDefCompiler()
        compiler.addTypes({ Read: { zigzag64: ['native', zz[0]] }, Write: { zigzag64: ['native', zz[1]] }, SizeOf: { zigzag64: ['native', zz[2]] } })
        compiler.addTypesToCompile(definitions)
        for (const codec of [proto, compiler.compileProtoDefSync()]) {
          for (const [value, hex] of [[0n, '00'], [1n, '01'], [127n, '7f'], [128n, '8001'], [256n, '8002'], [4294967295n, 'ffffffff0f'], [4294967296n, '8080808010'], [9007199254740993n, '8180808080808010'], [9223372036854775808n, '80808080808080808001'], [18446744073709551615n, 'ffffffffffffffffff01']]) {
            const wire = Buffer.from(hex, 'hex')
            assert.deepStrictEqual(codec.createPacketBuffer('probe', value), wire)
            const parsed = codec.parsePacketBuffer('probe', wire)
            assert.strictEqual(parsed.data, value)
            assert.strictEqual(parsed.metadata.size, wire.length)
          }
        }
      }
    })
  }
})
