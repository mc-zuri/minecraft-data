/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler
const paths = require('../../../data/dataPaths.json').bedrock

describe('Bedrock camera entity attachment', function () {
  for (const dir of new Set(Object.values(paths).map(p => p.protocol).filter(Boolean))) {
    const { types } = require(`../../../data/${dir}/protocol.json`)
    const field = types.packet_camera_instruction?.[1]?.find(f => f.name === 'attach_to_entity')
    if (!field) continue
    it(`${dir} includes the actor locator only in 1.26.0`, function () {
      const definitions = { probe: ['container', [field, { name: 'sentinel', type: 'u8' }]] }
      const proto = new ProtoDef(false)
      proto.addTypes(definitions)
      const compiler = new ProtoDefCompiler()
      compiler.addTypesToCompile(definitions)
      const locator = dir === 'bedrock/1.26.0'
      for (const codec of [proto, compiler.compileProtoDefSync()]) {
        for (const position of [undefined, 0, 1, 8]) {
          const entity = codec.parsePacketBuffer('probe', Buffer.from('00a5', 'hex')).data
          if (position === undefined) {
            assert.deepStrictEqual(entity, { attach_to_entity: undefined, sentinel: 0xa5 })
            assert.deepStrictEqual(codec.createPacketBuffer('probe', entity), Buffer.from('00a5', 'hex'))
            continue
          }
          const idBytes = Buffer.from('01000000ffffffff', 'hex') // -4294967295, signed little endian.
          const locatorBytes = Buffer.alloc(locator ? 4 : 0)
          if (locator) locatorBytes.writeInt32LE(position)
          const wire = Buffer.concat([Buffer.from([1]), idBytes, locatorBytes, Buffer.from([0xa5])])
          const parsed = codec.parsePacketBuffer('probe', wire)
          assert.strictEqual(parsed.metadata.size, wire.length)
          const id = locator ? parsed.data.attach_to_entity.entity_id : parsed.data.attach_to_entity
          assert.strictEqual(BigInt(id), -4294967295n)
          if (locator) assert.strictEqual(parsed.data.attach_to_entity.actor_locator, position)
          assert.strictEqual(parsed.data.sentinel, 0xa5)
          assert.deepStrictEqual(codec.createPacketBuffer('probe', parsed.data), wire)
        }
      }
    })
  }
})
