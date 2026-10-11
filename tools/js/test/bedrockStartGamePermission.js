/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler
const paths = require('../../../data/dataPaths.json').bedrock

describe('Bedrock start game permission encoding', function () {
  for (const path of [...new Set(Object.values(paths).map(p => p.protocol))].filter(Boolean)) {
    const { types } = require(`../../../data/${path}/protocol.json`)
    const field = types.packet_start_game?.[1]?.find?.(f => f.name === 'permission_level')
    if (!field) continue
    it(`${path} uses the version-specific permission wire type`, function () {
      const modern = ['bedrock/1.26.40', 'bedrock/1.26.45', 'bedrock/1.26.51'].includes(path)
      const definitions = { probe: ['container', [field, { name: 'next', type: 'li32' }]] }
      for (const name of ['PermissionLevel', 'PermissionLevel_', 'PermissionLevelZigzag32']) if (types[name]) definitions[name] = types[name]
      const proto = new ProtoDef(false)
      proto.addTypes(definitions)
      const compiler = new ProtoDefCompiler()
      compiler.addTypesToCompile(definitions)
      for (const codec of [proto, compiler.compileProtoDefSync()]) {
        for (const [level, name] of ['visitor', 'member', 'operator', 'custom'].entries()) {
          const data = { permission_level: field.type === 'zigzag32' ? level : name, next: 0x40302010 }
          const wire = Buffer.from([modern ? level : level * 2, 0x10, 0x20, 0x30, 0x40])
          assert.deepStrictEqual(codec.createPacketBuffer('probe', data), wire)
          const decoded = codec.parsePacketBuffer('probe', wire)
          assert.strictEqual(decoded.metadata.size, wire.length)
          assert.deepStrictEqual(decoded.data, data)
        }
      }
    })
  }
})
