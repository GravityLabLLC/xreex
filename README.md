# 💥 Nuke Your X Likes

Prune your account for a fresh algorithm by nuking your X likes. This creates a clean likes state so you can move forward with more intentionality. ✨

## 🚀 Run it

1. Navigate to `https://x.com/YOUR_USERNAME/likes` (replace `YOUR_USERNAME`).
2. Open your browser's Developer Tools.
3. Open the **Console**, paste the script below, and press **Enter**.
4. Keep the tab open and visible until the script finishes.

> [!NOTE]
> The default configuration is intentionally conservative to reduce throttling. Large like histories may take a long time to clear.

<details>
<summary>📜 View inline code · standalone script: <a href="./nuke-x-likes.js"><code>nuke-x-likes.js</code></a></summary>

```javascript
(() => {
  const CONFIG = {
    maxUnlikes: 999999,          // safety limit (set lower if you want)
    baseDelay: 1800,             // ms between each unlike (increase if you get rate-limited)
    jitter: 800,                 // random extra delay
    scrollDelay: 2500,           // wait after scrolling
    batchPauseEvery: 40,         // pause every N unlikes
    batchPauseMs: 12000,         // longer pause duration
    maxNoProgress: 15            // stop if no new unlikes for this many cycles
  };

  let unliked = 0;
  let noProgressCount = 0;
  let running = true;

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

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

          // Random delay between clicks
          await sleep(CONFIG.baseDelay + rand(0, CONFIG.jitter));

          // Occasional longer pause to reduce rate-limit risk
          if (unliked % CONFIG.batchPauseEvery === 0) {
            log(`Batch pause (${CONFIG.batchPauseMs / 1000}s)...`);
            await sleep(CONFIG.batchPauseMs);
          }
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

## 🛑 Stop early

Run either command in the console:

```javascript
window.stopUnlike = true;
// or
window.stopUnlikeScript();
```

Refresh your likes page when it finishes to confirm the result. 🌱
