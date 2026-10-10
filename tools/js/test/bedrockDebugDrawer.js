/* eslint-env mocha */
const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler

describe('Bedrock debug drawer shapes', function () {
  for (const version of ['1.21.120', '1.21.124', '1.21.130', '1.26.0', '1.26.10']) {
    it(`${version} reads the independent extra-data discriminator`, function () {
      const source = fs.readFileSync(path.join(__dirname, '../../../data/bedrock', version, 'proto.yml'), 'utf8')
      assert.match(source, /packet_server_script_debug_drawer:\s+!id: 0x148\s+!bound: client/)
      const { types } = require(`../../../data/bedrock/${version}/protocol.json`)
      const proto = new ProtoDef(false)
      const [read, write, size] = proto.types.varint
      const encode = n => ((n << 1) ^ (n >> 31)) >>> 0
      const zz = [(buffer, offset) => { const r = read(buffer, offset); return { value: (r.value >>> 1) ^ -(r.value & 1), size: r.size } }, (value, buffer, offset) => write(encode(value), buffer, offset), value => size(encode(value))]
      proto.addType('zigzag32', zz)
      const definitions = { string: types.string, vec3f: types.vec3f, probe: types.packet_server_script_debug_drawer }
      proto.addTypes(definitions)
      const compiler = new ProtoDefCompiler()
      compiler.addTypes({ Read: { zigzag32: ['native', zz[0]] }, Write: { zigzag32: ['native', zz[1]] }, SizeOf: { zigzag32: ['native', zz[2]] } })
      compiler.addTypesToCompile(definitions)
      const compiled = compiler.compileProtoDefSync()
      const attached = version.startsWith('1.26.')
      const optionalDimension = attached || version === '1.21.130'
      const alternatives = [
        [undefined, 'none', undefined, ''],
        [5, 'arrow', { end_location: { x: 1, y: 2, z: 3 }, head_length: 0.5, head_radius: 0.25, segment_count: 8 }, '010000803f0000004000004040010000003f010000803e0108'],
        [4, 'text', { text: '✓' }, '03e29c93'],
        [1, 'box', { bound: { x: 1, y: 2, z: 3 } }, '0000803f0000004000004040'],
        [0, 'line', { end_location: { x: 1, y: 2, z: 3 } }, '0000803f0000004000004040'],
        [2, 'sphere', { segment_count: 20 }, '14']
      ]
      const shapes = []
      const bodies = []
      for (const [tag, [shapeType, extraType, extra, hex]] of alternatives.entries()) {
        const shape = { network_id: 1n, shape_type: shapeType === undefined ? undefined : ['line', 'box', 'sphere', 'circle', 'text', 'arrow'][shapeType], location: undefined, scale: undefined, rotation: undefined, time_left: undefined, color: undefined, dimension_id: 2, ...(attached ? { attached_to_entity_id: 42n } : {}), extra_shape_data_type: extraType, extra_shape_data: extra }
        const body = Buffer.concat([Buffer.from([1, ...(shapeType === undefined ? [0] : [1, shapeType]), 0, 0, 0, 0, 0, ...(optionalDimension ? [1, 4] : [4]), ...(attached ? [1, 42] : []), tag]), Buffer.from(hex, 'hex')])
        shapes.push(shape)
        bodies.push(body)
      }
      // Empty, each individual variant, and one heterogeneous collection.
      const cases = [[[], Buffer.from([0])], ...shapes.map((s, i) => [[s], Buffer.concat([Buffer.from([1]), bodies[i]])]), [shapes, Buffer.concat([Buffer.from([shapes.length]), ...bodies])]]
      for (let mask = 0; mask < 16; mask++) {
        const fields = ['end_location', 'head_length', 'head_radius', 'segment_count']
        const payloads = ['0000803f0000004000004040', '0000003f', '0000803e', '08']
        const extra = Object.fromEntries(fields.map((name, i) => [name, mask & (1 << i) ? shapes[1].extra_shape_data[name] : undefined]))
        const head = Buffer.from([1, 1, 1, 5, 0, 0, 0, 0, 0, ...(optionalDimension ? [1, 4] : [4]), ...(attached ? [1, 42] : []), 1])
        const body = fields.map((name, i) => Buffer.from(mask & (1 << i) ? '01' + payloads[i] : '00', 'hex'))
        cases.push([[{ ...shapes[1], extra_shape_data: extra }], Buffer.concat([head, ...body])])
      }
      for (const [items, wire] of cases) {
        for (const codec of [proto, compiled]) {
          assert.deepStrictEqual(codec.createPacketBuffer('probe', { shapes: items }), wire)
          const parsed = codec.parsePacketBuffer('probe', wire)
          assert.deepStrictEqual(parsed.data, { shapes: items })
          assert.strictEqual(parsed.metadata.size, wire.length)
        }
      }
    })
  }
})
