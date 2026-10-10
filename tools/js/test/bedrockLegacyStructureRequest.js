/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler

describe('Bedrock early structure template requests', function () {
  for (const version of ['1.16.201', '1.16.210', '1.16.220']) {
    it(`${version} includes names, settings and request operations`, function () {
      const { types } = require(`../../../data/bedrock/${version}/protocol.json`)
      const proto = new ProtoDef(false)
      const compiler = new ProtoDefCompiler()
      for (const [name, base, encode, decode] of [
        ['zigzag32', 'varint', n => ((n << 1) ^ (n >> 31)) >>> 0, n => (n >>> 1) ^ -(n & 1)],
        ['zigzag64', 'varint64', n => (n << 1n) ^ (n >> 63n), n => (n >> 1n) ^ -(n & 1n)]
      ]) {
        const [read, write, size] = proto.types[base]
        compiler.addTypes({ Read: { [name]: ['native', (buffer, offset) => { const r = read(buffer, offset); return { value: decode(r.value), size: r.size } }] }, Write: { [name]: ['native', (value, buffer, offset) => write(encode(value), buffer, offset)] }, SizeOf: { [name]: ['native', value => size(encode(value))] } })
      }
      compiler.addTypesToCompile({ string: types.string, vec3f: types.vec3f, BlockCoordinates: types.BlockCoordinates, StructureBlockSettings: types.StructureBlockSettings, probe: types.packet_structure_template_data_export_request })
      const codec = compiler.compileProtoDefSync()
      for (const [id, requestType] of [0, 'export_from_save', 'export_from_load', 'query_saved_structure'].entries()) {
        const value = { name: 'test', position: { x: -5, y: 64, z: 7 }, settings: { palette_name: 'default', ignore_entities: true, ignore_blocks: false, size: { x: 4, y: 5, z: 6 }, structure_offset: { x: -1, y: 2, z: -3 }, last_editing_player_unique_id: -1n, rotation: 1, mirror: 2, integrity: 0.5, seed: 0x12345678, pivot: { x: 0.5, y: 1, z: -0.5 } }, request_type: requestType }
        const wire = Buffer.concat([Buffer.from('047465737409400e0764656661756c74010008050c0102050101020000003f785634120000003f0000803f000000bf', 'hex'), Buffer.from([id])])
        assert.deepStrictEqual(codec.createPacketBuffer('probe', value), wire)
        const parsed = codec.parsePacketBuffer('probe', wire)
        assert.deepStrictEqual(parsed.data, value)
        assert.strictEqual(parsed.metadata.size, wire.length)
      }
    })
  }
})
