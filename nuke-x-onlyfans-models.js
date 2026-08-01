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
