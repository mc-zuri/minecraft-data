/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const protocol = require('../../../data/pc/1.20.3/protocol.json')

// On 1.20.3 and 1.20.4 ClientboundExplodePacket writes its sound with SoundEvent.writeToNetwork: the
// sound's identifier and an optional fixed range, not a registry holder (that came with 1.20.5).
// The bytes are an explosion packet as the vanilla 1.20.4 server writes it, without the packet id.
const packet = Buffer.from(
  '400c000000000000405940000000000040434000000000004000000000be61417b3df346b80000000000171620' +
  '6d696e6563726166743a656e746974792e67656e657269632e6578706c6f646500', 'hex')

describe('pc/1.20.3 explosion', () => {
  it('reads the whole packet a vanilla server writes', () => {
    const proto = new ProtoDef(false)
    proto.addTypes(protocol.types)
    proto.addTypes(protocol.play.toClient.types)
    const { data, metadata } = proto.parsePacketBuffer('packet_explosion', packet)
    assert.strictEqual(metadata.size, packet.length)
    assert.deepStrictEqual(data.sound, { soundName: 'minecraft:entity.generic.explode', fixedRange: undefined })
    assert.deepStrictEqual(proto.createPacketBuffer('packet_explosion', data), packet)
  })
})
