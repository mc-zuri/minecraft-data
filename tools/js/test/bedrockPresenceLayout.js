/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler

describe('Bedrock presence configuration from 1.26.40', function () {
  for (const version of ['1.26.40', '1.26.45', '1.26.51']) {
    it(`${version} has only the optional rich presence ID`, function () {
      const { types } = require(`../../../data/bedrock/${version}/protocol.json`)
      const definitions = { string: types.string, PresenceInfo: types.PresenceInfo, probe: types.packet_server_presence_info }
      const proto = new ProtoDef(false)
      proto.addTypes(definitions)
      const compiler = new ProtoDefCompiler()
      compiler.addTypesToCompile(definitions)
      for (const codec of [proto, compiler.compileProtoDefSync()]) {
        for (const [data, hex] of [[{ presence_info: undefined }, '00'], [{ presence_info: { rich_presence_id: undefined } }, '0100'], [{ presence_info: { rich_presence_id: '' } }, '010100'], [{ presence_info: { rich_presence_id: 'hub' } }, '010103687562'], [{ presence_info: { rich_presence_id: '✓' } }, '010103e29c93']]) {
          const wire = Buffer.from(hex, 'hex')
          assert.deepStrictEqual(codec.createPacketBuffer('probe', data), wire)
          const parsed = codec.parsePacketBuffer('probe', wire)
          assert.deepStrictEqual(parsed.data, data)
          assert.strictEqual(parsed.metadata.size, wire.length)
        }
      }
    })
  }
})
