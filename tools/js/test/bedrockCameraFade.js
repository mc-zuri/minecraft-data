/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler
const paths = require('../../../data/dataPaths.json').bedrock

describe('Bedrock camera fade presence flags', function () {
  for (const dir of new Set(Object.values(paths).map(p => p.protocol).filter(Boolean))) {
    const { types } = require(`../../../data/${dir}/protocol.json`)
    const fade = types.packet_camera_instruction?.[1]?.find(f => f.name === 'fade')
    if (!fade) continue // Versions before 1.20.30 use an NBT instruction.
    it(`${dir} reads every combination of timing and colour presence`, function () {
      const definitions = { vec3f: types.vec3f, probe: ['container', [fade, { name: 'sentinel', type: 'u8' }]] }
      const proto = new ProtoDef(false)
      proto.addTypes(definitions)
      const compiler = new ProtoDefCompiler()
      compiler.addTypesToCompile(definitions)
      const compiled = compiler.compileProtoDefSync()
      const cases = [
        [undefined, '00'],
        [{ time_data: undefined, color_rgb: undefined }, '010000'],
        [{ time_data: { fade_in_duration: 0.5, wait_duration: 1, fade_out_duration: 2.5 }, color_rgb: undefined }, '01010000003f0000803f0000204000'],
        [{ time_data: undefined, color_rgb: { x: 1, y: 0, z: 0.25 } }, '0100010000803f000000000000803e'],
        [{ time_data: { fade_in_duration: 0.5, wait_duration: 1, fade_out_duration: 2.5 }, color_rgb: { x: 1, y: 0, z: 0.25 } }, '01010000003f0000803f00002040010000803f000000000000803e']
      ]
      for (const [value, hex] of cases) {
        const input = { fade: value, sentinel: 0xa5 }
        const wire = Buffer.from(hex + 'a5', 'hex')
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
