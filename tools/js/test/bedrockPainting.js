/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler
const paths = require('../../../data/dataPaths.json').bedrock

describe('Bedrock painting fields', function () {
  for (const dir of new Set(Object.values(paths).map(p => p.protocol).filter(Boolean))) {
    const { types } = require(`../../../data/${dir}/protocol.json`)
    const packet = types.packet_add_painting
    // 0.14/0.15 use separate x/y/z fields and have no coordinates alias.
    if (!packet || !packet[1].some(f => f.name === 'coordinates')) continue
    function check (field, cases) {
      const definitions = { vec3f: types.vec3f, probe: ['container', [field, { name: 'sentinel', type: 'u8' }]] }
      const proto = new ProtoDef(false)
      proto.addTypes(definitions)
      const compiler = new ProtoDefCompiler()
      compiler.addTypesToCompile(definitions)
      const compiled = compiler.compileProtoDefSync()
      for (const [data, hex] of cases) {
        const value = { [field.name]: data, sentinel: 0xa5 }
        const wire = Buffer.from(hex + 'a5', 'hex')
        for (const codec of [proto, compiled]) {
          assert.deepStrictEqual(codec.createPacketBuffer('probe', value), wire)
          const parsed = codec.parsePacketBuffer('probe', wire)
          assert.deepStrictEqual(parsed.data, value)
          assert.strictEqual(parsed.metadata.size, wire.length)
        }
      }
    }
    it(`${dir} preserves fractional painting coordinates`, function () {
      const field = packet[1].find(f => f.name === 'coordinates')
      assert.strictEqual(field.type, 'vec3f')
      check(field, [[{ x: 1.5, y: -1, z: 1000000 }, '0000c03f000080bf00247449'], [{ x: 0, y: 64, z: -0.5 }, '0000000000008042000000bf']])
    })
  }
})
