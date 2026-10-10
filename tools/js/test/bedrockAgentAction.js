/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler
const paths = require('../../../data/dataPaths.json').bedrock

describe('Bedrock agent action responses', function () {
  for (const dir of new Set(Object.values(paths).map(p => p.protocol).filter(Boolean))) {
    const { types } = require(`../../../data/${dir}/protocol.json`)
    if (!types.packet_agent_action) continue
    it(`${dir} places the JSON response after a fixed-width action`, function () {
      const action = types.packet_agent_action[1].find(f => f.name === 'action_type')
      assert.strictEqual(action.type[1].type, 'li32')
      const definitions = { string: types.string, packet: types.packet_agent_action }
      const proto = new ProtoDef(false)
      proto.addTypes(definitions)
      const compiler = new ProtoDefCompiler()
      compiler.addTypesToCompile(definitions)
      const compiled = compiler.compileProtoDefSync()
      // Exact game writers use 01 00 00 00 for Attack, followed by the
      // length-prefixed JSON text. Test every named action and JSON scalars.
      for (let n = 1; n <= 18; n++) {
        const body = ['null\n', '42\n', '1.5\n', 'true\n'][(n - 1) % 4]
        const value = { request_id: 'r', action_type: action.type[1].mappings[n], body }
        const fixed = Buffer.alloc(4)
        fixed.writeInt32LE(n)
        const wire = Buffer.concat([Buffer.from([1, 114]), fixed, Buffer.from([body.length]), Buffer.from(body)])
        for (const codec of [proto, compiled]) {
          assert.deepStrictEqual(codec.createPacketBuffer('packet', value), wire)
          const decoded = codec.parsePacketBuffer('packet', wire)
          assert.deepStrictEqual(decoded.data, value)
          assert.strictEqual(decoded.metadata.size, wire.length)
        }
      }
    })
  }
})
