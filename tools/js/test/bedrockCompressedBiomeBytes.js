/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler
const paths = require('../../../data/dataPaths.json').bedrock

describe('Bedrock compressed biome bytes', function () {
  for (const version of [...new Set(Object.values(paths).map(p => p.protocol))].filter(p => /^bedrock\/1\./.test(p))) {
    const { types } = require(`../../../data/${version}/protocol.json`)
    if (!types.packet_compressed_biome_definitions) continue
    it(`${version} preserves binary data without UTF-8 conversion`, function () {
      const definitions = { string: types.string, ByteArray: types.ByteArray, probe: types.packet_compressed_biome_definitions }
      const proto = new ProtoDef(false)
      proto.addTypes(definitions)
      const compiler = new ProtoDefCompiler()
      compiler.addTypesToCompile(definitions)
      for (const codec of [proto, compiler.compileProtoDefSync()]) {
        for (const [length, prefix] of [[0, '00'], [1, '01'], [127, '7f'], [128, '8001'], [129, '8101']]) {
          const payload = Buffer.alloc(length)
          for (let i = 0; i < length; i++) payload[i] = [0xff, 0x80, 0xc0, 0, 0x7f][i % 5]
          const wire = Buffer.concat([Buffer.from(prefix, 'hex'), payload])
          const parsed = codec.parsePacketBuffer('probe', wire)
          assert.deepStrictEqual(parsed.data, { raw_payload: payload })
          assert.strictEqual(parsed.metadata.size, wire.length)
          assert.deepStrictEqual(codec.createPacketBuffer('probe', parsed.data), wire)
        }
      }
    })
  }
})
