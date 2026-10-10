/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler
const paths = require('../../../data/dataPaths.json').bedrock

describe('Bedrock player movement runtime IDs', function () {
  for (const dir of new Set(Object.values(paths).map(p => p.protocol).filter(Boolean))) {
    if (dir === 'bedrock/0.14' || dir === 'bedrock/0.15') continue // Separate fixed-width layouts.
    it(`${dir} preserves full player and mount IDs`, function () {
      const { types } = require(`../../../data/${dir}/protocol.json`)
      for (const fieldName of ['runtime_id', 'ridden_runtime_id']) {
        const field = types.packet_move_player[1].find(f => f.name === fieldName)
        const definitions = { probe: ['container', [field, { name: 'sentinel', type: 'u8' }]] }
        const proto = new ProtoDef(false)
        proto.addTypes(definitions)
        const compiler = new ProtoDefCompiler()
        compiler.addTypesToCompile(definitions)
        const compiled = compiler.compileProtoDefSync()
        for (const [id, hex] of [[0n, '00'], [1n, '01'], [127n, '7f'], [128n, '8001'], [4294967295n, 'ffffffff0f'], [4294967296n, '8080808010'], [9007199254740991n, 'ffffffffffffff0f'], [9007199254740992n, '8080808080808010'], [9007199254740993n, '8180808080808010'], [18446744073709551615n, 'ffffffffffffffffff01']]) {
          const value = { [fieldName]: id, sentinel: 0xa5 }
          const wire = Buffer.from(hex + 'a5', 'hex')
          for (const codec of [proto, compiled]) {
            assert.deepStrictEqual(codec.createPacketBuffer('probe', value), wire)
            const parsed = codec.parsePacketBuffer('probe', wire)
            assert.deepStrictEqual(parsed.data, value)
            assert.strictEqual(parsed.metadata.size, wire.length)
          }
        }
      }
    })
  }
})
