/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const dataPaths = require('../../../data/dataPaths.json')

// From 1.21.2 the explosion packet carries the player's knockback as an optional Vec3
// (ClientboundExplodePacket, Vec3.STREAM_CODEC): three doubles. Read as floats, the rest of
// the packet is misaligned and the knockback values are garbage.
const versions = Object.keys(dataPaths.pc).filter(version => {
  const protocol = require(`../../../data/${dataPaths.pc[version].protocol}/protocol.json`)
  const explosion = protocol.play?.toClient.types.packet_explosion
  return explosion?.[1].some(field => field.name === 'playerKnockback')
})

describe('pc explosion playerKnockback', () => {
  it('exists from 1.21.2', () => assert.ok(versions.includes('1.21.3')))
  for (const version of versions) {
    it(`${version} reads the knockback as three doubles`, () => {
      const protocol = require(`../../../data/${dataPaths.pc[version].protocol}/protocol.json`)
      const proto = new ProtoDef(false)
      proto.addTypes(protocol.types)
      const field = protocol.play.toClient.types.packet_explosion[1].find(field => field.name === 'playerKnockback')
      proto.addType('knockback', field.type)
      const knockback = { x: -0.22, y: 0.119, z: 0 }
      const buffer = proto.createPacketBuffer('knockback', knockback)
      assert.strictEqual(buffer.length, 1 + 3 * 8)
      assert.deepStrictEqual(buffer.subarray(1, 9), Buffer.from('bfcc28f5c28f5c29', 'hex'))
      assert.deepStrictEqual(proto.parsePacketBuffer('knockback', buffer).data, knockback)
    })
  }
})
