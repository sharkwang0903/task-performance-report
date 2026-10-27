const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.TEST_NODE_MODULES?path.join(process.env.TEST_NODE_MODULES,'playwright'):'playwright');
(async()=>{
 const dir=path.join(__dirname,'.browser-profile'),url='http://127.0.0.1:4173/docs/';
 const launch=()=>chromium.launchPersistentContext(dir,{headless:true,channel:process.env.TEST_BROWSER||'msedge'});
 let ctx=await launch(),page=await ctx.newPage();await page.goto(url);await page.evaluate(()=>localStorage.clear());await page.reload();await page.locator('#task-name').fill('重啟恢復測試');await ctx.close();
 ctx=await launch();page=await ctx.newPage();await page.goto(url);assert.equal(await page.locator('#task-name').inputValue(),'重啟恢復測試');console.log('PASS 完整關閉瀏覽器程序再重啟恢復資料');
 await page.locator('#supplement-review').fill(Array.from({length:150},(_,i)=>`補充測試第 ${i+1} 行。`).join('\n'));
 await page.evaluate(()=>{window.print=()=>{};});await page.locator('#print').click();await page.waitForFunction(()=>!document.body.classList.contains('busy'));const pages=await page.locator('#print-root .print-page').count();assert(pages>2);assert.match(await page.locator('#print-root').textContent(),/補充測試第 150 行/);console.log('PASS 長補充自動延續且最後一行保留，共 '+pages+' 頁');
 await page.locator('#task-name').fill('😀');await page.locator('#download').click();await page.waitForFunction(()=>document.querySelector('#feedback').classList.contains('error'));assert.match(await page.locator('#feedback').textContent(),/字型不支援/);console.log('PASS 不支援字元明確提示且阻止輸出');
 await page.evaluate(()=>localStorage.setItem('task-performance:v1',JSON.stringify({version:999,tasks:[{}],keep:'future'})));await page.reload();await page.locator('#task-name').fill('不可覆寫');assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('task-performance:v1')).version),999);console.log('PASS 未知版本保留原資料並暫停覆寫');
 await page.evaluate(()=>localStorage.setItem('task-performance:v1','broken'));await page.reload();await page.locator('#task-name').fill('不可覆寫');assert.equal(await page.evaluate(()=>localStorage.getItem('task-performance:v1')),'broken');console.log('PASS 損毀資料保留原文並提示');
 page.once('dialog',d=>d.accept());await page.locator('#clear-all').click();await page.evaluate(()=>{Storage.prototype.setItem=function(){throw new DOMException('full','QuotaExceededError');};});await page.locator('#task-name').fill('儲存失敗測試');assert.match(await page.locator('#save-status').textContent(),/儲存失敗/);assert.equal(await page.locator('#task-name').inputValue(),'儲存失敗測試');console.log('PASS 儲存失敗明確提示且保留當頁內容');
 await ctx.close();
})().catch(e=>{console.error(e);process.exit(1);});
