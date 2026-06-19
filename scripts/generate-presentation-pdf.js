const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

const htmlPath = path.resolve(__dirname, "../docs/FekraTech_Presentation_Guide.html");
const pdfPath = path.resolve(__dirname, "../docs/FekraTech_Presentation_Guide.pdf");

(async () => {
  if (!fs.existsSync(htmlPath)) {
    console.error("HTML file not found:", htmlPath);
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.goto(`file:///${htmlPath.replace(/\\/g, "/")}`, {
    waitUntil: "networkidle0",
  });

  await page.pdf({
    path: pdfPath,
    format: "A4",
    printBackground: true,
    margin: { top: "15mm", bottom: "15mm", left: "12mm", right: "12mm" },
  });

  await browser.close();
  console.log("PDF created:", pdfPath);
})();
