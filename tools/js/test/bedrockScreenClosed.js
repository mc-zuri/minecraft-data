/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler
const paths = require('../../../data/dataPaths.json').bedrock

describe('Bedrock data-driven screen closed form ID', function () {
  for (const dir of new Set(Object.values(paths).map(p => p.protocol).filter(Boolean))) {
    const { types } = require(`../../../data/${dir}/protocol.json`)
    const packet = types.packet_serverbound_data_driven_screen_closed
    if (!packet) continue
    it(`${dir} writes a mandatory unsigned form ID before every close reason`, function () {
      // Isolate the ID: some versions also have a separate close-reason
      // encoding defect. The independent string tail detects an extra byte.
      const definitions = { string: types.string, packet: ['container', [packet[1].find(f => f.name === 'form_id'), { name: 'close_reason', type: 'string' }]] }
      const proto = new ProtoDef(false)
      proto.addTypes(definitions)
      const compiler = new ProtoDefCompiler()
      compiler.addTypesToCompile(definitions)
      const compiled = compiler.compileProtoDefSync()
      for (const id of [0, 1, 0x12345678, 0xffffffff]) {
        for (const reason of ['programmaticclose', 'programmaticcloseall', 'clientcanceled', 'userbusy', 'invalidform']) {
          const value = { form_id: id, close_reason: reason }
          const fixed = Buffer.alloc(4)
          fixed.writeUInt32LE(id)
          const wire = Buffer.concat([fixed, Buffer.from([reason.length]), Buffer.from(reason)])
          for (const codec of [proto, compiled]) {
            assert.deepStrictEqual(codec.createPacketBuffer('packet', value), wire)
            const parsed = codec.parsePacketBuffer('packet', wire)
            assert.deepStrictEqual(parsed.data, value)
            assert.strictEqual(parsed.metadata.size, wire.length)
          }
        }
      }
    })
  }
})
