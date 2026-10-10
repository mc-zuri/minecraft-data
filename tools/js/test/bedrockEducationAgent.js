/* eslint-env mocha */
const assert = require('assert')
const { ProtoDefCompiler } = require('protodef').Compiler
const paths = require('../../../data/dataPaths.json').bedrock

describe('Bedrock education agent capabilities', function () {
  for (const dir of new Set(Object.values(paths).map(p => p.protocol).filter(Boolean))) {
    const { types } = require(`../../../data/${dir}/protocol.json`)
    const fields = types.packet_education_settings?.[1].filter(f => ['has_agent_capabilities', 'agent_capabilities'].includes(f.name))
    if (!fields?.length) continue
    it(`${dir} permits absent nested block-modification capabilities`, function () {
      const compiler = new ProtoDefCompiler()
      compiler.addTypesToCompile({ probe: ['container', [...fields, { name: 'sentinel', type: 'u8' }]] })
      const codec = compiler.compileProtoDefSync()
      for (const [capabilities, hex] of [[undefined, '00'], [{ has: false, can_modify_blocks: undefined }, '0100'], [{ has: true, can_modify_blocks: false }, '010100'], [{ has: true, can_modify_blocks: true }, '010101']]) {
        const value = { has_agent_capabilities: capabilities !== undefined, agent_capabilities: capabilities, sentinel: 0xa5 }
        const wire = Buffer.from(hex + 'a5', 'hex')
        assert.deepStrictEqual(codec.createPacketBuffer('probe', value), wire)
        const parsed = codec.parsePacketBuffer('probe', wire)
        assert.deepStrictEqual(parsed.data, value)
        assert.strictEqual(parsed.metadata.size, wire.length)
      }
    })
  }
})
