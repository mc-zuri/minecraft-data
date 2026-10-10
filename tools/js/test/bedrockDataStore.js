/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler
const paths = require('../../../data/dataPaths.json').bedrock

describe('Bedrock data store variants', function () {
  for (const dir of new Set(Object.values(paths).map(p => p.protocol).filter(Boolean))) {
    const { types } = require(`../../../data/${dir}/protocol.json`)
    const packet = types.packet_serverbound_data_store
    if (!packet) continue
    it(`${dir} reads all three variants after a VarInt discriminator`, function () {
      const definitions = { string: types.string, packet }
      const proto = new ProtoDef(false)
      proto.addTypes(definitions)
      const compiler = new ProtoDefCompiler()
      compiler.addTypesToCompile(definitions)
      const compiled = compiler.compileProtoDefSync()
      for (const [type, data, body] of [['double', 1.5, '00000000000000f83f'], ['double', -2.25, '0000000000000002c0'], ['bool', false, '0100'], ['bool', true, '0101'], ['string', '', '0200'], ['string', '§✓', '0205c2a7e29c93']]) {
        const pathCount = !dir.endsWith('/1.21.130')
        const value = { name: 'n', property: 'p', path: '', data_type: type, data, update_count: 0x12345678, ...(pathCount ? { path_update_count: 0x76543210 } : {}) }
        const wire = Buffer.from('016e017000' + body + '78563412' + (pathCount ? '10325476' : ''), 'hex')
        for (const codec of [proto, compiled]) {
          assert.deepStrictEqual(codec.createPacketBuffer('packet', value), wire)
          const parsed = codec.parsePacketBuffer('packet', wire)
          assert.deepStrictEqual(parsed.data, value)
          assert.strictEqual(parsed.metadata.size, wire.length)
        }
      }
    })
  }
})
