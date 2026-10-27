const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
(async()=>{
 const base=process.env.TEST_NODE_MODULES||path.join(__dirname,'../node_modules');
 const {getDocument}=await import(pathToFileURL(path.join(base,'pdfjs-dist/legacy/build/pdf.mjs')).href);
 for(const [name,total] of [['single.pdf',1],['three.pdf',3],['supplement.pdf',3],['print-fallback.pdf',3]]){
  const doc=await getDocument({data:new Uint8Array(fs.readFileSync(path.join(__dirname,'output',name)))}).promise;assert.equal(doc.numPages,total);
  for(let i=1;i<=total;i++){const page=await doc.getPage(i),content=await page.getTextContent();const text=content.items.map(t=>t.str).join('\n').normalize('NFKC');
   const expected=i<=(name==='single.pdf'?1:3)?['任務績效報告','總經理評定','本任務備註','完成評級','完成時限','C 延遲','D 延誤','回報週別','2026/10/19–2026/10/25']:['自我檢討：加強進度回報。'];
   if(name==='supplement.pdf'||name==='print-fallback.pdf'){assert.equal(text.replace(/\s/g,'').includes('自我檢討:加強進度回報。'),i===3,[name,i,'shared supplement only on last task page']);}
   // Chromium may map the shared dash glyph to U+2012 when extracting SVG print text.
   const comparable=s=>s.normalize('NFKC').replace(/[‒–—]/g,'-').replace(/\s/g,'');
   for(const value of expected)assert(comparable(text).includes(comparable(value)),[name,i,value]);
   if(i===1)for(const value of ['測試同事','English text 123','<script>安全測試</script>'])assert(text.replace(/\s/g,'').includes(value.replace(/\s/g,'')),[name,value]);
   // Text width and coordinates stay within the physical page, including long mixed-language lines.
   for(const item of content.items){assert(item.transform[4]>=33.5&&item.transform[4]+item.width<=562,[name,i,item.str]);assert(item.transform[5]>33.5&&item.transform[5]<810,[name,i,item.str]);}
  }console.log('PASS '+name+': 頁數、中文英文擷取、評定選項與文字邊界');await doc.destroy();
 }
})().catch(e=>{console.error(e);process.exit(1);});
