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
// Keep the supplied swatch order, including colors available for optional accents.
const customPaletteThemes = [
  {
    ...lightPresets[8],name:'1 · Teal & Copper',night:true,
    description:'Dark teal surfaces, warm ivory text, and a copper primary action.',
    palette:['#0A0F14','#0F3D3E','#2E6F73','#7FB3B8','#EADCC8','#C6601F'],
    colors:{canvas:'#0A0F14',surface:'#0F3D3E',action:'#C6601F',onAction:'#0A0F14',accent:'#7FB3B8',heading:'#EADCC8',ink:'#EADCC8',line:'#2E6F73',tint:'#0F3D3E'},
    radius:8,panel:12,design:'flat',font:'sans'
  },
  {
    ...lightPresets[1],name:'2 · Navy & Amber',night:true,
    description:'Layered navy, cyan details, warm text, and an amber primary action.',
    palette:['#0B132B','#1C2541','#3A506B','#5BC0DE','#F4D6B0','#D97706'],
    colors:{canvas:'#0B132B',surface:'#1C2541',action:'#D97706',onAction:'#0B132B',accent:'#5BC0DE',heading:'#F4D6B0',ink:'#F4D6B0',line:'#3A506B',tint:'#3A506B'},
    radius:6,panel:10,design:'flat',font:'sans'
  },
  {
    ...lightPresets[5],name:'3 · Deep Sea & Gold',night:true,
    description:'Deep sea blues with a warm gold primary action and pale readable text.',
    palette:['#08141A','#092830','#0E6B74','#68A2BD','#1B3D4F','#F4B544','#EAF3F4'],
    colors:{canvas:'#08141A',surface:'#092830',action:'#F4B544',onAction:'#08141A',accent:'#68A2BD',heading:'#EAF3F4',ink:'#EAF3F4',line:'#0E6B74',tint:'#1B3D4F'},
    radius:8,panel:12,design:'flat',font:'sans'
  },
  {
    ...lightPresets[6],name:'4 · Ivory & Sage',
    description:'Warm ivory, teal primary buttons, terracotta accents, and optional gold and sage swatches.',
    palette:['#F2E9D8','#59718A','#2F6F6D','#E07A47','#D4A72C','#8FA68F'],
    colors:{canvas:'#F2E9D8',surface:'#F2E9D8',action:'#2F6F6D',onAction:'#F2E9D8',accent:'#E07A47',heading:'#2F6F6D',ink:'#2F6F6D',line:'#59718A',tint:'#F2E9D8'},
    radius:8,panel:12,design:'flat',font:'sans'
  }
];
const projectPresets = [...lightPresets,...nightColors.map(([name,canvas,surface,action,ink,line,tint],i)=>({
  ...lightPresets[i],name,colors:{canvas,surface,action,ink,line,tint,accent:action},night:true
})),...customPaletteThemes];
function styleLayerForTheme(n,t){
  applyLayerTheme(n,completeTheme(t));
}
function useProjectTheme(name){
  const t=[...projectPresets,...(project.customThemes||[])].find(item=>item.name===name);
  if(t)openProjectThemes(t);
}
function themePicker(){
  return btn('theme-studio','Browse & preview themes','theme','btn full')+btn('create-theme','Create my own theme','plus','btn full mt')+
    '<p>Colors are labeled by their purpose. Preview your existing form, then choose Apply Theme.</p><h3>My themes</h3>'+
    ((project.customThemes||[]).map(t=>'<button class="variant" data-open-theme="'+esc(t.id)+'">'+esc(t.name)+'</button>').join('')||'<p class="hint">Save a theme to reuse it here.</p>');
}
