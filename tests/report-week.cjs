const path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.TEST_NODE_MODULES?path.join(process.env.TEST_NODE_MODULES,'playwright'):'playwright');
(async()=>{
 const b=await chromium.launch({headless:true,channel:'msedge'}),c=await b.newContext(),p=await c.newPage();
 await p.goto('http://127.0.0.1:4173/docs/');
 const cases=[['2026-10-22','2026-W43','2026/10/19–2026/10/25'],['2027-01-01','2026-W53','2026/12/28–2027/01/03'],['2024-12-30','2025-W01','2024/12/30–2025/01/05'],['2024-02-29','2024-W09','2024/02/26–2024/03/03']];
 for(const [date,week,range] of cases){assert.deepEqual(await p.evaluate(d=>[ReportWeek.fromDate(d),ReportWeek.range(ReportWeek.fromDate(d))],date),[week,range]);}
 assert.equal(await p.evaluate(()=>ReportWeek.range('2025-W53')),'');console.log('PASS 當週、跨年、閏年與無效第53週');
 await p.locator('#reportWeek').fill('2026-W43');assert.match(await p.locator('#report-week-range').textContent(),/2026\/10\/19–2026\/10\/25/);assert.equal(await p.locator('#week-fallback-label').isVisible(),false);await p.reload();assert.equal(await p.locator('#reportWeek').inputValue(),'2026-W43');console.log('PASS 選週、完整日期範圍、儲存恢復');
 await p.evaluate(()=>localStorage.setItem('task-performance:v1',JSON.stringify({version:1,personal:{reporter:'舊草稿測試',fillDate:'2026-10-22',reportDate:'2027-01-01'},tasks:[{name:'保留任務',goal:'保留多行\n第二行',grade:'A'}],active:0,supplement:{notes:'保留共用備註'}})));
 await p.reload();assert.equal(await p.locator('#reportWeek').inputValue(),'2026-W53');assert.equal(await p.locator('#task-name').inputValue(),'保留任務');assert.equal(await p.locator('#field-goal').inputValue(),'保留多行\n第二行');assert.equal(await p.locator('#legacy-shared-notes').inputValue(),'保留共用備註');assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('task-performance:v1')).version),3);console.log('PASS v1日期草稿遷移至v3週別，任務及共用欄位保留');
 await p.locator('#reportWeek').fill('');await p.locator('#download').click();await p.waitForFunction(()=>document.querySelector('#feedback').classList.contains('error'));assert.match(await p.locator('#feedback').textContent(),/有效的回報週別/);console.log('PASS 未選週別阻止輸出');
 await p.setViewportSize({width:390,height:844});await p.locator('#reportWeek').fill('2026-W43');assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.screenshot({path:path.join(__dirname,'output','week-mobile.png'),fullPage:true});console.log('PASS 手機寬度日期範圍可見且不溢出');
 await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
