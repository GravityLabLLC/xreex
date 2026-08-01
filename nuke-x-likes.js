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
