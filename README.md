# Handball VR - The Courtyard

v0.4.1 local playtest (not published). Separate project built from selected Bean There VR systems. Bean There VR files and services are untouched.

## Play locally

Open `handball-desktop.html`, or double-click `START-PC.cmd`. No server is required for PC practice and CPU play. For a full project checkout: `npm ci`, then `npm run dev -- --port 5176 --strictPort`.

## Local v0.4.1 CPU refinement

Approved defaults: hitPower 1.00 and bounce 0.90. Existing saved browser settings still take priority; Reset defaults loads these values.

The CPU now predicts incoming trajectories for 3.4-4.2 seconds and considers physical contacts up to 2.2 m, instead of rejecting everything over 1.65 m. Reaction delay, foot speed, targeting error and fast-shot tolerance remain difficulty dependent. All difficulties can return soft, medium and fast shots when reachable; impossible shots remain misses. CPU gloves follow the higher contact height.

Versus CPUs cycle through drive, lob, drop, topspin, backspin and sidespin strokes with varied pace. The planner evaluates actual hand impulses, air curvature, walls and the required floor bounces before choosing a shot. Spin comes from off-centre contact rather than changing angular velocity directly. Rally partner keeps aiming gentle returns toward the player, with a higher preferred receiving window.

82 unit checks pass, plus the existing 81-shot baseline and a new 81-shot mixed-height/pace simulation. The mixed simulation returns are Easy 27, Medium 39, Hard 55, Rally 67. Every difficulty returned shots in all three pace bands (3, 7, 12 m/s). These are test-set counts, not promised player win rates. Handset feel and a new cross-device multiplayer test are pending. No GitHub or Render publishing was performed for this revision.

## v0.4 controls and tuning

Options provides Bounce, Hit strength, Gravity, Spin effect and Air resistance sliders. Exact shareable values appear beneath them. Settings save on that browser/device. The new defaults are bounce 0.90, hitPower 1.00, gravity 9.81, spin 1, airDrag 0.010. In multiplayer the host controls settings and the snapshots synchronize them to the guest. The host can switch the current full-court game between Versus and Practice (no points, catches allowed) in Options. Switching restarts the serve/score, keeping the connection.

A bad serve now retries with the same server and no point lost, until it has legally reached the opponent's receiving bounce. Faults during an established versus rally still score. A stopped toss gets 2.5 seconds of rest before resetting. Serve retries return the ball near the server's hand when a hand pose is available.

Grip and trigger both close the hand and attempt one catch on the first close edge. Holding a button does not keep searching for new balls. Hold either to retain the ball; release all held grab buttons to throw/drop. Trigger still makes a fist for striking. In wall practice, CPU Rally partner, and online Practice, hold either button (desktop E) for 2.5 seconds to recall a free ball into that hand. This is an intentional recall, not automatic catching. Another player's held ball cannot be recalled.

78 checks and the CPU simulation pass. Current shot set returns: Easy 21, Medium 37, Hard 54. Quest controller feel still requires physical testing.

## Earlier v0.3 changes

- Hand impulse reduced: a 3 m/s central open-hand swing launches a stationary ball at about 3.24 m/s. Faster swings and fists still hit harder; no post-bounce power assist.
- Stronger bounded Magnus curvature and surface friction give topspin dip/kick, backspin lift/check, and sidespin curve/deflection. Subtle trails: blue topspin, red backspin, green sidespin, white weak/no spin. Mixed spin uses its dominant component relative to flight.
- Arena is 5.8 x 9.2 m with a 6.5 m ceiling. Half-court practice remains 5.8 x 4.6 m.
- Hard has slower feet/reactions, larger placement errors and gentler shots. Current 81-shot simulation: Easy 24, Medium 52, Hard 63 legal returns.
- Select Rally partner under CPU difficulty, or CPU - Rally partner in VR. It predicts reachable shots and plans gentle, central-contact returns toward your current position through the real ball solver. It adds no spin, but incoming spin remains physical. Unreachable shots can still end a rally; the CPU does not teleport or move the ball. No points or game-over in this mode. Current rally and personal best appear subtly below the score and on arena boards; the record is saved on that browser/device when storage is available.
- Desktop Ctrl + click plays a soft shot; Shift + click plays a high-bounce lob. VR shot height/pace/spin come from the actual hand motion and contact.

69 automated checks, the AI shot simulation and production build pass. Physical Quest feel and cross-device co-op still need user testing.

## Rules and physics

Every serve and return must bounce exactly once on the hitter's own floor before crossing the centre line. After a legal serve, crossing without that bounce or bouncing twice on the hitter's side loses the point. Invalid serves retry without points. The receiver must return after one receiving bounce and before the second. Wall contacts do not count as floor bounces. First to 11, win by two; the point winner serves.

VR serving is physical: grab with either grip or trigger, toss up or drop, then strike with either open hand or fist. Release alone is a toss and does not start the serve or score a point. A toss can be caught and repositioned. In a scored rally, catch-and-throw is a fault; use strikes. Practice permits re-grabs without penalties. Desktop Space remains a starter serve; E also supports grab, drop and click-to-hit.

Hand impacts respond immediately, before any ground contact, with a gentler v0.3 transfer. Floor rebound is increased and air drag reduced, with gravity left at 9.81 m/s2. Normal drop/serve tests reach approximately waist/chest height after a bounce. v0.3 reduces the earlier immediate hand boost while preserving that rebound. Open palms transfer more brushing/spin control; fists give a stronger normal impulse. Contact uses linear speed, palm orientation, wrist rotation and position on the ball, including off-centre topspin, backspin and sidespin. Relative swept contact handles fast ball/hand motion between frames. Simultaneous left/right contacts form one legal hit while allowing both physical impulses.

Practice is now a 5.8 x 4.6 m half-court, using the existing side/end walls and a solid wall at the centre line. Both visual and ball collision boundaries stop at that wall. CPU/online matches retain the full 5.8 x 9.2 m court.

## Controls

| Action | PC | Quest controllers |
|---|---|---|
| Move | WASD | Left stick by default |
| Look/turn | Middle drag or arrows | Headset; right stick snap turn |
| Slap | Left click near ball | Move an open glove into the ball |
| Punch | Right click near ball | Hold trigger, then strike |
| Prepare serve | Hold E near ball; release, then click | Press grip or trigger near the ball; hold, release all to toss/drop, then hit |
| Starter serve | Space | Physical toss-and-hit; menu resets the serve ball only |
| Pause/menu | P / Escape | A or X |

Choose **VR movement** in the browser dropdown or cycle it in the in-world menu:

- **Stick**: original smooth left-stick movement.
- **Teleport**: click the left stick to teleport to the predicted reachable intercept marked on the floor.
- **Auto**: smoothly move toward a predicted intercept. Manual left-stick input temporarily overrides the assist.

Position prediction keeps you in your half and accounts for a room-scale head offset. Teleport/snap-turn discontinuities clear hand velocity history, so they do not generate an artificial strike. Movement choice persists between modes during the current page session; a reload defaults to Stick.

## CPU difficulties

Easy has slow feet, delayed tracking, larger placement errors and difficulty with fast shots. Medium uses normal movement speed, a shorter prediction window and reliable returns for rallies. Hard moves slightly faster, predicts reachable future contacts, makes fewer errors and tolerates more pace. Hard never teleports and can still lose from a bad position or an unreachable shot.

The same deterministic 81-shot simulation includes pace, side-wall angles and varied CPU starting positions: Easy made 24 legal returns, Medium 52, Hard 63. These are test-set results, not a promised player win rate. Hard returned 21/27 shots from the central start in that set. CPU strokes use the same physical ball impulse solver and the same bounce rules.

## Verification

```powershell
npm run test:unit
npm run test:ai
npm run build
npm run desktop
npm run test:browser:offline
```

78 automated checks pass. Coverage includes all left/right toss/strike combinations with open/fist contacts, toss recovery, immediate hit strength, rebound height, repeated own-bounce/crossing rules, swept contacts, opposite spin directions, wrist/palm effects, half-court collisions, bounded assist movement, finite network data and physically unreachable hard-CPU shots. The 81-shot AI simulation and production TypeScript/Vite build pass.

The production standalone file was manually checked in the existing PC browser: half-court practice, serve/bounce flow, CPU movement/scoring, and selecting Auto movement worked. The automated Edge smoke runner could not launch inside the restricted Work environment (Edge terminated while opening its profile/SSL logging), so its assertions are included but not claimed as passed. Real Quest controller feel, teleport/auto comfort, headset performance and connected multiplayer are still pending physical tests.

## Local Quest hosting

`START-QUEST.cmd` uses Node directly with this game's existing local certificate, stored outside the repository in the sibling `work/handball-tls` directory. `scripts/start-quest.ps1` can create/refresh that certificate with PowerShell 7. The launcher detects the Wi-Fi IPv4 address and serves HTTPS/WSS on port 8444. Keep its window open. Local reachability has previously been unreliable; PC testing can use the standalone HTML instead.

The optional firewall scripts create/remove only the separate Handball local-subnet rule. No certificate, key, credential or diagnostic report belongs in a publishable build. No old Bean There service is reused.

## Multiplayer and publication

The inherited two-player WebRTC room/pose/snapshot transport remains. The host arbitrates the new rules, ball ownership, impulse and score. Guest hand actions include bounded angular/contact data. This revision's connected multiplayer has not yet been tested end-to-end. The default public signaling endpoint is `wss://handball-vr.onrender.com/multiplayer`, a separate free Render service in Singapore. Automatic deployments are disabled. Free instances can take about a minute to wake after inactivity. Two browser tabs successfully hosted, joined and started a WebRTC match through this service. No TURN relay is configured; cross-network connectivity depends on the networks involved. GitHub Pages practice/CPU do not require signaling.

Existing repository: https://github.com/AelisonX/handball-vr

Existing playtest URL: https://aelisonx.github.io/handball-vr/

The online URL serves the approved playtest build. The new static page is prepared at `docs/index.html`; Pages should publish main /docs. The root `index.html` remains the Vite source entry so `npm run dev` and production rebuilds use the TypeScript source. Publishing should update the static page and desktop copy together. Publishing updates only the Handball repository and its Pages build. Bean There VR, itch.io, Render and firewall settings are untouched.
