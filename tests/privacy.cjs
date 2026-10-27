// Synthetic content only. Checks actual requests and the browser-enforced network policy.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const base=process.env.TEST_NODE_MODULES||path.join(__dirname,'../node_modules');
const {chromium}=require(path.join(base,'playwright'));
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'}),context=await browser.newContext({acceptDownloads:true}),page=await context.newPage();
 const requests=[],failures=[],violations=[];
 page.on('request',r=>requests.push({url:r.url(),method:r.method(),body:r.postData()}));page.on('pageerror',e=>failures.push(e.message));
 await page.goto('http://127.0.0.1:4173/docs/');
 const secret='PRIVACY_TEST_ONLY_7da912';
 for(const id of ['reporter','task-name','field-goal','field-resources','field-team','field-progress','task-notes','supplement-review','supplement-suggestions'])await page.locator('#'+id).fill(secret);
 await page.locator('#preview').click();await page.locator('#preview-dialog').waitFor({state:'visible'});await page.locator('#close-preview').click();
 const waiting=page.waitForEvent('download');await page.locator('#download').click();const dl=await waiting;assert(dl.suggestedFilename().endsWith('.pdf'));
 assert((await page.evaluate(()=>localStorage.getItem('task-performance:v1'))).includes(secret));
 for(const r of requests){assert.equal(r.method,'GET');assert.equal(r.body,null);assert(!r.url.includes(secret));assert(r.url.startsWith('http://127.0.0.1:4173/docs/')||r.url.startsWith('blob:'));}
 assert.deepEqual(failures,[]);console.log('PASS 填寫、預覽、下載只讀取本站靜態資源；無POST、無表單內容傳出');
 const before=requests.length;
 const blocked=await page.evaluate(async()=>{
  const results=[];
  for(const url of ['https://example.com/privacy-probe','/docs/?privacy-probe']){try{await fetch(url,{method:'POST',body:'synthetic-probe'});results.push(false);}catch{results.push(true);}}
  return results;
 });assert.deepEqual(blocked,[true,true]);assert.equal(requests.length,before);console.log('PASS 瀏覽器政策阻擋外部及同站fetch資料連線');
 await page.evaluate(()=>{window.__privacyViolations=[];document.addEventListener('securitypolicyviolation',e=>window.__privacyViolations.push(e.violatedDirective));const form=document.createElement('form');form.method='POST';form.action='/docs/?form-probe';document.body.append(form);form.submit();});
 await page.waitForFunction(()=>window.__privacyViolations.includes('form-action'));assert.equal(requests.length,before);console.log('PASS 瀏覽器政策阻擋表單送出');
 fs.writeFileSync(path.join(__dirname,'output','privacy-results.json'),JSON.stringify({requests,failures,blocked},null,2));await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
