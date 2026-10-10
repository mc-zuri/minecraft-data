/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler

describe('Bedrock early structure block updates', function () {
  for (const version of ['1.16.201', '1.16.210', '1.16.220']) {
    const { types } = require(`../../../data/bedrock/${version}/protocol.json`)
    it(`${version} includes the editor settings and trigger`, function () {
      const proto = new ProtoDef(false)
      const compiler = new ProtoDefCompiler()
      for (const [name, base, encode, decode] of [
        ['zigzag32', 'varint', n => ((n << 1) ^ (n >> 31)) >>> 0, n => (n >>> 1) ^ -(n & 1)],
        ['zigzag64', 'varint64', n => (n << 1n) ^ (n >> 63n), n => (n >> 1n) ^ -(n & 1n)]
      ]) {
        const [read, write, size] = proto.types[base]
        compiler.addTypes({ Read: { [name]: ['native', (buffer, offset) => { const r = read(buffer, offset); return { value: decode(r.value), size: r.size } }] }, Write: { [name]: ['native', (value, buffer, offset) => write(encode(value), buffer, offset)] }, SizeOf: { [name]: ['native', value => size(encode(value))] } })
      }
      compiler.addTypesToCompile({ string: types.string, vec3f: types.vec3f, BlockCoordinates: types.BlockCoordinates, StructureBlockSettings: types.StructureBlockSettings, probe: types.packet_structure_block_update })
      const codec = compiler.compileProtoDefSync()
      const value = { position: { x: -5, y: 64, z: 7 }, structure_name: 'test', data_field: 'data', include_players: true, show_bounding_box: false, structure_block_type: 2, settings: { palette_name: 'default', ignore_entities: true, ignore_blocks: false, size: { x: 4, y: 5, z: 6 }, structure_offset: { x: -1, y: 2, z: -3 }, last_editing_player_unique_id: -1n, rotation: 1, mirror: 2, integrity: 0.5, seed: 0x12345678, pivot: { x: 0.5, y: 1, z: -0.5 } }, redstone_save_mode: 1, should_trigger: true }
      const wire = Buffer.from('09400e047465737404646174610100040764656661756c74010008050c0102050101020000003f785634120000003f0000803f000000bf0201', 'hex')
      assert.deepStrictEqual(codec.createPacketBuffer('probe', value), wire)
      const parsed = codec.parsePacketBuffer('probe', wire)
      assert.deepStrictEqual(parsed.data, value)
      assert.strictEqual(parsed.metadata.size, wire.length)
    })
  }
})
