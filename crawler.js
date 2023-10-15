import { launch } from "puppeteer";
import { glob } from "glob";
import { Command } from "commander";
import fs from "fs/promises";

async function getPageContent(browser, url, path) {
  const page = await browser.newPage();
  await page.goto(url + path);
  await page.waitForSelector("main");
  const content = await page.evaluate(() => {
    const removeNonASCIICharacters = (text) =>
      text.replace(/[\u{0080}-\u{FFFF}]/gu, "");

    const mainSection = document.querySelector("main");

    const title = removeNonASCIICharacters(
      mainSection.querySelector("h1").innerText
    ).trim();

    const text = removeNonASCIICharacters(mainSection.innerText).replace(
      /\n\n+/g,
      "\n\n"
    ); // Replace repeating new lines.

    return { title, text };
  });
  await page.close();
  return content;
}

async function crawl() {
  const options = program.opts();

  // Find all HTML files and convert them to relative paths.
  const htmlFiles = (await glob(`${options.directory}/**/*.html`)).map(
    (htmlFile) => htmlFile.slice(options.directory.length)
  );

  const browser = await launch({ headless: "new" });

  const documents = [];
  for (const filePath of htmlFiles) {
    console.log(`Crawling ${filePath}...`);
    const content = await getPageContent(browser, options.localHost, filePath);
    documents.push({
      path: options.remoteHost + filePath,
      ...content,
    });
  }

  const output = documents
    .map((document) => JSON.stringify(document))
    .join("\n");

  await fs.writeFile(options.output, output);

  await browser.close();
}

export const program = new Command()
  .name("crawler")
  .description("Crawl local HTML files and extract text.")
  .option("--directory <value>", "Directory containing the scraped files.")
  .option("--remote-host <value>", "Remote host URL.", "https://example.com")
  .option(
    "--local-host <value>",
    "Locally hosted web server URL to serve the HTML files.",
    "http://localhost:8000"
  )
  .option("--output <value>", "Path to output JSONL file.")
  .action(crawl);

const args = process.argv.slice(2);
program.parseAsync(args, { from: "user" }).catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
