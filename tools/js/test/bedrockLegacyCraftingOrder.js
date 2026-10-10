/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler

describe('Bedrock early crafting data collection order', function () {
  for (const version of ['1.17.30', '1.17.40', '1.18.0']) {
    it(`${version} writes potion containers before material reducers`, function () {
      // Gophertunnel abce8bf (1.17.30 support) and captured packets agree on
      // this order; distinct counts prevent the two arrays from being swapped.
      const { types } = require(`../../../data/bedrock/${version}/protocol.json`)
      const definitions = Object.fromEntries(['PotionTypeRecipes', 'PotionContainerChangeRecipes', 'MaterialReducer'].map(k => [k, types[k]]))
      definitions.probe = ['container', types.packet_crafting_data[1].slice(-4)]
      const proto = new ProtoDef(false)
      const [read, write, size] = proto.types.varint
      const encode = n => ((n << 1) ^ (n >> 31)) >>> 0
      const zz = [(buffer, offset) => { const r = read(buffer, offset); return { value: (r.value >>> 1) ^ -(r.value & 1), size: r.size } }, (value, buffer, offset) => write(encode(value), buffer, offset), value => size(encode(value))]
      proto.addType('zigzag32', zz)
      proto.addTypes(definitions)
      const compiler = new ProtoDefCompiler()
      compiler.addTypes({ Read: { zigzag32: ['native', zz[0]] }, Write: { zigzag32: ['native', zz[1]] }, SizeOf: { zigzag32: ['native', zz[2]] } })
      compiler.addTypesToCompile(definitions)
      const data = { potion_type_recipes: [], potion_container_recipes: [{ input_item_id: 1, ingredient_id: 2, output_item_id: 3 }, { input_item_id: 4, ingredient_id: 5, output_item_id: 6 }], material_reducers: [{ mix: -1, items: [{ network_id: -27, count: 64 }, { network_id: -12, count: 36 }] }], clear_recipes: false }
      const wire = Buffer.from('0002020406080a0c010102358001174800', 'hex')
      for (const codec of [proto, compiler.compileProtoDefSync()]) {
        assert.deepStrictEqual(codec.createPacketBuffer('probe', data), wire)
        const parsed = codec.parsePacketBuffer('probe', wire)
        assert.deepStrictEqual(parsed.data, data)
        assert.strictEqual(parsed.metadata.size, wire.length)
      }
    })
  }
})
