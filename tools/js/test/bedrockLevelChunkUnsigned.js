/* eslint-env mocha */
const assert = require('assert')
const { ProtoDefCompiler } = require('protodef').Compiler
const { varint } = require('protodef/src/datatypes/varint')
const paths = require('../../../data/dataPaths.json').bedrock

describe('Bedrock level chunk unsigned request-mode sentinel', function () {
  for (const path of [...new Set(Object.values(paths).map(p => p.protocol))].filter(Boolean)) {
    const { types } = require(`../../../data/${path}/protocol.json`)
    const fields = types.packet_level_chunk?.[1]
    const highest = fields?.find?.(f => f.name === 'highest_subchunk_count')
    if (highest?.type?.[0] !== 'switch') continue
    it(`${path} reads the limited request mode with unsigned and legacy signed codecs`, function () {
      for (const unsigned of [false, true]) {
        const compiler = new ProtoDefCompiler()
        compiler.addTypesToCompile({ ByteArray: types.ByteArray, packet: types.packet_level_chunk })
        if (unsigned) {
          compiler.addTypes({
            Read: {
              varint: ['native', (buffer, offset) => {
                const result = varint[0](buffer, offset)
                return { value: result.value >>> 0, size: result.size }
              }]
            },
            Write: {},
            SizeOf: {}
          })
        }
        const codec = compiler.compileProtoDefSync()
        // x=-1, z=1; optional dimension=0; sentinel; limit=0x1234;
        // cache disabled; two opaque payload bytes. The limit must not consume payload.
        const prefix = fields.some(f => f.name === 'dimension') ? '010200' : '0102'
        for (const [count, hex, limit] of [[0, '00', undefined], [4294967295, 'ffffffff0f', undefined], [4294967294, 'feffffff0f3412', 0x1234]]) {
          const raw = Buffer.from(prefix + hex + '0002abcd', 'hex')
          const parsed = codec.parsePacketBuffer('packet', raw)
          assert.strictEqual(parsed.metadata.size, raw.length)
          assert.strictEqual(parsed.data.sub_chunk_count, unsigned ? count : count | 0)
          assert.strictEqual(parsed.data.highest_subchunk_count, limit)
          assert.deepStrictEqual(parsed.data.payload, Buffer.from('abcd', 'hex'))
          assert.deepStrictEqual(codec.createPacketBuffer('packet', parsed.data), raw)
        }
      }
    })
  }
})
