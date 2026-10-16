/* eslint-env mocha */

const fs = require('fs')
const path = require('path')
const assert = require('assert')

// From 1.19.3 (protocol 761) vanilla's ClientboundRespawnPacket writes its dataToKeep as a byte (KEEP_ATTRIBUTES 1,
// KEEP_ENTITY_DATA 2, KEEP_ALL_DATA 3; a portal or /tp to another dimension keeps all: 3), no longer
// keepAllPlayerData's boolean. Read as a bool, 3 comes back as true and is written as 1.

const respawnFields = protocol => {
  const container = protocol.play.toClient.types.packet_respawn[1]
  const spawnInfo = protocol.types.SpawnInfo ? protocol.types.SpawnInfo[1] : []
  return [...container, ...spawnInfo]
}

require('./version_iterator')(function (p, versionString) {
  if (!versionString.startsWith('pc ')) return
  const file = path.join(p, 'protocol.json')
  const versionFile = path.join(p, 'version.json')
  if (!fs.existsSync(file) || !fs.existsSync(versionFile)) return
  const version = require(versionFile)
  describe('respawn ' + versionString, function () {
    const field = () => respawnFields(require(file)).find(f => f.name === 'copyMetadata')
    if (version.version >= 0x40000000) return // snapshots number their protocol apart
    if (version.version >= 761) {
      it('keeps the data-to-keep byte as a byte', function () {
        assert.strictEqual(field()?.type, 'u8')
      })
    } else if (version.version >= 735) { // 1.16 - 1.19.2: keepAllPlayerData
      it('keeps keepAllPlayerData as a boolean', function () {
        assert.strictEqual(field()?.type, 'bool')
      })
    }
  })
})
