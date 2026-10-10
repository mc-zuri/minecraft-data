/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler
const paths = require('../../../data/dataPaths.json').bedrock

describe('Bedrock entity property overrides', function () {
  for (const dir of new Set(Object.values(paths).map(p => p.protocol).filter(Boolean))) {
    const { types } = require(`../../../data/${dir}/protocol.json`)
    const fields = types.packet_player_update_entity_overrides?.[1]
    if (!fields) continue
    it(`${dir} preserves signed unique entity IDs using ZigZag`, function () {
      const field = fields.find(f => ['runtime_id', 'entity_unique_id'].includes(f.name))
      assert.strictEqual(field.name, 'entity_unique_id')
      assert.strictEqual(field.type, 'zigzag64')
      const proto = new ProtoDef(false)
      const [read, write, size] = proto.types.varint64
      const encode = n => (n << 1n) ^ (n >> 63n)
      proto.addType('zigzag64', [
        (buffer, offset) => { const r = read(buffer, offset); return { value: (r.value >> 1n) ^ -(r.value & 1n), size: r.size } },
        (value, buffer, offset) => write(encode(value), buffer, offset),
        value => size(encode(value))
      ])
      const definitions = { probe: ['container', [field, { name: 'sentinel', type: 'u8' }]] }
      proto.addTypes(definitions)
      const compiler = new ProtoDefCompiler()
      compiler.addTypesToCompile(definitions)
      compiler.addTypes({ Read: { zigzag64: ['native', proto.types.zigzag64[0]] }, Write: { zigzag64: ['native', proto.types.zigzag64[1]] }, SizeOf: { zigzag64: ['native', proto.types.zigzag64[2]] } })
      const compiled = compiler.compileProtoDefSync()
      for (const [id, hex] of [[0n, '00'], [1n, '02'], [-1n, '01'], [63n, '7e'], [64n, '8001'], [-64n, '7f'], [-65n, '8101'], [-4294967295n, 'fdffffff1f'], [9007199254740992n, '8080808080808020'], [9223372036854775807n, 'feffffffffffffffff01'], [-9223372036854775808n, 'ffffffffffffffffff01']]) {
        for (const codec of [proto, compiled]) {
          const value = { entity_unique_id: id, sentinel: 0xa5 }
          const wire = Buffer.from(hex + 'a5', 'hex')
          assert.deepStrictEqual(codec.createPacketBuffer('probe', value), wire)
          const parsed = codec.parsePacketBuffer('probe', wire)
          assert.deepStrictEqual(parsed.data, value)
          assert.strictEqual(parsed.metadata.size, wire.length)
        }
      }
    })
    it(`${dir} preserves the version-specific action name and payload`, function () {
      const named = ['1.26.40', '1.26.45', '1.26.51'].some(v => dir.endsWith('/' + v))
      const compiler = new ProtoDefCompiler()
      compiler.addTypesToCompile({ string: types.string, probe: ['container', [...fields.filter(f => !['runtime_id', 'entity_unique_id', 'property_index'].includes(f.name)), { name: 'sentinel', type: 'u8' }]] })
      const codec = compiler.compileProtoDefSync()
      const actions = [['clear_all', 'clearoverrides', undefined, ''], ['remove', 'removeoverride', undefined, ''], ['set_int', 'setintoverride', -12, 'f4ffffff'], ['set_float', 'setfloatoverride', 0.75, '0000403f']]
      for (const [index, [type, name, value, data]] of actions.entries()) {
        const input = { type, ...(named ? { type_name: name } : {}), value, sentinel: 0xa5 }
        const wire = Buffer.concat([Buffer.from([index]), ...(named ? [Buffer.from([name.length]), Buffer.from(name)] : []), Buffer.from(data, 'hex'), Buffer.from([0xa5])])
        assert.deepStrictEqual(codec.createPacketBuffer('probe', input), wire)
        const parsed = codec.parsePacketBuffer('probe', wire)
        assert.deepStrictEqual(parsed.data, input)
        assert.strictEqual(parsed.metadata.size, wire.length)
      }
    })
  }
})
