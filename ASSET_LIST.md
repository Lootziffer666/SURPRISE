# Asset-Liste für Snow Resource Run

Diese Liste ersetzt die aktuell prozedural erzeugten Three.js-Primitive durch such- und generierbare Produktionsassets. Die Größen sind Schätzwerte für komprimierte Runtime-Assets (GLB plus KTX2/WebP-Texturen), nicht die Größe der heutigen prozeduralen Geometrien.

## Annahmen

- Formate: `.glb` für Meshes, `.ktx2` oder `.webp` für Texturen.
- Einheit: Meter; Y-Achse nach oben; Pivot bei Bodenhöhe und Objektmitte.
- Material: PBR `MeshStandardMaterial`; Albedo im sRGB-Farbraum, Normal/Roughness/Metallic linear.
- Kompression: Draco oder Meshopt für GLB; Basis Universal/KTX2 für Texturen.
- Figuren werden per Code bewegt; Root Motion ist nicht erforderlich.
- Statische Umgebungsteile sollten zu wenigen Meshes oder Texture-Atlanten zusammengefasst werden.

## Priorisierte Mesh-Liste

| Priorität | Asset | Benötigtes Mesh | Rigging | Animation | Geschätzte Größe |
|---|---|---|---|---|---:|
| P0 | Spieler | `player.glb`: Körper, Kopf, Arme, Beine, Rucksack und benannter `InventoryMount` | Skelett erforderlich | `Idle`, `Walk`; optional `Run`, `Turn`, `Carry` | 3–6 MB |
| P0 | Schnee-Terrain und Teich | `terrain.glb` oder gekachelte Terrain-Chunks, Teichrand und separate Wasserfläche | Nein | Wasser über UV/Normal-Scrolling; Terrain statisch | 6–13 MB |
| P0 | Baum-Kit | Stamm, 2–3 Kronen, Schneekappe; optional 2 LOD-Stufen | Nein | Statistisch; optional leichter Vertex-Wind | 3–6 MB |
| P0 | Bär | `bear.glb` mit Körper, Kopf, Nase und vier Beinen | Nur erforderlich, wenn er sich verhalten soll | Optional `Idle`, `Walk`, `Sniff`; aktuell kann er statisch bleiben | 2–4 MB |
| P0 | Angelplatz/Dock | Planken, Pfosten, Angelrute, Rolle und separat benannter `Bobber` | Nein | Bobber per Code; Rute optional mit leichtem Schwung | 2–4 MB |
| P1 | Lagerfeuer | Holzstöße, Steine und separat benannter `Flame`-Emitter | Nein | Flamme über Shader/Partikel; Holz und Steine statisch | 1–2 MB |
| P1 | Marktstand | Pfosten, Theke, Dach und optionale Warenplätze | Nein | Statistisch; Dach optional mit leichtem Vertex-Wind | 3–6 MB |
| P1 | Ressourcen-Kit | Holz, rohes Fleisch, gegartes Fleisch, Geld und Fisch als einzelne Meshes oder ein Atlas | Nein | Aufheben/Drehen per Code; Fisch optional mit Fang-Flip | 1–3 MB |
| P1 | Zaun-Kit | Pfosten, Querstreben und ein offenes Tor-/Übergangselement | Nein | Statistisch | 1–3 MB |
| P2 | Kauf-/Zonenmarker | Pfosten und Schild mit klar lesbarem Vorderbild | Nein | Statistisch | 0,5–1,5 MB |
| P2 | Schneefall | Kein Mesh; weiches Partikel-Sprite | Nein | CPU- oder GPU-Partikelbewegung | 0,1–0,3 MB |
| P2 | UI-Icons | Optionaler 2D-Icon-Atlas für Inventar, Fisch, Fleisch, Holz und Geld | Nein | Keine | 0,25–1 MB |

## Texturen

### Spieler

- `player_albedo.webp/ktx2`, 1024 × 1024 oder 2048 × 2048.
- `player_normal.ktx2`, gleiche Auflösung wie Albedo.
- `player_roughnessMetallicAO.ktx2`, kombinierte Map wenn möglich.
- Rucksack und Kleidung sollten im selben Atlas liegen, um Materialwechsel zu reduzieren.

### Bär

- `bear_fur_albedo.webp/ktx2`, 1024 × 1024.
- `bear_fur_normal.ktx2`, 1024 × 1024.
- `bear_roughnessAO.ktx2`, 1024 × 1024.
- Bei statischem Bär genügt ein einfacheres, ungeriggtes Low-Poly-Modell.

### Terrain und Wasser

- `snow_albedo.ktx2`, nahtlos kachelbar, bevorzugt 2048 × 2048.
- `snow_normal.ktx2`, 2048 × 2048.
- `snow_roughnessAO.ktx2`, 2048 × 2048.
- `water_normalFlow.ktx2`, 512 × 512 oder 1024 × 1024.
- Optionale `water_opacityRoughness.ktx2` für die Teichfläche.
- Terrain-Patches und Farbvariationen sollten über Vertex-Farben oder eine zweite kleine Detailmap laufen, nicht über viele einzelne Meshes.

### Umgebungskit

Ein gemeinsamer 2048 × 2048-Atlas reicht für die meisten statischen Objekte:

- `environment_albedo.webp/ktx2`: Holz, Stamm, Steine, Zaun, Dock, Marktstand.
- `environment_normal.ktx2`.
- `environment_roughnessAO.ktx2`.
- Separater `sign_albedo.webp/ktx2`, 512 × 512 oder 1024 × 1024, für lesbare Schilder.
- Optionale `cloth_albedo/normal/roughness.ktx2` für das Marktdach.

### Ressourcen

- `resources_albedo.webp/ktx2`, 1024 × 1024, mit Holz, Fleisch, Fisch, Geld und gegartem Fleisch.
- `resources_normal.ktx2`, 1024 × 1024.
- `resources_roughnessMetallicAO.ktx2`, 1024 × 1024.
- Geld kann eine kleine Emissive-Map erhalten; dafür ist kein separates Mesh nötig.

### Effekte

- `snowflake_alpha.webp/ktx2`, 128 × 128 oder 256 × 256, weicher runder Alpha-Verlauf.
- `flame_sprite.ktx2` oder kleines Sprite-Sheet, 256 × 256 bis 512 × 512.
- Keine Textur ist für Trigger-Zonen, HUD, DOM-Overlays oder den Fehlerdialog erforderlich.

## Animation und Rigging

### Skelett erforderlich

- **Spieler:** Skelett mit Hüfte/Root, Wirbelsäule, Kopf, Oberarm, Unterarm, Hand, Oberschenkel, Wade und Fuß. `InventoryMount` sollte als leerer Bone oder Node exportiert werden.
- **Bär:** Nur riggen, wenn er später laufen, schnüffeln oder als Gegner reagieren soll. Für die aktuelle statische Dekoration ist ein einzelnes statisches Mesh ausreichend.

### Empfohlene Actions

- Spieler: `Idle`, `Walk`; optional `Run`, `TurnLeft`, `TurnRight`, `Carry`, `Collect`.
- Bär: `Idle`, `Walk`, optional `Sniff` oder `React`.
- Keine Root Motion; Position und Rotation bleiben in `PlayerController` beziehungsweise der späteren Bären-Steuerung.

### Per Code animieren

- Bobber: vertikales Schweben und kurzer Fang-Impuls.
- Angelrute: leichter Schwung während des Fischens, optional.
- Lagerfeuer: Flammen-Scale, Rotation und Partikel; keine Skelettanimation.
- Wasser: scrollende Normal-/Flow-Map.
- Schnee: Partikelpositionen, Wind und Reset am Boden.
- Ressourcen: Drehung, Schweben, Aufheben und Sale-Flug.
- Marktstand-Dach und Baumkronen: optionaler Vertex-Wind, kein Rig.

## Nicht benötigte Assets

- Keine separaten Modelle für `TriggerZone`, Kauf-Overlay, HUD, Toast, Fehlerdialog oder Buttons.
- Keine Textur für die aktuelle DOM/CSS-Oberfläche, außer optionalen Inventar-Icons.
- Keine Skelette für Terrain, Bäume, Zaun, Dock, Marktstand, Lagerfeuer, Ressourcen oder Schild.
- Keine einzelnen hochauflösenden Texturen pro Holzstab, Stein oder Geldschein; Atlanten sind bevorzugt.

## Such- und Generierungs-Budget

- Realistisches Rohpaket mit allen P0/P1-Assets: etwa **20–35 MB**.
- Ziel nach Atlasing, LOD, Draco/Meshopt und KTX2/WebP: etwa **10–20 MB Runtime-Download**.
- Wenn der Bär statisch bleibt und auf LODs verzichtet wird, sind etwa **8–15 MB** realistisch.
- Für die erste brauchbare Version zuerst Spieler, Terrain/Wasser, Baum-Kit, Angelplatz, Ressourcen-Kit und Effektmappen beschaffen; Marktstand, Zaun und Bär können anschließend folgen.

## Aktuelle prozedurale Ersetzungen

- `playerBody`, `playerHead`, `playerArm`, `playerLeg`, `backpack` → `player.glb`.
- `trunk`, `treeCone`, `snowCap` → Baum-Kit.
- `bearBody`, `bearHead`, `bearLeg`, `bearNose` → `bear.glb` oder statisches Bärenmesh.
- `dockPlank`, `dockPost`, `fishingRod`, `fishingReel`, `bobber` → Angelplatz-Kit.
- `log`, `stone`, `flameOuter`, `flameInner` → Lagerfeuer-Kit.
- `stallPost`, `stallCounter`, `stallCanopy` → Marktstand.
- `fencePost` → Zaun-Kit.
- `wood`, `rawMeat`, `cookedMeat`, `cash`, `fish` → Ressourcen-Kit.
- `terrain`, `pond` und die Terrain-Patches → Terrain-/Wasserasset.
- `markerPole`, `markerSign` → Zonenmarker.
- `SnowfallEffect`-Punkte → Schneeflocken-Sprite und Partikelsystem.
