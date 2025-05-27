import { chromium, Page } from 'playwright';
import readline from 'readline';
import ExcelJS from 'exceljs';

(async () => {
  console.log("🚀 Launching browser...");
  const browser = await chromium.launch({ headless: false, slowMo: 50 });
  const context = await browser.newContext();
  const page = await context.newPage();

  const targetUsername = 'codex_401';
  const profileUrl = `https://www.instagram.com/${targetUsername}/`;

  // Step 1: Open login page
  console.log("🔐 Navigating to Instagram login page...");
  await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'networkidle' });

  console.log('\n🚨 Please log in manually in the browser window.');
  console.log('✅ Once logged in and you see your feed, press ENTER here to continue...\n');

  // Step 2: Wait for Enter key
  await new Promise<void>((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question('Press ENTER to continue after login...\n', () => {
      rl.close();
      resolve();
    });
  });

  console.log("✅ Continuing script after manual login...");

  // Step 3: Navigate to profile
  console.log(`👤 Navigating to profile: ${targetUsername}`);
  await page.goto(profileUrl, { waitUntil: 'load', timeout: 60000 });

  // Step 4: Scroll to load posts
  console.log("📜 Scrolling to load more posts...");
  async function autoScroll(page: Page): Promise<void> {
    let previousHeight = 0;
    while (true) {
      const currentHeight = await page.evaluate('document.body.scrollHeight');
      if (currentHeight === previousHeight) break;
      previousHeight = currentHeight as number;
      await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
      await page.waitForTimeout(2000);
    }
  }

  await autoScroll(page);
  console.log("✅ Scrolling complete.");

  // Step 5: Extract post URLs only
  console.log("🔍 Searching for post links...");
  await page.waitForSelector('a[href^="/p/"]');

  const posts: { postUrl: string }[] = await page.evaluate(() => {
    const postNodes = document.querySelectorAll('a[href^="/p/"]');
    const data: { postUrl: string }[] = [];

    postNodes.forEach((node) => {
      const href = node.getAttribute('href');
      if (href) {
        data.push({
          postUrl: `https://www.instagram.com${href}`,
        });
      }
    });

    return data;
  });

  // Step 6: Log post URLs
  console.log(`\n✅ Extracted ${posts.length} post URLs:\n`);
  posts.forEach((post, i) => {
    console.log(`--- Post ${i + 1} ---`);
    console.log(`Link: ${post.postUrl}\n`);
  });

  // ======= NEW: Extract hashtagged messages and timestamps from each post =======

  async function extractHashtagMessages(page: Page, postUrl: string) {
    await page.goto(postUrl, { waitUntil: 'load', timeout: 60000 });

    // Wait for post caption to load
    await page.waitForSelector('article', { timeout: 15000 });

    // Extract messages with hashtags and timestamps
    const data = await page.evaluate(() => {
      const results: { message: string; timestamp: string; hashtags: string[] }[] = [];

      // Caption node selector
      const captionNode = document.querySelector('article div > ul > li > div > div > span');
      if (captionNode) {
        const message = captionNode.textContent || '';
        // Extract hashtags as lowercase without '#'
        const hashtags = Array.from(message.matchAll(/#(\w+)/g)).map(m => m[1].toLowerCase());

        // Timestamp inside time element under article
        const timeNode = document.querySelector('article time');
        const timestamp = timeNode ? timeNode.getAttribute('datetime') || '' : '';

        if (hashtags.length > 0) {
          results.push({ message, timestamp, hashtags });
        }
      }

      return results;
    });

    return data;
  }

  // Collect all hashtagged messages
  const allMessages: { message: string; timestamp: string; hashtag: string }[] = [];

  for (const [index, post] of posts.entries()) {
    console.log(`🔎 Extracting hashtag messages from post ${index + 1} / ${posts.length}`);
    const extracted = await extractHashtagMessages(page, post.postUrl);

    extracted.forEach(({ message, timestamp, hashtags }) => {
      hashtags.forEach((hashtag) => {
        allMessages.push({ message, timestamp, hashtag });
      });
    });
  }

  // Save filtered messages to Excel
  async function saveMessagesToExcel(data: { message: string; timestamp: string; hashtag: string }[]) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('HashtagMessages');

    worksheet.columns = [
      { header: 'Hashtag', key: 'hashtag', width: 20 },
      { header: 'Timestamp', key: 'timestamp', width: 30 },
      { header: 'Message', key: 'message', width: 100 },
    ];

    data.forEach((row) => {
      worksheet.addRow(row);
    });

    await workbook.xlsx.writeFile('hashtag_messages.xlsx');
    console.log('✅ Hashtag messages saved to hashtag_messages.xlsx');
  }

  await saveMessagesToExcel(allMessages);

  // ======= END NEW FEATURE =======

  console.log("🛑 Closing browser.");
  await browser.close();
})();
