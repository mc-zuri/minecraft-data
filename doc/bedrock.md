## minecraft bedrock edition data

### Generated data

From 1.16.201, `blocks.json`, `blockStates.json`, `blockCollisionShapes.json`, `materials.json` and `items.json` are
generated from what each version's Bedrock Dedicated Server says, not from Java Edition data:

* [bedrock-data-extractor][4] runs each release of the dedicated server with an agent that reads the game's own
  registries, joins it with a client, and writes what it finds to [bedrock-data][5]: one folder per server build
  (`release/<build>/`), whose `build.json` names the server zip (and its sha256) each file was read from. A bedrock-data
  commit names the extractor commit that made it.
* [bedrock-data-generator][6] turns bedrock-data into these files for every version below, and keeps `dataPaths.json`
  pointing at them: a version whose file would say what the version before says points at that version's folder.
  The commit that adds or changes them names the bedrock-data commit and the generator run they were made from.

Where a Linux server says otherwise than the Windows server only because of its compiler or its filesystem, the
Windows server's is written: the chests' collision box up to 1.26.10, the explosion resistance of 21 blocks from 1.21.42
to 1.26.10, and up to 1.26.30 the ids of the items a `vanilla_<version>` behavior pack defines (spears, bundles, trial
keys, the wind charge), which the two servers number in another order. bedrock-data's README lists every difference.

`items.json` is each build's item registry (`start_game`'s itemstates, from 1.21.60 the `item_registry` packet): every
id is the runtime id the server sends, `componentBased` is its `component_based`, and from 1.21.60 `version` and `nbt`
are the entry's own, so the registry a server sends can be written back from it. Its order is not kept: the server sends
the items in an order of its own.

Every version from 1.16.201 to 1.26.51 is generated (0.14, 0.15 and 1.0 have no dedicated server and keep their files),
each from one server build:

| version | server build | version | server build | version | server build |
|-|-|-|-|-|-|
| 1.16.201 | 1.16.201.02 | 1.19.60 | 1.19.60.04 | 1.21.42 | 1.21.42.01 |
| 1.16.210 | 1.16.210.05 | 1.19.62 | 1.19.62.01 | 1.21.50 | 1.21.50.10 (Linux; Windows has 1.21.50.07) |
| 1.16.220 | 1.16.220.02 | 1.19.63 | 1.19.63.01 | 1.21.60 | 1.21.60.10 |
| 1.17.0 | 1.17.0.03 | 1.19.70 | 1.19.70.02 | 1.21.70 | 1.21.70.04 |
| 1.17.10 | 1.17.10.04 | 1.19.80 | 1.19.80.02 | 1.21.80 | 1.21.80.3 |
| 1.17.30 | 1.17.30.04 | 1.20.0 | 1.20.0.01 | 1.21.90 | 1.21.90.3 |
| 1.17.40 | 1.17.40.06 | 1.20.10 | 1.20.11.01 (there is no 1.20.10 server) | 1.21.93 | 1.21.93.1 |
| 1.18.0 | 1.18.0.02 | 1.20.15 | 1.20.15.01 | 1.21.100 | 1.21.100.6 |
| 1.18.11 | 1.18.11.01 | 1.20.30 | 1.20.30.02 | 1.21.111 | 1.21.111.1 |
| 1.18.30 | 1.18.30.04 | 1.20.40 | 1.20.40.01 | 1.21.120 | 1.21.120.4 |
| 1.19.1 | 1.19.1.01 | 1.20.50 | 1.20.50.03 | 1.21.124 | 1.21.124.2 |
| 1.19.10 | 1.19.10.03 | 1.20.61 | 1.20.61.01 | 1.21.130 | 1.21.130.3 |
| 1.19.20 | 1.19.20.02 | 1.20.71 | 1.20.71.01 | 1.26.0 | 1.26.0.2 |
| 1.19.21 | 1.19.21.01 | 1.20.80 | 1.20.80.05 | 1.26.10 | 1.26.10.4 |
| 1.19.30 | 1.19.30.04 | 1.21.0 | 1.21.0.03 | 1.26.20 | 1.26.20.5 |
| 1.19.40 | 1.19.40.02 | 1.21.2 | 1.21.2.02 | 1.26.30 | 1.26.30.5 |
| 1.19.50 | 1.19.50.02 | 1.21.20 | 1.21.20.03 | 1.26.40 | 1.26.40.8 |
| | | 1.21.30 | 1.21.30.03 | 1.26.45 | 1.26.45.1 |
| | | | | 1.26.51 | 1.26.51.1 |

A version minecraft-data adds (its protocol and version files) is generated once bedrock-data has its build: the
extractor finds new server builds on minecraft.net and exports those it supports, and the generator then pushes the
files to a branch of a fork, from which a pull request is opened. To generate them by hand, see bedrock-data-generator's
README (`pnpm generate` writes into a minecraft-data checkout; then run `npm test` in `tools/js`).

### Obtaining data

| file name | info | how to get | schema |
|-|-|-|-|
| blockStates.json | Contains the global block palette for a Minecraft version. <br>Contains all of the possible block states. <br><br><br>The index of a Block State instance here is the paletted ID, <br>which can be used to idenfify this block state<br>instead of a string. | [bedrock-data-generator][6] (from 1.16.201: [Generated data](#generated-data)); before, [bedrock-extractor][1] ("BlockStates.json" file) |  |
| steve.json | Skin data for clients connecting to BE servers, for default Steve character | [bedrock-protocol][2] (capture from proxy) |  |
| blockMappings.json | Output of bedrock-extractor |
| language.json | Translation keys and their English string values. | [extract-minecraft-lang][3] (run for new version, then copy the JSON file to minecraft-data) | |

### Updating protocol data

* To update bedrock protocol data, open `data/bedrock/latest` (or replace "latest" with some older version) and update the `proto.yml` and `types.yml` files.
* Go to `tools/js`, run `npm install` then `npm run build` to update the protodef JSON files

To update to a new protocol version:
* Copy `data/bedrock/latest` files into the old version's folder.
* Open `data/bedrock/latest` and update the `proto.yml` and `types.yml` files and update the `!version` part at the top
* Go to `tools/js`, run `npm install` then `npm run build` to update the protodef JSON files


then run `npm test` to test validity

### Status of data

<!--StartFragment-->
file name | have? | how to get it | notes
-- | -- | -- | --
protocol.json | ✔ | manual updated | wip
blocks.json | ✔ | bedrock-data-generator (from 1.16.201); before, bedrock-extractor | &nbsp;
items.json | ✔ | bedrock-data-generator (from 1.16.201); before, bedrock-extractor | each build's item registry: the ids the server sends, `componentBased`, and from 1.21.60 `version` and `nbt`
entities.json | ✔ | bedrock-extractor  | &nbsp;
recipes.json | ✔ |  bedrock-protocol dumper | new schema: adds furnace and other special recipes. <br/> Some recipes can have multiple outputs, also allow for recipe ingredients with damage values and specific counts.
blockCollisionShapes.json | ✔ | bedrock-data-generator (from 1.16.201: each build's own collision boxes); before, from pc data | New schema: block IDs map to an array of block state indexes, to get the block stateID, minStateId + index of array. This way different copies of the block with different state IDs can have unique collisions. 
commands.json | ❌ | bedrock-protocol + dumper | must be custom schema, current JE schema too low level
biomes.json | ✔ | bedrock-extractor (via Amulet) | 
instruments | ✔ | manual | &nbsp;
materials.json | ✔ | bedrock-data-generator (from 1.16.201: what each build's items dig, at what speed); before, from pc data | &nbsp;
windows.json | ✔ | manual obtained via proxy | &nbsp;
version.json | ✔ | from bedrock-protocol | 
effects.json | ❌ | (from pc data) | &nbsp;
enchantments.json | ✔ | bedrock-extractor (via Geyser -> pc data) | &nbsp;
language.json | ✔ | [extract-minecraft-lang][3] (extract from dedicated server) | &nbsp;
particles.json | 🔵 | bedrock-protocol docs | IDs not needed, handled in protocol
blockLoot.json | 🔵 | manual data for 1.18 | &nbsp;
entityLoot.json | 🔵 | manual data for 1.18 | &nbsp;
mapIcons.json | 🔵 | ? | ?

<!--EndFragment-->

[1]: https://github.com/extremeheat/minecraft-data-extractor/tree/master/bedrock
[2]: https://github.com/PrismarineJS/bedrock-protocol
[3]: https://github.com/CreeperG16/extract-minecraft-lang
[4]: https://github.com/mc-zuri/bedrock-data-extractor
[5]: https://github.com/mc-zuri/bedrock-data
[6]: https://github.com/mc-zuri/bedrock-data-generator
