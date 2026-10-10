/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler

describe('Bedrock early player armor damage branches', function () {
  for (const version of ['1.16.201', '1.16.210']) {
    it(`${version} reaches all sixteen slot masks`, function () {
      const { types } = require(`../../../data/bedrock/${version}/protocol.json`)
      const proto = new ProtoDef(false)
      const [read, write, size] = proto.types.varint
      const encode = n => ((n << 1) ^ (n >> 31)) >>> 0
      const zz = [(buffer, offset) => { const r = read(buffer, offset); return { value: (r.value >>> 1) ^ -(r.value & 1), size: r.size } }, (value, buffer, offset) => write(encode(value), buffer, offset), value => size(encode(value))]
      proto.addType('zigzag32', zz)
      const definitions = { ArmorDamageType: types.ArmorDamageType, probe: types.packet_player_armor_damage }
      proto.addTypes(definitions)
      const compiler = new ProtoDefCompiler()
      compiler.addTypes({ Read: { zigzag32: ['native', zz[0]] }, Write: { zigzag32: ['native', zz[1]] }, SizeOf: { zigzag32: ['native', zz[2]] } })
      compiler.addTypesToCompile(definitions)
      for (const codec of [compiler.compileProtoDefSync()]) {
        for (let mask = 0; mask < 16; mask++) {
          const data = { type: { _value: mask, head: !!(mask & 1), chest: !!(mask & 2), legs: !!(mask & 4), feet: !!(mask & 8) }, helmet_damage: mask & 1 ? 1 : undefined, chestplate_damage: mask & 2 ? 2 : undefined, leggings_damage: mask & 4 ? 3 : undefined, boots_damage: mask & 8 ? 4 : undefined }
          const wire = Buffer.from([mask, ...[0, 1, 2, 3].filter(bit => mask & (1 << bit)).map(bit => 2 * (bit + 1))])
          assert.deepStrictEqual(codec.createPacketBuffer('probe', data), wire)
          const parsed = codec.parsePacketBuffer('probe', wire)
          assert.deepStrictEqual(parsed.data, data)
          assert.strictEqual(parsed.metadata.size, wire.length)
        }
      }
    })
  }
})
