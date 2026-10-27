const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const base=process.env.TEST_NODE_MODULES||path.join(__dirname,'../node_modules');
const {chromium}=require(path.join(base,'playwright')),{PDFDocument}=require(path.join(base,'pdf-lib'));
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 for(const mode of ['file','http']){
  const ctx=await browser.newContext({acceptDownloads:true}),page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const url=mode==='file'?pathToFileURL(path.join(__dirname,'../docs/index.html')).href:'http://127.0.0.1:4173/docs/';
  await page.goto(url);await page.locator('#task-name').fill('本機開啟測試');await page.locator('#field-goal').fill('繁體中文與 English 123，預覽及下載驗證。');
  await page.locator('#preview').click();await page.locator('#preview-dialog').waitFor({state:'visible',timeout:30000});assert.match(await page.locator('#pdf-preview').getAttribute('src'),/^blob:/);await page.locator('#close-preview').click();
  const waiting=page.waitForEvent('download');await page.locator('#download').click();const download=await waiting;const target=path.join(__dirname,'output',`local-${mode}.pdf`);await download.saveAs(target);assert.equal((await PDFDocument.load(fs.readFileSync(target))).getPageCount(),1);
  assert.deepEqual(errors,[]);console.log(`PASS ${mode}: 實際 PDF 預覽與下載、可開啟一頁 PDF、無程式錯誤`);await ctx.close();
 }
 // A missing font bundle gives actionable feedback and allows retry on the same page.
 const ctx=await browser.newContext(),page=await ctx.newPage();await page.route('**/fonts/report-font.js',r=>r.abort());await page.goto('http://127.0.0.1:4173/docs/');await page.locator('#preview').click();await page.waitForFunction(()=>document.querySelector('#feedback').classList.contains('error'));assert.match(await page.locator('#feedback').textContent(),/report-font.js/);await page.unroute('**/fonts/report-font.js');await page.locator('#preview').click();await page.locator('#preview-dialog').waitFor({state:'visible'});console.log('PASS 字型載入失敗顯示具體提示，恢復檔案後可直接重試');await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
