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
    it(`${dir} encodes mandatory easing in each instruction keyframe`, function () {
      const shape = fields.filter(f => ['progress_key_frames', 'rotation_options'].includes(f.name))
      const byteEase = dir === 'bedrock/1.26.0'
      const float = n => { const b = Buffer.alloc(4); b.writeFloatLE(n); return b }
      const ease = n => byteEase ? n : ['linear', 'in_out_elastic'][n === 31 ? 1 : 0]
      const easeBytes = n => byteEase ? Buffer.from([n]) : Buffer.concat([Buffer.from([ease(n).length]), Buffer.from(ease(n))])
      for (const count of [0, 1, 2]) {
        const progress = []
        const rotation = []
        const progressBytes = [Buffer.from([count])]
        const rotationBytes = [Buffer.from([count])]
        for (let i = 0; i < count; i++) {
          progress.push({ value: i * 0.5, time: i, ease_type: ease(i * 31) })
          rotation.push({ value: { x: 0, y: i * 90, z: -5.5 }, time: i, ease_type: ease((1 - i) * 31) })
          progressBytes.push(float(i * 0.5), float(i), easeBytes(i * 31))
          rotationBytes.push(float(0), float(i * 90), float(-5.5), float(i), easeBytes((1 - i) * 31))
        }
        check(codecs(shape), { progress_key_frames: progress, rotation_options: rotation, sentinel: 0xa5 }, Buffer.concat([...progressBytes, ...rotationBytes, Buffer.from([0xa5])]))
      }
    })
    it(`${dir} always encodes the spline identifier and load flag`, function () {
      const shape = fields.filter(f => ['spline_identifier', 'load_from_json'].includes(f.name))
      assert.strictEqual(shape.length, 2)
      for (const identifier of ['', 'minecraft:orbit']) {
        for (const load of [false, true]) {
          const wire = Buffer.concat([Buffer.from([identifier.length]), Buffer.from(identifier), Buffer.from([Number(load), 0xa5])])
          check(codecs(shape), { spline_identifier: identifier, load_from_json: load, sentinel: 0xa5 }, wire)
        }
      }
    })
  }
})
