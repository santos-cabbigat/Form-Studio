'use strict';

// The original markup only enters an inert template. The measurement document receives
// newly created HTML elements and a restricted set of attributes. It cannot run scripts.
async function inspectHTMLDesign(html, width=960){
  const source=String(html||'').trim();
  if(!source)throw Error('Paste some HTML or choose an HTML file first.');
  if(source.length>2097152||new TextEncoder().encode(source).length>2097152)throw Error('This HTML is over 2 MB. Import one screen or section at a time.');
  if(!Number.isFinite(width)||width<96||width>4096)throw Error('Choose a layout width between 96 and 4096 pixels.');
  width=Math.round(width);
  const warnings=new Set();
  let skipped=0;
  const unsupported='Supply the rendered HTML and its CSS for one screen. JavaScript, React/JSX, server source, and repository archives cannot be converted directly.';
  if(/^(?:<\?(?:php|=)|(?:import|export|const|let|var|class|function)\s|PK\x03\x04)/i.test(source)||!/<[a-z][\w:-]*(?:\s[^<>]*|\/?)>/i.test(source))throw Error(unsupported);

  // Template fragments discard ordinary <html> and <body> tags. Temporary names retain
  // their classes, inline styles and attributes for selectors such as body.dashboard.
  const inert=document.createElement('template');
  inert.innerHTML=source.replace(/<(\/?)(html|head|body)(?=[\s/>])/gi,'<$1fs-import-$2');
  const root=inert.content,all=root.querySelectorAll('*');
  if(all.length>12000)throw Error('This screen contains over 12,000 HTML elements. Import a smaller section.');
  const title=(root.querySelector('title')?.textContent||'').trim().slice(0,160);
  const allowed=new Set(('a abbr address article aside b bdi bdo blockquote br button caption center cite code col colgroup data datalist dd del details dfn dialog div dl dt em fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 header hgroup hr i img input ins kbd label legend li main mark menu nav ol optgroup option output p picture pre q rp rt ruby s samp section select small span strong sub summary sup table tbody td textarea tfoot th thead time tr u ul var wbr').split(' '));
  const discard=new Set('base canvas embed iframe link math meta noscript object portal script source style svg template title track audio video'.split(' '));
  const ids=new WeakMap(),names=new WeakMap();
  all.forEach((el,i)=>ids.set(el,String(i)));
  if(root.querySelector('script')||[...all].some(el=>el.getAttributeNames().some(k=>/^on/i.test(k)))){
    warnings.add('Scripts and event handlers were left out. Reconnect actions in Triggers.');
  }
  if(root.querySelector('link[rel~="stylesheet"]'))warnings.add('External stylesheets were left out. Paste their CSS inside a style tag to include it.');
  const raster=/^data:image\/(?:png|jpeg|gif|webp);base64,[a-z\d+/=\s]+$/i;
  const cssUnsafe=/[<>{};]|(?:url|image|image-set|paint|element|attr|expression)\s*\(/i;
  const presentational=new Set('class id style hidden dir lang width height align valign bgcolor border cellpadding cellspacing span colspan rowspan scope type role open rows cols size multiple required disabled placeholder for alt aria-label name media'.split(' '));
  const hasPseudo=Array.from(root.querySelectorAll('style')).some(el=>/::?(?:before|after|marker)\b/i.test(el.textContent));
  if(hasPseudo)warnings.add('Pseudo-elements and list markers may need separate shapes or text.');
  const images=[];
  const frame=document.createElement('iframe');
  frame.setAttribute('sandbox','allow-same-origin');
  frame.setAttribute('aria-hidden','true');
  frame.tabIndex=-1;
  frame.style.cssText='position:fixed;left:-20000px;top:0;border:0;opacity:0;pointer-events:none;width:'+width+'px;height:'+(width<600?760:width<1040?760:600)+'px';
  const policy="default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src 'none'; object-src 'none'; frame-src 'none'; connect-src 'none'; form-action 'none'; base-uri 'none'";
  frame.srcdoc='<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="'+policy+'"></head><body></body></html>';
  const ready=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('The HTML layout could not be measured. Try a smaller section.')),7000);frame.onload=()=>{clearTimeout(timer);resolve()}});
  document.body.append(frame);
  try{
    await ready;
    const doc=frame.contentDocument,view=frame.contentWindow;
    if(!doc?.body)throw Error('The browser could not open the isolated layout preview.');
    const nodes=[],keys=[];
    function copyAttributes(from,to){
      // URLs, form actions, autofocus, handlers and user-entered field values never transfer.
      for(const a of from.attributes){
        if(presentational.has(a.name)||a.name.startsWith('data-'))to.setAttribute(a.name,a.value);
      }
      if(from.localName==='a'&&from.hasAttribute('href'))to.setAttribute('href','#');
      if(from.localName==='option'&&from.hasAttribute('value'))to.setAttribute('value',from.getAttribute('value'));
      if(from.localName==='input'&&['button','reset','submit'].includes(to.type)&&from.hasAttribute('value'))to.value=from.getAttribute('value');
      if(from.localName==='img'){
        const src=(from.getAttribute('src')||'').trim();
        if(raster.test(src)){to.src=src;images.push(to)}
        else warnings.add('Images that use a URL or a separate file were left out. Embedded PNG, JPEG, WebP and GIF images are supported.');
      }
    }
    const htmlRoot=root.querySelector('fs-import-html'),bodyRoot=root.querySelector('fs-import-body');
    if(htmlRoot)copyAttributes(htmlRoot,doc.documentElement);
    if(bodyRoot)copyAttributes(bodyRoot,doc.body);
    names.set(doc.body,'body');
    for(const style of root.querySelectorAll('style')){
      if(style.closest('svg,math,noscript,template'))continue;
      if(style.textContent.includes('@import')||/url\s*\(/i.test(style.textContent))warnings.add('External CSS resources and fonts were left out.');
      const sheet=doc.createElement('style');
      if(style.media)sheet.media=style.media;
      sheet.textContent=style.textContent;doc.head.append(sheet);
    }
    const stable=doc.createElement('style');
    stable.textContent='*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}html{scrollbar-width:none!important}html::-webkit-scrollbar{display:none}';
    doc.head.append(stable);
    function copy(sourceNode,parent,depth,sourceIndex=0){
      if(depth>180)throw Error('This screen has very deeply nested markup. Import a smaller section.');
      if(sourceNode.nodeType===3){
        const t=doc.createTextNode(sourceNode.data);names.set(t,ids.get(sourceNode.parentElement)+'-t'+sourceIndex);parent.append(t);return;
      }
      if(sourceNode.nodeType!==1)return;
      const tag=sourceNode.localName;
      if(tag==='fs-import-html'||tag==='fs-import-body'){sourceNode.childNodes.forEach((child,i)=>copy(child,parent,depth+1,i));return}
      if(tag==='fs-import-head')return;
      if(discard.has(tag)){
        if(['svg','math','iframe','embed','object','canvas','audio','video'].includes(tag)){skipped++;warnings.add('Vector artwork, media, frames and canvas widgets need to be recreated or supplied as an image.')}
        return;
      }
      if(sourceNode.namespaceURI!=='http://www.w3.org/1999/xhtml')return;
      // Unknown tags are inert HTML wrappers. Preserve children and CSS tag selectors.
      const target=doc.createElement(allowed.has(tag)?tag:'div');
      if(!allowed.has(tag)){warnings.add('Custom elements were reduced to the static content inside them.')}
      copyAttributes(sourceNode,target);names.set(target,ids.get(sourceNode));parent.append(target);
      if(['textarea','input','img','br','hr','wbr'].includes(tag))return;
      sourceNode.childNodes.forEach((child,i)=>copy(child,target,depth+1,i));
    }
    const frag=doc.createDocumentFragment();
    (bodyRoot||root).childNodes.forEach((child,i)=>copy(child,frag,0,i));
    doc.body.append(frag);
    if(images.length){
      let timer;
      try{await Promise.race([Promise.allSettled(images.map(img=>img.decode())),new Promise(resolve=>{timer=setTimeout(resolve,1800)})])}
      finally{clearTimeout(timer)}
    }
    const computed=el=>view.getComputedStyle(el);
    const clear=c=>!c||c==='transparent'||c==='rgba(0, 0, 0, 0)'||/rgba\([^)]*,\s*0(?:\.0+)?\)$/.test(c);
    function color(value){
      if(clear(value))return 'transparent';
      const rgb=/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/.exec(value);
      return rgb?'#'+rgb.slice(1).map(c=>Number(c).toString(16).padStart(2,'0')).join('').toUpperCase():value;
    }
    const rawBackground=color(!clear(computed(doc.body).backgroundColor)?computed(doc.body).backgroundColor:computed(doc.documentElement).backgroundColor);
    let background=rawBackground;
    if(background!=='transparent'&&!/^#[0-9a-f]{6}$/i.test(background)){
      const canvas=doc.createElement('canvas');canvas.width=canvas.height=1;
      const context=canvas.getContext('2d');context.fillStyle='#ffffff';context.fillRect(0,0,1,1);
      context.fillStyle=background;context.fillRect(0,0,1,1);
      background='#'+Array.from(context.getImageData(0,0,1,1).data).slice(0,3).map(v=>v.toString(16).padStart(2,'0')).join('');
    }
    function cleanText(text,style){
      return (style.whiteSpace.startsWith('pre')||style.whiteSpace==='break-spaces'?text:text.replace(/\s+/g,' ')).trim();
    }
    function rectBox(r){
      return [Math.round(r.left),Math.round(r.top),Math.max(1,Math.round(r.width)),Math.max(1,Math.round(r.height))];
    }
    function usable(r){return r.width>0&&r.height>0&&Math.max(Math.abs(r.x),Math.abs(r.y),r.width,r.height)<250000}
    function border(s){return s.borderTopStyle!=='none'&&parseFloat(s.borderTopWidth)>0?s.borderTop:'0px solid transparent'}
    function painted(s){return !clear(s.backgroundColor)||s.backgroundImage!=='none'||s.boxShadow!=='none'||['Top','Right','Bottom','Left'].some(k=>parseFloat(s['border'+k+'Width'])>0&&s['border'+k+'Style']!=='none')}
    function appearance(n,s,r,textOnly){
      const rad=s.borderTopLeftRadius.split(' ')[0];
      const radius=rad.endsWith('%')?Math.min(r.width,r.height)*parseFloat(rad)/100:parseFloat(rad);
      const align=({start:s.direction==='rtl'?'right':'left',end:s.direction==='rtl'?'left':'right','-webkit-center':'center'})[s.textAlign]||s.textAlign;
      n.style={fill:textOnly?'transparent':color(s.backgroundColor),color:color(s.color),radius:textOnly?0:Math.round(radius)||0,fontSize:Math.max(1,Math.round(parseFloat(s.fontSize))||16),weight:s.fontWeight,border:textOnly?'0px solid transparent':border(s),align:['left','center','right'].includes(align)?align:'left'};
      const extra={};
      function add(k,v){if(v&&!cssUnsafe.test(v)&&(!/\\|[\x00-\x1f]/.test(v)))extra[k]=v}
      if(['Button','Input','Text','Table'].includes(n.type)){
        add('font-family',s.fontFamily);add('font-style',s.fontStyle);add('line-height',s.lineHeight);
        add('letter-spacing',s.letterSpacing);add('text-transform',s.textTransform);
        if(n.type==='Text')add('white-space',s.whiteSpace);
        if(s.textDecorationLine!=='none')add('text-decoration',s.textDecoration);
      }
      if(!textOnly){
        if(['Text','Button','Input'].includes(n.type))add('padding',s.padding);
        if(s.boxShadow!=='none')add('box-shadow',s.boxShadow);
        if(n.type==='Image')add('object-fit',s.objectFit);
        if(s.backgroundImage!=='none'){
          if(/^(?:repeating-)?(?:linear|radial|conic)-gradient\(/i.test(s.backgroundImage)&&!cssUnsafe.test(s.backgroundImage))add('background-image',s.backgroundImage);
          else warnings.add('Some CSS imagery could not be represented as editable layers.');
        }
        for(const side of ['Right','Bottom','Left'])if(s['border'+side]!==s.borderTop)add('border-'+side.toLowerCase(),s['border'+side]);
      }
      if(s.opacity!=='1')add('opacity',s.opacity);
      if(Object.keys(extra).length)n.extraCSS=extra;
    }
    function emit(el,type,label,r,s,role='main',props={},textOnly=false){
      if(!usable(r))return;
      if(nodes.length>=2000)throw Error('This layout contains over 2,000 visible layers. Import one section at a time.');
      const name=el.getAttribute('aria-label')||el.getAttribute('alt')||el.id||label||type;
      const n=node(type,label,rectBox(r),props);n.name=String(name).trim().slice(0,140)||type;n.text=label;
      appearance(n,s,r,textOnly);nodes.push(n);keys.push(names.get(el)+'/'+role);
    }
    function readTable(el){
      const rows=Array.from(el.rows);
      if(!rows.length)return '';
      function cell(t){
        const text=t.innerText.replace(/\s+/g,' ').trim();
        if(text.includes('|'))warnings.add('Pipe characters in table cells were converted to a visual equivalent.');
        return text.replace(/\|/g,'｜');
      }
      const lines=rows.map(tr=>Array.from(tr.cells,cell));
      if(!rows[0].querySelector('th'))lines.unshift(Array.from({length:Math.max(...lines.map(line=>line.length),1)},(_,i)=>'Column '+(i+1)));
      if(el.querySelector('[rowspan],[colspan]'))warnings.add('Merged table cells were flattened into a standard Studio table.');
      return lines.map(line=>line.join(' | ')).join('\n');
    }
    function ownText(el,s,t){
      const text=cleanText(t.data,s);if(!text)return;
      const r=doc.createRange();r.selectNodeContents(t);
      emit(el,'Text',text,r.getBoundingClientRect(),s,'text:'+names.get(t),{},true);
    }
    function walk(el){
      const s=computed(el);
      if(s.display==='none'||s.visibility==='hidden'||s.visibility==='collapse'||s.opacity==='0'||el.hidden)return;
      const tag=el.localName,r=el.getBoundingClientRect();
      if(s.transform!=='none')warnings.add('Transformed elements use their measured bounding boxes.');
      if(tag==='button'||tag==='a'||(tag==='input'&&['submit','button','reset'].includes(el.type))||el.getAttribute('role')==='button'){
        const text=cleanText(tag==='input'?(el.value||el.type):el.innerText,s);
        emit(el,'Button',text,r,s);if(tag==='a')warnings.add('Links became buttons. Choose their destinations in Triggers.');return;
      }
      if(tag==='input'||tag==='textarea'||tag==='select'){
        if(el.type==='hidden')return;
        if(el.disabled||el.readOnly||el.multiple)warnings.add('Disabled, read-only and multiple-selection states need to be reconnected after import.');
        let kind=tag==='select'?'select':(tag==='textarea'?'text':el.type);
        if(!['email','text','tel','url','search','number','password','select','date','month'].includes(kind)){skipped++;warnings.add('Some specialized form controls do not have a matching Studio control.');return}
        if(['tel','url','search'].includes(kind))kind='text';
        if(tag==='textarea')warnings.add('Multiline inputs were converted into editable single-line fields.');
        let label=el.getAttribute('placeholder')||'',choices='';
        if(kind==='select'){
          const opts=Array.from(el.options);label=opts.find(o=>o.value==='')?.textContent.trim()||'Choose an option';
          choices=opts.filter(o=>o.value!=='').map(o=>o.textContent.trim().replace(/\|/g,'｜')+' | '+o.value.replace(/[\r\n]+/g,' ')).join('\n');
        }
        if(kind==='date'||kind==='month')label=label||'Choose a '+kind;
        const props={inputType:kind,requirement:el.required?'required':'optional'};
        if(kind==='select')props.choices=choices;
        emit(el,'Input',label,r,s,'control',props);return;
      }
      if(tag==='img'){if(el.hasAttribute('src'))emit(el,'Image',el.alt||'Image',r,s,'image',{src:el.getAttribute('src')});else skipped++;return}
      if(tag==='table'){const rows=readTable(el);if(rows)emit(el,'Table',el.caption?.innerText||'Table',r,s,'table',{rows,initialState:'sample'});return}
      if(['option','optgroup','datalist','br','wbr','col','colgroup'].includes(tag))return;
      const children=Array.from(el.children);
      if(el!==doc.body&&children.every(c=>c.localName==='br')){
        const text=cleanText(el.innerText||'',s);
        if(text&&usable(r)){emit(el,'Text',text,r,s);return}
      }
      if(el!==doc.body&&painted(s)&&usable(r))emit(el,children.length?'Module':'Shape',el.id||el.getAttribute('aria-label')||(children.length?'Panel':'Shape'),r,s,'back');
      const entries=Array.from(el.childNodes);
      const z=n=>n.nodeType===1?Number.parseInt(computed(n).zIndex,10)||0:0;
      // CSS paint order of positioned siblings; DOM order breaks equal z-index ties.
      const ordered=entries.map(n=>({n,z:z(n)})).sort((a,b)=>a.z-b.z);
      for(const {n} of ordered){if(n.nodeType===3)ownText(el,s,n);else if(n.nodeType===1)walk(n)}
    }
    walk(doc.body);
    const height=Math.max(1,doc.body.scrollHeight,doc.documentElement.scrollHeight,...nodes.map(n=>n.boxes.laptop[1]+n.boxes.laptop[3]));
    if(!nodes.length&&(root.querySelector('script,template')||/\{\{[^}]+\}\}/.test(source))&&!doc.body.querySelector('button,input,select,textarea,table,p,h1,h2,div,main,section,article'))throw Error(unsupported);
    return {nodes,keys,width,height,title,background,warnings:[...warnings],skipped};
  }finally{frame.remove()}
}
