/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler

describe('Bedrock party presence', function () {
  for (const version of ['1.26.10', '1.26.20', '1.26.30', '1.26.40', '1.26.45', '1.26.51']) {
    it(`${version} distinguishes absent parties from empty IDs`, function () {
      const { types } = require(`../../../data/bedrock/${version}/protocol.json`)
      const definitions = { string: types.string, probe: types.packet_party_changed }
      if (types.PartyInfo) definitions.PartyInfo = types.PartyInfo
      const proto = new ProtoDef(false)
      proto.addTypes(definitions)
      const compiler = new ProtoDefCompiler()
      compiler.addTypesToCompile(definitions)
      const early = version === '1.26.10'
      const field = early ? 'party_id' : 'party_info'
      for (const codec of [proto, compiler.compileProtoDefSync()]) {
        const absent = Buffer.from([0])
        assert.deepStrictEqual(codec.createPacketBuffer('probe', { [field]: undefined }), absent)
        assert.strictEqual(codec.parsePacketBuffer('probe', absent).data[field], undefined)
        for (const [id, hex] of [['', '00'], ['party', '057061727479'], ['✓', '03e29c93']]) {
          for (const leader of early ? [false] : [false, true]) {
            const value = early ? id : { party_id: id, party_leader: leader }
            const wire = Buffer.concat([Buffer.from('01' + hex, 'hex'), early ? Buffer.alloc(0) : Buffer.from([Number(leader)])])
            assert.deepStrictEqual(codec.createPacketBuffer('probe', { [field]: value }), wire)
            const parsed = codec.parsePacketBuffer('probe', wire)
            assert.strictEqual(parsed.metadata.size, wire.length)
            assert.deepStrictEqual(parsed.data[field], value)
          }
        }
      }
    })
  }
})
