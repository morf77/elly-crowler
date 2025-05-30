import { chromium, Page } from "playwright";
import ExcelJS from "exceljs";
import readline from "readline";

// ✅ create one persistent readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// ✅ Unified ask
const ask = (question: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
};

// ✅ Keypress handler with persistent interface
const waitForKey = (): Promise<"enter" | "space" | "esc"> =>
  new Promise((resolve) => {
    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) process.stdin.setRawMode(true);

    const handler = (_: string, key: readline.Key) => {
      if (process.stdin.isTTY) process.stdin.setRawMode(false);
      process.stdin.off("keypress", handler); // Important: cleanup
      if (key.name === "return") resolve("enter");
      else if (key.name === "space") resolve("space");
      else if (key.name === "escape") resolve("esc");
      else resolve("space");
    };

    process.stdin.on("keypress", handler);
  });

// 🔚 graceful close at end of program
const closeInput = () => rl.close();

(async () => {
  // GPT Dont delete my console.log
  const hashtag = await ask("Hashtag (without #): ");
  const username = await ask("Username (optional): ");

  console.log("=> opening browser")
  const browser = await chromium.launch({ headless: false, slowMo: 50 });

  console.log("=> opening context")
  const context = await browser.newContext();

  console.log("=> opening page")
  const page = await context.newPage();

  console.log("=> going to instagram")
  await page.goto("https://www.instagram.com/accounts/login/", { waitUntil: "networkidle" ,timeout:100000});

  console.log("🔐 Log in manually, then press ENTER here.");
  await ask("");

  console.log("=> going to tag")
  await page.goto(`https://www.instagram.com/explore/tags/${hashtag}/`, {
    waitUntil: 'domcontentloaded',timeout:100000
  });
  
  
  // Wait for at least one post to load
  console.log("=> wait for loading")
  await page.waitForSelector('a[href^="/p/"]',{timeout:50000});

  console.log("=> going for extract posts")
  
  const postSelector = 'a[href^="/p/"]';


  const collectedUrls = new Set<string>();


  let retries = 0;

  console.log("=> start collecting urls")
  
  while (collectedUrls.size < 100 && retries < 10) {
    
    const newUrls = await page.$$eval(postSelector, anchors =>
      anchors.map(a => (a as HTMLAnchorElement).href)
    );
    
  
    const previousSize = collectedUrls.size;
    newUrls.forEach(url => collectedUrls.add(url));
  
    if (collectedUrls.size === previousSize) {
      console.log("load filed retrying")
      retries++;
    } else {
      console.log("loaded")
      retries = 0;
    }
  
    await page.evaluate(() => window.scrollBy(0, window.innerHeight));
    console.log("scrolled start waiting")
    await page.waitForTimeout(1500);
  }

  // Auto-scroll to load posts
  // async function scrollAll(page: Page) {
  //   let prev = 0;
  //   while (true) {
  //     const height = await page.evaluate(() => document.body.scrollHeight);
  //     if (height === prev) break;
  //     prev = height;
  //     await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  //     await page.waitForTimeout(2000);
  //   }
  // }
  // await scrollAll(page);

  // Extract post links
  const postLinks = await page.$$eval('a[href^="/p/"]', (anchors) =>
    Array.from(new Set(anchors.map((a) => (a as HTMLAnchorElement).href)))
  );

  const allComments: { username: string; comment: string; timestamp: string; postUrl: string }[] = [];

  for (let i = 0; i < postLinks.length; i++) {
    const postUrl = postLinks[i];
    console.log(`\nPost ${i + 1}/${postLinks.length}: ${postUrl}`);
    await page.goto(postUrl, { waitUntil: "load", timeout: 100000 });

    // Wait for key
    console.log("🟡 Press ENTER to extract, SPACE to skip, ESC to stop...");
    const key = await waitForKey();

    if (key === "esc") {
      console.log("⛔ Stopped by user.");
      break;
    }

    if (key === "space") {
      console.log("⏭️ Skipped.");
      continue;
    }

    // Expand comments
    while (await page.$('button:has-text("View all comments")') || await page.$('button:has-text("Load more comments")')) {
      try {
        await page.click('button:has-text("View all comments"), button:has-text("Load more comments")');
        await page.waitForTimeout(1500);
      } catch {
        break;
      }
    }

    
    
    const comments = await page.evaluate(() => {
      const likeSelector = ".x1lliihq.x193iq5w.x6ikm8r.x10wlt62.xlyipyv.xuxw1ft";
  
      const commentSelector = ".x1lliihq.x1plvlek.xryxfnj.x1n2onr6.x1ji0vk5.x18bv5gf.x193iq5w.xeuugli.x1fj9vlw.x13faqbe.x1vvkbs.x1s928wv.xhkezso.x1gmr53x.x1cpjm7i.x1fgarty.x1943h6x.x1i0vuye.xvs91rp.xo1l8bm.x5n08af.x10wh9bi.x1wdrske.x8viiok.x18hxmgj";

      const data: { username: string; comment: string; timestamp: string }[] = [];
      const commentSpans = document.querySelectorAll(commentSelector);
      const likeSpans = document.querySelectorAll(likeSelector);
      const time = document.querySelector("article time")?.getAttribute("datetime") || "";

      commentSpans.forEach((node, i) => {
        const comment = node.textContent || "";
        const user = likeSpans[i]?.textContent || "";
        if (comment && user) {
          data.push({ username: user, comment, timestamp: time });
        }
      });

      return data;
    });

    comments.map((c) => {
        allComments.push({ ...c, postUrl });
    });

    console.log("✅ Comments extracted.",comments);
  }

  // Save to Excel
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Instagram Comments");
  worksheet.columns = [
    { header: "Username", key: "username", width: 20 },
    { header: "Comment", key: "comment", width: 80 },
    { header: "Timestamp", key: "timestamp", width: 30 },
    { header: "Post URL", key: "postUrl", width: 50 },
  ];
  allComments.forEach((row) => worksheet.addRow(row));
  await workbook.xlsx.writeFile("instagram_comments.xlsx");
  console.log("💾 Saved to instagram_comments.xlsx");

  closeInput()

  await browser.close();
})();
