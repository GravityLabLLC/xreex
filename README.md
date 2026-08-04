# X account cleanup scripts

Browser-console scripts for nuking stale X likes, unfollowers, and accounts matching OnlyFans or promotional bio keywords.

## Stale X Likes

These are things you've liked in the past. They influence your account's shape and frequency and thus your algorithm. Use this script to obtain a reset.

## Unfollowers

These are people you follow who do not follow you back. Tired of interacting and never getting a follow back? Want to reset your account's breadth by limiting things to mutuals? Use this script to obtain a reset.

## OnlyFans models

Use [nuke-x-onlyfans-models.js](./nuke-x-onlyfans-models.js) on your X Following page to unfollow accounts whose visible profile text matches the configurable OnlyFans and promotional keyword list. Review the keywords before running it: broad phrases such as `link in bio` and Instagram references can match unrelated accounts. Note that this script might inadverently include accounts that are not OnlyFans models. It's intended to be an ultralight first pass.

## Nuking Stale X-likes

1. Open `https://x.com/YOUR_USERNAME/likes`.
2. Open the browser developer console.
3. Paste and run [nuke-x-likes.js](./nuke-x-likes.js).
4. Keep the tab open and visible until it finishes.

The script uses a jittered 850–1,300 ms delay between unlikes, pauses for 9 seconds after every 45 unlikes, and reports elapsed time, average speed, and ETA.

<details>
<summary>View code</summary>

```javascript
(() => {
  const CONFIG = {
    maxUnlikes: 999999,          // Safety limit
    minDelay: 850,               // Fastest end of the range (ms)
    maxDelay: 1300,              // Slowest end of the range (ms)
    scrollDelay: 2200,
    batchPauseEvery: 45,         // Longer pause every N unlikes
    batchPauseMs: 9000,
    maxNoProgress: 16
  };

  let unliked = 0;
  let noProgressCount = 0;
  let running = true;
  const startTime = Date.now();

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  function formatTime(ms) {
    if (ms < 0 || !isFinite(ms)) return "—";
    const sec = Math.floor(ms / 1000);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  function getStats() {
    const elapsed = Date.now() - startTime;
    const ratePerMin = elapsed > 5000 ? (unliked / (elapsed / 60000)) : 0;
    const ratePerSec = ratePerMin / 60;
    const remaining = Math.max(0, CONFIG.maxUnlikes - unliked);
    const etaMs = ratePerMin > 0 ? (remaining / ratePerMin) * 60000 : 0;

    return {
      elapsed: formatTime(elapsed),
      ratePerMin: ratePerMin.toFixed(1),
      ratePerSec: ratePerSec.toFixed(2),
      eta: formatTime(etaMs)
    };
  }

  function log(msg, type = "info") {
    const { elapsed, ratePerMin, ratePerSec, eta } = getStats();
    const icons = {
      info: "💙",
      success: "✅",
      wait: "⏳",
      scroll: "📜",
      warn: "⚠️",
      done: "🎉",
      eta: "🕒"
    };

    console.log(
      `${icons[type] || "💙"} ${msg}  |  ⏱️ ${elapsed}  |  ❤️ ${unliked}  |  ⚡ ${ratePerSec}/s (${ratePerMin}/min)  |  🕒 ETA ${eta}`
    );
  }

  async function clickUnlikeButtons() {
    const buttons = [
      ...document.querySelectorAll('div[data-testid="unlike"]'),
      ...document.querySelectorAll('button[data-testid="unlike"]'),
      ...document.querySelectorAll('[aria-label*="Unlike"], [aria-label*="unlike"]')
    ];

    const unique = [...new Set(buttons)];
    let clickedThisRound = 0;

    for (const btn of unique) {
      if (!running || unliked >= CONFIG.maxUnlikes) break;

      try {
        const isUnlike = btn.getAttribute('data-testid') === 'unlike' ||
                         (btn.getAttribute('aria-label') || '').toLowerCase().includes('unlike');

        if (isUnlike) {
          btn.click();
          unliked++;
          clickedThisRound++;
          log(`Unliked #${unliked}`, "success");

          // Aggressive but jittered delay (targets ~0.9–1.1 unlikes/sec average)
          await sleep(rand(CONFIG.minDelay, CONFIG.maxDelay));

          // Occasional longer pause to reduce throttling risk
          if (unliked % CONFIG.batchPauseEvery === 0) {
            log(`Safety pause (${CONFIG.batchPauseMs / 1000}s) after ${unliked} unlikes`, "wait");
            await sleep(CONFIG.batchPauseMs);
          }
        }
      } catch (e) {}
    }

    return clickedThisRound;
  }

  async function scrollDown() {
    document.documentElement.scrollTop = document.documentElement.scrollHeight;
    document.body.scrollTop = document.body.scrollHeight;
    await sleep(CONFIG.scrollDelay);
  }

  async function mainLoop() {
    console.clear();
    console.log("%c🚀 Fast Bulk Unlike Script", "font-size:16px; font-weight:bold; color:#1DA1F2");
    log("Started – targeting ~1 unlike/sec with anti-throttle jitter");
    console.log("🛑 Stop early → type: stopUnlike = true");
    console.log("─".repeat(70));

    // Safe stop flag
    this.stopUnlike = false;

    while (running && unliked < CONFIG.maxUnlikes) {
      if (this.stopUnlike) {
        log("Stopped by user", "warn");
        break;
      }

      const clicked = await clickUnlikeButtons();

      if (clicked === 0) {
        noProgressCount++;
        log(`No buttons found (${noProgressCount}/${CONFIG.maxNoProgress}) → scrolling`, "scroll");
      } else {
        noProgressCount = 0;
      }

      if (noProgressCount >= CONFIG.maxNoProgress) {
        log("No more likes loading. Finished!", "done");
        break;
      }

      await scrollDown();
    }

    // Final summary
    console.log("─".repeat(70));
    const { elapsed, ratePerMin, ratePerSec } = getStats();
    console.log("%c🎉 Finished!", "font-size:16px; font-weight:bold; color:#17BF63");
    console.log(`❤️  Total unliked     : ${unliked}`);
    console.log(`⏱️  Time elapsed      : ${elapsed}`);
    console.log(`⚡  Average speed     : ${ratePerSec}/s  (${ratePerMin}/min)`);
    console.log("Refresh the page to confirm.");
  }

  mainLoop();
})();
```

</details>

To stop early:

```javascript
stopUnlike = true;
```

## Nuking X Unfollowers

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

## Nuking OnlyFans Models

1. Open `https://x.com/YOUR_USERNAME/following`.
2. Open the browser developer console.
3. Review the keyword list, then paste and run [nuke-x-onlyfans-models.js](./nuke-x-onlyfans-models.js).
4. Keep the tab open and visible until it finishes.

The script scans visible profile text for configurable OnlyFans and promotional keywords, waits 6–14 seconds between unfollows, and stops after 60 unfollows. By default, it can unfollow accounts that follow you back. Broad terms such as `link in bio`, `18+`, and Instagram references can match unrelated accounts.

<details>
<summary>View code</summary>

```javascript
(() => {
  // ========== CONFIG ==========
  const CONFIG = {
    maxUnfollows: 60,          // Safe limit per run
    minDelay: 6000,            // 6–14 seconds between unfollows
    maxDelay: 14000,
    scrollDelay: 3000,
    maxNoProgress: 15,
    requireNotFollowingBack: false  // true = only unfollow if they don't follow you
  };

  // Keyword list (case-insensitive). Edit freely.
  const KEYWORDS = [
    // Direct OnlyFans / Fansly etc.
    "onlyfans", "only fans", "onlyfans.com", "fansly", "fanvue", "loyalfans",
    "of.com", "o.f.", "o/f",

    // Common promo language
    "link in bio", "linkinbio", "link tree", "linktree", "allmylinks",
    "beacons.ai", "beacons", "spicy content", "exclusive content",
    "premium content", "18+", "nsfw", "adult content", "subscribe for",

    // Soft / emoji-heavy signals often used by these accounts
    "🔥 link", "🍑", "🍆", "content creator 🔞", "🔞", "vip content",
    "custom content", "dick rating", "sexting", "menu in bio",

    // Instagram promo patterns
    "ig:", "instagram:", "insta:", "my ig", "follow my ig"
  ];

  // ========== SCRIPT ==========
  let unfollowed = 0;
  let noProgress = 0;
  let running = true;
  const startTime = Date.now();

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  function formatElapsed(ms) {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}h ${m}m ${sec}s`;
    if (m > 0) return `${m}m ${sec}s`;
    return `${sec}s`;
  }

  function log(msg, type = "info") {
    const elapsed = formatElapsed(Date.now() - startTime);
    const rate = (Date.now() - startTime) > 0
      ? (unfollowed / ((Date.now() - startTime) / 60000)).toFixed(1)
      : "0.0";

    const icons = {
      info: "💙", success: "✅", wait: "⏳", scroll: "📜",
      warn: "⚠️", done: "🎉", match: "🎯"
    };

    console.log(`${icons[type] || "💙"} ${msg}  |  ⏱️ ${elapsed}  |  🚫 ${unfollowed} unfollowed  |  📈 ${rate}/min`);
  }

  function getConfirmButton() {
    return document.querySelector('[data-testid="confirmationSheetConfirm"]') ||
           [...document.querySelectorAll('button, div[role="button"]')]
             .find(b => b.textContent.trim().toLowerCase() === "unfollow");
  }

  function matchesKeywords(text) {
    const lower = text.toLowerCase();
    return KEYWORDS.some(kw => lower.includes(kw.toLowerCase()));
  }

  async function processCell(cell) {
    const text = cell.textContent || "";

    // Optional: skip mutuals
    if (CONFIG.requireNotFollowingBack && text.includes("Follows you")) {
      return false;
    }

    if (!matchesKeywords(text)) return false;

    // Find the Following button
    let btn = cell.querySelector('[data-testid$="-unfollow"]') ||
              cell.querySelector('[data-testid="unfollow"]') ||
              [...cell.querySelectorAll('button, div[role="button"]')]
                .find(b => (b.innerText || b.getAttribute("aria-label") || "").toLowerCase().includes("following"));

    if (!btn) return false;

    try {
      btn.click();
      await sleep(700);

      const confirm = getConfirmButton();
      if (confirm) {
        confirm.click();
        unfollowed++;
        log(`Matched & unfollowed → ${text.slice(0, 60).replace(/\n/g, " ")}...`, "match");
        return true;
      } else {
        document.body.click(); // close any dialog
        return false;
      }
    } catch (e) {
      return false;
    }
  }

  async function main() {
    console.clear();
    console.log("%c🎯 OnlyFans / Promo Bio Unfollow Script", "font-size:16px; font-weight:bold; color:#ff6b6b");
    log("Started. Scanning visible bios for keywords...");
    console.log("🛑 Stop anytime → type: stopUnfollow = true");
    console.log("─".repeat(60));

    this.stopUnfollow = false;

    while (running && unfollowed < CONFIG.maxUnfollows) {
      if (this.stopUnfollow) {
        log("Stopped by user", "warn");
        break;
      }

      const cells = [...document.querySelectorAll('[data-testid="UserCell"]')];
      let action = false;

      for (const cell of cells) {
        if (!running || unfollowed >= CONFIG.maxUnfollows || this.stopUnfollow) break;

        const success = await processCell(cell);
        if (success) {
          action = true;
          noProgress = 0;
          const delay = rand(CONFIG.minDelay, CONFIG.maxDelay);
          log(`Waiting ${(delay / 1000).toFixed(1)}s...`, "wait");
          await sleep(delay);
        }
      }

      if (!action) {
        noProgress++;
        log(`No matches in view (${noProgress}/${CONFIG.maxNoProgress}) → scrolling`, "scroll");
        document.documentElement.scrollTop = document.documentElement.scrollHeight;
        document.body.scrollTop = document.body.scrollHeight;
        await sleep(CONFIG.scrollDelay);
      }

      if (noProgress >= CONFIG.maxNoProgress) {
        log("No more matches found. Done!", "done");
        break;
      }
    }

    console.log("─".repeat(60));
    const elapsed = formatElapsed(Date.now() - startTime);
    console.log("%c🎉 Finished!", "font-size:16px; font-weight:bold; color:#17BF63");
    console.log(`🚫  Total unfollowed : ${unfollowed}`);
    console.log(`⏱️  Time elapsed     : ${elapsed}`);
    console.log("Refresh the page to see the updated list.");
  }

  main();
})();
```

</details>

To stop early:

```javascript
stopUnfollow = true;
```

Review each script before running it. X may rate-limit large batches. These scripts were, ironically and unironically, generated by Grok on X. We make no guarantees about their security or safety, but we do use them ourselves for pruning.
