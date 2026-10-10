/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler
const paths = require('../../../data/dataPaths.json').bedrock

describe('Bedrock equipment inventory size', function () {
  for (const dir of new Set(Object.values(paths).map(p => p.protocol).filter(Boolean))) {
    const { types } = require(`../../../data/${dir}/protocol.json`)
    const packet = types.packet_update_equipment
    if (!packet) continue
    it(`${dir} encodes size as signed ZigZag without shifting subsequent fields`, function () {
      const field = packet[1].find(f => f.name === 'size')
      const proto = new ProtoDef(false)
      const [read, write, size] = proto.types.varint
      const encode = n => ((n << 1) ^ (n >> 31)) >>> 0
      proto.addType('zigzag32', [
        (buffer, offset) => { const r = read(buffer, offset); return { value: (r.value >>> 1) ^ -(r.value & 1), size: r.size } },
        (value, buffer, offset) => write(encode(value), buffer, offset),
        value => size(encode(value))
      ])
      // Keep a trailing sentinel so an incorrect width cannot pass by only
      // checking that the size itself round-trips. Native exports separately
      // exercise the real following ActorUniqueID and compound NBT fields.
      const definitions = { probe: ['container', [field, { name: 'sentinel', type: 'lu32' }]] }
      proto.addTypes(definitions)
      const compiler = new ProtoDefCompiler()
      compiler.addTypesToCompile(definitions)
      compiler.addTypes({ Read: { zigzag32: ['native', proto.types.zigzag32[0]] }, Write: { zigzag32: ['native', proto.types.zigzag32[1]] }, SizeOf: { zigzag32: ['native', proto.types.zigzag32[2]] } })
      const compiled = compiler.compileProtoDefSync()
      // Explicit independent byte expectations. Negative and extreme sizes
      // exercise storage; they are not claims about legal horse inventories.
      for (const [value, hex] of [[0, '00'], [1, '02'], [-1, '01'], [63, '7e'], [64, '8001'], [-64, '7f'], [-65, '8101'], [8191, 'fe7f'], [8192, '808001'], [1048575, 'feff7f'], [1048576, '80808001'], [134217727, 'feffff7f'], [134217728, '8080808001'], [2147483647, 'feffffff0f'], [-2147483648, 'ffffffff0f']]) {
        const wire = Buffer.from(hex + '12345678', 'hex')
        const input = { size: value, sentinel: 0x78563412 }
        for (const codec of [proto, compiled]) {
          assert.deepStrictEqual(codec.createPacketBuffer('probe', input), wire)
          const parsed = codec.parsePacketBuffer('probe', wire)
          assert.deepStrictEqual(parsed.data, input)
          assert.strictEqual(parsed.metadata.size, wire.length)
        }
      }
    })
  }
})
