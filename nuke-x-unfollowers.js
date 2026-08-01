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
