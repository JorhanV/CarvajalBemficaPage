const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(__dirname+'/index.html','utf8'),js=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);assert.strictEqual(new Set(ids).size,ids.length,'Unique IDs');for(const ref of js.matchAll(/\$\('([^']+)'\)/g))assert(ids.includes(ref[1]),'Missing ID '+ref[1]);
for(const ref of html.matchAll(/href="#([^"\s]+)"/g))assert(ids.includes(ref[1]),'Missing anchor '+ref[1]);
class El{constructor(){this.value='';this.checked=false;this.hidden=false;this.children=[];this.handlers={};this.textContent='';this.attrs={};this.classList={toggle:()=>true,remove:()=>{}};}addEventListener(t,f){this.handlers[t]=f;}append(...x){this.children.push(...x);}replaceChildren(...x){this.children=x;}remove(){}click(){}focus(){}scrollIntoView(){}setAttribute(k,v){this.attrs[k]=v;if(k==='value')this.value=v;}getAttribute(k){return this.attrs[k];}hasAttribute(k){return k in this.attrs;}showModal(){this.open=true;}close(){this.open=false;}getBoundingClientRect(){return {left:0,right:100,top:0,bottom:100};}setCustomValidity(t){this.validity=t;}reportValidity(){return !this.validity;}}
const els=Object.fromEntries(ids.map(id=>[id,new El()]));els.erpFilter.value='all';
els.contactStatus.hidden=true;
const originalTexts=JSON.parse(fs.readFileSync(__dirname+'/static-texts.json','utf8'));
const textNodes=originalTexts.map(nodeValue=>({nodeValue,parentElement:{closest:()=>null}}));
const placeholder=new El();placeholder.attrs.placeholder='Ejemplo: nuestro dashboard de compras no coincide con SAP. Necesitamos identificar las diferencias y validar el reporte.';
const option=new El();option.textContent='Próximos 1–3 meses';
const description={content:'Demo de Carvajal Bemfica Finance & Data Advisory. Validación ERP, Power BI, SQL, controles P2P y pruebas UAT/SIT desde Costa Rica para LATAM.'};
const document={getElementById:id=>els[id],createElement:()=>new El(),querySelectorAll:sel=>sel==='select option'?[option]:sel==='[aria-label],[placeholder]'?[placeholder]:[],querySelector:()=>description,documentElement:{lang:'es'},title:'Carvajal Bemfica | Finanzas, datos y ERP',createTreeWalker:()=>({i:-1,nextNode(){this.i++;this.currentNode=textNodes[this.i];return this.i<textNodes.length;}}),body:new El()};
let requests=[], mockResponse={ok:true,json:async()=>({success:'true',message:'Email sent successfully'})};
const c=vm.createContext({document,NodeFilter:{SHOW_TEXT:4},Intl,Blob,URL,setTimeout,clearTimeout,AbortController,console,window:{location:{protocol:'https:',href:'https://example.test'}},fetch:async(url,options)=>{requests.push({url,options});if(mockResponse instanceof Error)throw mockResponse;return mockResponse;}});vm.runInContext(js,c);const run=s=>vm.runInContext(s,c);const fire=(id,t)=>els[id].handlers[t]({preventDefault(){}});
assert.strictEqual(option.value,'Próximos 1–3 meses','Freeze option machine value');
assert.strictEqual(els.expectedMetric.textContent,run('money(56300)'));assert.strictEqual(els.actualMetric.textContent,run('money(56620)'));assert.strictEqual(els.varianceMetric.textContent,run('money(320)'));assert.strictEqual(els.exceptionsMetric.textContent,'4 / 8');assert(els.verdict.textContent.startsWith('NO-GO'));assert.strictEqual(els.demoRows.children.length,8);
els.erpFilter.value='Oracle';fire('erpFilter','change');assert.strictEqual(els.expectedMetric.textContent,run('money(10700)'));els.onlyExceptions.checked=true;fire('onlyExceptions','change');assert.strictEqual(els.demoRows.children.length,1);assert(els.verdict.textContent.startsWith('NO-GO'));
fire('resolveButton','click');assert(els.verdict.textContent.startsWith('GO ·'));assert.strictEqual(els.exceptionsMetric.textContent,'0 / 0');fire('resolveButton','click');assert(els.verdict.textContent.startsWith('NO-GO'));
run('showRecord(activeRows()[1])');assert(els.recordDialog.open);assert(els.recordText.textContent.includes('500'));fire('closeDialog','click');assert(!els.recordDialog.open);
els.challenge.value='testing';els.challenge.selectedOptions=[{textContent:'Validar un cambio'}];els.system.value='SAP';els.dataReady.value='partial';els.dataReady.selectedOptions=[{textContent:'Acceso parcial'}];els.timing.value='Próximos 1–3 meses';fire('diagnosticForm','submit');assert(!els.diagnosticResult.hidden);assert(els.resultTitle.textContent.includes('UAT'));assert.strictEqual(els.resultList.children.length,4);fire('useDiagnostic','click');assert(els.message.value.includes('SAP'));assert(els.message.value.includes('acceso autorizado'));
els.name.value='Persona demo';els.email.value='persona@example.com';els.company.value='<script>alert(1)</script>';
// Switch languages with an existing result, generated message, filter and open record.
run('showRecord(activeRows()[1])');const beforeFilter=els.erpFilter.value;
els.languageSelect.value='en';fire('languageSelect','change');assert.strictEqual(document.documentElement.lang,'en');assert(textNodes.some(n=>n.nodeValue==='Services'));assert(placeholder.attrs.placeholder.startsWith('Example:'));assert.strictEqual(els.erpFilter.value,beforeFilter);assert.strictEqual(els.resultTitle.textContent,'UAT / SIT preparation');assert(els.recordText.textContent.startsWith('Variance of +USD 500'));assert(els.message.value.includes('authorized data access'));assert.strictEqual(els.expectedMetric.textContent,'$6,400');
els.languageSelect.value='pt';fire('languageSelect','change');assert.strictEqual(document.documentElement.lang,'pt-BR');assert(textNodes.some(n=>n.nodeValue==='Serviços'));assert.strictEqual(els.resultTitle.textContent,'Preparação de UAT / SIT');assert(els.message.value.includes('acesso autorizado'));assert(els.recordText.textContent.startsWith('Divergência'));assert(description.content.startsWith('Demo da Carvajal'));
els.message.value='Texto personal: keep exactly / preservar';run("setLanguage('en')");assert.strictEqual(els.message.value,'Texto personal: keep exactly / preservar');
run("download=(name,text,type)=>{globalThis.capturedExport={name,text,type};}");fire('exportCsv','click');assert(run('capturedExport.text').includes('expected_usd'));assert(run('capturedExport.text').includes('Supplier Gamma'));run("setLanguage('pt')");fire('exportCsv','click');assert(run('capturedExport.text').includes('dados_ficticios'));assert(run('capturedExport.text').includes('Fornecedor Gama'));fire('exportDiagnostic','click');assert(run('capturedExport.text').includes('Orientação inicial'));
run("setLanguage('es')");assert(textNodes.some(n=>n.nodeValue==='Servicios'));assert.strictEqual(document.documentElement.lang,'es');assert.strictEqual(els.message.value,'Texto personal: keep exactly / preservar');fire('diagnosticForm','change');assert(els.diagnosticResult.hidden);assert.strictEqual(run('diagnostic'),null);
// CSV construction and download paths execute with mocked browser primitives.
fire('exportCsv','click');
// All contact requests below are mocks; this script never sends an email.
(async()=>{
 await run('sendContact()');assert.strictEqual(requests.length,1);
 let payload=JSON.parse(requests[0].options.body);
 assert.strictEqual(requests[0].url,'https://formsubmit.co/ajax/aanohel@gmail.com');
 assert.strictEqual(payload.message,els.message.value);assert.strictEqual(payload.company,'<script>alert(1)</script>');assert.strictEqual(payload._replyto,'persona@example.com');assert.strictEqual(payload.language,'es');
 assert(els.contactStatus.className.includes('success'));assert(!els.submitContact.disabled);assert.strictEqual(els.submitContact.textContent,'Enviar mensaje');
 run("setLanguage('en')");assert(els.contactStatus.textContent.startsWith('Your inquiry'));run("setLanguage('pt')");assert(els.contactStatus.textContent.startsWith('Sua consulta'));
 mockResponse={ok:true,json:async()=>({success:'true',message:'This form needs Activation.'})};await run('sendContact()');assert(els.contactStatus.className.includes('warning'));
 mockResponse={ok:false,json:async()=>({success:'false'})};await run('sendContact()');assert(els.contactStatus.className.includes('error'));assert(els.contactStatus.textContent.startsWith('Não foi possível'));
 mockResponse=new Error('Network unavailable');await run('sendContact()');assert(els.contactStatus.className.includes('error'));
 mockResponse=Object.assign(new Error('Timeout'),{name:'AbortError'});await run('sendContact()');assert(els.contactStatus.textContent.includes('demorou demais'));
 const count=requests.length;c.window.location.protocol='file:';await run('sendContact()');assert.strictEqual(requests.length,count);assert(els.contactStatus.textContent.includes('endereço web'));c.window.location.protocol='https:';
 els.website.value='bot';await run('sendContact()');assert.strictEqual(requests.length,count);els.website.value='';
 els.name.value='';await run('sendContact()');assert.strictEqual(requests.length,count);assert(els.message.validity);els.name.value='Persona demo';fire('contactForm','input');assert(els.contactStatus.hidden);assert(!els.message.validity);
 let release;mockResponse={ok:true,json:()=>new Promise(resolve=>{release=resolve;})};
 const pending=run('sendContact()');await Promise.resolve();assert(els.submitContact.disabled);await run('sendContact()');assert.strictEqual(requests.length,count+1,'No duplicate requests');run("setLanguage('en')");assert.strictEqual(els.submitContact.textContent,'Sending…');assert(els.contactStatus.textContent.includes('Sending your inquiry'));
 release({success:'true'});await pending;assert(!els.submitContact.disabled);assert.strictEqual(els.submitContact.textContent,'Send message');assert.strictEqual(els.message.value,'Texto personal: keep exactly / preservar');
 assert(!html.includes('mailto:'));assert(!html.includes('id="mailPreview"'));
 console.log('PASS: valid DOM references; ES/EN/PT content and state; reconciliation; diagnostic; safe exports; mocked direct contact success, activation, rejection, network failure, timeout, file protocol, validation, bot trap and duplicate prevention. No live email or browser layout tested.');
})().catch(e=>{console.error(e);process.exitCode=1;});
