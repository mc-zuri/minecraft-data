/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler
const cases = require('./fixtures/bedrockPrimitiveShapes')

describe('Bedrock primitive shape payloads', function () {
  for (const version of ['1.26.20', '1.26.30', '1.26.40', '1.26.45', '1.26.51']) {
    it(`${version} reads each tagged variant and optional shape field`, function () {
      const { types } = require(`../../../data/bedrock/${version}/protocol.json`)
      const proto = new ProtoDef(false)
      const [read, write, size] = proto.types.varint
      const encode = n => ((n << 1) ^ (n >> 31)) >>> 0
      const zz = [(buffer, offset) => { const r = read(buffer, offset); return { value: (r.value >>> 1) ^ -(r.value & 1), size: r.size } }, (value, buffer, offset) => write(encode(value), buffer, offset), value => size(encode(value))]
      const [read64, write64, size64] = proto.types.varint64
      const encode64 = n => (n << 1n) ^ (n >> 63n)
      const zz64 = [(buffer, offset) => { const r = read64(buffer, offset); return { value: (r.value >> 1n) ^ -(r.value & 1n), size: r.size } }, (value, buffer, offset) => write64(encode64(value), buffer, offset), value => size64(encode64(value))]
      const definitions = Object.fromEntries(Object.entries(types).filter(([name]) => ['string', 'vec2f', 'vec3f', 'PrimitiveShape'].includes(name) || name.startsWith('Shape')))
      definitions.probe = types.packet_primitive_shapes
      proto.addType('zigzag32', zz)
      proto.addType('zigzag64', zz64)
      proto.addTypes(definitions)
      const compiler = new ProtoDefCompiler()
      compiler.addTypes({ Read: { zigzag32: ['native', zz[0]], zigzag64: ['native', zz64[0]] }, Write: { zigzag32: ['native', zz[1]], zigzag64: ['native', zz64[1]] }, SizeOf: { zigzag32: ['native', zz[2]], zigzag64: ['native', zz64[2]] } })
      compiler.addTypesToCompile(definitions)
      for (const codec of [proto, compiler.compileProtoDefSync()]) {
        for (const { id, params, wire } of cases(version)) {
          assert.deepStrictEqual(codec.createPacketBuffer('probe', params), wire, id)
          const parsed = codec.parsePacketBuffer('probe', wire)
          assert.deepStrictEqual(parsed.data, params, id)
          assert.strictEqual(parsed.metadata.size, wire.length, id)
        }
      }
    })
  }
})
