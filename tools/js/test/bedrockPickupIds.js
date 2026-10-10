/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler
const paths = require('../../../data/dataPaths.json').bedrock

describe('Bedrock item pickup runtime IDs', function () {
  for (const dir of new Set(Object.values(paths).map(p => p.protocol).filter(Boolean))) {
    if (dir === 'bedrock/0.14' || dir === 'bedrock/0.15') continue // Separate fixed-width layouts.
    it(`${dir} preserves both unsigned 64-bit pickup IDs`, function () {
      const { types } = require(`../../../data/${dir}/protocol.json`)
      const definitions = { probe: types.packet_take_item_entity }
      const proto = new ProtoDef(false)
      proto.addTypes(definitions)
      const compiler = new ProtoDefCompiler()
      compiler.addTypesToCompile(definitions)
      const compiled = compiler.compileProtoDefSync()
      for (const [id, hex] of [[0n, '00'], [1n, '01'], [127n, '7f'], [128n, '8001'], [4294967295n, 'ffffffff0f'], [4294967296n, '8080808010'], [9007199254740991n, 'ffffffffffffff0f'], [9007199254740992n, '8080808080808010'], [9007199254740993n, '8180808080808010'], [18446744073709551615n, 'ffffffffffffffffff01']]) {
        for (const target of [false, true]) {
          const value = target ? { runtime_entity_id: 42n, target: id } : { runtime_entity_id: id, target: 42n }
          const wire = Buffer.from(target ? '2a' + hex : hex + '2a', 'hex')
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
