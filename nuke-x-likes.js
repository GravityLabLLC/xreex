(() => {
  const CONFIG = {
    maxUnlikes: 999999,
    minDelay: 850,               // ~1 unlike per second target
    maxDelay: 1300,
    scrollDelay: 2200,
    batchPauseEvery: 45,
    batchPauseMs: 9000,
    // No maxNoProgress limit — it will keep scrolling forever
  };

  let unliked = 0;
  let consecutiveNoButtons = 0;
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
    const etaMs = ratePerMin > 0.5 ? (remaining / ratePerMin) * 60000 : 0;

    return {
      elapsed: formatTime(elapsed),
      ratePerMin: ratePerMin.toFixed(1),
      ratePerSec: ratePerSec.toFixed(2),
      eta: ratePerMin > 0.5 ? formatTime(etaMs) : "—"
    };
  }

  function log(msg, type = "info") {
    const { elapsed, ratePerMin, ratePerSec, eta } = getStats();
    const icons = {
      info: "💙", success: "✅", wait: "⏳", scroll: "📜",
      warn: "⚠️", done: "🎉"
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
    let clicked = 0;

    for (const btn of unique) {
      if (!running || unliked >= CONFIG.maxUnlikes) break;

      try {
        const isUnlike = btn.getAttribute('data-testid') === 'unlike' ||
                         (btn.getAttribute('aria-label') || '').toLowerCase().includes('unlike');

        if (isUnlike) {
          btn.click();
          unliked++;
          clicked++;
          consecutiveNoButtons = 0;          // reset counter
          log(`Unliked #${unliked}`, "success");

          await sleep(rand(CONFIG.minDelay, CONFIG.maxDelay));

          if (unliked % CONFIG.batchPauseEvery === 0) {
            log(`Safety pause (${CONFIG.batchPauseMs / 1000}s)`, "wait");
            await sleep(CONFIG.batchPauseMs);
          }
        }
      } catch (e) {}
    }

    return clicked;
  }

  async function scrollDown() {
    document.documentElement.scrollTop = document.documentElement.scrollHeight;
    document.body.scrollTop = document.body.scrollHeight;
    await sleep(CONFIG.scrollDelay);
  }

  async function mainLoop() {
    console.clear();
    console.log("%c🚀 Infinite Bulk Unlike Script", "font-size:16px; font-weight:bold; color:#1DA1F2");
    log("Running indefinitely – will keep scrolling as long as needed");
    console.log("🛑 Stop → type: stopUnlike = true");
    console.log("─".repeat(70));

    this.stopUnlike = false;

    while (running && unliked < CONFIG.maxUnlikes) {
      if (this.stopUnlike) {
        log("Stopped by user", "warn");
        break;
      }

      const clicked = await clickUnlikeButtons();

      if (clicked === 0) {
        consecutiveNoButtons++;
        // Only log every few scrolls so the console doesn’t spam
        if (consecutiveNoButtons === 1 || consecutiveNoButtons % 5 === 0) {
          log(`No buttons found (scrolled ${consecutiveNoButtons}×) – continuing...`, "scroll");
        }
      }

      await scrollDown();
    }

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