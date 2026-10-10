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

function action (types, name) {
  return field(types.ItemStackRequest, 'actions').type[1].type[1].find(f => f.anon).type[1].fields[name]
}

function stackProto (types) {
  const proto = new ProtoDef(false)
  const [read, write, size] = proto.types.varint
  const encode = n => ((n << 1) ^ (n >> 31)) >>> 0
  proto.addType('zigzag32', [
    (buffer, offset) => { const r = read(buffer, offset); return { value: (r.value >>> 1) ^ -(r.value & 1), size: r.size } },
    (value, buffer, offset) => write(encode(value), buffer, offset),
    value => size(encode(value))
  ])
  proto.addType('string', types.string)
  return proto
}

describe('Bedrock item stack wire values', () => {
  // Gophertunnel 27724f76 and captured 1.21.20 cartography requests:
  // optional recipe actions contain no craft count between these fields.
  for (const version of ['1.21.2', '1.21.20', '1.21.30']) {
    it(`${version} writes the optional recipe filter index immediately after its ID`, () => {
      const { types } = require(`../../../data/bedrock/${version}/protocol.json`)
      const proto = stackProto(types)
      proto.addType('value', ['container', [...action(types, 'optional')[1], { name: 'next', type: 'u8' }]])
      const value = { recipe_network_id: 300, filtered_string_index: -1, next: 6 }
      const bytes = Buffer.from('ac02ffffffff06', 'hex')
      assert.deepStrictEqual(proto.createPacketBuffer('value', value), bytes)
      assert.deepStrictEqual(proto.parsePacketBuffer('value', bytes).data, value)
    })
  }
  // Recorded 1.21.20/30/42 loom requests and gophertunnel af279425.
  for (const version of ['1.21.20', '1.21.30', '1.21.42', '1.21.50']) {
    it(`${version} keeps the loom count after its pattern`, () => {
      const { types } = require(`../../../data/bedrock/${version}/protocol.json`)
      const proto = stackProto(types)
      proto.addType('value', ['container', [...action(types, 'craft_loom_request')[1], { name: 'next', type: 'u8' }]])
      const value = { pattern: 'bo', times_crafted: 3, next: 6 }
      const bytes = Buffer.from('02626f0306', 'hex')
      assert.deepStrictEqual(proto.createPacketBuffer('value', value), bytes)
      assert.deepStrictEqual(proto.parsePacketBuffer('value', bytes).data, value)
    })
  }
  // The count was introduced in 1.21.20 (gophertunnel d9002856).
  for (const version of ['1.21.20', '1.21.30', '1.21.42', '1.21.50']) {
    it(`${version} keeps the grindstone count before its cost and next action`, () => {
      const { types } = require(`../../../data/bedrock/${version}/protocol.json`)
      const proto = stackProto(types)
      proto.addType('value', ['container', [...action(types, 'craft_grindstone_request')[1], { name: 'next', type: 'u8' }]])
      const value = { recipe_network_id: 300, times_crafted: 2, cost: 0, next: 6 }
      const bytes = Buffer.from('ac02020006', 'hex')
      assert.deepStrictEqual(proto.createPacketBuffer('value', value), bytes)
      assert.deepStrictEqual(proto.parsePacketBuffer('value', bytes).data, value)
    })
  }
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
