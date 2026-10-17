/* eslint-env mocha */

const path = require('path')
const assert = require('assert')

// checks entities.json against what vanilla's client registers: each version's own file (dataPaths), once

const data = path.join(__dirname, '../../../data')
const versions = require(path.join(data, 'pc/common/versions.json'))
const dataPaths = require(path.join(data, 'dataPaths.json')).pc
const since = version => versions.indexOf(version)

const files = new Map()
for (const version of versions) {
  const entities = dataPaths[version] && dataPaths[version].entities
  if (entities && !files.has(entities)) files.set(entities, version)
}

for (const [file, version] of files) {
  describe('audit entities ' + file, function () {
    const entities = require(path.join(data, file, 'entities.json'))
    // from 1.11 an entity is named by its registry name (EntityType's "iron_golem", "command_block_minecart"); the
    // objects' list keeps the older names
    if (since(version) >= since('1.11')) {
      it('the entities that are not objects have their registry names', function () {
        assert.deepStrictEqual(entities.filter(e => e.type !== 'object' && !/^[a-z0-9_]+$/.test(e.name)).map(e => e.name), [])
      })
    }
    // before 1.14 an object (spawn_entity's type) is named as the entity the client spawns for it is registered
    // (EntityList, EntityType); the fishing hook, which none registers before 1.13, keeps its name
    const objectNames = [
      ['1.7', '1.9', { 62: 'ThrownEgg' }],
      ['1.9', '1.11', { 3: 'AreaEffectCloud', 62: 'ThrownEgg', 93: 'DragonFireball' }],
      ['1.13', '1.14', { 2: 'item', 3: 'area_effect_cloud', 50: 'tnt', 51: 'end_crystal', 60: 'arrow', 64: 'small_fireball', 65: 'ender_pearl', 70: 'falling_block', 71: 'item_frame', 72: 'eye_of_ender', 73: 'potion', 75: 'experience_bottle', 78: 'armor_stand', 79: 'evoker_fangs', 90: 'fishing_bobber' }]
    ]
    for (const [from, until, names] of objectNames) {
      if (since(version) < since(from) || since(version) >= since(until)) continue
      it('the objects are named as the entities they spawn', function () {
        const wrong = Object.entries(names).filter(([id, name]) => !entities.some(e => e.type === 'object' && e.id === Number(id) && e.name === name))
        assert.deepStrictEqual(wrong.map(([id, name]) => `${id} ${name}`), [])
      })
    }
    // before 1.11 the entities' list holds what EntityList registers that is not spawned as an object (the living, the
    // experience orb and the painting), by its EntityList id
    const listed = [
      ['1.7', '1.11', ['XPOrb', 'Painting', 'Mob', 'Monster']],
      ['1.10', '1.11', ['PolarBear']]
    ]
    for (const [from, until, names] of listed) {
      if (since(version) < since(from) || since(version) >= since(until)) continue
      it(`${names.join(', ')} are listed`, function () {
        assert.deepStrictEqual(names.filter(name => !entities.some(e => e.type === 'mob' && e.name === name)), [])
      })
    }
    if (since(version) >= since('1.7') && since(version) < since('1.8')) {
      it('the firework rocket (76) and the leash knot (77) are objects', function () {
        assert.deepStrictEqual([76, 77].filter(id => !entities.some(e => e.type === 'object' && e.id === id)), [])
      })
    }
    it('every entity has a width and a height', function () {
      assert.deepStrictEqual(entities.filter(e => typeof e.width !== 'number' || typeof e.height !== 'number').map(e => e.name), [])
    })
    // sizes the clients before 1.14 give, from their entity classes' setSize, as floats (the jars' EntityType.sized since)
    const sizes = [
      [/^(Zombie|zombie|PigZombie|zombie_pigman|Witch|witch)$/, '1.8', '1.14', [0.6, 1.95]],
      [/^(ArmorStand|armor_stand|armorstand)$/, '1.8', '1.14', [0.5, 1.975]],
      [/^(Creeper|creeper)$/, '1.9', '1.14', [0.6, 1.7]],
      [/^(Skeleton|skeleton|stray)$/, '1.9', '1.14', [0.6, 1.99]],
      [/^(Villager|villager)$/, '1.9', '1.14', [0.6, 1.95]],
      [/^(Squid|squid)$/, '1.9', '1.14', [0.8, 0.8]],
      [/^(VillagerGolem|villager_golem|iron_golem)$/, '1.9', '1.14', [1.4, 2.7]],
      [/^(Rabbit|rabbit)$/, '1.9', '1.14', [0.4, 0.5]],
      [/^(AreaEffectCloud|area_effect_cloud|area_effect cloud)$/, '1.9', '1.14', [6, 0.5]],
      // GiantEntity: setSize(width * 6.0F, height * 6.0F) of the 0.6F x 1.8F it starts with
      [/^(Giant|giant)$/, '1.7', '1.14', [3.6000001, 10.799999]],
      [/^cod$/, '1.13', '1.14', [0.5, 0.3]]
    ]
    for (const [names, from, until, [width, height]] of sizes) {
      if (since(version) < since(from) || (until && since(version) >= since(until))) continue
      it(`${names.source} is ${width} x ${height}`, function () {
        assert.deepStrictEqual(entities.filter(e => names.test(e.name) && (e.width !== width || e.height !== height)).map(e => `${e.name} ${e.width} x ${e.height}`), [])
      })
    }
    // (the crosshair picks a living entity by its type: a mob of none is never picked)
    it('every entity has a type', function () {
      assert.deepStrictEqual(entities.filter(e => !e.type || e.type === 'UNKNOWN').map(e => e.name), [])
    })
    // from 1.9 the horses (AbstractHorse: setSize, then EntityType.sized), the hoglin and the zoglin are 1.3964844F wide
    if (since(version) >= since('1.9')) {
      it('the horse family, the hoglin and the zoglin are 1.3964844F wide', function () {
        const family = /^(EntityHorse|horse|donkey|mule|skeleton_horse|zombie_horse|hoglin|zoglin)$/
        assert.deepStrictEqual(entities.filter(e => family.test(e.name) && e.width !== 1.3964844).map(e => `${e.name} ${e.width}`), [])
      })
    }
    if (since(version) >= since('1.13')) {
      it('the command block minecart, the firework rocket and the iron golem are named as EntityType registers them', function () {
        const names = new Set(entities.filter(e => e.type !== 'object').map(e => e.name))
        assert.deepStrictEqual(['command_block_minecart', 'firework_rocket', 'iron_golem'].filter(name => !names.has(name)), [])
      })
    }
  })
}
