/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler

describe('Bedrock legacy inventory stack IDs', function () {
  // Gophertunnel 44101ba (1.16.210), item.go ItemInst: signed Varint32.
  // CreativeEntry uses unsigned Varuint32 and must not share this wrapper.
  for (const version of ['1.16.201', '1.16.210']) {
    it(`${version} preserves ZigZag inventory IDs without changing catalogue IDs`, function () {
      const { types } = require(`../../../data/bedrock/${version}/protocol.json`)
      const field = types.ItemStack[1][0]
      assert.strictEqual(field.type, 'zigzag32')
      assert.strictEqual(types.packet_inventory_slot[1].find(f => f.name === 'item').type, 'ItemStack')
      assert.strictEqual(types.packet_inventory_content[1].find(f => f.name === 'input').type, 'ItemStacks')
      const proto = new ProtoDef(false), [read, write, size] = proto.types.varint
      const encode = value => ((value << 1) ^ (value >> 31)) >>> 0
      const zz = [
        (buffer, offset) => { const r = read(buffer, offset); return { value: (r.value >>> 1) ^ -(r.value & 1), size: r.size } },
        (value, buffer, offset) => write(encode(value), buffer, offset),
        value => size(encode(value))
      ]
      const definitions = { probe: ['container', [field, { name: 'sentinel', type: 'u8' }]] }
      proto.addType('zigzag32', zz)
      proto.addTypes(definitions)
      const compiler = new ProtoDefCompiler()
      compiler.addTypes({ Read: { zigzag32: ['native', zz[0]] }, Write: { zigzag32: ['native', zz[1]] }, SizeOf: { zigzag32: ['native', zz[2]] } })
      compiler.addTypesToCompile(definitions)
      const compiled = compiler.compileProtoDefSync()
      for (const [id, hex] of [[0, '00'], [1, '02'], [-1, '01'], [63, '7e'], [64, '8001'], [88, 'b001'], [2147483647, 'feffffff0f'], [-2147483648, 'ffffffff0f']]) {
        const expected = { [field.name]: id, sentinel: 0xa5 }, raw = Buffer.from(hex + 'a5', 'hex')
        for (const codec of [proto, compiled]) {
          assert.deepStrictEqual(codec.createPacketBuffer('probe', expected), raw)
          const decoded = codec.parsePacketBuffer('probe', raw)
          assert.strictEqual(decoded.metadata.size, raw.length)
          assert.deepStrictEqual(decoded.data, expected)
        }
      }
    })
  }
})
