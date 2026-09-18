# Danao character asset provenance

The first real-render benchmark for Danao replaces Hero/Guannan's procedural body with a skinned Quaternius humanoid while leaving the Rapier gameplay body unchanged.

Runtime files:
- `hero/hero-female.gltf` — Quaternius Universal Base Characters Standard, Superhero Female full-body rig, simplified to local toon-friendly materials.
- `hero/hero-female.bin` — original skinned mesh/skeleton buffer.
- `hero/hero-eye-brown.png` — lightweight eye texture retained from the original pack.
- `hero/hero-hair-buns.glb` — Quaternius rigged bun hairstyle on the same 65-joint skeleton.
- `../licenses/QUATERNIUS-CC0.txt` — bundled source license.

Original creator: Quaternius  
License: CC0 1.0 Universal  
Official pack: https://quaternius.com/packs/universalbasecharacters.html  
Official free download: https://quaternius.itch.io/universal-base-characters

Source references used for the vendored files:
- female glTF: `804aa3d3bbbd1977d31ec25c7dbf9a00705be49d`
- female BIN: `6e6507c85a4993e97d31f187b4d0715af300400d`
- eye texture: `0d037febc2789c86fdb40d7ccd4c0a1d0591cfbe`
- bun hair GLB: `90f46c9134152a6d71111f49636d7105c9d448ef`

The imported render model is cosmetic only. Danao's existing Rapier collision, hit detection, movement and combat remain authoritative.
