/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler
const paths = require('../../../data/dataPaths.json').bedrock

describe('Bedrock camera spline instructions', function () {
  for (const dir of new Set(Object.values(paths).map(p => p.protocol).filter(Boolean))) {
    const { types } = require(`../../../data/${dir}/protocol.json`)
    if (!types.packet_camera_spline) continue
    const fields = types.CameraSplineInstruction[1]
    function codecs (fields) {
      const names = ['string', 'vec3f', 'CameraProgressOption', 'CameraRotationOption']
      const definitions = { ...Object.fromEntries(names.map(n => [n, types[n]])), probe: ['container', [...fields, { name: 'sentinel', type: 'u8' }]] }
      const proto = new ProtoDef(false)
      proto.addTypes(definitions)
      const compiler = new ProtoDefCompiler()
      compiler.addTypesToCompile(definitions)
      return [proto, compiler.compileProtoDefSync()]
    }
    function check (codecs, value, wire) {
      for (const codec of codecs) {
        assert.deepStrictEqual(codec.createPacketBuffer('probe', value), wire)
        const parsed = codec.parsePacketBuffer('probe', wire)
        assert.deepStrictEqual(parsed.data, value)
        assert.strictEqual(parsed.metadata.size, wire.length)
      }
    }
    it(`${dir} encodes the instruction spline type as a mandatory byte`, function () {
      const shape = fields.filter(f => ['has_spline_type', 'spline_type'].includes(f.name))
      for (const type of [0, 1]) {
        check(codecs(shape), { spline_type: type, sentinel: 0xa5 }, Buffer.from([type, 0xa5]))
      }
    })
  }
})
