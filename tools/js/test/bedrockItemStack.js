/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler
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
  return field(types.ItemStackRequest || types.ItemStackRequests, 'actions').type[1].type[1].find(f => f.anon).type[1].fields[name]
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
  // Exact 1.16.201.02 reader/writer and gophertunnel v1.10.0:
  // rejected responses end after the request ID, without a container count.
  for (const version of ['1.16.201', '1.16.210', '1.16.220']) {
    it(`${version} reads rejected responses followed by a successful response`, () => {
      const { types } = require(`../../../data/bedrock/${version}/protocol.json`)
      const proto = stackProto(types)
      if (types.ContainerSlotType) proto.addType('ContainerSlotType', types.ContainerSlotType)
      proto.addType('responses', types.ItemStackResponses)
      const compiler = new ProtoDefCompiler()
      compiler.addTypesToCompile({ string: types.string, ...(types.ContainerSlotType ? { ContainerSlotType: types.ContainerSlotType } : {}), responses: types.ItemStackResponses })
      compiler.addTypes({ Read: { zigzag32: ['native', proto.types.zigzag32[0]] }, Write: { zigzag32: ['native', proto.types.zigzag32[1]] }, SizeOf: { zigzag32: ['native', proto.types.zigzag32[2]] } })
      const compiled = compiler.compileProtoDefSync()
      const status = version === '1.16.201' ? { result: 1 } : { status: 'error' }
      const success = version === '1.16.201' ? { result: 0 } : { status: 'ok' }
      const cases = [
        [[{ ...status, request_id: -1 }], '010101'],
        [[{ ...status, request_id: -65 }, { ...success, request_id: -3, containers: [] }], '02018101000500']
      ]
      for (const [value, hex] of cases) {
        const bytes = Buffer.from(hex, 'hex')
        assert.deepStrictEqual(compiled.createPacketBuffer('responses', value), bytes)
        const decoded = compiled.parsePacketBuffer('responses', bytes)
        assert.deepStrictEqual(decoded.data, value)
        assert.strictEqual(decoded.metadata.size, bytes.length)
      }
    })
  }
  // NetworkItemInstanceDescriptorData has the same four descriptor alternatives
  // as the adjacent auto-craft ingredient type (protocols 2168, 2169, 2193).
  for (const version of ['1.26.40', '1.26.45', '1.26.51']) {
    it(`${version} covers every deprecated craft-result descriptor alternative`, () => {
      const { types } = require(`../../../data/bedrock/${version}/protocol.json`)
      const proto = stackProto(types)
      // The user data is length delimited; keep it empty to isolate descriptors.
      proto.addType('value', ['container', [...types.ItemStackRequestInstanceDescriptor[1].slice(0, -1), { name: 'extra', type: ['buffer', { countType: 'varint' }] }]])
      const cases = [
        [{ type: 'invalid', legacy_type: 0 }, '000001000000'],
        [{ type: 'name', legacy_type: 1, name: 'minecraft:stone', metadata: 129 }, '01010f6d696e6563726166743a73746f6e65820201000000'],
        [{ type: 'molang', legacy_type: 2, expression: '1', version: 256 }, '02020131000101000000'],
        [{ type: 'item_tag', legacy_type: 3, tag: 'wood' }, '030304776f6f6401000000']
      ]
      for (const [descriptor, hex] of cases) {
        const value = { ...descriptor, count: 1, block_runtime_id: 0, extra: Buffer.alloc(0) }
        const bytes = Buffer.from(hex, 'hex')
        assert.deepStrictEqual(proto.createPacketBuffer('value', value), bytes)
        const decoded = proto.parsePacketBuffer('value', bytes)
        assert.strictEqual(decoded.metadata.size, bytes.length)
        for (const [key, expected] of Object.entries(value)) assert.deepStrictEqual(decoded.data[key], expected)
      }
    })
  }
  // Before 1.17.10, auto-craft contained only the recipe network ID.
  for (const version of ['1.16.201', '1.16.210', '1.16.220', '1.17.0', '1.17.10']) {
    it(`${version} places the next action after the version-specific auto-craft payload`, () => {
      const { types } = require(`../../../data/bedrock/${version}/protocol.json`)
      const proto = stackProto(types)
      proto.addType('value', ['container', [...action(types, 'craft_recipe_auto')[1], { name: 'next', type: 'u8' }]])
      const value = { recipe_network_id: 300, next: 15 }
      if (version === '1.17.10') value.times_crafted = 2
      const bytes = Buffer.from(version === '1.17.10' ? 'ac02020f' : 'ac020f', 'hex')
      assert.deepStrictEqual(proto.createPacketBuffer('value', value), bytes)
      assert.deepStrictEqual(proto.parsePacketBuffer('value', bytes).data, value)
    })
  }
  // The descriptor-based craft results still carry shield blocking ticks.
  // Gophertunnel StackRequestItem selects user data by "minecraft:shield".
  for (const version of ['1.26.40', '1.26.45', '1.26.51']) {
    it(`${version} retains shield blocking ticks inside deprecated craft results`, () => {
      const { types } = require(`../../../data/bedrock/${version}/protocol.json`)
      const proto = stackProto(types)
      proto.addTypes({ ShortString: types.ShortString, ItemExtraDataWithBlockingTick: types.ItemExtraDataWithBlockingTick, ItemExtraDataWithoutBlockingTick: types.ItemExtraDataWithoutBlockingTick })
      const extra = JSON.parse(JSON.stringify(field(types.ItemStackRequestInstanceDescriptor, 'extra')))
      // Test the inner user-data payload independently of its length wrapper.
      if (extra.type[0] === 'switch') {
        const args = extra.type[1]
        for (const key of Object.keys(args.fields)) args.fields[key] = args.fields[key][1].type
        args.default = args.default[1].type
      } else extra.type = extra.type[1].type
      const valueType = ['container', [...types.ItemStackRequestInstanceDescriptor[1].slice(0, -1), extra]]
      proto.addType('value', valueType)
      const compiler = new ProtoDefCompiler()
      compiler.addTypesToCompile({ string: types.string, ShortString: types.ShortString, lnbt: 'void', ItemExtraDataWithBlockingTick: types.ItemExtraDataWithBlockingTick, ItemExtraDataWithoutBlockingTick: types.ItemExtraDataWithoutBlockingTick, value: valueType })
      compiler.addTypes({ Read: { zigzag32: ['native', proto.types.zigzag32[0]] }, Write: { zigzag32: ['native', proto.types.zigzag32[1]] }, SizeOf: { zigzag32: ['native', proto.types.zigzag32[2]] } })
      const compiled = compiler.compileProtoDefSync()
      for (const shield of [false, true]) {
        const name = shield ? 'minecraft:shield' : 'minecraft:stone'
        const data = { has_nbt: 'false', can_place_on: [], can_destroy: [] }
        if (shield) data.blocking_tick = 0x0123456789abcdefn
        const prefix = Buffer.concat([Buffer.from([1, 1, name.length]), Buffer.from(name), Buffer.from('00010000', 'hex')])
        const bytes = Buffer.concat([prefix, Buffer.from('00000000000000000000' + (shield ? 'efcdab8967452301' : ''), 'hex')])
        for (const codec of [proto, compiled]) {
          assert.deepStrictEqual(codec.createPacketBuffer('value', { type: 'name', legacy_type: 1, name, metadata: 0, count: 1, block_runtime_id: 0, extra: data }), bytes)
          const decoded = codec.parsePacketBuffer('value', bytes)
          assert.strictEqual(decoded.metadata.size, bytes.length)
          if (shield) assert.strictEqual(BigInt(decoded.data.extra.blocking_tick), data.blocking_tick)
        }
      }
    })
  }
  // Both IDs have used signed Varint32 since gophertunnel cc9a209 (1.16).
  for (const version of ['1.16.201', '1.16.210', '1.16.220']) {
    it(`${version} decodes negative response request IDs and exact stack IDs`, () => {
      const { types } = require(`../../../data/bedrock/${version}/protocol.json`)
      const proto = stackProto(types)
      proto.addType('ids', ['container', [field(types.ItemStackResponses, 'request_id'), field(types.ItemStackResponses, 'item_stack_id')]])
      for (const [value, hex] of [[{ request_id: -65, item_stack_id: 64 }, '81018001'], [{ request_id: -2147483647, item_stack_id: 2147483647 }, 'fdffffff0ffeffffff0f']]) {
        const bytes = Buffer.from(hex, 'hex')
        assert.deepStrictEqual(proto.createPacketBuffer('ids', value), bytes)
        assert.deepStrictEqual(proto.parsePacketBuffer('ids', bytes).data, value)
      }
    })
  }
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
    const grindstone = types.ItemStackRequest && action(types, 'craft_grindstone_request')
    if (grindstone) {
      it(`${version} preserves signed grindstone costs and ZigZag length transitions`, () => {
        const proto = stackProto(types)
        proto.addType('cost', field(grindstone, 'cost').type)
        for (const [value, hex] of [[0, '00'], [1, '02'], [-1, '01'], [63, '7e'], [64, '8001'], [-65, '8101'], [2147483647, 'feffffff0f'], [-2147483648, 'ffffffff0f']]) {
          const bytes = Buffer.from(hex, 'hex')
          assert.deepStrictEqual(proto.createPacketBuffer('cost', value), bytes)
          assert.strictEqual(proto.parsePacketBuffer('cost', bytes).data, value)
        }
      })
    }
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
