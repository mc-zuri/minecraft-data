/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler
const paths = require('../../../data/dataPaths.json').bedrock

describe('Bedrock command parameter option bits', function () {
  for (const dir of new Set(Object.values(paths).map(p => p.protocol).filter(Boolean))) {
    const { types } = require(`../../../data/${dir}/protocol.json`)
    if (!types.CommandFlags) continue
    it(`${dir} reads the named low bits and preserves the whole byte`, function () {
      const chained = !['1.16.201', '1.16.210', '1.16.220', '1.17.0', '1.17.10'].includes(dir.split('/')[1])
      const proto = new ProtoDef(false)
      proto.addType('flags', types.CommandFlags)
      const compiler = new ProtoDefCompiler()
      compiler.addTypesToCompile({ flags: types.CommandFlags })
      const compiled = compiler.compileProtoDefSync()
      // Gophertunnel ParamOption constants and the game-written command table:
      // CollapseEnum=1, HasSemanticConstraint=2, AsChainedCommand=4.
      for (let byte = 0; byte <= 255; byte++) {
        const expected = { unused: byte >>> (chained ? 3 : 2) }
        if (chained) expected.as_chained_command = (byte >>> 2) & 1
        expected.has_semantic_constraint = (byte >>> 1) & 1
        expected.collapse_enum = byte & 1
        const wire = Buffer.from([byte])
        for (const codec of [proto, compiled]) {
          const decoded = codec.parsePacketBuffer('flags', wire)
          assert.deepStrictEqual(decoded.data, expected, `byte ${byte}`)
          assert.strictEqual(decoded.metadata.size, 1)
          assert.deepStrictEqual(codec.createPacketBuffer('flags', expected), wire)
        }
      }
    })
  }
})
