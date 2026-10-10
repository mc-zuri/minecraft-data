/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler
const paths = require('../../../data/dataPaths.json').bedrock

describe('Bedrock camera field-of-view easing', function () {
  for (const dir of new Set(Object.values(paths).map(p => p.protocol).filter(Boolean))) {
    const { types } = require(`../../../data/${dir}/protocol.json`)
    const field = types.packet_camera_instruction?.[1]?.find(f => f.name === 'fov')
    if (!field) continue
    it(`${dir} uses the version-specific FOV easing encoding`, function () {
      const stringEase = ['1.26.10', '1.26.20', '1.26.30', '1.26.40', '1.26.45', '1.26.51'].some(v => dir.endsWith('/' + v))
      const definitions = { string: types.string, ...(types.EaseType ? { EaseType: types.EaseType } : {}), probe: ['container', [field, { name: 'sentinel', type: 'u8' }]] }
      const proto = new ProtoDef(false)
      proto.addTypes(definitions)
      const compiler = new ProtoDefCompiler()
      compiler.addTypesToCompile(definitions)
      const compiled = compiler.compileProtoDefSync()
      // A FOV instruction changed to lowercase string easing in 1.26.10.
      // Set-instruction easing remains the existing byte enum.
      const setEase = types.packet_camera_instruction[1].find(f => f.name === 'instruction_set').type[1][1].find(f => f.name === 'ease_data').type[1][1].find(f => f.name === 'type').type
      assert.notStrictEqual(setEase, 'string')
      for (const [name, text, id] of [['Linear', 'linear', 0], ['InQuad', 'in_quad', 2], ['InOutElastic', 'in_out_elastic', 31]]) {
        const ease = stringEase ? text : name
        const input = { fov: { field_of_view: 70, ease_time: 1.5, ease_type: ease, clear: true }, sentinel: 0xa5 }
        const easeBytes = stringEase ? Buffer.concat([Buffer.from([ease.length]), Buffer.from(ease)]) : Buffer.from([id])
        const wire = Buffer.concat([Buffer.from('0100008c420000c03f', 'hex'), easeBytes, Buffer.from('01a5', 'hex')])
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
