/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler
const paths = require('../../../data/dataPaths.json').bedrock

describe('Bedrock graphics override value presence', function () {
  for (const dir of new Set(Object.values(paths).map(p => p.protocol).filter(Boolean))) {
    const { types } = require(`../../../data/${dir}/protocol.json`)
    const fields = types.packet_graphics_override_parameter?.[1].filter(f => ['float_value', 'vec3_value'].includes(f.name))
    if (!fields?.length) continue
    it(`${dir} independently encodes optional scalar and vector values`, function () {
      const definitions = { vec3f: types.vec3f, probe: ['container', [...fields, { name: 'sentinel', type: 'u8' }]] }
      const proto = new ProtoDef(false)
      proto.addTypes(definitions)
      const compiler = new ProtoDefCompiler()
      compiler.addTypesToCompile(definitions)
      const compiled = compiler.compileProtoDefSync()
      for (const [scalar, scalarHex] of [[undefined, '00'], [0, '0100000000'], [-2.25, '01000010c0']]) {
        for (const [vector, vectorHex] of [[undefined, '00'], [{ x: 1, y: 0.5, z: 0 }, '010000803f0000003f00000000']]) {
          const input = { float_value: scalar, vec3_value: vector, sentinel: 0xa5 }
          const wire = Buffer.from(scalarHex + vectorHex + 'a5', 'hex')
          for (const codec of [proto, compiled]) {
            assert.deepStrictEqual(codec.createPacketBuffer('probe', input), wire)
            const parsed = codec.parsePacketBuffer('probe', wire)
            assert.deepStrictEqual(parsed.data, input)
            assert.strictEqual(parsed.metadata.size, wire.length)
          }
        }
      }
    })
  }
})
