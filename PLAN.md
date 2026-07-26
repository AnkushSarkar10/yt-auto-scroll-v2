# YouTube Shorts loop and auto-scroll plan

## 1. Product goal

Build a Chrome Manifest V3 extension that adds a polished, Tesla-inspired mode control to YouTube Shorts.

The extension will support two states:

| Mode | Behavior when the active short finishes |
| --- | --- |
| Loop | Restart the current short from the beginning. |
| Auto-scroll | Move to the next short and allow it to play. |

`loop` and `auto-scroll` are the two positions of one control. Selecting one always deselects the other. The initial mode is `loop`, which matches YouTube Shorts' normal replay behavior and is the least surprising default.

If an explicit `off` mode is wanted later, add it as a separate product decision. It is not required by the current two-position toggle concept.

## 2. MVP scope

The first usable release should include:

- A two-option control for `loop` and `auto-scroll`.
- A compact floating control displayed only on YouTube Shorts pages.
- A matching extension popup that reads and updates the same setting.
- Automatic detection of the currently active short.
- Reliable handling of direct page loads and YouTube single-page navigation.
- Persistent settings using `chrome.storage.local`.
- Correct behavior when the user manually moves between shorts.
- Keyboard-accessible controls and visible focus states.
- No analytics, remote requests, or unnecessary permissions.

Do not include these in the MVP:

- Accounts or cloud synchronization.
- Per-channel settings.
- Playback speed controls.
- Timers or delayed scrolling.
- Analytics or telemetry.
- A background service worker unless a later requirement proves it is necessary.

## 3. Current project cleanup

The repository currently contains the default CRXJS starter interface. Remove or replace the starter code before implementing the feature.

### Files to replace

- Replace `src/content/views/App.vue` with the Shorts mode control.
- Replace `src/popup/App.vue` with the extension popup.
- Replace the generic styles in `src/popup/style.css`.
- Remove `src/components/HelloWorld.vue` after nothing imports it.
- Remove the side-panel entry and `src/sidepanel/` unless the side panel is intentionally kept as a future feature.
- Remove starter text such as `HELLO BLAZEKUSH`, `Vite + Vue + CRXJS`, and the counter demo.
- Replace the starter console message in `src/content/main.ts` with useful development-only logging or remove it.

### Files to add

- Add `src/shared/settings.ts` for the mode type, defaults, storage reads, storage writes, and storage change subscriptions.
- Add `src/content/shorts-controller.ts` for active-video detection and completion behavior.
- Add `src/components/ModeToggle.vue` if the same control is reused by the content UI and popup.
- Add `src/components/icons/` only if inline icon markup becomes too large to keep inside the toggle component.

Keep the number of modules small. Split code only where it creates a clear boundary between UI, persisted settings, and YouTube page behavior.

## 4. Manifest configuration

Update `manifest.config.ts` before writing the feature logic.

### Required changes

- Add the `storage` permission.
- Limit content-script injection to YouTube instead of every HTTPS website.
- Match all `www.youtube.com` routes so the script is present when YouTube performs client-side navigation.
- Remove the side-panel declaration if the side panel is removed.
- Keep the popup declaration if the popup will mirror the in-page toggle.

The relevant manifest shape should be:

```ts
permissions: ['storage'],
content_scripts: [{
  js: ['src/content/main.ts'],
  matches: ['https://www.youtube.com/*'],
}],
```

Do not restrict the content-script match to `https://www.youtube.com/shorts/*`. YouTube is a single-page application. A user can load the homepage and navigate to Shorts without a full page reload, so Chrome may never inject a script that only matches the final `/shorts/` URL.

`host_permissions` is not required for a statically declared content script. Add it only if the extension later uses APIs such as programmatic script injection or makes extension-origin requests to YouTube.

## 5. State model

Use one mode value instead of two unrelated booleans.

```ts
export type PlaybackMode = 'loop' | 'auto-scroll'
```

This avoids the invalid state where both loop and auto-scroll are enabled.

Store one object under a versioned key:

```ts
type StoredSettings = {
  playbackMode: PlaybackMode
}
```

Recommended storage behavior:

- Use `chrome.storage.local` for the MVP.
- Use `loop` when no value has been saved or the saved value is invalid.
- Validate loaded values before trusting them.
- Write only when the mode actually changes.
- Subscribe to `chrome.storage.onChanged` so the popup and every open YouTube tab remain synchronized.
- Treat the mode as a global extension preference for the MVP.

If per-tab behavior is desired later, add a background service worker and track modes by tab ID. Do not add that complexity to the first version.

## 6. Tesla-inspired control design

Use the linked Dribbble shot as visual inspiration, not as an exact copy.

### Visual direction

- Use a dark graphite shell with a subtle border and soft inset shadow.
- Use a rounded rectangular form instead of a generic browser checkbox.
- Place `loop` on the left and `auto-scroll` on the right.
- Use a sliding or illuminated active surface to communicate the selected mode.
- Use restrained red or warm-white accents that fit the YouTube context.
- Keep inactive icons low contrast while preserving accessibility.
- Use short labels or tooltips so the icons are understandable.
- Use inline SVG icons for loop and downward movement rather than adding an icon package.
- Keep animations between 160ms and 240ms.
- Disable nonessential motion under `prefers-reduced-motion: reduce`.

### Interaction rules

- Clicking `loop` activates loop mode.
- Clicking `auto-scroll` activates auto-scroll mode.
- Clicking the active option again keeps that option selected.
- Pressing `Tab` must focus each option.
- Pressing `Enter` or `Space` must activate the focused option.
- Each button must expose `aria-pressed="true"` or `aria-pressed="false"`.
- The group must have an accessible label such as `shorts playback mode`.
- A visible focus ring must remain present even if the design uses custom shadows.

### In-page placement

- Start with a fixed position near the lower-right edge while avoiding YouTube's action rail.
- Test the control at narrow and wide desktop sizes.
- Keep the control above YouTube using an explicit high `z-index`.
- Hide the control outside `/shorts/` routes.
- Keep the control small enough that it does not cover captions or playback controls.
- Consider a draggable position only after the MVP if placement conflicts cannot be solved responsively.

### Style isolation

Mount the content UI inside a Shadow DOM root if CRXJS development mode works reliably with that setup. This prevents YouTube styles from changing buttons, typography, and layout.

If Shadow DOM complicates hot reload, use Vue scoped styles and an extension-specific root class. Avoid broad selectors such as `button`, `body`, or `h1` in content-script styles.

## 7. YouTube route handling

YouTube changes routes without reloading the document. The content script must respond to those changes.

Implement route handling in `src/content/main.ts`:

1. Check `location.pathname` immediately when the content script starts.
2. Treat paths beginning with `/shorts/` as active Shorts routes.
3. Listen for YouTube's `yt-navigate-finish` event.
4. Listen for `popstate` as a fallback for browser navigation.
5. Compare the new URL with the last handled URL to avoid duplicate work.
6. Mount the UI and start the Shorts controller when entering a Shorts route.
7. Stop observers, detach video listeners, and hide or unmount the UI when leaving Shorts.
8. Ensure only one extension root exists even after many route changes.

Do not create a permanent high-frequency URL polling loop. Event-driven navigation handling plus a lightweight DOM observer is sufficient.

## 8. Finding the active short

YouTube keeps multiple Shorts elements in the document and recycles them while scrolling. A simple `document.querySelector('video')` will eventually target the wrong video.

Use this active-video strategy:

1. Query video elements inside Shorts renderer containers.
2. Prefer a visible video that is currently playing.
3. Track candidate visibility with `IntersectionObserver`.
4. Select the candidate with the largest intersection ratio, preferably above `0.75`.
5. Use YouTube's active-renderer attribute only as a secondary hint because internal attributes can change.
6. Use a `MutationObserver` on the Shorts feed to discover newly inserted or recycled videos.
7. When the active video changes, detach listeners from the old video before attaching to the new one.
8. Recalculate the active video after manual scroll, navigation-button clicks, and feed mutations.

Centralize YouTube selectors in one place inside `shorts-controller.ts`. This makes future repairs easier when YouTube changes its markup.

The observer must watch the smallest stable Shorts container available. Avoid observing the entire document with every MutationObserver option enabled.

## 9. Detecting video completion

Do not rely only on the `ended` event. YouTube may restart or loop a short before a normal `ended` handler can perform the desired action.

Attach these listeners to the active video:

- `ended` for normal completion.
- `timeupdate` as a near-end fallback.
- `durationchange` to refresh duration assumptions.
- `playing` to re-arm completion tracking after a replay or video change.
- `seeked` to avoid treating an ordinary seek as multiple completions.

Recommended completion logic:

1. Ignore videos with a missing, infinite, zero, or invalid duration.
2. Consider the short complete when `ended` fires.
3. Also consider it complete when remaining time enters a small threshold near zero.
4. Use a threshold large enough for `timeupdate` frequency, approximately `350ms` to `500ms`.
5. Trigger completion only once for each playback cycle.
6. Re-arm only after the video changes or its playback time returns near the beginning.
7. Clear completion state when the active renderer changes.

Use an explicit `handledCompletion` flag or playback-cycle counter. Without this guard, several near-end `timeupdate` events can skip multiple Shorts.

## 10. Loop behavior

When the current mode is `loop` and the active short completes:

1. Confirm the video is still the active short.
2. Mark the completion as handled before changing playback state.
3. Set `currentTime` to `0` if YouTube has not already restarted it.
4. Call `video.play()` and handle the returned promise.
5. Do not show an unhandled error if autoplay is blocked.
6. Re-arm completion only after playback has returned near the beginning.

Do not permanently overwrite unrelated video properties unless necessary. If the implementation sets `video.loop`, preserve the original value and restore it when detaching from that video.

## 11. Auto-scroll behavior

When the current mode is `auto-scroll` and the active short completes:

1. Confirm the video and renderer are still active.
2. Mark the completion as handled immediately.
3. Find the next Shorts renderer relative to the current renderer.
4. Move the next renderer into view with `scrollIntoView` if it already exists.
5. Fall back to YouTube's next-navigation button if the next renderer is not directly available.
6. Avoid selectors based only on English `aria-label` text because YouTube is localized.
7. Wait for the active video to change before allowing another completion action.
8. Retry briefly if YouTube is loading the next feed item, then stop instead of scrolling repeatedly.

Use smooth scrolling only if it does not delay activation of the next short. Respect reduced-motion preferences and use immediate scrolling when reduced motion is enabled.

Do not synthesize keyboard events as the primary navigation method. They can be intercepted by focused controls and are less reliable than moving to the known next renderer.

## 12. Content UI lifecycle

The content script should have a clear start and stop lifecycle.

### Start lifecycle

1. Create one root element with a unique ID such as `yt-auto-scroll-root`.
2. Mount the Vue control.
3. Load the saved playback mode.
4. Start route listeners.
5. Start the Shorts controller only when the current route is a Short.
6. Subscribe to storage changes.

### Stop or route-exit lifecycle

1. Disconnect `IntersectionObserver`.
2. Disconnect `MutationObserver`.
3. Remove listeners from the active video.
4. Cancel pending retry timers.
5. Clear active renderer and completion state.
6. Hide or unmount the control outside Shorts.

Make cleanup functions idempotent so calling them more than once is safe.

## 13. Popup behavior

Replace the starter popup with a compact version of the same mode control.

The popup should:

- Show the extension logo and a short title.
- Display the current mode immediately after reading storage.
- Allow switching between loop and auto-scroll behavior.
- Use the same labels, icons, colors, and state rules as the in-page control.
- Save changes through the shared settings module.
- Update if another extension context changes storage while the popup is open.
- Avoid requiring `tabs` or `activeTab` permissions for the MVP.

If reusing `ModeToggle.vue` makes the in-page and popup layouts awkward, keep two small views but share the state and design tokens.

## 14. Error handling and resilience

Handle expected failures without breaking YouTube playback.

- If no active video exists, wait for a DOM mutation instead of throwing.
- If the next renderer does not exist, leave the user on the current Short.
- If `video.play()` rejects, keep the mode enabled and allow manual playback.
- If storage fails, use loop mode for the current session.
- If YouTube replaces a video node, detach from the disconnected node and locate the replacement.
- If the active video changes during an auto-scroll attempt, cancel the old attempt.
- If a short is an advertisement or unsupported renderer, take no action unless it exposes a normal playable video.
- Keep development logs concise and prefix them consistently, for example `[yt-auto-scroll]`.
- Remove noisy production logs before release.

## 15. Performance rules

- Do not run an animation-frame loop to locate the current video.
- Do not query the full document on every `timeupdate` event.
- Cache the current renderer and video.
- Use passive listeners for scroll-related events when possible.
- Disconnect observers outside Shorts routes.
- Debounce mutation-driven active-video recalculation.
- Keep the content bundle dependency-free beyond Vue.
- Avoid adding a state-management library for one persisted mode value.

## 16. Accessibility checklist

- [ ] Both mode options are native buttons.
- [ ] The selected state is exposed with `aria-pressed`.
- [ ] The control group has an accessible name.
- [ ] Loop and auto-scroll are understandable without color alone.
- [ ] Focus indicators meet contrast requirements.
- [ ] Text and icons meet WCAG AA contrast where practical.
- [ ] The control works with keyboard-only navigation.
- [ ] Motion is reduced when the operating system requests it.
- [ ] Tooltips do not contain information unavailable to keyboard users.

## 17. Testing plan

### Build checks

Run these before manual testing:

```sh
pnpm exec tsc --noEmit
pnpm exec vue-tsc -b
pnpm build
```

Confirm the build contains:

- `dist/manifest.json`
- `dist/icons/`
- The popup HTML entry.
- The compiled content script.

### Development setup

1. Run `pnpm dev` and keep it running.
2. Open `chrome://extensions`.
3. Enable developer mode.
4. Load the project's `dist/` directory as an unpacked extension.
5. Open a YouTube Shorts URL in a separate tab.
6. Refresh the YouTube tab after content-script entry changes.

### Route tests

- [ ] Load a `/shorts/{id}` URL directly.
- [ ] Navigate from the YouTube homepage to Shorts without refreshing.
- [ ] Navigate from Shorts back to a normal watch page.
- [ ] Use browser back and forward navigation.
- [ ] Confirm only one extension control exists after repeated navigation.
- [ ] Confirm no control appears on non-Shorts YouTube pages.
- [ ] Confirm no script runs on unrelated websites.

### Mode tests

- [ ] Loop mode restarts the same Short exactly once per completion.
- [ ] Auto-scroll mode advances exactly one Short per completion.
- [ ] Enabling loop disables auto-scroll.
- [ ] Enabling auto-scroll disables loop.
- [ ] Clicking the active mode does not clear the selection.
- [ ] A mode change in the popup updates an already open Shorts tab.
- [ ] A mode change in the in-page control updates the popup.
- [ ] The selected mode survives browser and extension reloads.

### Playback edge cases

- [ ] Pause near the end and resume.
- [ ] Seek to the final second.
- [ ] Seek backward after reaching the completion threshold.
- [ ] Manually scroll before a video completes.
- [ ] Rapidly scroll through several Shorts.
- [ ] Test a very short video.
- [ ] Test a long Short.
- [ ] Test when the next Short is still loading.
- [ ] Test with captions open.
- [ ] Test with the video muted and unmuted.
- [ ] Test after leaving the tab in the background.
- [ ] Test a feed item that is an ad or nonstandard renderer.

### UI tests

- [ ] The control does not cover YouTube's like, comment, share, or navigation controls.
- [ ] The control remains usable at common desktop viewport sizes.
- [ ] The active state is obvious in light and dark YouTube themes.
- [ ] Both buttons work using mouse, keyboard, and touch input.
- [ ] Focus rings are visible.
- [ ] Reduced-motion mode removes the sliding animation.
- [ ] YouTube CSS does not alter the extension control.
- [ ] Extension CSS does not alter YouTube controls.

### Reload and failure tests

- [ ] Reload the unpacked extension while a Shorts page is open.
- [ ] Refresh the Shorts page after extension reload.
- [ ] Disable and re-enable the extension.
- [ ] Remove the stored setting and confirm loop mode is restored.
- [ ] Confirm there are no uncaught errors in the page console.
- [ ] Confirm there are no uncaught errors in the popup console.

## 18. Optional automated tests

Manual browser testing is required because YouTube's live DOM is not stable enough to model completely in unit tests. Small deterministic parts can still be tested.

Add Vitest only when the core behavior exists. Prioritize tests for:

- Playback-mode validation.
- Storage defaulting and change handling.
- Mutual-exclusion behavior.
- Completion threshold calculations.
- The once-per-playback-cycle guard.
- Selection of the most visible video from candidate metadata.
- Auto-scroll retry cancellation when the active video changes.

Keep YouTube selectors and direct DOM integration covered by manual tests unless a lightweight fixture proves useful.

## 19. Implementation order

Follow this order so each stage can be tested before adding more complexity.

1. Update the manifest and remove unused starter surfaces.
2. Define the playback mode and storage helpers.
3. Build the reusable Tesla-inspired mode control with local mock state.
4. Connect the in-page control to `chrome.storage.local`.
5. Add YouTube route detection and mount the control only on Shorts.
6. Implement active renderer and video detection.
7. Implement completion detection with the once-per-cycle guard.
8. Add loop behavior and test it independently.
9. Add next-renderer navigation and test auto-scroll independently.
10. Replace the popup and connect it to shared storage.
11. Add observer cleanup and route-exit handling.
12. Test edge cases and repair selector assumptions.
13. Run type checks and a production build.
14. Update the README with installation, usage, permissions, and testing instructions.
15. Package the final build and test the zip in a clean Chrome profile.

## 20. Release checklist

- [ ] `pnpm build` succeeds.
- [ ] The generated zip contains the same working extension as `dist/`.
- [ ] The manifest requests only `storage` and the required YouTube match pattern.
- [ ] The extension works after a clean install.
- [ ] Loop and auto-scroll are mutually exclusive.
- [ ] Settings persist after Chrome restarts.
- [ ] Direct and single-page navigation to Shorts both work.
- [ ] No starter UI or placeholder copy remains.
- [ ] No console errors occur during normal use.
- [ ] README instructions match the released behavior.
- [ ] Privacy documentation states that no browsing data is collected or transmitted.

## 21. Definition of done

The feature is complete when a user can install the unpacked extension, open YouTube Shorts through either direct or client-side navigation, choose loop or auto-scroll from a polished accessible control, and receive exactly one correct action whenever the active Short finishes. The selected mode must remain synchronized between the page and popup, survive reloads, and never affect non-Shorts pages.
