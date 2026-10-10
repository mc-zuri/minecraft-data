/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler
const paths = require('../../../data/dataPaths.json').bedrock

describe('Bedrock photo transfer image bytes', function () {
  for (const dir of new Set(Object.values(paths).map(p => p.protocol).filter(Boolean))) {
    const { types } = require(`../../../data/${dir}/protocol.json`)
    if (!types.packet_photo_transfer) continue
    it(`${dir} preserves binary images without UTF-8 conversion`, function () {
      const data = types.packet_photo_transfer[1].find(f => f.name === 'image_data')
      const definitions = { string: types.string, ByteArray: types.ByteArray, probe: ['container', [data, { name: 'sentinel', type: 'u8' }]] }
      const proto = new ProtoDef(false)
      proto.addTypes(definitions)
      const compiler = new ProtoDefCompiler()
      compiler.addTypesToCompile(definitions)
      const compiled = compiler.compileProtoDefSync()
      const cases = [[Buffer.alloc(0), '00'], [Buffer.from('89504e470d0a1a0a0000', 'hex'), '0a'], [Buffer.from(Array.from({ length: 256 }, (_, i) => i)), '8002'], [Buffer.alloc(127, 0xff), '7f'], [Buffer.alloc(128, 0xff), '8001'], [Buffer.alloc(16383, 0xff), 'ff7f'], [Buffer.alloc(16384, 0xff), '808001']]
      for (const [image, prefix] of cases) {
        const wire = Buffer.concat([Buffer.from(prefix, 'hex'), image, Buffer.from([0xa5])])
        for (const codec of [proto, compiled]) {
          const parsed = codec.parsePacketBuffer('probe', wire)
          assert.deepStrictEqual(parsed.data, { image_data: image, sentinel: 0xa5 })
          assert.strictEqual(parsed.metadata.size, wire.length)
          assert.deepStrictEqual(codec.createPacketBuffer('probe', parsed.data), wire)
        }
      }
    })
  }
})
