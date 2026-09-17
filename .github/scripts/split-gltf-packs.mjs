import fs from 'node:fs/promises';
import path from 'node:path';
import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { copyToDocument, prune } from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';

const TARGETS = [
  'assets/low_poly_market_stall_pack.glb',
  'assets/low_poly_medieval_houses_pack.glb',
  'assets/low_poly_medieval_village_props.glb',
  'assets/low_poly_winter_medieval_castle_and_town_pack.glb',
  'assets/lowpoly_fish_pack.glb',
  'assets/lowpoly_trees_-_free_model_of_the_month.glb',
];

const EXPECTED_COUNTS = new Map([
  ['low_poly_market_stall_pack', 3],
  ['low_poly_medieval_houses_pack', 5],
  ['low_poly_medieval_village_props', 22],
  ['low_poly_winter_medieval_castle_and_town_pack', 50],
  ['lowpoly_fish_pack', 3],
  ['lowpoly_trees_-_free_model_of_the_month', 3],
]);

await MeshoptDecoder.ready;
await MeshoptEncoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    'draco3d.decoder': await draco3d.createDecoderModule(),
    'draco3d.encoder': await draco3d.createEncoderModule(),
    'meshopt.decoder': MeshoptDecoder,
    'meshopt.encoder': MeshoptEncoder,
  });

function slug(value) {
  return value
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

function numericSuffix(name, prefix) {
  const match = name.match(new RegExp(`^${prefix}(\\d+)$`));
  return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
}

function getRootNode(document) {
  const nodes = document.getRoot().listNodes().filter((node) => node.getName() === 'RootNode');
  if (nodes.length !== 1) throw new Error(`Expected one RootNode, found ${nodes.length}.`);
  return nodes[0];
}

function hasCollider(node) {
  let found = false;
  node.traverse((entry) => {
    if ((entry.getMesh()?.getName() || '').includes('COLLIDER')) found = true;
  });
  return found;
}

function buildGroups(packName, source) {
  const rootNode = getRootNode(source);
  const children = rootNode.listChildren();
  const byName = new Map(children.map((node) => [node.getName(), node]));
  if (byName.size !== children.length) throw new Error(`${packName}: duplicate RootNode child names.`);

  let groups;
  if (packName === 'low_poly_market_stall_pack') {
    groups = [
      { name: 'market_stall_1', keep: ['Cylinder.054', 'Cube.062'], requireCollider: true },
      { name: 'market_stall_2', keep: ['Cube.067', 'Cylinder.015'], requireCollider: true },
      { name: 'market_stall_3', keep: ['Cube.057', 'Cube.056'], requireCollider: true },
    ];
  } else if (packName === 'low_poly_medieval_houses_pack') {
    const centers = [-20, -10, 0, 10, 20];
    groups = centers.map((center, index) => {
      const keep = children
        .filter((node) => Math.abs(node.getWorldTranslation()[2] - center) < 0.1)
        .map((node) => node.getName());
      return { name: `house_${index + 1}`, keep, requireCollider: true, sourceZ: center };
    });
  } else if (packName === 'low_poly_medieval_village_props') {
    const visible = children
      .map((node) => node.getName())
      .filter((name) => /^Item\d+$/.test(name))
      .sort((a, b) => numericSuffix(a, 'Item') - numericSuffix(b, 'Item'));
    groups = visible.map((name) => ({
      name: `item_${String(numericSuffix(name, 'Item')).padStart(2, '0')}`,
      keep: [name, `${name}_Collider`],
      requireCollider: true,
    }));
  } else if (packName === 'low_poly_winter_medieval_castle_and_town_pack') {
    const visible = children
      .map((node) => node.getName())
      .filter((name) => !name.endsWith('_Collider'));
    groups = visible.map((name) => ({
      name: slug(name),
      keep: [name, `${name}_Collider`],
      requireCollider: true,
    }));
  } else if (packName === 'lowpoly_fish_pack') {
    groups = children
      .map((node) => node.getName())
      .filter((name) => /^fish_\d+$/.test(name))
      .sort()
      .map((name) => ({ name, keep: [name], requireCollider: false }));
  } else if (packName === 'lowpoly_trees_-_free_model_of_the_month') {
    groups = children
      .map((node) => node.getName())
      .filter((name) => /^Tree\d+$/.test(name))
      .sort((a, b) => numericSuffix(a, 'Tree') - numericSuffix(b, 'Tree'))
      .map((name) => ({ name: slug(name), keep: [name], requireCollider: false }));
  } else {
    throw new Error(`No grouping rule for ${packName}.`);
  }

  const expected = EXPECTED_COUNTS.get(packName);
  if (groups.length !== expected) {
    throw new Error(`${packName}: expected ${expected} groups, found ${groups.length}.`);
  }

  const assigned = [];
  for (const group of groups) {
    if (!group.keep.length) throw new Error(`${packName}/${group.name}: empty group.`);
    for (const name of group.keep) {
      if (!byName.has(name)) throw new Error(`${packName}/${group.name}: missing node ${name}.`);
      assigned.push(name);
    }
    if (group.requireCollider && !group.keep.some((name) => hasCollider(byName.get(name)))) {
      throw new Error(`${packName}/${group.name}: no collider assigned.`);
    }
  }

  if (new Set(assigned).size !== assigned.length) {
    throw new Error(`${packName}: a RootNode child was assigned more than once.`);
  }
  const unassigned = children.map((node) => node.getName()).filter((name) => !assigned.includes(name));
  if (unassigned.length) {
    throw new Error(`${packName}: unassigned RootNode children: ${unassigned.join(', ')}`);
  }

  return groups;
}

async function writeGroup(source, sourceScene, group, outputPath) {
  const out = new Document();
  copyToDocument(out, source, [sourceScene]);
  const copiedRoot = getRootNode(out);
  const keep = new Set(group.keep);
  for (const child of [...copiedRoot.listChildren()]) {
    if (!keep.has(child.getName())) copiedRoot.removeChild(child);
  }
  await out.transform(prune());

  const retained = getRootNode(out).listChildren().map((node) => node.getName()).sort();
  const expectedRetained = [...group.keep].sort();
  if (JSON.stringify(retained) !== JSON.stringify(expectedRetained)) {
    throw new Error(`${group.name}: retained node mismatch.`);
  }

  await io.write(outputPath, out);
  const verify = await io.read(outputPath);
  const verifyRoot = getRootNode(verify);
  const verifyNames = verifyRoot.listChildren().map((node) => node.getName()).sort();
  if (JSON.stringify(verifyNames) !== JSON.stringify(expectedRetained)) {
    throw new Error(`${group.name}: round-trip node mismatch.`);
  }

  const meshes = verify.getRoot().listMeshes();
  const colliderMeshes = meshes.filter((mesh) => mesh.getName().includes('COLLIDER'));
  const visibleMeshes = meshes.filter((mesh) => !mesh.getName().includes('COLLIDER'));
  if (!verify.getRoot().listScenes().length || !visibleMeshes.length) {
    throw new Error(`${group.name}: missing scene or visible mesh.`);
  }
  if (group.requireCollider && !colliderMeshes.length) {
    throw new Error(`${group.name}: collider lost during split.`);
  }

  const stat = await fs.stat(outputPath);
  if (stat.size < 1024) throw new Error(`${group.name}: suspiciously small output (${stat.size} bytes).`);
  return {
    bytes: stat.size,
    meshes: meshes.length,
    visibleMeshes: visibleMeshes.length,
    colliderMeshes: colliderMeshes.length,
  };
}

async function splitPack(inputPath) {
  const source = await io.read(inputPath);
  const sourceRoot = source.getRoot();
  if (sourceRoot.listAnimations().length) {
    throw new Error(`${inputPath}: animations present; refusing destructive grouping.`);
  }
  const scenes = sourceRoot.listScenes();
  if (scenes.length !== 1) throw new Error(`${inputPath}: expected one scene, found ${scenes.length}.`);

  const packName = path.basename(inputPath, '.glb');
  const groups = buildGroups(packName, source);
  const outputDir = path.join('assets', 'split', packName);
  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });

  const items = [];
  for (const group of groups) {
    const outputPath = path.join(outputDir, `${group.name}.glb`);
    const stats = await writeGroup(source, scenes[0], group, outputPath);
    items.push({ name: group.name, file: outputPath, keptNodes: group.keep, ...stats });
    console.log(`${packName}: ${group.name} -> ${stats.visibleMeshes} visible / ${stats.colliderMeshes} collider mesh(es)`);
  }

  const manifest = { source: inputPath, count: items.length, items };
  await fs.writeFile(path.join(outputDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

await fs.rm('assets/split', { recursive: true, force: true });
const manifests = [];
for (const target of TARGETS) {
  await fs.access(target);
  console.log(`\n=== Splitting ${target} ===`);
  manifests.push(await splitPack(target));
}

const total = manifests.reduce((sum, manifest) => sum + manifest.count, 0);
if (total !== 86) throw new Error(`Expected 86 standalone GLBs, created ${total}.`);
console.log(`\nCreated ${total} standalone GLBs across ${manifests.length} packs.`);
