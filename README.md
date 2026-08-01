# X account cleanup scripts

Browser-console scripts for removing likes and unfollowing accounts that do not follow you back.

## Remove likes

1. Open `https://x.com/YOUR_USERNAME/likes`.
2. Open the browser developer console.
3. Paste and run [nuke-x-likes.js](./nuke-x-likes.js).
4. Keep the tab open and visible until it finishes.

The script targets one unlike per second.

<details>
<summary>View code</summary>

```javascript
(() => {
  const CONFIG = {
    maxUnlikes: 999999,          // safety limit (set lower if you want)
    actionInterval: 1000,        // target one unlike per second
    scrollDelay: 2500,           // wait after scrolling
    maxNoProgress: 15            // stop if no new unlikes for this many cycles
  };

  let unliked = 0;
  let noProgressCount = 0;
  let running = true;

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const log = (msg) => console.log(`[Unlike] ${msg}`);

  async function clickUnlikeButtons() {
    // Current X selectors for the unlike (filled heart) button
    const buttons = [
      ...document.querySelectorAll('div[data-testid="unlike"]'),
      ...document.querySelectorAll('button[data-testid="unlike"]'),
      ...document.querySelectorAll('[aria-label*="Unlike"]')
    ];

    // Deduplicate
    const unique = [...new Set(buttons)];

    let clickedThisRound = 0;

    for (const btn of unique) {
      if (!running || unliked >= CONFIG.maxUnlikes) break;

      try {
        // Only click if it still looks like a liked state
        if (btn.getAttribute('data-testid') === 'unlike' ||
            (btn.getAttribute('aria-label') || '').toLowerCase().includes('unlike')) {

          btn.click();
          unliked++;
          clickedThisRound++;
          log(`Unliked #${unliked}`);

          // Target one unlike per second
          await sleep(CONFIG.actionInterval);
        }
      } catch (e) {
        // ignore individual click errors
      }
    }

    return clickedThisRound;
  }

  async function scrollDown() {
    window.scrollTo(0, document.body.scrollHeight);
    await sleep(CONFIG.scrollDelay);
  }

  async function mainLoop() {
    log('Starting bulk unlike. Keep this tab open and visible.');
    log('To stop early, type:  window.stopUnlike = true');

    while (running && unliked < CONFIG.maxUnlikes) {
      if (window.stopUnlike) {
        log('Stopped by user.');
        break;
      }

      const clicked = await clickUnlikeButtons();

      if (clicked === 0) {
        noProgressCount++;
        log(`No buttons found (${noProgressCount}/${CONFIG.maxNoProgress}). Scrolling...`);
      } else {
        noProgressCount = 0;
      }

      if (noProgressCount >= CONFIG.maxNoProgress) {
        log('No more likes loading. Finished or reached the end.');
        break;
      }

      await scrollDown();
    }

    log(`Done. Total unliked this session: ${unliked}`);
    log('Refresh the page to confirm.');
  }

  // Expose stop function
  window.stopUnlike = false;
  window.stopUnlikeScript = () => { window.stopUnlike = true; };

  mainLoop();
})();
```

</details>

To stop early:

```javascript
window.stopUnlikeScript();
```

## Unfollow non-followers

1. Open `https://x.com/YOUR_USERNAME/following`.
2. Open the browser developer console.
3. Paste and run [nuke-x-unfollowers.js](./nuke-x-unfollowers.js).
4. Keep the tab open and visible until it finishes.

The script skips accounts marked `Follows you`, targets one unfollow per second, and stops after 2,500 unfollows.

<details>
<summary>View code</summary>

```javascript
(() => {
  const CONFIG = {
    maxUnfollows: 2500,          // Maximum unfollows per run
    actionInterval: 1000,        // Target one unfollow per second
    scrollDelay: 3000,           // Wait after scrolling
    maxNoProgress: 12,           // Stop if nothing happens for this many cycles
    confirmWait: 800             // Wait for the confirmation dialog
  };

  let unfollowed = 0;
  let noProgress = 0;
  let running = true;

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const log = (msg) => console.log(`[Unfollow] ${msg}`);

  // Find the confirmation "Unfollow" button in the modal
  function getConfirmButton() {
    // Primary modern selector
    let btn = document.querySelector('[data-testid="confirmationSheetConfirm"]');
    if (btn) return btn;

    // Fallback: any button that says exactly "Unfollow"
    btn = [...document.querySelectorAll('button, div[role="button"]')]
      .find(el => el.textContent.trim().toLowerCase() === 'unfollow');
    return btn || null;
  }

  async function processCell(cell) {
    // Skip anyone who follows you back
    if (cell.textContent.includes('Follows you')) {
      return false;
    }

    // Find the "Following" button inside this user card
    // Common current selectors
    let followBtn = cell.querySelector('[data-testid$="-unfollow"]') ||
                    cell.querySelector('[data-testid="unfollow"]') ||
                    [...cell.querySelectorAll('button, div[role="button"]')]
                      .find(b => {
                        const text = (b.innerText || b.getAttribute('aria-label') || '').toLowerCase();
                        return text.includes('following');
                      });

    if (!followBtn) return false;

    try {
      // Click "Following" → opens confirm dialog
      followBtn.click();
      await sleep(CONFIG.confirmWait);

      const confirmBtn = getConfirmButton();
      if (confirmBtn) {
        confirmBtn.click();
        unfollowed++;
        log(`Unfollowed non-follower  (#${unfollowed})`);
        return true;
      } else {
        log('Confirm button not found – skipping');
        // Click somewhere safe or press Escape to close any open dialog
        document.body.click();
        return false;
      }
    } catch (e) {
      log('Error on one user: ' + e.message);
      return false;
    }
  }

  async function mainLoop() {
    log('Starting non-follower unfollow script.');
    log(`Max this run: ${CONFIG.maxUnfollows} | Target pace: 1 unfollow/s`);
    log('To stop early → type:  window.stopUnfollow = true');

    while (running && unfollowed < CONFIG.maxUnfollows) {
      if (window.stopUnfollow) {
        log('Stopped by user.');
        break;
      }

      const cells = [...document.querySelectorAll('[data-testid="UserCell"]')];
      let actionTaken = false;

      for (const cell of cells) {
        if (!running || unfollowed >= CONFIG.maxUnfollows) break;

        const actionStartedAt = Date.now();
        const success = await processCell(cell);
        if (success) {
          actionTaken = true;
          noProgress = 0;

          // Include the confirmation wait in the one-second action interval
          const elapsed = Date.now() - actionStartedAt;
          const remainingDelay = Math.max(0, CONFIG.actionInterval - elapsed);
          await sleep(remainingDelay);
        }
      }

      if (!actionTaken) {
        noProgress++;
        log(`No actionable users found (${noProgress}/${CONFIG.maxNoProgress}). Scrolling...`);
        window.scrollTo(0, document.body.scrollHeight);
        await sleep(CONFIG.scrollDelay);
      }

      if (noProgress >= CONFIG.maxNoProgress) {
        log('No more non-followers loading. Finished (or reached the end of loaded list).');
        break;
      }
    }

    log(`Done. Total unfollowed this session: ${unfollowed}`);
    log('Refresh the page to see the updated Following count.');
  }

  // Global stop control
  window.stopUnfollow = false;
  window.stopUnfollowScript = () => { window.stopUnfollow = true; };

  mainLoop();
})();
```

</details>

To stop early:

```javascript
window.stopUnfollowScript();
```

Review each script before running it. X may rate-limit large batches.
