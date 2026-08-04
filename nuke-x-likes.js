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
