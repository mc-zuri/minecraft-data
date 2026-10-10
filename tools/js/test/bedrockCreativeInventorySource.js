/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler

describe('Bedrock creative inventory action source', function () {
  for (const version of ['1.16.201', '1.16.210']) {
    it(`${version} reads the slot immediately after the creative source tag`, function () {
      const { types } = require(`../../../data/bedrock/${version}/protocol.json`)
      const actions = version === '1.16.201'
        ? types.Transaction[1].find(f => f.name === 'inventory_actions').type
        : types.TransactionActions[1].find(f => f.name === 'actions').type
      const fields = actions[1].type[1]
      const definitions = { probe: ['container', fields.slice(0, 3)] }
      const proto = new ProtoDef(false)
      proto.addTypes(definitions)
      const compiler = new ProtoDefCompiler()
      compiler.addTypesToCompile(definitions)
      for (const codec of [proto, compiler.compileProtoDefSync()]) {
        for (const [data, hex] of [[{ source_type: 'creative', slot: 1 }, '0301'], [{ source_type: 'creative', slot: 129 }, '038101'], [{ source_type: 'container', inventory_id: 0, slot: 2 }, '000002']]) {
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
