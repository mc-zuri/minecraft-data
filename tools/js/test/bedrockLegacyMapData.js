/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler

describe('Bedrock early map updates', function () {
  for (const version of ['1.16.201', '1.16.210', '1.16.220']) {
    it(`${version} handles every combination of map sections`, function () {
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
      compiler.addTypesToCompile({ string: types.string, BlockCoordinates: types.BlockCoordinates, UpdateMapFlags: types.UpdateMapFlags, TrackedObject: types.TrackedObject, MapDecoration: types.MapDecoration, probe: types.packet_clientbound_map_item_data })
      const codec = compiler.compileProtoDefSync()
      for (let flags = 0; flags <= 14; flags += 2) {
        const creation = !!(flags & 8)
        const decoration = !!(flags & 4)
        const texture = !!(flags & 2)
        // Independently encoded sections: three map IDs, heterogeneous tracked objects,
        // one decoration and a 2x2 texture, with differing values to detect field swaps.
        const wire = Buffer.concat([Buffer.from([1, flags, 2, 1]), ...(creation ? [Buffer.from('03010204', 'hex')] : []), ...(flags ? [Buffer.from([3])] : []), ...(decoration ? [Buffer.from('0200000000010100000009400e0100037f80036d6170f8acd19101', 'hex')] : []), ...(texture ? [Buffer.from('0404020404f8acd1910100017f', 'hex')] : [])])
        const value = { map_id: -1n, update_flags: { initialisation: creation, decoration, texture }, dimension: 2, locked: true, included_in: creation ? [-1n, 1n, 2n] : undefined, scale: flags ? 3 : undefined, tracked: decoration ? { objects: [{ type: 'entity', entity_unique_id: -1n }, { type: 'block', block_position: { x: -5, y: 64, z: 7 } }], decorations: [{ type: 'marker_white', rotation: 3, x: 127, y: 128, label: 'map', color_abgr: 0x12345678 }] } : undefined, texture: texture ? { width: 2, height: 2, x_offset: 1, y_offset: 2, pixels: [0x12345678, 0, 1, 127] } : undefined }
        assert.deepStrictEqual(codec.createPacketBuffer('probe', value), wire)
        const parsed = codec.parsePacketBuffer('probe', wire)
        assert.strictEqual(parsed.metadata.size, wire.length)
        assert.strictEqual(parsed.data.map_id, -1n)
        assert.deepStrictEqual(parsed.data.included_in, value.included_in)
        assert.strictEqual(parsed.data.scale, value.scale)
        assert.deepStrictEqual(parsed.data.texture, value.texture)
        if (decoration) {
          assert.strictEqual(parsed.data.tracked.objects[0].entity_unique_id, -1n)
          assert.deepStrictEqual(parsed.data.tracked.objects[1].block_position, { x: -5, y: 64, z: 7 })
          assert.deepStrictEqual(parsed.data.tracked.decorations, value.tracked.decorations)
        }
        assert.deepStrictEqual(codec.createPacketBuffer('probe', parsed.data), wire)
      }
    })
  }
})
