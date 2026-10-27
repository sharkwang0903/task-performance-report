const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const base=process.env.TEST_NODE_MODULES||path.join(__dirname,'../node_modules');
const {chromium}=require(path.join(base,'playwright'));
(async()=>{
 const b=await chromium.launch({headless:true,channel:'msedge'}),page=await b.newPage();await page.goto('http://127.0.0.1:4173/docs/');
 for(const key of ['review','suggestions'])await page.locator('#supplement-'+key).fill('同頁補充測試');
 const build=()=>page.evaluate(async()=>{const state=JSON.parse(localStorage.getItem('task-performance:v1'));const r=await ReportPDF.build(state);return {count:r.pageCount,html:r.html,bytes:Array.from(r.bytes)};});
 let r=await build();assert.equal(r.count,1);assert.equal((r.html.match(/同頁補充測試/g)||[]).length,2);fs.writeFileSync(path.join(__dirname,'output','supplement-same-page.pdf'),Buffer.from(r.bytes));console.log('PASS 一項任務及兩個簡短整體回饋欄位維持一頁');
 await page.locator('#field-goal').fill(Array(15).fill('增加任務內容以測試空間不足').join('\n'));r=await build();assert.equal(r.count,2);assert(r.html.indexOf('總經理評定')<r.html.indexOf('整體回饋'));console.log('PASS 任務仍一頁、當頁放不下補充才增加下一頁');
 await page.locator('#field-goal').fill('');await page.locator('#supplement-review').fill(Array.from({length:100},(_,i)=>'長補充第'+(i+1)+'行').join('\n'));r=await build();assert(r.count>1);assert(r.html.includes('長補充第100行'));assert(r.html.split('<div class="print-page">')[1].includes('長補充第1行'));fs.writeFileSync(path.join(__dirname,'output','supplement-overflow.pdf'),Buffer.from(r.bytes));console.log('PASS 長補充先利用當頁空間、再延續，最後一行完整保留');await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
