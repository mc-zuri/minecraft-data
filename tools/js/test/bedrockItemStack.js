/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { readdirSync, existsSync } = require('fs')
const { join } = require('path')

function field (value, name) {
  if (!value || typeof value !== 'object') return
  if (value.name === name && value.type) return value
  for (const child of Object.values(value)) {
    const found = field(child, name)
    if (found) return found
  }
}

describe('Bedrock item stack wire values', () => {
  // Gophertunnel introduced FullContainerName in d9002856 (1.21.20).
  // Uint32 is little endian, including when the value later became optional.
  const bedrock = join(__dirname, '../../../data/bedrock')
  for (const version of readdirSync(bedrock)) {
    const file = join(bedrock, version, 'protocol.json')
    if (!existsSync(file)) continue
    const { types } = require(file)
    if (!types.FullContainerName) continue
    it(`${version} reads and writes unsigned dynamic container IDs in little endian`, () => {
      const proto = new ProtoDef(false)
      proto.addType('ContainerSlotType', types.ContainerSlotType)
      proto.addType('value', types.FullContainerName)
      for (const [id, hex] of [[0, '00000000'], [0x12345678, '78563412'], [0x89abcdef, 'efcdab89'], [0xffffffff, 'ffffffff']]) {
        const value = { container_id: 'inventory', dynamic_container_id: id }
        const optional = Array.isArray(field(types.FullContainerName, 'dynamic_container_id').type)
        const bytes = Buffer.from('1d' + (optional ? '01' : '') + hex, 'hex')
        assert.deepStrictEqual(proto.createPacketBuffer('value', value), bytes)
        assert.deepStrictEqual(proto.parsePacketBuffer('value', bytes).data, value)
      }
    })
  }
  // Bedrock::Safety::RedactableString (protocols 2168, 2169, 2193), and
  // gophertunnel 283a5a97: the redacted value has its own presence byte.
  for (const version of ['1.26.40', '1.26.45', '1.26.51']) {
    it(`${version} preserves absent, empty and multibyte filtered response names`, () => {
      const { types } = require(`../../../data/bedrock/${version}/protocol.json`)
      const proto = new ProtoDef(false)
      proto.addType('string', types.string)
      proto.addType('value', ['container', [field(types.ItemStackResponses, 'filtered_custom_name'), { name: 'next', type: 'u8' }]])
      for (const [name, hex] of [[undefined, '00ab'], ['', '0100ab'], ['é', '0102c3a9ab']]) {
        const value = { filtered_custom_name: name, next: 171 }
        const bytes = Buffer.from(hex, 'hex')
        assert.deepStrictEqual(proto.createPacketBuffer('value', value), bytes)
        const decoded = proto.parsePacketBuffer('value', bytes)
        assert.strictEqual(decoded.data.filtered_custom_name, name)
        assert.strictEqual(decoded.data.next, 171)
        assert.strictEqual(decoded.metadata.size, bytes.length)
      }
    })
  }
  it('keeps the pre-1.26.40 filtered name as a mandatory string', () => {
    for (const version of ['1.21.50', '1.26.30']) {
      const { types } = require(`../../../data/bedrock/${version}/protocol.json`)
      assert.strictEqual(field(types.ItemStackResponses, 'filtered_custom_name').type, 'string')
    }
  })
})
