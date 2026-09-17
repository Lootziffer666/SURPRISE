import fs from 'node:fs/promises';
import path from 'node:path';
import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { copyToDocument } from '@gltf-transform/functions';
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

function slug(value, fallback) {
  const cleaned = (value || '')
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
  return cleaned || fallback;
}

function printNodeTree(node, depth = 0) {
  const mesh = node.getMesh();
  const skin = node.getSkin();
  const label = node.getName() || '(unnamed)';
  const meshLabel = mesh ? ` mesh=${mesh.getName() || '(unnamed)'}` : '';
  const skinLabel = skin ? ` skin=${skin.getName() || '(unnamed)'}` : '';
  console.log(`${'  '.repeat(depth)}- ${label}${meshLabel}${skinLabel} children=${node.listChildren().length}`);
  for (const child of node.listChildren()) printNodeTree(child, depth + 1);
}

function chooseNodeRoots(scene) {
  const roots = scene.listChildren();
  if (roots.length !== 1) return roots;
  const only = roots[0];
  const children = only.listChildren();
  if (!only.getMesh() && !only.getSkin() && children.length > 1) return children;
  return roots;
}

async function writeAndVerify(document, outputPath) {
  await io.write(outputPath, document);
  const verify = await io.read(outputPath);
  const scenes = verify.getRoot().listScenes();
  const meshes = verify.getRoot().listMeshes();
  if (!scenes.length || !meshes.length) {
    throw new Error(`Invalid split output: ${outputPath} (${scenes.length} scenes, ${meshes.length} meshes)`);
  }
  const stat = await fs.stat(outputPath);
  if (stat.size < 1024) throw new Error(`Suspiciously small split output: ${outputPath}`);
  return { bytes: stat.size, scenes: scenes.length, meshes: meshes.length };
}

async function splitPack(inputPath) {
  const source = await io.read(inputPath);
  const root = source.getRoot();
  if (root.listAnimations().length) {
    throw new Error(`${inputPath} contains animations; refusing to split without animation-target analysis.`);
  }

  const scenes = root.listScenes();
  if (!scenes.length) throw new Error(`${inputPath} has no scene.`);

  const packName = path.basename(inputPath, path.extname(inputPath));
  const outputDir = path.join('assets', 'split', packName);
  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });

  const items = [];
  const usedNames = new Map();
  const reserveName = (base) => {
    const count = (usedNames.get(base) || 0) + 1;
    usedNames.set(base, count);
    return count === 1 ? base : `${base}_${String(count).padStart(2, '0')}`;
  };

  if (scenes.length > 1) {
    for (let i = 0; i < scenes.length; i += 1) {
      const sourceScene = scenes[i];
      const out = new Document();
      copyToDocument(out, source, [sourceScene]);
      const name = reserveName(slug(sourceScene.getName(), `scene_${String(i + 1).padStart(3, '0')}`));
      const outputPath = path.join(outputDir, `${name}.glb`);
      const stats = await writeAndVerify(out, outputPath);
      items.push({ name, sourceType: 'scene', sourceName: sourceScene.getName() || null, file: outputPath, ...stats });
    }
  } else {
    const nodes = chooseNodeRoots(scenes[0]);
    for (let i = 0; i < nodes.length; i += 1) {
      const sourceNode = nodes[i];
      const out = new Document();
      const map = copyToDocument(out, source, [sourceNode]);
      const copiedNode = map.get(sourceNode);
      if (!copiedNode) throw new Error(`Failed to copy node ${sourceNode.getName() || i} from ${inputPath}`);
      const sourceName = sourceNode.getName();
      const name = reserveName(slug(sourceName, `model_${String(i + 1).padStart(3, '0')}`));
      out.createScene(name).addChild(copiedNode);
      const outputPath = path.join(outputDir, `${name}.glb`);
      const stats = await writeAndVerify(out, outputPath);
      items.push({ name, sourceType: 'node', sourceName: sourceName || null, file: outputPath, ...stats });
    }
  }

  if (items.length < 2) {
    await fs.rm(outputDir, { recursive: true, force: true });
    throw new Error(`${inputPath} produced only ${items.length} model; not treating it as a pack.`);
  }

  const manifest = {
    source: inputPath,
    generatedAt: new Date().toISOString(),
    count: items.length,
    items,
  };
  await fs.writeFile(path.join(outputDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

for (const target of TARGETS) {
  const source = await io.read(target);
  console.log(`\n=== NODE TREE ${target} ===`);
  for (const scene of source.getRoot().listScenes()) {
    console.log(`SCENE ${scene.getName() || '(unnamed)'}`);
    for (const child of scene.listChildren()) printNodeTree(child);
  }
}

const manifests = [];
for (const target of TARGETS) {
  try {
    await fs.access(target);
  } catch {
    throw new Error(`Missing expected pack: ${target}`);
  }
  console.log(`\n=== Splitting ${target} ===`);
  const manifest = await splitPack(target);
  manifests.push(manifest);
  console.log(`Created ${manifest.count} standalone GLBs.`);
}

console.log('\n=== Summary ===');
for (const manifest of manifests) console.log(`${manifest.source}: ${manifest.count}`);
