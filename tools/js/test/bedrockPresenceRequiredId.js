/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler

describe('Bedrock 1.26.30 presence ID', function () {
  it('requires the ID string after both optional names', function () {
    const { types } = require('../../../data/bedrock/1.26.30/protocol.json')
    const definitions = { string: types.string, probe: types.PresenceInfo }
    const proto = new ProtoDef(false)
    proto.addTypes(definitions)
    const compiler = new ProtoDefCompiler()
    compiler.addTypesToCompile(definitions)
    for (const codec of [proto, compiler.compileProtoDefSync()]) {
      for (let mask = 0; mask < 4; mask++) {
        for (const [id, bytes] of [['', '00'], ['hub', '03687562'], ['✓', '03e29c93']]) {
          const data = { experience_name: mask & 1 ? 'A' : undefined, world_name: mask & 2 ? 'B' : undefined, rich_presence_id: id }
          const wire = Buffer.from((mask & 1 ? '010141' : '00') + (mask & 2 ? '010142' : '00') + bytes, 'hex')
          assert.deepStrictEqual(codec.createPacketBuffer('probe', data), wire)
          const parsed = codec.parsePacketBuffer('probe', wire)
          assert.deepStrictEqual(parsed.data, data)
          assert.strictEqual(parsed.metadata.size, wire.length)
        }
      }
    }
  })
})
