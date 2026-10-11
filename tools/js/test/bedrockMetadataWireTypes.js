/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler
const paths = require('../../../data/dataPaths.json').bedrock

describe('Bedrock metadata wire discriminators', function () {
  for (const path of [...new Set(Object.values(paths).map(p => p.protocol))].filter(Boolean)) {
    const { types } = require(`../../../data/${path}/protocol.json`)
    if (!Array.isArray(types.MetadataDictionary)) continue
    it(`${path} selects storage by type before interpreting known keys`, function () {
      const fields = types.MetadataDictionary[1].type[1]
      const keys = fields.find(f => f.name === 'key').type[1].mappings
      const legacy = fields.some(f => f.name === 'legacy_type')
      // Flags have a custom object adapter; its underlying wire primitive is
      // sufficient here. Full packet tests additionally check that adapter.
      if (types.MetadataFlags1) assert.strictEqual(types.MetadataFlags1[1].type, 'zigzag64')
      if (types.MetadataFlags2) assert.strictEqual(types.MetadataFlags2[1].type, 'zigzag64')
      const definitions = { probe: types.MetadataDictionary, string: types.string, vec3i: types.vec3i, vec3f: types.vec3f, MetadataFlags1: 'zigzag64', MetadataFlags2: 'zigzag64', nbt: 'void' }
      const proto = new ProtoDef(false)
      proto.addTypes(definitions)
      const compiler = new ProtoDefCompiler()
      compiler.addTypesToCompile(definitions)
      for (const codec of [proto, compiler.compileProtoDefSync()]) {
        for (const [keyId, key] of Object.entries(keys).filter(([, name]) => ['flags', 'flags_extended', 'health', 'seat_third_person_camera_radius', 'seat_camera_relax_distance_smoothing'].includes(name))) {
          const id = Number(keyId)
          assert.ok(id < 16384)
          const keyBytes = id < 128 ? [id] : [(id & 127) | 128, id >> 7]
          for (const [typeId, type, value, hex] of [[0, 'byte', -1, 'ff'], [1, 'short', -1234, '2efb'], [2, 'int', -65, '8101'], [3, 'float', 1.5, '0000c03f'], [4, 'string', '✓', '03e29c93'], [6, 'vec3i', { x: -1, y: 2, z: 3 }, '010406'], [7, 'long', 1n, '02'], [8, 'vec3f', { x: 1, y: 2, z: 3 }, '0000803f0000004000004040']]) {
            const wire = Buffer.concat([Buffer.from([1, ...keyBytes, typeId, ...(legacy ? [typeId] : [])]), Buffer.from(hex, 'hex')])
            const data = [{ key, type, ...(legacy ? { legacy_type: typeId } : {}), value }]
            assert.deepStrictEqual(codec.createPacketBuffer('probe', data), wire, `${key}/${type}`)
            const decoded = codec.parsePacketBuffer('probe', wire)
            assert.strictEqual(decoded.metadata.size, wire.length)
            if (type === 'long') assert.strictEqual(BigInt(decoded.data[0].value), value)
            else assert.deepStrictEqual(decoded.data, data)
          }
        }
      }
    })
  }
})
