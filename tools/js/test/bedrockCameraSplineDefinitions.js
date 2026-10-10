/* eslint-env mocha */
const assert = require('assert')
const { ProtoDefCompiler } = require('protodef').Compiler
const paths = require('../../../data/dataPaths.json').bedrock

describe('Bedrock named camera spline definitions', function () {
  for (const dir of new Set(Object.values(paths).map(p => p.protocol).filter(Boolean))) {
    const { types } = require(`../../../data/${dir}/protocol.json`)
    if (!types.packet_camera_spline) continue
    it(`${dir} separates definition strings from instruction enums`, function () {
      const compiler = new ProtoDefCompiler()
      const names = ['string', 'vec3f', 'CameraSplineInstruction', 'CameraSplineDefinition', 'CameraProgressOption', 'CameraRotationOption', 'packet_camera_spline']
      compiler.addTypesToCompile(Object.fromEntries(names.filter(n => types[n]).map(n => [n, types[n]])))
      const codec = compiler.compileProtoDefSync()
      const float = n => { const b = Buffer.alloc(4); b.writeFloatLE(n); return b }
      const string = s => Buffer.concat([Buffer.from([Buffer.byteLength(s)]), Buffer.from(s)])
      for (const mask of [0, 1, 2, 3]) {
        const progress = { value: 0.5, time: 1, has_ease_type: !!(mask & 1), ease_type: mask & 1 ? 'linear' : undefined }
        const rotation = { value: { x: 0, y: 90, z: 0 }, time: 1, has_ease_type: !!(mask & 2), ease_type: mask & 2 ? 'in_quad' : undefined }
        const definition = { name: 'test:path', total_time: 10, spline_type: 'linear', control_points: [], progress_key_frames: [progress], rotation_key_frames: [rotation] }
        const wire = Buffer.concat([Buffer.from([1]), string('test:path'), float(10), string('linear'), Buffer.from([0, 1]), float(0.5), float(1), Buffer.from([Number(!!(mask & 1))]), ...(mask & 1 ? [string('linear')] : []), Buffer.from([1]), float(0), float(90), float(0), float(1), Buffer.from([Number(!!(mask & 2))]), ...(mask & 2 ? [string('in_quad')] : [])])
        const value = { splines: [definition] }
        assert.deepStrictEqual(codec.createPacketBuffer('packet_camera_spline', value), wire)
        const parsed = codec.parsePacketBuffer('packet_camera_spline', wire)
        assert.deepStrictEqual(parsed.data, value)
        assert.strictEqual(parsed.metadata.size, wire.length)
      }
    })
  }
})
