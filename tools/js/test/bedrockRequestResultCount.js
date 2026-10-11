/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler
const paths = require('../../../data/dataPaths.json').bedrock

// The network descriptor's stack size is uint16 (Mojang and Gophertunnel).
// The game separately restricts craft results to 1..64. Larger values below
// exercise the codec's declared signedness, not gameplay acceptance.
describe('Bedrock craft-result descriptor stack size', function () {
  for (const dir of new Set(Object.values(paths).map(p => p.protocol).filter(Boolean))) {
    const { types } = require('../../../data/' + dir + '/protocol.json')
    if (!types.ItemStackRequestInstanceDescriptor) continue
    it(dir + ' uses little-endian uint16 without consuming the following byte', function () {
      const field = types.ItemStackRequestInstanceDescriptor[1].find(f => f.name === 'count')
      assert.strictEqual(field.type, 'lu16')
      const packet = ['container', [field, { name: 'sentinel', type: 'u8' }]]
      const proto = new ProtoDef(false)
      proto.addType('packet', packet)
      const compiler = new ProtoDefCompiler()
      compiler.addTypesToCompile({ packet })
      for (const codec of [proto, compiler.compileProtoDefSync()]) for (const [count, hex] of [[1, '0100'], [64, '4000'], [0x1234, '3412'], [32767, 'ff7f'], [32768, '0080'], [65535, 'ffff']]) {
        const raw = Buffer.from(hex + 'a5', 'hex'), expected = { count, sentinel: 0xa5 }
        const parsed = codec.parsePacketBuffer('packet', raw)
        assert.strictEqual(parsed.metadata.size, raw.length)
        assert.deepStrictEqual(parsed.data, expected)
        assert.deepStrictEqual(codec.createPacketBuffer('packet', expected), raw)
      }
    })
  }
})
