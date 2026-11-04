import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const appUrl=process.env.APP_URL||"http://127.0.0.1:5174";
const artifacts=new URL("../artifacts/upgrade/",import.meta.url);
await mkdir(artifacts,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:process.platform==="darwin"?{executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"}:{})});
const errors=[];
try {
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:"reduce"});
  page.on("pageerror",error=>errors.push(error.message));
  await page.goto(appUrl,{waitUntil:"networkidle"});
  await page.locator('[data-renderer="ready"] canvas').waitFor();
  await page.waitForTimeout(500);
  await page.screenshot({path:new URL("desktop.png",artifacts).pathname,fullPage:true});
  await page.locator(".avatar-region").screenshot({path:new URL("avatar.png",artifacts).pathname});
  // A larger diagnostic view reveals shading defects hidden by the CRT crop.
  await page.addStyleTag({content:".avatar-region{position:fixed!important;inset:0!important;width:600px!important;height:740px!important;z-index:100!important;background:#142119!important}.avatar-canvas{inset:0!important;transform:none!important}.avatar-shade{display:none!important}.avatar-name,.avatar-state,.avatar-disclosure{display:none!important}"});
  await page.waitForTimeout(400);
  await page.locator(".avatar-region").screenshot({path:new URL("avatar-detail.png",artifacts).pathname});
  await writeFile(new URL("avatar-report.json",artifacts),JSON.stringify({errors},null,2));
  console.log(JSON.stringify({errors,artifacts:artifacts.pathname}));
} finally {await browser.close();}
if(errors.length)process.exitCode=1;
