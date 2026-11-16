const lightPresets = [
  {
    "name": "Emerald Courtyard",
    "description": "Warm ivory and deep jade for the Oon Jai front desk.",
    "colors": {
      "canvas": "#f7f4e9",
      "surface": "#fffdf6",
      "action": "#155b43",
      "accent": "#b17b31",
      "ink": "#1e3229",
      "line": "#a3b0a0",
      "tint": "#e4eee4"
    },
    "height": 48,
    "radius": 8,
    "panel": 12,
    "design": "flat",
    "tabs": "line",
    "font": "serif",
    "title": 36,
    "section": 22,
    "body": 16,
    "label": 14,
    "caption": 12,
    "titleWeight": 700,
    "sectionWeight": 700
  },
  {
    "name": "Mekong Blue",
    "description": "River blue and cool mist for ledger and reporting screens.",
    "colors": {
      "canvas": "#edf4f8",
      "surface": "#ffffff",
      "action": "#24577d",
      "accent": "#3481a1",
      "ink": "#172e41",
      "line": "#9aafbd",
      "tint": "#daeaf4"
    },
    "height": 40,
    "radius": 4,
    "panel": 6,
    "design": "rail",
    "tabs": "boxed",
    "font": "sans",
    "title": 32,
    "section": 20,
    "body": 15,
    "label": 14,
    "caption": 12,
    "titleWeight": 700,
    "sectionWeight": 700
  },
  {
    "name": "Lotus Porcelain",
    "description": "Plum and soft blush for guest profiles and appointments.",
    "colors": {
      "canvas": "#faf1f5",
      "surface": "#fffafd",
      "action": "#783956",
      "accent": "#bd708b",
      "ink": "#382332",
      "line": "#c4a8b5",
      "tint": "#f2dfe9"
    },
    "height": 46,
    "radius": 24,
    "panel": 18,
    "design": "flat",
    "tabs": "pills",
    "font": "sans",
    "title": 38,
    "section": 22,
    "body": 16,
    "label": 14,
    "caption": 12,
    "titleWeight": 400,
    "sectionWeight": 700
  },
  {
    "name": "Saffron Paper",
    "description": "Burnt sienna and marigold for purchase requests and approvals.",
    "colors": {
      "canvas": "#fbf5e6",
      "surface": "#fffdf4",
      "action": "#894016",
      "accent": "#da9d28",
      "ink": "#392a1f",
      "line": "#bda989",
      "tint": "#f8e9c7"
    },
    "height": 44,
    "radius": 3,
    "panel": 5,
    "design": "double",
    "tabs": "line",
    "font": "serif",
    "title": 36,
    "section": 22,
    "body": 16,
    "label": 14,
    "caption": 12,
    "titleWeight": 400,
    "sectionWeight": 700
  },
  {
    "name": "Indigo Ledger",
    "description": "Ink indigo and periwinkle for compact accounting forms.",
    "colors": {
      "canvas": "#f0f1f9",
      "surface": "#fdfdff",
      "action": "#403f83",
      "accent": "#8582c1",
      "ink": "#252538",
      "line": "#a6a6bf",
      "tint": "#e4e4f5"
    },
    "height": 36,
    "radius": 2,
    "panel": 3,
    "design": "flat",
    "tabs": "boxed",
    "font": "sans",
    "title": 28,
    "section": 18,
    "body": 15,
    "label": 14,
    "caption": 12,
    "titleWeight": 700,
    "sectionWeight": 700
  },
  {
    "name": "Coastal Glass",
    "description": "Petrol teal and seafoam for appointment and service forms.",
    "colors": {
      "canvas": "#ecf7f6",
      "surface": "#fbffff",
      "action": "#106269",
      "accent": "#529f98",
      "ink": "#193438",
      "line": "#92b4b2",
      "tint": "#d9efed"
    },
    "height": 50,
    "radius": 14,
    "panel": 20,
    "design": "raised",
    "tabs": "pills",
    "font": "sans",
    "title": 34,
    "section": 22,
    "body": 16,
    "label": 14,
    "caption": 12,
    "titleWeight": 400,
    "sectionWeight": 700
  },
  {
    "name": "Olive Grove",
    "description": "Olive ink and pale straw for ingredient and stock records.",
    "colors": {
      "canvas": "#f3f4e9",
      "surface": "#fffff7",
      "action": "#4d5d28",
      "accent": "#a59341",
      "ink": "#2c321f",
      "line": "#aab193",
      "tint": "#e7ead4"
    },
    "height": 42,
    "radius": 6,
    "panel": 8,
    "design": "rail",
    "tabs": "line",
    "font": "serif",
    "title": 32,
    "section": 20,
    "body": 16,
    "label": 14,
    "caption": 12,
    "titleWeight": 400,
    "sectionWeight": 700
  },
  {
    "name": "Coral Clay",
    "description": "Brick red and pale peach for large cashier touch controls.",
    "colors": {
      "canvas": "#fcf1eb",
      "surface": "#fffaf6",
      "action": "#984637",
      "accent": "#c77e58",
      "ink": "#3c2824",
      "line": "#c8a697",
      "tint": "#f6e1d5"
    },
    "height": 52,
    "radius": 12,
    "panel": 16,
    "design": "raised",
    "tabs": "boxed",
    "font": "sans",
    "title": 34,
    "section": 22,
    "body": 16,
    "label": 14,
    "caption": 12,
    "titleWeight": 700,
    "sectionWeight": 700
  },
  {
    "name": "Graphite Studio",
    "description": "Graphite and pale silver with cobalt selection marks for operations.",
    "colors": {
      "canvas": "#f3f4f5",
      "surface": "#ffffff",
      "action": "#353c46",
      "accent": "#416ab3",
      "ink": "#20242b",
      "line": "#aab0b8",
      "tint": "#e5e9ee"
    },
    "height": 38,
    "radius": 0,
    "panel": 0,
    "design": "rail",
    "tabs": "line",
    "font": "sans",
    "title": 30,
    "section": 18,
    "body": 15,
    "label": 14,
    "caption": 12,
    "titleWeight": 700,
    "sectionWeight": 700
  },
  {
    "name": "Lavender Archive",
    "description": "Violet and lilac for document and archive workflows.",
    "colors": {
      "canvas": "#f6f2fa",
      "surface": "#fffcff",
      "action": "#644181",
      "accent": "#9a7aae",
      "ink": "#33273e",
      "line": "#b6a5c2",
      "tint": "#ede3f4"
    },
    "height": 48,
    "radius": 18,
    "panel": 14,
    "design": "double",
    "tabs": "pills",
    "font": "serif",
    "title": 38,
    "section": 24,
    "body": 16,
    "label": 14,
    "caption": 12,
    "titleWeight": 400,
    "sectionWeight": 700
  }
];

// Night companions keep the typography and shape system of each original light design.
const nightColors = [
  ['Jade Lantern','#101c19','#192b25','#95dfb4','#e3f5e8','#537c67','#243d31'],
  ['Mekong at Night','#101d29','#192d40','#93cdf3','#e3f1fb','#54738a','#263f55'],
  ['Midnight Lotus','#231820','#352332','#f2b1d2','#fff0f7','#86687a','#482e40'],
  ['Ember Paper','#231c16','#332820','#ffc18d','#fff0de','#826c57','#493526'],
  ['Indigo Night','#191a2a','#25283e','#bac0ff','#efedff','#646886','#353950'],
  ['Deep Tide','#111f23','#182e32','#85e1d9','#ddf8f6','#537879','#213e43'],
  ['Olive Dusk','#1a2016','#2a3121','#c1dc8f','#f0f5dd','#71815c','#37452c'],
  ['Terracotta Night','#251b19','#392824','#ffb9a5','#fff0eb','#906b60','#4b332c'],
  ['Carbon Studio','#171a1d','#23282e','#c3d4e3','#f3f5f7','#687482','#323b44'],
  ['Violet Archive','#1e1928','#30263e','#d8b6fa','#f8f0ff','#806694','#41334f']
];
const projectPresets = [...lightPresets,...nightColors.map(([name,canvas,surface,action,ink,line,tint],i)=>({
  ...lightPresets[i],name,colors:{canvas,surface,action,ink,line,tint,accent:action},night:true
}))];
function styleLayerForTheme(n,t){
  const c=t.colors,s=n.style;
  if(['Image','Custom'].includes(n.type))return;
  s.color=c.ink;
  if(n.type==='Text'||n.type==='Icon')return;
  if(n.type==='Shape'){s.fill=c.tint;return}
  s.fontSize=t.body;
  const width=t.design==='double'?'3px double ':'1px solid ';
  s.border=width+c.line;
  s.radius=n.type==='Module'?t.panel:t.radius;
  s.fill=c.surface;
  if(n.type==='Button'){
    const outline=n.variant==='Outline';
    s.fill=outline?'transparent':'var(--accent)';
    s.color=outline?c.action:(t.night?'#101820':'#FFFFFF');
    s.border=width+c.action;
    if(n.variant==='Pill')s.radius=99;
  }
  if(n.type==='Module')s.fill=c.tint;
  if(pickerKind(n))n.picker={...n.picker,accent:c.action,background:c.surface,ink:c.ink,fontSize:t.body};
}
function useProjectTheme(name){
  const t=projectPresets.find(item=>item.name===name);
  if(!t)return;
  change(()=>{
    project.theme={...project.theme,preset:t.name,accent:t.colors.action,background:t.colors.canvas,
      surface:t.colors.surface,ink:t.colors.ink,tint:t.colors.tint,line:t.colors.line,tabRadius:t.tabs==='pills'?30:t.radius,
      font:t.font==='serif'?'Georgia, serif':'Arial, sans-serif'};
    project.palette=[...new Set(Object.values(t.colors))];
    for(const pg of project.pages){
      delete pg.backgrounds;
      for(const n of pg.nodes)styleLayerForTheme(n,t);
    }
  },t.name+' applied');
}
function themePicker(){
  const selected=project.theme.preset;
  const group=(title,items)=>'<optgroup label="'+title+'">'+items.map(t=>'<option '+(t.name===selected?'selected':'')+'>'+esc(t.name)+'</option>').join('')+'</optgroup>';
  return field('Project theme','<select id="presetChoice">'+group('Light',projectPresets.slice(0,10))+group('Dark',projectPresets.slice(10))+'</select>')+
    btn('apply-preset','Apply theme','','btn primary')+'<p>Restyles all screens and windows. Keeps positions, field connections and triggers. Undo restores the previous appearance.</p>';
}
