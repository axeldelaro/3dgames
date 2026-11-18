# 🌌 3D GAMES : OMNIVERSE AAA

> **Moteur 3D Multi-Mondes Ouverts WebGL2 / PBR / GLSL Shaders & Multijoueur Temps Réel WebRTC P2P** — jouable instantanément sur le Web et sur Android natif (`3dgames.apk`).

- 🌐 **Jouer en ligne (GitHub Pages) :** [https://axeldelaro.github.io/3dgames/](https://axeldelaro.github.io/3dgames/)
- 📱 **Télécharger l'APK Android natif (`3dgames.apk`) :** [Téléchargement direct (`3dgames.apk`)](https://github.com/axeldelaro/3dgames/releases/latest/download/3dgames.apk)

---

## ✨ Architecture Technique AAA

### 1. Pipeline Graphique Photoréaliste PBR & Shaders GLSL (`src/core/graphics/`)
- **`ProceduralTextureGenerator` (Maps PBR 1024×1024 sans dépendances externes) :** Synthèse procédurale multi-octaves (Perlin, Simplex 2D/3D, Worley/Voronoi, FBM, opérateur de Sobel) générant *Albedo, Normal Map, Roughness Map, Metalness Map, Emissive Map* et *Bump Map* pour : bitume fissuré/mouillé, pavés, façades brique/verre, écorce, feuillage, roche granulaire, sable ridé, rouille, bois de galion et fibre de carbone.
- **Atmosphère Physique Rayleigh & Mie (`AtmosphereSky`) :** Dispersion atmosphérique temps réel, soleil à couronne, crépuscule doré, nuit étoilée avec Voie Lactée et nébuleuses, nuages volumétriques animés, ombres douces `PCFSoftShadowMap` et probe d'environnement dynamique `PMREMGenerator`.
- **Post-Processing Cinématographique (`PostProcessingPipeline`) :** `EffectComposer` commutable intégrant *SSAO*, *UnrealBloomPass*, *ACES Filmic Tone Mapping*, *Chromatic Aberration* réactive à la vitesse et *Vignette* optique.
- **Shaders GLSL Sur-Mesure (`Shaders.ts`) :**
  - **Océan de Gerstner** synchronisé GPU/CPU (flottabilité multi-points, Fresnel, caustiques sous-marines, absorption selon la profondeur, écume dynamique).
  - **Interior Mapping Urbain** par ray-box parallaxe donnant l'illusion de pièces meublées éclairées en 3D dans les gratte-ciels la nuit + bitume pluvieux réfléchissant (*Clearcoat Puddles*).
  - **Végétation Vivante** par *Vertex Shader* de vent sinusoïdal sur `InstancedMesh`.
  - **Cel-Shading Hybride Toon/PBR + Outline** et **Tunnel Warp Quantique**.

### 2. Audio Spatial 3D 100 % Procédural (`WebAudioEngine`)
- Synthèse temps réel via **Web Audio API** (oscillateurs FM, synthèse granulaire, bruit filtré, réverbération à convolution stéréo) sans aucun fichier `.mp3` externe : bruits de pas différenciés (bitume, herbe, bois, métal, eau, sable, neige), moteur automobile indexé sur le régime RPM + crissement de pneus, vent d'altitude, canons, propulseurs plasma/warp, pluie et **6 nappes musicales adaptatives**.

### 3. Multijoueur WebRTC P2P Serverless & Contrôles Universels
- **Réseau P2P (`NetworkManager`) :** `trystero` (WebRTC DataChannels) + pont automatique `PeerJS`, code de salon à 4 caractères, lien d'invitation directe `?room=XXXX`, interpolation cubique d'Hermite à 60 FPS, véhicules multi-places, construction synchronisée et voyage groupé inter-mondes avec l'Hôte.
- **Contrôles Contextuels (`InputManager`) :** Clavier/Souris (`ZQSD` & `WASD`), Manette Bluetooth/USB avec vibrations haptiques (`Gamepad API`), et **HUD Tactile AAA** à double joystick + boutons vectoriels SVG reconfigurés dynamiquement (*Piéton, Conduite, Vol/Espace, Navire Pirate*).

---

## 🌍 Les 6 Mondes Ouverts (`src/worlds/`)

1. **🏙️ METROPOLIS OSM 1:1 & GTA SANDBOX :** Vraies villes 1:1 (Paris, Lyon, Tokyo, NYC, Londres, Dubaï + recherche **Nominatim** + **GPS Réel**) reconstruites en Web Worker via **Overpass API** + cache `IndexedDB` (et fallback procédural instantané < 3s), météo réelle **Open-Meteo**, trafic IA, voitures de sport à suspension raycast/drift, motos, hélicoptères, achat d'appartements et livraisons GPS.
2. **🚀 STARFIELD ODYSSEY :** Système stellaire sans écran de chargement, 4 planètes sphériques à gravité directionnelle 3D, ceinture de 3 000+ astéroïdes instanciés, station orbitale, minage laser, chasseur spatial (cockpit 1re/3e personne), hyperpropulsion *Warp Shader* et combats spatiaux.
3. **🪓 VALHEIM WILDLANDS :** Continent sauvage infini multi-biomes, rayons lumineux volumétriques, abattage physique d'arbres, minage, **construction modulaire synchronisée en P2P** (fondations, murs, toits, ponts, torches, feux de camp) et défense coopérative nocturne.
4. **🏴‍☠️ SEA OF LEGENDS :** Océan de Gerstner synchronisé, archipels tropicaux, forts côtiers, galion pirate 3D à flottabilité physique 4-points, réglage des voiles selon le vent, duels au canon balistique, nage sous-marine et chasse aux coffres au trésor.
5. **🗡️ AETHERIA CHRONICLES :** Royaume Action-RPG Cel-Shaded (*Toon/Outline*), 20 000+ brins d'herbe instanciés au vent, **escalade libre à 360°** avec endurance, **paravoile** et courants thermiques ascendants, épée à *Sword Trails*, arc et magie du feu interactive enflammant les herbes.
6. **✈️ EXTREME HORIZON :** Massifs topographiques haute résolution (Alpes, Grand Canyon, Mont Fuji, Fjord) avec bascule instantanée entre **Chasseur Supersonique** (portance, décrochage, postcombustion, bang Mach 1, HUD) et **4x4 Trial** à suspension articulée.

---

## 🛠️ Développement Local & Build APK Android

```bash
# Installation des dépendances
npm ci

# Génération des icônes PWA / Android
npm run icons

# Serveur de développement local (http://localhost:5173)
npm run dev

# Build Web de production (TypeScript + Vite)
npm run build

# Initialisation & configuration native Android (Capacitor)
npm run android:init
```

Le workflow GitHub Actions [`.github/workflows/deploy-and-build-apk.yml`](.github/workflows/deploy-and-build-apk.yml) déploie automatiquement chaque push `main` sur **GitHub Pages** et génère une **GitHub Release** signée contenant `3dgames.apk`.
