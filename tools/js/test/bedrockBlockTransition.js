/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler

describe('Bedrock block transition mapping', function () {
  for (const version of ['1.16.210', '1.16.220', '1.17.0', '1.17.10', '1.17.30', '1.26.51']) {
    it(`${version} serializes each named block transition`, function () {
      const { types } = require(`../../../data/bedrock/${version}/protocol.json`)
      const definitions = { probe: types.packet_update_block_synced[1].find(f => f.name === 'transition_type').type }
      const proto = new ProtoDef(false)
      proto.addTypes(definitions)
      const compiler = new ProtoDefCompiler()
      compiler.addTypesToCompile(definitions)
      for (const codec of [proto, compiler.compileProtoDefSync()]) {
        for (const [id, name] of ['entity', 'create', 'destroy'].entries()) {
          const wire = Buffer.from([id])
          assert.deepStrictEqual(codec.createPacketBuffer('probe', name), wire)
          assert.strictEqual(codec.parsePacketBuffer('probe', wire).data, name)
        }
      }
    })
  }
})
