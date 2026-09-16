# Dǎnào Unity CI licence setup

The Dǎnào GitHub Actions workflow supports either Unity Personal or a paid Unity Pro/Enterprise serial. Do not commit licence files, serials, email addresses or passwords to the repository.

## Unity Personal

1. Install Unity Hub and sign in with the Unity account that will be used for CI.
2. In Unity Hub open **Preferences > Licenses**, choose **Add**, then activate **Unity Personal**. This should create the Unity licence file on the computer.
3. Find `Unity_lic.ulf`:
   - Windows: `C:\ProgramData\Unity\Unity_lic.ulf`
   - macOS: `/Library/Application Support/Unity/Unity_lic.ulf`
   - Linux: `~/.local/share/unity3d/Unity/Unity_lic.ulf`
4. Open the `duck-bear-hq` repository on GitHub and go to **Settings > Secrets and variables > Actions**.
5. Add repository secrets:
   - `UNITY_LICENSE` — the full text contents of `Unity_lic.ulf`
   - `UNITY_EMAIL` — the Unity account email
   - `UNITY_PASSWORD` — the Unity account password
6. Do not add `UNITY_SERIAL` for Personal unless Unity/GameCI specifically requires it for that account.

## Unity Pro / Enterprise

In **Settings > Secrets and variables > Actions**, add:

- `UNITY_SERIAL` — the Unity subscription serial
- `UNITY_EMAIL` — the Unity account email
- `UNITY_PASSWORD` — the Unity account password

`UNITY_LICENSE` is not required when the serial method is used.

## What happens next

The workflow checks that either `UNITY_LICENSE` or `UNITY_SERIAL` exists and that `UNITY_EMAIL` and `UNITY_PASSWORD` are also present. Once they are available, the previously skipped jobs run automatically on the next Dǎnào push or on a manual workflow run:

1. Unity EditMode and PlayMode tests.
2. WebGL build.
3. Windows x64 build.
4. WebGL artifact upload.
5. On `main`, R2 publishing runs when the Cloudflare secrets are also present.

The secrets are passed only to the GameCI Unity test/build steps and are not written into the game build or invitation links.
