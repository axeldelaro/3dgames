const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./MetropolisWorld-NBZ1FvMm.js","./vendor-three-CZKCEY4Y.js","./vendor-network-DQWGHFic.js","./StarfieldWorld-DrpkfSQp.js","./ValheimWorld-Ddqdf73z.js","./SeaOfLegendsWorld-DiJnKHIN.js","./AetheriaWorld-CFZmdTbM.js","./ExtremeHorizonWorld-CsNnDVX5.js"])))=>i.map(i=>d[i]);
import{D as Dt,R as Bt,U as Ft,a as Xe,L as nt,b as rt,M as ve,C as ae,V as qe,N as $e,S as Ue,c as le,d as Ve,e as Ht,B as xt,f as Se,g as b,h as lt,H as Gt,F as Vt,i as Mt,P as zt,j as be,A as St,k as Ct,E as Ot,l as Nt,m as Wt,n as kt,o as _t,p as qt,q as Ut,r as ct,s as at,t as ht,u as je,v as jt,w as _e,x as Xt,Q as it,y as Tt,G as q,z as te,I as $,O as Ze,T as Ke,J as $t,K as Qt,W as ot,X as Jt,Y as Yt,Z as Zt,_ as Kt,$ as es,a0 as ts,a1 as ss}from"./vendor-three-CZKCEY4Y.js";import{j as is,$ as dt}from"./vendor-network-DQWGHFic.js";(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))o(s);new MutationObserver(s=>{for(const i of s)if(i.type==="childList")for(const a of i.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&o(a)}).observe(document,{childList:!0,subtree:!0});function t(s){const i={};return s.integrity&&(i.integrity=s.integrity),s.referrerPolicy&&(i.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?i.credentials="include":s.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function o(s){if(s.ep)return;s.ep=!0;const i=t(s);fetch(s.href,i)}})();const os="modulepreload",as=function(f,e){return new URL(f,e).href},ut={},De=function(e,t,o){let s=Promise.resolve();if(t&&t.length>0){let a=function(c){return Promise.all(c.map(d=>Promise.resolve(d).then(h=>({status:"fulfilled",value:h}),h=>({status:"rejected",reason:h}))))};const n=document.getElementsByTagName("link"),r=document.querySelector("meta[property=csp-nonce]"),l=r?.nonce||r?.getAttribute("nonce");s=a(t.map(c=>{if(c=as(c,o),c in ut)return;ut[c]=!0;const d=c.endsWith(".css"),h=d?'[rel="stylesheet"]':"";if(!!o)for(let m=n.length-1;m>=0;m--){const g=n[m];if(g.href===c&&(!d||g.rel==="stylesheet"))return}else if(document.querySelector(`link[href="${c}"]${h}`))return;const p=document.createElement("link");if(p.rel=d?"stylesheet":os,d||(p.as="script"),p.crossOrigin="",p.href=c,l&&p.setAttribute("nonce",l),document.head.appendChild(p),d)return new Promise((m,g)=>{p.addEventListener("load",m),p.addEventListener("error",()=>g(new Error(`Unable to preload CSS for ${c}`)))})}))}function i(a){const n=new Event("vite:preloadError",{cancelable:!0});if(n.payload=a,window.dispatchEvent(n),!n.defaultPrevented)throw a}return s.then(a=>{for(const n of a||[])n.status==="rejected"&&i(n.reason);return e().catch(i)})},Je=[{id:"metropolis",title:"METROPOLIS OSM 1:1",subtitle:"Vraies Villes Réelles & GTA Sandbox",genre:"Open-World Urbain • OSM Overpass • Météo Live",accentColor:"#28e0ff",description:"Reconstruction 3D 1:1 de n’importe quelle ville sur Terre (Paris, Tokyo, NYC, Nominatim & GPS réel), météo Open-Meteo en direct, Interior Mapping nocturne, voitures à suspension raycast, motos, hélicoptères et missions.",features:["Overpass 3D + Cache IndexedDB","Météo Live Open-Meteo","Voitures Drift, Motos & Hélicos","Immobilier & Livraisons GPS"]},{id:"starfield",title:"STARFIELD ODYSSEY",subtitle:"Exploration Spatiale Sans Chargement",genre:"Sci-Fi Planétaire • Gravité Sphérique 3D",accentColor:"#ffb347",description:"Système stellaire complet avec planètes sphériques à gravité directionnelle 3D, transition continue sol-atmosphère-espace sans écran de chargement, minage laser, hyperpropulsion Warp et combats spatiaux.",features:["Gravité Sphérique 3D","Surface → Espace Continu","Hyperpropulsion Warp Shader","Cockpit & Dogfights P2P"]},{id:"valheim",title:"VALHEIM WILDLANDS",subtitle:"Survie, Craft & Construction Coop",genre:"Survie Nordique • Construction Modulaire P2P",accentColor:"#66f2a5",description:"Continent sauvage infini (forêts boréales, pics enneigés, plages, rivières), abattage physique d’arbres, minage, construction modulaire synchronisée en P2P, feux de camp et défense nocturne coopérative.",features:["Abattage Physique d’Arbres","Construction Modulaire P2P","Biomes & Rayons Volumétriques","Survie & Défense Nocturne"]},{id:"seaOfLegends",title:"SEA OF LEGENDS",subtitle:"Océan Photoréaliste & Batailles Navales",genre:"Piraterie Multijoueur • Océan de Gerstner",accentColor:"#19d4c6",description:"Océan physique gouverné par des vagues de Gerstner synchronisées en P2P, galion à flottabilité multi-points, réglage des voiles selon le vent, duels au canon balistique, plongée sous-marine et chasse au trésor.",features:["Vagues de Gerstner + Caustiques","Galion à Flottabilité 4-Points","Voiles, Gouvernail & Canons","Archipels & Coffres au Trésor"]},{id:"aetheria",title:"AETHERIA CHRONICLES",subtitle:"Action-RPG Cel-Shaded, Escalade & Paravoile",genre:"Fantasy Anime • Escalade 360° & Magie",accentColor:"#ffd166",description:"Royaume fantastique stylisé Toon/PBR avec contours Outline, escalade libre à 360° sur toutes les falaises, paravoile à courants thermiques ascendants, épée à traînées lumineuses, arc et magie du feu interactive.",features:["Escalade Libre 360° + Endurance","Paravoile & Courants Thermiques","Sword Trails & Tir à l’Arc","Feu Élémentaire Interactif"]},{id:"extremeHorizon",title:"EXTREME HORIZON",subtitle:"Vol Supersonique & Off-Road 4x4 Trial",genre:"Simulation Aérienne Mach 2 & Franchissement",accentColor:"#ff6b57",description:"Massifs montagneux haute résolution (Alpes, Grand Canyon, Mont Fuji, Fjord) avec bascule instantanée entre avion de chasse supersonique (portance, postcombustion, bang Mach 1, HUD) et 4x4 Trial articulé.",features:["Alpes, Canyon, Fuji & Fjord","Chasseur Supersonique + HUD","4x4 Suspension Articulée","Courses Checkpoints P2P"]}];class ns{state;constructor(e=1337){this.state=e>>>0}next(){let e=this.state+=1831565813;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}range(e,t){return e+(t-e)*this.next()}int(e,t){return Math.floor(this.range(e,t+1))}}const rs=.5*(Math.sqrt(3)-1),Oe=(3-Math.sqrt(3))/6,ls=1/3,Me=1/6,oe=[[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]];class Ae{perm;permMod12;constructor(e=42026){const t=new ns(e),o=new Uint8Array(256);for(let s=0;s<256;s++)o[s]=s;for(let s=255;s>0;s--){const i=Math.floor(t.next()*(s+1)),a=o[s];o[s]=o[i],o[i]=a}this.perm=new Uint8Array(512),this.permMod12=new Uint8Array(512);for(let s=0;s<512;s++)this.perm[s]=o[s&255],this.permMod12[s]=this.perm[s]%12}static fade(e){return e*e*e*(e*(e*6-15)+10)}static lerp(e,t,o){return e+o*(t-e)}perlin2D(e,t,o=0,s=0){const i=Math.floor(e),a=Math.floor(t),n=e-i,r=t-a,l=o>0?(i%o+o)%o:i&255,c=s>0?(a%s+s)%s:a&255,d=o>0?(l+1)%o:l+1&255,h=s>0?(c+1)%s:c+1&255,u=Ae.fade(n),p=Ae.fade(r),m=oe[this.permMod12[(l&255)+this.perm[c&255]]],g=oe[this.permMod12[(d&255)+this.perm[c&255]]],y=oe[this.permMod12[(l&255)+this.perm[h&255]]],C=oe[this.permMod12[(d&255)+this.perm[h&255]]],M=m[0]*n+m[1]*r,x=g[0]*(n-1)+g[1]*r,T=y[0]*n+y[1]*(r-1),k=C[0]*(n-1)+C[1]*(r-1),w=Ae.lerp(M,x,u),U=Ae.lerp(T,k,u);return Ae.lerp(w,U,p)*1.4142}simplex2D(e,t){let o=0,s=0,i=0;const a=(e+t)*rs,n=Math.floor(e+a),r=Math.floor(t+a),l=(n+r)*Oe,c=n-l,d=r-l,h=e-c,u=t-d;let p,m;h>u?(p=1,m=0):(p=0,m=1);const g=h-p+Oe,y=u-m+Oe,C=h-1+2*Oe,M=u-1+2*Oe,x=n&255,T=r&255,k=this.permMod12[x+this.perm[T]],w=this.permMod12[x+p+this.perm[T+m]],U=this.permMod12[x+1+this.perm[T+1]];let G=.5-h*h-u*u;G>=0&&(G*=G,o=G*G*(oe[k][0]*h+oe[k][1]*u));let P=.5-g*g-y*y;P>=0&&(P*=P,s=P*P*(oe[w][0]*g+oe[w][1]*y));let v=.5-C*C-M*M;return v>=0&&(v*=v,i=v*v*(oe[U][0]*C+oe[U][1]*M)),70*(o+s+i)}simplex3D(e,t,o){let s=0,i=0,a=0,n=0;const r=(e+t+o)*ls,l=Math.floor(e+r),c=Math.floor(t+r),d=Math.floor(o+r),h=(l+c+d)*Me,u=e-(l-h),p=t-(c-h),m=o-(d-h);let g,y,C,M,x,T;u>=p?p>=m?(g=1,y=0,C=0,M=1,x=1,T=0):u>=m?(g=1,y=0,C=0,M=1,x=0,T=1):(g=0,y=0,C=1,M=1,x=0,T=1):p<m?(g=0,y=0,C=1,M=0,x=1,T=1):u<m?(g=0,y=1,C=0,M=0,x=1,T=1):(g=0,y=1,C=0,M=1,x=1,T=0);const k=u-g+Me,w=p-y+Me,U=m-C+Me,G=u-M+2*Me,P=p-x+2*Me,v=m-T+2*Me,Q=u-1+3*Me,B=p-1+3*Me,F=m-1+3*Me,O=l&255,j=c&255,J=d&255,Z=this.permMod12[O+this.perm[j+this.perm[J]]],A=this.permMod12[O+g+this.perm[j+y+this.perm[J+C]]],X=this.permMod12[O+M+this.perm[j+x+this.perm[J+T]]],ne=this.permMod12[O+1+this.perm[j+1+this.perm[J+1]]];let I=.6-u*u-p*p-m*m;I>0&&(I*=I,s=I*I*(oe[Z][0]*u+oe[Z][1]*p+oe[Z][2]*m));let se=.6-k*k-w*w-U*U;se>0&&(se*=se,i=se*se*(oe[A][0]*k+oe[A][1]*w+oe[A][2]*U));let pe=.6-G*G-P*P-v*v;pe>0&&(pe*=pe,a=pe*pe*(oe[X][0]*G+oe[X][1]*P+oe[X][2]*v));let de=.6-Q*Q-B*B-F*F;return de>0&&(de*=de,n=de*de*(oe[ne][0]*Q+oe[ne][1]*B+oe[ne][2]*F)),32*(s+i+a+n)}worley2D(e,t,o=.85,s=0){const i=Math.floor(e),a=Math.floor(t);let n=999,r=999,l=0;for(let c=-1;c<=1;c++)for(let d=-1;d<=1;d++){const h=i+d,u=a+c,p=s>0?(h%s+s)%s:h&255,m=s>0?(u%s+s)%s:u&255,g=this.perm[(p&255)+this.perm[m&255]],y=this.perm[g+73&255],C=h+.5+(g/255-.5)*o,M=u+.5+(y/255-.5)*o,x=Math.hypot(e-C,t-M);x<n?(r=n,n=x,l=g/255):x<r&&(r=x)}return{f1:Math.min(1,n),f2:Math.min(1,r),edge:Math.min(1,Math.max(0,r-n)),cellId:l}}fbm2D(e,t,o=5,s=2.03,i=.5){let a=0,n=.5,r=1,l=0;for(let c=0;c<o;c++)a+=n*this.simplex2D(e*r,t*r),l+=n,r*=s,n*=i;return l>0?a/l:0}fbm3D(e,t,o,s=5,i=2.02,a=.5){let n=0,r=.5,l=1,c=0;for(let d=0;d<s;d++)n+=r*this.simplex3D(e*l,t*l,o*l),c+=r,l*=i,r*=a;return c>0?n/c:0}ridged2D(e,t,o=5,s=2.1,i=.52){let a=0,n=.5,r=1,l=1,c=0;for(let d=0;d<o;d++){let h=1-Math.abs(this.simplex2D(e*r,t*r));h*=h,a+=h*n*l,c+=n,l=Math.max(.15,Math.min(1,h*1.6)),r*=s,n*=i}return c>0?Math.min(1,a/c):0}}const Ys=new Ae(202630),pt={asphalt:{roughness:1,metalness:1,emissiveIntensity:0,bumpScale:.018,normalScale:.95,sobelStrength:2.6},cobblestone:{roughness:1,metalness:1,emissiveIntensity:0,bumpScale:.045,normalScale:1.35,sobelStrength:4.2},facade_brick:{roughness:1,metalness:1,emissiveIntensity:.85,bumpScale:.03,normalScale:1.15,sobelStrength:3.4},facade_glass:{roughness:1,metalness:1,emissiveIntensity:.65,bumpScale:.012,normalScale:.85,sobelStrength:2.4},bark:{roughness:1,metalness:1,emissiveIntensity:0,bumpScale:.05,normalScale:1.4,sobelStrength:4.4},foliage:{roughness:1,metalness:1,emissiveIntensity:0,bumpScale:.02,normalScale:.9,sobelStrength:2.5},rock:{roughness:1,metalness:1,emissiveIntensity:0,bumpScale:.048,normalScale:1.35,sobelStrength:4},sand:{roughness:1,metalness:1,emissiveIntensity:0,bumpScale:.022,normalScale:.95,sobelStrength:2.8},rust:{roughness:1,metalness:1,emissiveIntensity:0,bumpScale:.032,normalScale:1.2,sobelStrength:3.5},ship_wood:{roughness:1,metalness:1,emissiveIntensity:0,bumpScale:.03,normalScale:1.15,sobelStrength:3.3},carbon:{roughness:1,metalness:1,emissiveIntensity:0,bumpScale:.01,normalScale:.85,sobelStrength:2.6}},Be=256,Fe=255;function Y(f){return f<0?0:f>1?1:f}function ce(f,e,t){const o=Y((t-f)/(e-f));return o*o*(3-2*o)}function D(f,e,t){return f+(e-f)*t}function we(f){return(f<0?0:f>1?1:f)*255+.5|0}function mt(f){const e=Math.max(64,Math.min(2048,Math.round(f)));return 1<<Math.round(Math.log2(e))}function He(f,e){let t=Math.imul(f,374761393)+Math.imul(e,668265263);return t=Math.imul(t^t>>>13,1274126177),((t^t>>>16)>>>0)/4294967296}class cs{_textureSize;perlinLut;simplexLut;worleyF1Lut;worleyEdgeLut;worleyCellLut;cache=new Map;repeatCache=new Map;allocatedTextures=new Set;scratchHeight;constructor(e=1024,t=202630){this._textureSize=mt(e),this.scratchHeight=new Float32Array(this._textureSize*this._textureSize);const o=new Ae(t),s=Be*Be;this.perlinLut=new Float32Array(s),this.simplexLut=new Float32Array(s),this.worleyF1Lut=new Float32Array(s),this.worleyEdgeLut=new Float32Array(s),this.worleyCellLut=new Float32Array(s);const i=1/Be,a=(n,r,l,c)=>{const d=o.simplex2D(n*l+c,r*l+c),h=o.simplex2D((n-1)*l+c,r*l+c),u=o.simplex2D(n*l+c,(r-1)*l+c),p=o.simplex2D((n-1)*l+c,(r-1)*l+c),m=(1-n)*(1-r)*d+n*(1-r)*h+(1-n)*r*u+n*r*p,g=Math.sqrt(((1-n)*(1-n)+n*n)*((1-r)*(1-r)+r*r));return m/g};for(let n=0;n<Be;n++){const r=n*i,l=n<<8;for(let c=0;c<Be;c++){const d=c*i,h=l|c,u=.56*o.perlin2D(d*4,r*4,4,4)+.3*o.perlin2D(d*8,r*8,8,8)+.14*o.perlin2D(d*16,r*16,16,16);this.perlinLut[h]=Y(.5+.5*u);const p=.68*a(d,r,6,11.3)+.32*a(d,r,12,47.9);this.simplexLut[h]=Y(.5+.5*p);const m=o.worley2D(d*8,r*8,.86,8);this.worleyF1Lut[h]=m.f1,this.worleyEdgeLut[h]=m.edge,this.worleyCellLut[h]=m.cellId}}}get textureSize(){return this._textureSize}set textureSize(e){this.setTextureSize(e)}setTextureSize(e){const t=mt(e);t!==this._textureSize&&(this._textureSize=t,this.scratchHeight=new Float32Array(t*t),this.cache.clear(),this.repeatCache.clear())}sampleBilinear(e,t,o){const s=Math.floor(t),i=Math.floor(o),a=t-s,n=o-i,r=s&Fe,l=s+1&Fe,c=(i&Fe)<<8,d=(i+1&Fe)<<8,h=e[c|r],u=e[c|l],p=e[d|r],m=e[d|l],g=h+(u-h)*a,y=p+(m-p)*a;return g+(y-g)*n}sampleNearest(e,t,o){const s=Math.floor(t)&Fe,i=Math.floor(o)&Fe;return e[i<<8|s]}sampleFbm(e,t,o){return .52*this.sampleBilinear(e,t,o)+.26*this.sampleBilinear(e,t*2+37,o*2+91)+.14*this.sampleBilinear(e,t*4+113,o*4+53)+.08*this.sampleBilinear(e,t*8+19,o*8+173)}createDataTexture(e,t,o){const s=new Dt(e,t,t,Bt,Ft);return s.wrapS=Xe,s.wrapT=Xe,s.magFilter=nt,s.minFilter=rt,s.generateMipmaps=!0,s.anisotropy=8,s.colorSpace=o,s.needsUpdate=!0,this.allocatedTextures.add(s),s}cloneWithRepeat(e,t,o){const s=e.clone();return s.wrapS=Xe,s.wrapT=Xe,s.magFilter=nt,s.minFilter=rt,s.generateMipmaps=!0,s.anisotropy=8,s.colorSpace=e.colorSpace,s.repeat.set(t,o),s.needsUpdate=!0,this.allocatedTextures.add(s),s}getTextureSet(e){const t=this.cache.get(e);if(t)return t;const o=this.synthesizeTextureSet(e);return this.cache.set(e,o),o}createPBRMaterial(e,t){const o=t?.repeatX??1,s=t?.repeatY??1,i=pt[e];let a;if(o===1&&s===1)a=this.getTextureSet(e);else{const c=`${e}:${o.toFixed(4)}:${s.toFixed(4)}`,d=this.repeatCache.get(c);if(d)a=d;else{const h=this.getTextureSet(e);a={name:e,map:this.cloneWithRepeat(h.map,o,s),normalMap:this.cloneWithRepeat(h.normalMap,o,s),roughnessMap:this.cloneWithRepeat(h.roughnessMap,o,s),metalnessMap:this.cloneWithRepeat(h.metalnessMap,o,s),emissiveMap:this.cloneWithRepeat(h.emissiveMap,o,s),bumpMap:this.cloneWithRepeat(h.bumpMap,o,s)},this.repeatCache.set(c,a)}}const n=t?.normalScale??i.normalScale,r=t?.emissiveIntensity??i.emissiveIntensity;return new ve({name:`PBR_${e}`,color:t?.tint!==void 0?new ae(t.tint):new ae(16777215),map:a.map,normalMap:a.normalMap,normalScale:new qe(n,n),roughnessMap:a.roughnessMap,roughness:t?.roughness??i.roughness,metalnessMap:a.metalnessMap,metalness:t?.metalness??i.metalness,emissiveMap:a.emissiveMap,emissive:new ae(r>0?16777215:0),emissiveIntensity:r,bumpMap:a.bumpMap,bumpScale:t?.bumpScale??i.bumpScale})}dispose(){for(const e of this.allocatedTextures)e.dispose();this.allocatedTextures.clear(),this.cache.clear(),this.repeatCache.clear()}synthesizeTextureSet(e){const t=this._textureSize,o=t*t,s=o*4,i=new Uint8Array(s),a=new Uint8Array(s),n=new Uint8Array(s),r=new Uint8Array(s),l=new Uint8Array(s),c=new Uint8Array(s);this.scratchHeight.length!==o&&(this.scratchHeight=new Float32Array(o));const d=this.scratchHeight,h=Be/t,u=1/t,p=this.perlinLut,m=this.simplexLut,g=this.worleyF1Lut,y=this.worleyEdgeLut,C=this.worleyCellLut;for(let T=0;T<t;T++){const k=T*u,w=T*h,U=T*t;for(let G=0;G<t;G++){const P=G*u,v=G*h,Q=U+G,B=Q<<2;let F=.5,O=.5,j=.5,J=.7,Z=0,A=0,X=0,ne=0,I=.5;switch(e){case"asphalt":{const V=this.sampleFbm(p,v,w),_=this.sampleBilinear(m,v*16,w*16),L=this.sampleNearest(p,v*48+T*.7,w*48+G*.3),R=this.sampleBilinear(y,v*2+V*6,w*2+V*6),N=this.sampleBilinear(y,v*4+31,w*4+77),z=(1-ce(.015,.055,R))*.85+(1-ce(.01,.04,N))*.45,H=ce(.56,.78,this.sampleBilinear(m,v+64,w+128)),W=L>.78?(L-.78)*1.1:0;let E=.13+V*.055+(_-.5)*.05+W;E*=D(1,.68,H),E*=1-Y(z)*.62,F=E*.97,O=E*.99,j=E*1.05,J=Y(D(.86-W*.4,.32,H)+z*.12),Z=.03,I=Y(.58+(_-.5)*.22+W*.35-z*.48);break}case"cobblestone":{const V=(this.sampleBilinear(p,v*2,w*2)-.5)*6.5,_=(this.sampleBilinear(m,v*2+90,w*2+45)-.5)*6.5,L=v*3+V,R=w*3+_,N=this.sampleBilinear(g,L,R),z=this.sampleBilinear(y,L,R),H=this.sampleNearest(C,L,R),W=this.sampleFbm(m,v*8,w*8),E=ce(.045,.135,z),re=Math.sqrt(Y(1-N*N*1.15))*E,ee=D(.27,.48,H)+(W-.5)*.11,ie=D(.28,.45,Y(H*.85+.08))+(W-.5)*.1,K=D(.3,.44,1-H*.5)+(W-.5)*.1,me=.19+W*.07,ue=D(.65,1.06,re);F=D(me*1.04,ee*ue,E),O=D(me*1,ie*ue,E),j=D(me*.92,K*ue,E),J=D(.94,.48+(1-re)*.26,E),Z=D(0,.05,E),I=Y(.12+re*.78+(W-.5)*.08);break}case"facade_brick":{const L=P*4%1,R=k*4%1,N=Math.floor(P*4),z=Math.floor(k*4),H=L>.2&&L<.8,W=R>.18&&R<.78,E=L>.16&&L<.84&&R>=.13&&R<=.18,re=L>.16&&L<.84&&R>=.78&&R<=.84,ee=this.sampleFbm(p,v*6,w*6);if(H&&W){const ie=(L-.2)/.6,K=(R-.18)/.6;if(ie<.055||ie>.945||K<.055||K>.945||Math.abs(ie-.5)<.025||Math.abs(K-.58)<.025)F=.14,O=.15,j=.17,J=.42,Z=.65,I=.34;else{const ue=He(N+17,z+53),Ce=ue>.42,fe=.75+.25*Math.sin(ie*Math.PI*6),xe=.55+.45*K;if(F=.07+ee*.03,O=.1+ee*.03,j=.15+ee*.04,J=.11,Z=.32,I=.16,Ce){const ye=ue>.68,ge=xe*fe*(.65+.35*ee);A=ye?ge*1:ge*.72,X=ye?ge*.76:ge*.86,ne=ye?ge*.42:ge*1}}}else if(E||re){const ie=.54+(ee-.5)*.12;F=ie*1.03,O=ie*.99,j=ie*.92,J=.78,Z=.02,I=.78}else{const me=k*32,ue=Math.floor(me),Ce=(ue&1)*.5,fe=P*16+Ce,xe=Math.floor(fe),ye=fe-xe,ge=me-ue,Ie=1-ce(.04,.09,Math.min(ye,1-ye))*ce(.07,.15,Math.min(ge,1-ge)),ze=He(xe&15,ue&31),Le=this.sampleBilinear(m,v*10,w*10),At=D(.42,.64,ze)+(Le-.5)*.1,It=D(.18,.29,ze)+(Le-.5)*.06,Lt=D(.13,.21,ze)+(Le-.5)*.05,Ye=.48+(ee-.5)*.1;F=D(At,Ye,Ie),O=D(It,Ye*.97,Ie),j=D(Lt,Ye*.93,Ie),J=D(.82,.95,Ie),Z=.02,I=D(.62+(Le-.5)*.14,.28,Ie)}break}case"facade_glass":{const L=P*8,R=k*8,N=Math.floor(L),z=Math.floor(R),H=L-N,W=R-z,E=H<.055||H>.945,re=W<.14||W>.95,ee=this.sampleBilinear(p,v*3,w*3);if(E||re){const ie=this.sampleBilinear(m,v*24,w*4),K=(E?.22:.14)+(ie-.5)*.04;F=K*.95,O=K*1,j=K*1.08,J=E?.26:.36,Z=.88,I=E?.76:.56}else{const ie=He(N,z),K=.88+.24*ie,me=.75+.25*W+(ee-.5)*.08;if(F=.06*K*me,O=.15*K*me,j=.22*K*me,J=.07+ee*.04,Z=.28,I=.35+(ee-.5)*.03,ie>.36){const ue=ce(.68,.86,W)*(.55+.45*Math.sin(H*Math.PI)),Ce=(.22+.28*W)*(.7+.3*ee),fe=ue*.85+Ce*.45;ie>.74?(A=fe*1,X=fe*.82,ne=fe*.55):(A=fe*.68,X=fe*.88,ne=fe*1)}}break}case"bark":{const V=(this.sampleBilinear(p,v*2,w*1)-.5)*8,_=Math.abs(this.sampleBilinear(p,v*10+V,w*2)-.5)*2,L=Math.abs(this.sampleBilinear(m,v*20+V*.5,w*4)-.5)*2,R=this.sampleBilinear(p,v*32,w*8),N=Y(_*.65+L*.35),z=this.sampleBilinear(g,v*3+21,w*3+65),H=ce(.66,.82,this.sampleBilinear(m,v*2,w*2))*(1-ce(.18,.42,z)),W=D(.13,.36,N)+(R-.5)*.06,E=D(.09,.26,N)+(R-.5)*.05,re=D(.07,.19,N)+(R-.5)*.04;F=D(W,.44,H),O=D(E,.52,H),j=D(re,.38,H),J=D(.93-N*.08,.88,H),Z=0,I=Y(N*.82+R*.12+H*.08);break}case"foliage":{const V=(this.sampleBilinear(p,v*2,w*2)-.5)*5,_=(this.sampleBilinear(m,v*2+40,w*2+80)-.5)*5,L=this.sampleBilinear(g,v*4+V,w*4+_),R=this.sampleBilinear(y,v*4+V,w*4+_),N=this.sampleNearest(C,v*4+V,w*4+_),z=1-ce(0,.08,Math.abs(L-.22)),H=this.sampleFbm(m,v*6,w*6),W=ce(.02,.24,R)*(.65+.35*(1-L));F=(.09+N*.11+z*.07+H*.06)*W,O=(.28+N*.22+z*.11+H*.1)*W,j=(.07+N*.07+H*.04)*W,J=Y(.44+(1-W)*.32-z*.08),Z=0,I=Y(W*.72+z*.18+(H-.5)*.12);break}case"rock":{const V=this.sampleFbm(m,v*2,w*2),_=Math.sin((k*6+V*1.45)*Math.PI*2)*.5+.5,L=this.sampleBilinear(g,v*3+V*10,w*3+V*10),R=this.sampleBilinear(y,v*3+V*10,w*3+V*10),N=this.sampleBilinear(p,v*24,w*24),z=1-ce(.015,.075,R),H=Y((1-L*.75)*.55+_*.25+V*.2),W=N>.76?(N-.76)*.85:0,E=(.26+H*.32+W)*(1-z*.58);F=E*(.98+_*.05),O=E*.99,j=E*(1.03-_*.04),J=Y(.76-W*.45+z*.18+(.5-N)*.12),Z=Y(.03+W*.18),I=Y(H*.82+(N-.5)*.14-z*.42);break}case"sand":{const V=this.sampleFbm(p,v*2,w*2),_=(k*18+P*2+(V-.5)*2.2)*Math.PI*2,L=.5+.5*Math.sin(_+.38*Math.sin(_)),R=this.sampleBilinear(m,v*32,w*32),N=He(G*3+11,T*7+29),z=N>.985?(N-.985)/.015:0,H=.84+L*.16+(R-.5)*.08+(V-.5)*.08;F=Y(.78*H+z*.2),O=Y(.66*H+z*.2),j=Y(.47*H+z*.22),J=Y(.8-L*.06-z*.64),Z=z*.25,I=Y(.32+L*.46+(R-.5)*.12);break}case"rust":{const V=this.sampleFbm(p,v*2,w*2),_=this.sampleBilinear(m,v*2,w*16),L=this.sampleBilinear(g,v*6,w*6),R=ce(.38,.62,V*.72+(1-_)*.28),N=ce(.58,.84,V+L*.22),z=.48+(_-.5)*.18,H=z*.96,W=z*.99,E=z*1.05,re=D(.72,.34,N),ee=D(.31,.13,N),ie=D(.11,.07,N);F=D(H,re,R),O=D(W,ee,R),j=D(E,ie,R),J=D(.26+(1-_)*.12,.89+L*.08,R),Z=D(.9,.06,R),I=Y(D(.62+(_-.5)*.08,.38-L*.24,R));break}case"ship_wood":{const _=k*8,L=Math.floor(_),R=_-L,N=He(L&7,99),z=(P+N)%1,H=1-ce(.025,.065,Math.min(R,1-R)),W=1-ce(.004,.012,Math.min(z,1-z)),E=Math.max(H,W),re=Math.min(Math.abs(z-.032),Math.abs(z-.968)),ee=Math.min(Math.abs(R-.26),Math.abs(R-.74)),ie=Math.hypot(re*14,ee*2.2),K=1-ce(.09,.16,ie),me=He(L&7,13),ue=this.sampleBilinear(g,v*1+me*40,w*2),Ce=(1-ce(.05,.32,ue))*3.2,fe=this.sampleBilinear(p,v*2+me*100,w*20+Ce*8),xe=Math.sin((R*9+fe*3.5+Ce)*Math.PI*2)*.5+.5,ye=this.sampleBilinear(m,v*32,w*4),ge=.85+me*.3,Ie=(.34+xe*.14+(ye-.5)*.05)*ge,ze=(.23+xe*.1+(ye-.5)*.04)*ge,Le=(.14+xe*.06+(ye-.5)*.03)*ge;F=D(Ie,.06,E),O=D(ze,.055,E),j=D(Le,.05,E),K>.01&&(F=D(F,.32,K),O=D(O,.29,K),j=D(j,.24,K)),J=D(D(.68-xe*.1,.92,E),.34,K),Z=D(0,.84,K),I=Y(D(.58+xe*.14+(ye-.5)*.08,.14,E)+K*.22);break}case"carbon":{const _=P*64,L=k*64,R=Math.floor(_),N=Math.floor(L),z=_-R,H=L-N,E=(R+N&3)<2,re=E?Math.sin(z*Math.PI)*(.85+.15*Math.sin(H*Math.PI*.5)):Math.sin(H*Math.PI)*(.85+.15*Math.sin(z*Math.PI*.5)),ee=E?Math.sin(z*Math.PI*10)*.04:Math.sin(H*Math.PI*10)*.04,ie=this.sampleBilinear(y,v*4,w*4),K=(1-ce(.02,.07,ie))*.06,me=E?1.16:.84,ue=(.055+re*.095+ee)*me+K;F=ue*.96,O=ue*1,j=ue*1.08,J=Y((E?.2:.34)+(1-re)*.18),Z=Y(.52+re*.18),I=Y(.25+re*.62+ee+K);break}}d[Q]=I,i[B]=we(F),i[B+1]=we(O),i[B+2]=we(j),i[B+3]=255;const se=we(J);n[B]=se,n[B+1]=se,n[B+2]=se,n[B+3]=255;const pe=we(Z);r[B]=pe,r[B+1]=pe,r[B+2]=pe,r[B+3]=255,l[B]=we(A),l[B+1]=we(X),l[B+2]=we(ne),l[B+3]=255;const de=we(I);c[B]=de,c[B+1]=de,c[B+2]=de,c[B+3]=255}}const M=t-1,x=pt[e].sobelStrength;for(let T=0;T<t;T++){const k=(T-1&M)*t,w=T*t,U=(T+1&M)*t;for(let G=0;G<t;G++){const P=G-1&M,v=G+1&M,Q=d[k+P],B=d[k+G],F=d[k+v],O=d[w+P],j=d[w+v],J=d[U+P],Z=d[U+G],A=d[U+v],X=(F+2*j+A-(Q+2*O+J))*x,ne=(J+2*Z+A-(Q+2*B+F))*x,I=-X,se=-ne,pe=1,de=1/Math.sqrt(I*I+se*se+pe*pe),V=w+G<<2;a[V]=we(I*de*.5+.5),a[V+1]=we(se*de*.5+.5),a[V+2]=we(pe*de*.5+.5),a[V+3]=255}}return{name:e,map:this.createDataTexture(i,t,Ue),normalMap:this.createDataTexture(a,t,$e),roughnessMap:this.createDataTexture(n,t,$e),metalnessMap:this.createDataTexture(r,t,$e),emissiveMap:this.createDataTexture(l,t,Ue),bumpMap:this.createDataTexture(c,t,$e)}}}const hs=`
varying vec3 vWorldDir;

void main() {
  vWorldDir = normalize(position);
  vec4 rotViewPos = mat4(mat3(viewMatrix)) * vec4(position, 1.0);
  vec4 clipPos = projectionMatrix * rotViewPos;
  gl_Position = clipPos.xyww;
}
`,ds=`
uniform vec3 uSunDirection;
uniform float uTime;
uniform float uSpaceBlend;
uniform float uCloudCoverage;
uniform float uCloudDarkness;
uniform float uHaziness;
uniform float uPrecipitation;
uniform vec3 uWeatherTint;

varying vec3 vWorldDir;

const float PI = 3.14159265359;

float hash13(vec3 p3) {
  p3 = fract(p3 * 0.1031);
  p3 += dot(p3, p3.zyx + 31.32);
  return fract((p3.x + p3.y) * p3.z);
}

vec3 hash33(vec3 p3) {
  p3 = fract(p3 * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yxz + 33.33);
  return fract((p3.xxy + p3.yxx) * p3.zyx);
}

float noise3D(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);

  float n000 = hash13(i + vec3(0.0, 0.0, 0.0));
  float n100 = hash13(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash13(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash13(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash13(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash13(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash13(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash13(i + vec3(1.0, 1.0, 1.0));

  float nx00 = mix(n000, n100, f.x);
  float nx10 = mix(n010, n110, f.x);
  float nx01 = mix(n001, n101, f.x);
  float nx11 = mix(n011, n111, f.x);

  float nxy0 = mix(nx00, nx10, f.y);
  float nxy1 = mix(nx01, nx11, f.y);
  return mix(nxy0, nxy1, f.z);
}

float fbm3D(vec3 p) {
  float sum = 0.0;
  float amp = 0.5;
  mat3 rot = mat3(
    0.00,  0.80,  0.60,
   -0.80,  0.36, -0.48,
   -0.60, -0.48,  0.64
  );
  for (int i = 0; i < 4; i++) {
    sum += amp * noise3D(p);
    p = rot * p * 2.04 + vec3(13.7, 29.1, 7.3);
    amp *= 0.5;
  }
  return sum;
}

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float noise2D(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash12(i);
  float b = hash12(i + vec2(1.0, 0.0));
  float c = hash12(i + vec2(0.0, 1.0));
  float d = hash12(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float cloudFbm(vec2 p) {
  float v = 0.0;
  float a = 0.52;
  mat2 m = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 5; i++) {
    v += a * noise2D(p);
    p = m * p * 2.03 + vec2(17.1, 31.7);
    a *= 0.5;
  }
  return v;
}

vec3 starLayer(vec3 dir, float scale, float threshold, float twinkleAmt) {
  vec3 p = dir * scale;
  vec3 cell = floor(p);
  vec3 f = fract(p) - 0.5;
  vec3 rnd = hash33(cell);
  if (rnd.x < threshold) {
    return vec3(0.0);
  }
  vec3 starOffset = (rnd - 0.5) * 0.62;
  float dist = length(f - starOffset);
  float brightness = smoothstep(0.24, 0.0, dist);
  brightness = pow(brightness, 3.2) * ((rnd.x - threshold) / (1.0 - threshold));

  // Blackbody stellar chromaticity (O/B blue-white, A/G white-gold, K/M warm orange)
  vec3 hotStar = vec3(0.68, 0.82, 1.0);
  vec3 warmStar = vec3(1.0, 0.78, 0.52);
  vec3 starCol = mix(hotStar, warmStar, rnd.y);
  starCol = mix(starCol, vec3(1.0, 0.98, 0.95), 0.35);

  float twinkle = 1.0 + sin(uTime * (2.2 + rnd.z * 5.0) + rnd.x * 60.0) * twinkleAmt;
  return starCol * brightness * twinkle * 2.8;
}

vec3 evaluateCosmos(vec3 dir, float spaceFactor, float twinkleAmt) {
  // Galactic plane rotation for realistic tilted Milky Way band
  mat3 galRot = mat3(
    0.866, -0.354,  0.354,
    0.433,  0.884, -0.177,
   -0.250,  0.306,  0.919
  );
  vec3 gDir = galRot * dir;

  float galBand = exp(-abs(gDir.y) * 5.8);
  float galCore = exp(-length(vec2(gDir.x - 0.35, gDir.y * 2.2)) * 2.4);

  // Galactic star-clouds & dark dust rifts
  float starCloud = fbm3D(gDir * 3.8);
  float dustRift = smoothstep(0.42, 0.68, fbm3D(gDir * 6.5 + vec3(4.2, -1.8, 9.1)));
  float milkyLum = galBand * (0.35 + 0.95 * starCloud) * (1.0 - dustRift * 0.72) + galCore * 0.32;

  vec3 milkyCol = mix(vec3(0.32, 0.42, 0.68), vec3(0.95, 0.82, 0.64), galCore * 0.75 + starCloud * 0.35);
  vec3 cosmos = milkyCol * milkyLum * mix(0.55, 1.15, spaceFactor);

  // Colorful deep-space emission nebulae (H-alpha crimson/magenta, O-III cyan-teal, gold dust)
  vec3 nebWarp = gDir * 2.4 + vec3(fbm3D(gDir * 2.1) * 0.85);
  float nebA = smoothstep(0.48, 0.84, fbm3D(nebWarp + vec3(11.3, 4.7, -6.2)));
  float nebB = smoothstep(0.50, 0.86, fbm3D(nebWarp * 1.35 + vec3(-8.4, 15.1, 3.9)));
  float nebMask = mix(0.32, 1.0, spaceFactor) * (0.35 + 0.65 * galBand);

  vec3 hAlpha = vec3(0.76, 0.14, 0.44) * nebA;
  vec3 oIII = vec3(0.08, 0.56, 0.74) * nebB;
  vec3 goldDust = vec3(0.82, 0.48, 0.16) * (nebA * nebB * 1.4);
  cosmos += (hAlpha + oIII + goldDust) * nebMask * 0.78;

  // Multi-scale procedural 3D stars (zero UV pole artifacts)
  cosmos += starLayer(dir, 95.0, 0.915, twinkleAmt) * 1.35;
  cosmos += starLayer(dir, 210.0, 0.945, twinkleAmt * 0.6) * 0.75;

  return cosmos;
}

void main() {
  vec3 dir = normalize(vWorldDir);
  vec3 sunDir = normalize(uSunDirection);
  float mu = clamp(dot(dir, sunDir), -1.0, 1.0);
  float sunElev = sunDir.y;

  // Day/Twilight/Night factors
  float dayFactor = smoothstep(-0.08, 0.25, sunElev);
  float twilightFactor = exp(-pow((sunElev - 0.02) / 0.16, 2.0));
  float nightFactor = smoothstep(0.08, -0.22, sunElev);

  // Physical Rayleigh & Henyey-Greenstein Mie phase functions
  float phaseR = (3.0 / (16.0 * PI)) * (1.0 + mu * mu);
  float g = mix(0.76, 0.86, uHaziness);
  float g2 = g * g;
  float phaseM = (1.0 - g2) / (4.0 * PI * pow(max(1.0 + g2 - 2.0 * g * mu, 0.0002), 1.5));

  // Chapman-like horizon optical depth
  float viewElev = max(dir.y, 0.0);
  float horizonGlow = pow(1.0 - clamp(abs(dir.y), 0.0, 1.0), 4.2);
  float airMass = 1.0 / (viewElev + 0.14);

  // Rayleigh & Mie extinction + in-scattering palette
  vec3 betaR = vec3(0.065, 0.185, 0.465);
  vec3 extinction = exp(-betaR * airMass * mix(0.45, 1.15, 1.0 - dayFactor * 0.5));

  vec3 dayZenith = vec3(0.055, 0.195, 0.56);
  vec3 dayHorizon = vec3(0.36, 0.62, 0.90);
  vec3 nightZenith = vec3(0.004, 0.009, 0.026);
  vec3 nightHorizon = vec3(0.015, 0.028, 0.065);

  vec3 skyGrad = mix(
    mix(nightZenith, nightHorizon, horizonGlow),
    mix(dayZenith, dayHorizon, pow(1.0 - viewElev, 2.4)),
    dayFactor
  );

  // Rayleigh angular brightening
  skyGrad += betaR * phaseR * dayFactor * 0.85;

  // Golden/crimson twilight horizon & anti-solar Belt of Venus
  float sunAzimuthGlow = pow(max(mu, 0.0), 3.2) * 0.72 + 0.28;
  vec3 sunsetFire = mix(vec3(1.15, 0.32, 0.10), vec3(1.35, 0.68, 0.22), clamp(viewElev * 3.0, 0.0, 1.0));
  vec3 beltOfVenus = vec3(0.38, 0.20, 0.46) * pow(max(-mu, 0.0), 1.6) * exp(-pow((viewElev - 0.12) / 0.14, 2.0));
  skyGrad += sunsetFire * twilightFactor * horizonGlow * sunAzimuthGlow * 1.15;
  skyGrad += beltOfVenus * twilightFactor * 0.65;

  // Mie forward scatter haze & solar aureole
  vec3 mieTint = mix(vec3(1.0, 0.95, 0.86), vec3(1.25, 0.55, 0.24), twilightFactor);
  float mieStrength = (0.018 + uHaziness * 0.085) * (dayFactor * 0.85 + twilightFactor * 0.65);
  skyGrad += mieTint * min(phaseM, 18.0) * mieStrength * (1.0 - extinction * 0.35);

  // Weather overcast / fog / storm modulation
  float overcastAmt = clamp(uCloudDarkness * 0.75 + uHaziness * 0.45, 0.0, 0.92);
  float skyLum = dot(skyGrad, vec3(0.2126, 0.7152, 0.0722));
  vec3 overcastCol = uWeatherTint * mix(0.04, 0.55, dayFactor + twilightFactor * 0.35);
  skyGrad = mix(skyGrad, mix(vec3(skyLum), overcastCol, 0.72), overcastAmt);

  // Cosmic backdrop (stars, Milky Way, nebulae)
  float atmoStarVis = nightFactor * (1.0 - overcastAmt * 0.92) * smoothstep(-0.02, 0.18, dir.y);
  float cosmicVis = clamp(mix(atmoStarVis, 1.0, uSpaceBlend), 0.0, 1.0);
  vec3 cosmos = vec3(0.0);
  if (cosmicVis > 0.002) {
    float twinkle = (1.0 - uSpaceBlend) * 0.28;
    cosmos = evaluateCosmos(dir, uSpaceBlend, twinkle);
  }

  // Solar disc & corona (in both planetary sky and deep space)
  float sunDisc = smoothstep(0.99935, 0.99982, mu);
  float sunCorona = pow(max(mu, 0.0), 96.0) * 0.85 + pow(max(mu, 0.0), 12.0) * 0.14;
  float atmoSunVis = smoothstep(-0.06, 0.03, dir.y) * (1.0 - uCloudDarkness * 0.88);
  float sunVis = mix(atmoSunVis, 1.0, uSpaceBlend);
  vec3 sunColor = mix(vec3(1.4, 0.42, 0.12), vec3(1.0, 0.96, 0.88), clamp(smoothstep(-0.02, 0.32, sunElev) + uSpaceBlend, 0.0, 1.0));
  vec3 solarRadiance = sunColor * (sunDisc * 16.0 + sunCorona * 1.45) * sunVis;

  // Subtle Moon disc at night in planetary mode
  vec3 moonDir = normalize(vec3(-sunDir.x, -sunDir.y + 0.14, -sunDir.z + 0.16));
  float moonMu = clamp(dot(dir, moonDir), -1.0, 1.0);
  float moonDisc = smoothstep(0.99945, 0.99978, moonMu);
  float moonHalo = pow(max(moonMu, 0.0), 48.0) * 0.18;
  float moonVis = nightFactor * smoothstep(0.0, 0.08, dir.y) * (1.0 - uCloudDarkness * 0.85) * (1.0 - uSpaceBlend);
  vec3 lunarRadiance = vec3(0.72, 0.82, 1.0) * (moonDisc * 2.4 + moonHalo) * moonVis;

  // Volumetric FBM Clouds on curved atmospheric shell
  vec3 atmoColor = skyGrad + cosmos * atmoStarVis + solarRadiance * (1.0 - uSpaceBlend) + lunarRadiance;
  float cloudSpaceFade = 1.0 - smoothstep(0.10, 0.72, uSpaceBlend);

  if (dir.y > -0.03 && uCloudCoverage > 0.01 && cloudSpaceFade > 0.005) {
    float shellDist = 1.0 / max(dir.y + 0.12, 0.055);
    vec2 wind = vec2(uTime * 0.014, uTime * 0.006);
    vec2 cloudUv = dir.xz * shellDist * 0.85 + wind;

    float baseDensity = cloudFbm(cloudUv);
    float thresh = mix(0.68, 0.24, uCloudCoverage);
    float cloudAlpha = smoothstep(thresh, thresh + 0.26, baseDensity);

    // Directional derivative toward sun for volumetric self-shadowing & silver lining
    float sunSample = cloudFbm(cloudUv + sunDir.xz * 0.11 + vec2(0.04));
    float selfShadow = clamp((sunSample - baseDensity) * 2.6 + 0.35, 0.0, 1.0);
    float lightTerm = 1.0 - selfShadow * 0.78;
    float silverLining = pow(max(mu, 0.0), 6.0) * (1.0 - cloudAlpha * 0.55) * 0.85;

    vec3 cloudLitCol = mix(
      mix(vec3(0.06, 0.08, 0.13), vec3(1.12, 0.52, 0.26), twilightFactor),
      vec3(0.98, 0.97, 0.95),
      dayFactor
    );
    vec3 cloudShadowCol = mix(
      vec3(0.02, 0.03, 0.05),
      mix(vec3(0.42, 0.48, 0.58), vec3(0.16, 0.18, 0.23), uCloudDarkness),
      dayFactor + twilightFactor * 0.5
    );

    vec3 cloudCol = mix(cloudShadowCol, cloudLitCol, lightTerm) + sunColor * silverLining * (dayFactor + twilightFactor);
    float horizonFade = smoothstep(-0.02, 0.14, dir.y);
    float finalCloudMask = cloudAlpha * horizonFade * cloudSpaceFade * mix(0.82, 0.97, uCloudDarkness);
    atmoColor = mix(atmoColor, cloudCol, finalCloudMask);
  }

  // Precipitation atmospheric veil
  if (uPrecipitation > 0.01 && uSpaceBlend < 0.8) {
    float streak = noise2D(vec2(atan(dir.z, dir.x) * 28.0, dir.y * 18.0 + uTime * 3.8));
    vec3 veilCol = uWeatherTint * mix(0.08, 0.48, dayFactor + twilightFactor * 0.4);
    atmoColor = mix(atmoColor, veilCol, uPrecipitation * (0.22 + streak * 0.12) * (1.0 - uSpaceBlend));
  }

  // Lower planetary hemisphere subtle horizon ground bounce so reflections on cars/water are natural
  if (dir.y < 0.0) {
    float nadirT = smoothstep(0.0, -0.45, dir.y);
    vec3 groundBounce = mix(atmoColor, mix(vec3(0.015, 0.02, 0.03), vec3(0.11, 0.13, 0.16), dayFactor) * uWeatherTint, nadirT);
    atmoColor = groundBounce;
  }

  // Deep space full-360 blend for seamless surface-to-orbit transition in World 2
  vec3 spaceColor = cosmos + solarRadiance;
  vec3 finalColor = mix(atmoColor, spaceColor, uSpaceBlend);

  gl_FragColor = vec4(max(finalColor, vec3(0.0)), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;class us{sunLight;hemiLight;cascadeFillLight;sunDirection=new le(.45,.78,.43).normalize();skyMesh;fog;scene;skyMaterial;envScene;envSkyMesh;pmremGenerator=null;pmremRenderer=null;envRenderTarget=null;timeOfDay=10.5;weather="clear";weatherIntensity=1;spaceBlend=0;elapsedTime=0;shadowMapSize=2048;shadowExtent=95;shadowDistance=160;_activeLightDir=new le;_moonDir=new le;_lightRight=new le;_lightUp=new le;_snappedTarget=new le;_worldUp=new le(0,1,0);_fallbackUp=new le(0,0,1);_sunColor=new ae;_hemiSkyColor=new ae;_hemiGroundColor=new ae;_fogColor=new ae;_weatherTint=new ae(1,1,1);constructor(e,t){this.scene=e,typeof t=="number"&&(this.shadowMapSize=Math.max(512,Math.min(4096,Math.round(t)))),this.skyMaterial=new Ve({name:"OmniverseAtmosphereSky",vertexShader:hs,fragmentShader:ds,side:xt,depthWrite:!1,depthTest:!0,depthFunc:Ht,toneMapped:!0,fog:!1,uniforms:{uSunDirection:{value:this.sunDirection.clone()},uTime:{value:0},uSpaceBlend:{value:0},uCloudCoverage:{value:.22},uCloudDarkness:{value:.08},uHaziness:{value:.12},uPrecipitation:{value:0},uWeatherTint:{value:new ae(1,1,1)}}});const o=new Se(60,48,32);this.skyMesh=new b(o,this.skyMaterial),this.skyMesh.name="AtmosphereSkyDome",this.skyMesh.frustumCulled=!1,this.skyMesh.renderOrder=-1e3,this.scene.add(this.skyMesh),this.sunLight=new lt(16774368,2.6),this.sunLight.name="AtmosphereSunLight",this.sunLight.castShadow=!0,this.sunLight.shadow.mapSize.set(this.shadowMapSize,this.shadowMapSize),this.sunLight.shadow.camera.near=1,this.sunLight.shadow.camera.far=360,this.sunLight.shadow.camera.left=-this.shadowExtent,this.sunLight.shadow.camera.right=this.shadowExtent,this.sunLight.shadow.camera.top=this.shadowExtent,this.sunLight.shadow.camera.bottom=-this.shadowExtent,this.sunLight.shadow.bias=-35e-5,this.sunLight.shadow.normalBias=.035,this.sunLight.shadow.camera.updateProjectionMatrix(),this.scene.add(this.sunLight),this.scene.add(this.sunLight.target),this.cascadeFillLight=new lt(9222399,.42),this.cascadeFillLight.name="AtmosphereCascadeFillLight",this.cascadeFillLight.castShadow=!1,this.scene.add(this.cascadeFillLight),this.scene.add(this.cascadeFillLight.target),this.hemiLight=new Gt(8896255,3880236,.72),this.hemiLight.name="AtmosphereHemiLight",this.scene.add(this.hemiLight),this.fog=new Vt(10405352,45e-5),this.scene.fog=this.fog,this.envScene=new Mt;const s=new Se(40,24,16);this.envSkyMesh=new b(s,this.skyMaterial),this.envSkyMesh.frustumCulled=!1,this.envScene.add(this.envSkyMesh),this.recomputeAtmosphereState(),t&&typeof t!="number"&&this.refreshEnvironmentMap(t)}setShadowMapSize(e){const t=Math.max(512,Math.min(4096,Math.round(e)));t!==this.shadowMapSize&&(this.shadowMapSize=t,this.sunLight.shadow.mapSize.set(t,t),this.sunLight.shadow.map&&(this.sunLight.shadow.map.dispose(),this.sunLight.shadow.map=null))}setTimeOfDay(e){const t=(e%24+24)%24;this.timeOfDay=t,this.recomputeAtmosphereState()}getTimeOfDay(){return this.timeOfDay}setWeather(e,t=1){this.weather=e,this.weatherIntensity=Math.max(0,Math.min(1,t)),this.recomputeAtmosphereState()}getWeather(){return this.weather}setSpaceBlend(e){this.spaceBlend=Math.max(0,Math.min(1,e)),this.recomputeAtmosphereState()}getSpaceBlend(){return this.spaceBlend}update(e,t){this.elapsedTime+=e,this.skyMaterial.uniforms.uTime.value=this.elapsedTime,this.skyMesh.position.copy(t);const o=this.sunDirection.y;this.spaceBlend>.65||o>=-.04?(this._activeLightDir.copy(this.sunDirection),this.spaceBlend<=.65&&this._activeLightDir.y<.06&&(this._activeLightDir.y=.06,this._activeLightDir.normalize())):(this._moonDir.set(-this.sunDirection.x,-this.sunDirection.y+.14,-this.sunDirection.z+.16).normalize(),this._moonDir.y<.12&&(this._moonDir.y=.12,this._moonDir.normalize()),this._activeLightDir.copy(this._moonDir));const s=Math.abs(this._activeLightDir.y)>.98?this._fallbackUp:this._worldUp;this._lightRight.crossVectors(s,this._activeLightDir).normalize(),this._lightUp.crossVectors(this._activeLightDir,this._lightRight).normalize();const i=this.shadowExtent*2/this.shadowMapSize,a=Math.round(t.dot(this._lightRight)/i)*i,n=Math.round(t.dot(this._lightUp)/i)*i,r=t.dot(this._activeLightDir);this._snappedTarget.set(0,0,0).addScaledVector(this._lightRight,a).addScaledVector(this._lightUp,n).addScaledVector(this._activeLightDir,r),this.sunLight.target.position.copy(this._snappedTarget),this.sunLight.target.updateMatrixWorld(),this.sunLight.position.copy(this._snappedTarget).addScaledVector(this._activeLightDir,this.shadowDistance),this.cascadeFillLight.position.set(t.x-this._activeLightDir.x*80,t.y+90,t.z-this._activeLightDir.z*80),this.cascadeFillLight.target.position.copy(t),this.cascadeFillLight.target.updateMatrixWorld()}refreshEnvironmentMap(e){(!this.pmremGenerator||this.pmremRenderer!==e)&&(this.pmremGenerator&&this.pmremGenerator.dispose(),this.pmremGenerator=new zt(e),this.pmremGenerator.compileCubemapShader(),this.pmremRenderer=e);const t=this.envRenderTarget;this.envRenderTarget=this.pmremGenerator.fromScene(this.envScene,.02,.1,150),this.scene.environment=this.envRenderTarget.texture,t&&t.dispose()}dispose(){this.scene.remove(this.skyMesh),this.scene.remove(this.sunLight),this.scene.remove(this.sunLight.target),this.scene.remove(this.cascadeFillLight),this.scene.remove(this.cascadeFillLight.target),this.scene.remove(this.hemiLight),this.skyMesh.geometry.dispose(),this.envSkyMesh.geometry.dispose(),this.skyMaterial.dispose(),this.sunLight.shadow.map&&this.sunLight.shadow.map.dispose(),this.envRenderTarget&&(this.scene.environment===this.envRenderTarget.texture&&(this.scene.environment=null),this.envRenderTarget.dispose(),this.envRenderTarget=null),this.pmremGenerator&&(this.pmremGenerator.dispose(),this.pmremGenerator=null)}recomputeAtmosphereState(){const e=(this.timeOfDay-6)/24*Math.PI*2,t=.34,o=Math.sin(e),s=Math.cos(e);this.sunDirection.set(s*Math.cos(t),o,s*Math.sin(t)+.22).normalize(),this.skyMaterial.uniforms.uSunDirection.value.copy(this.sunDirection);const a=this.weatherIntensity;let n=.2,r=.06,l=.12,c=0,d=42e-5;switch(this._weatherTint.setRGB(1,1,1),this.weather){case"clear":n=.18,r=.05,l=.1,c=0,d=38e-5;break;case"cloudy":n=.22+.56*a,r=.1+.35*a,l=.16+.28*a,c=0,d=45e-5+75e-5*a,this._weatherTint.setRGB(.9,.93,.98);break;case"rain":n=.45+.48*a,r=.35+.45*a,l=.35+.45*a,c=.65*a,d=65e-5+.0022*a,this._weatherTint.setRGB(.72,.8,.9);break;case"snow":n=.42+.5*a,r=.18+.26*a,l=.45+.45*a,c=.78*a,d=8e-4+.003*a,this._weatherTint.setRGB(.92,.95,1);break;case"fog":n=.35+.45*a,r=.15+.25*a,l=.6+.38*a,c=.15*a,d=.0012+.0072*a,this._weatherTint.setRGB(.86,.9,.94);break;case"storm":n=.65+.33*a,r=.55+.4*a,l=.5+.42*a,c=.92*a,d=.001+.0038*a,this._weatherTint.setRGB(.58,.66,.78);break}this.skyMaterial.uniforms.uSpaceBlend.value=this.spaceBlend,this.skyMaterial.uniforms.uCloudCoverage.value=n,this.skyMaterial.uniforms.uCloudDarkness.value=r,this.skyMaterial.uniforms.uHaziness.value=l,this.skyMaterial.uniforms.uPrecipitation.value=c,this.skyMaterial.uniforms.uWeatherTint.value.copy(this._weatherTint);const h=this.sunDirection.y,u=be.smoothstep(h,-.06,.3),p=Math.exp(-Math.pow((h-.02)/.16,2)),m=1-be.smoothstep(h,-.2,.06),g=1-r*.62;if(this.spaceBlend>.75)this._sunColor.setRGB(1,.98,.94),this.sunLight.color.copy(this._sunColor),this.sunLight.intensity=be.lerp(2.4,3.2,this.spaceBlend);else if(h>=-.04){this._sunColor.setRGB(1,.48,.2).lerp(new ae(1,.96,.89),u),this._sunColor.multiply(this._weatherTint),this.sunLight.color.copy(this._sunColor);const M=be.smoothstep(h,-.04,.06);this.sunLight.intensity=(.35+2.45*u+.55*p)*g*M}else{const M=be.smoothstep(-h,.04,.18);this.sunLight.color.setRGB(.62,.76,1).multiply(this._weatherTint),this.sunLight.intensity=.32*M*g}this._hemiSkyColor.setRGB(.08,.13,.26).lerp(new ae(.54,.75,1),u),p>.01&&this._hemiSkyColor.lerp(new ae(.86,.48,.34),p*.48),this._hemiSkyColor.multiply(this._weatherTint),this._hemiGroundColor.setRGB(.03,.035,.05).lerp(new ae(.24,.21,.17),u),this.hemiLight.color.copy(this._hemiSkyColor),this.hemiLight.groundColor.copy(this._hemiGroundColor),this.hemiLight.intensity=be.lerp((.28+.56*u)*(1-r*.25),.16,this.spaceBlend),this.cascadeFillLight.color.copy(this._hemiSkyColor),this.cascadeFillLight.intensity=be.lerp(.14+.32*u+.12*m,.08,this.spaceBlend),this._fogColor.setRGB(.025,.04,.085).lerp(new ae(.62,.79,.95),u),p>.01&&this._fogColor.lerp(new ae(.92,.5,.28),p*.62),this._fogColor.multiply(this._weatherTint),this._fogColor.multiplyScalar(1-this.spaceBlend),this.fog.color.copy(this._fogColor);const y=Math.pow(Math.max(0,1-this.spaceBlend),2.6),C=1+m*.22;this.fog.density=this.spaceBlend>=.995?0:d*C*y}}const Et=`
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,ps=`
uniform sampler2D tDiffuse;
uniform sampler2D tDepth;
uniform vec2 uResolution;
uniform float uCameraNear;
uniform float uCameraFar;
uniform float uRadius;
uniform float uAOIntensity;

varying vec2 vUv;

float linearizeDepth(float rawDepth) {
  float z = rawDepth * 2.0 - 1.0;
  return (2.0 * uCameraNear * uCameraFar) /
    max(uCameraFar + uCameraNear - z * (uCameraFar - uCameraNear), 0.0001);
}

float interleavedGradientNoise(vec2 pixelCoord) {
  return fract(52.9829189 * fract(dot(pixelCoord, vec2(0.06711056, 0.00583715))));
}

void main() {
  vec4 baseCol = texture2D(tDiffuse, vUv);
  float rawCenter = texture2D(tDepth, vUv).r;

  // Skip sky dome & far clear plane completely
  if (rawCenter >= 0.99992) {
    gl_FragColor = baseCol;
    return;
  }

  float dC = linearizeDepth(rawCenter);
  if (dC > 240.0) {
    gl_FragColor = baseCol;
    return;
  }

  vec2 texel = 1.0 / max(uResolution, vec2(1.0));

  // Edge-preserving local depth slope estimation (avoids silhouette halos)
  float dL = linearizeDepth(texture2D(tDepth, vUv - vec2(texel.x, 0.0)).r);
  float dR = linearizeDepth(texture2D(tDepth, vUv + vec2(texel.x, 0.0)).r);
  float dD = linearizeDepth(texture2D(tDepth, vUv - vec2(0.0, texel.y)).r);
  float dU = linearizeDepth(texture2D(tDepth, vUv + vec2(0.0, texel.y)).r);

  float slopeX = (abs(dR - dC) < abs(dC - dL)) ? (dR - dC) : (dC - dL);
  float slopeY = (abs(dU - dC) < abs(dC - dD)) ? (dU - dC) : (dC - dD);

  float rotAngle = interleavedGradientNoise(gl_FragCoord.xy) * 6.2831853;
  float cosA = cos(rotAngle);
  float sinA = sin(rotAngle);
  mat2 rot = mat2(cosA, -sinA, sinA, cosA);

  // Perspective-scaled screen-space radius in pixels
  float radiusPx = clamp((uRadius * uResolution.y * 0.45) / max(dC, 0.75), 2.0, 26.0);
  float bias = 0.025 + dC * 0.0022;
  float occlusion = 0.0;

  // 8-tap Golden-Angle Vogel spiral
  for (int i = 0; i < 8; i++) {
    float fi = float(i) + 0.5;
    float r = sqrt(fi / 8.0);
    float theta = fi * 2.39996323;
    vec2 dir = rot * vec2(cos(theta), sin(theta));
    vec2 offsetPx = dir * (r * radiusPx);
    vec2 sampleUv = clamp(vUv + offsetPx * texel, vec2(0.001), vec2(0.999));

    float rawSample = texture2D(tDepth, sampleUv).r;
    if (rawSample >= 0.99992) {
      continue;
    }

    float sampleZ = linearizeDepth(rawSample);
    float expectedZ = dC + slopeX * offsetPx.x + slopeY * offsetPx.y;
    float deltaZ = expectedZ - sampleZ;

    float rangeCheck = smoothstep(0.0, 1.0, (uRadius * 2.6) / (abs(dC - sampleZ) + 0.05));
    float sampleOcc = (deltaZ > bias ? smoothstep(bias, bias + 0.45, deltaZ) : 0.0) * rangeCheck;
    occlusion += sampleOcc;
  }

  occlusion /= 8.0;
  float distFade = 1.0 - smoothstep(110.0, 240.0, dC);
  float luminance = dot(baseCol.rgb, vec3(0.2126, 0.7152, 0.0722));
  // Preserve HDR highlights and emissive light sources
  float highlightProtect = 1.0 - smoothstep(0.65, 2.2, luminance) * 0.80;
  float aoFactor = 1.0 - clamp(occlusion * uAOIntensity * distFade * highlightProtect, 0.0, 0.72);

  gl_FragColor = vec4(baseCol.rgb * aoFactor, baseCol.a);
}
`,ms={name:"CinematicOpticsShader",uniforms:{tDiffuse:{value:null},uExposure:{value:1.05},uSpeedFactor:{value:0},uEnableChromatic:{value:1},uVignetteStrength:{value:.34}},vertexShader:Et,fragmentShader:`
    uniform sampler2D tDiffuse;
    uniform float uExposure;
    uniform float uSpeedFactor;
    uniform float uEnableChromatic;
    uniform float uVignetteStrength;

    varying vec2 vUv;

    // Stephen Hill's ACES Filmic RRT + ODT fit (matches Three.js ACESFilmicToneMapping)
    vec3 RRTAndODTFit(vec3 v) {
      vec3 a = v * (v + 0.0245786) - 0.000090537;
      vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;
      return a / b;
    }

    vec3 acesFilmic(vec3 color) {
      // sRGB / Rec.709 -> ACES AP1 (transposed column-major for GLSL mat3)
      const mat3 ACESInputMat = mat3(
        0.59719, 0.07600, 0.02840,
        0.35458, 0.90834, 0.13383,
        0.04823, 0.01566, 0.83777
      );
      // ACES AP1 -> sRGB / Rec.709
      const mat3 ACESOutputMat = mat3(
         1.60475, -0.10208, -0.00327,
        -0.53108,  1.10813, -0.07276,
        -0.07367, -0.00605,  1.07602
      );

      color *= 1.0 / 0.6;
      color = ACESInputMat * color;
      color = RRTAndODTFit(color);
      color = ACESOutputMat * color;
      return clamp(color, 0.0, 1.0);
    }

    vec3 linearToSRGB(vec3 linearRGB) {
      vec3 higher = pow(max(linearRGB, vec3(0.0)), vec3(1.0 / 2.4)) * 1.055 - 0.055;
      vec3 lower = max(linearRGB, vec3(0.0)) * 12.92;
      return mix(higher, lower, vec3(
        linearRGB.r <= 0.0031308 ? 1.0 : 0.0,
        linearRGB.g <= 0.0031308 ? 1.0 : 0.0,
        linearRGB.b <= 0.0031308 ? 1.0 : 0.0
      ));
    }

    void main() {
      vec2 centered = vUv - 0.5;
      float r2 = dot(centered, centered);

      vec3 hdrColor;
      if (uEnableChromatic > 0.5) {
        // Subtle optical dispersion at rest + dynamic radial shift at high vehicular/Mach/warp speed
        float caStrength = 0.0018 + uSpeedFactor * 0.024;
        vec2 disp = centered * r2 * caStrength;
        vec2 uvR = clamp(vUv + disp, vec2(0.001), vec2(0.999));
        vec2 uvB = clamp(vUv - disp, vec2(0.001), vec2(0.999));
        float r = texture2D(tDiffuse, uvR).r;
        float g = texture2D(tDiffuse, vUv).g;
        float b = texture2D(tDiffuse, uvB).b;
        hdrColor = vec3(r, g, b);
      } else {
        hdrColor = texture2D(tDiffuse, vUv).rgb;
      }

      // Apply renderer exposure & ACES Filmic curve
      vec3 mapped = acesFilmic(max(hdrColor, vec3(0.0)) * uExposure);

      // Subtle cinematic S-curve contrast & saturation polish
      mapped = mix(mapped, mapped * mapped * (3.0 - 2.0 * mapped), 0.14);
      float luma = dot(mapped, vec3(0.2126, 0.7152, 0.0722));
      mapped = clamp(mix(vec3(luma), mapped, 1.06), 0.0, 1.0);

      // Natural optical lens vignette (slightly intensified under high-G speed)
      float vigAmount = uVignetteStrength + uSpeedFactor * 0.16;
      float vignette = clamp(1.0 - r2 * (vigAmount * 2.2), 0.25, 1.0);
      mapped *= vignette;

      gl_FragColor = vec4(linearToSRGB(mapped), 1.0);
    }
  `};class fs extends kt{camera;constructor(e,t,o){super({name:"OmniverseDepthSSAOPass",uniforms:{tDiffuse:{value:null},tDepth:{value:null},uResolution:{value:new qe(t,o)},uCameraNear:{value:e.near},uCameraFar:{value:e.far},uRadius:{value:.85},uAOIntensity:{value:1.15}},vertexShader:Et,fragmentShader:ps}),this.camera=e,this.material.toneMapped=!1}setCamera(e){this.camera=e}setSize(e,t){this.uniforms.uResolution.value.set(e,t)}render(e,t,o,s,i){this.uniforms.tDepth.value=o.depthTexture,this.uniforms.uCameraNear.value=this.camera.near,this.uniforms.uCameraFar.value=this.camera.far,super.render(e,t,o,s??0,i??!1)}}class gs{renderer;scene;camera;composer;renderPass;ssaoPass;bloomPass;opticsPass;targetSpeedFactor=0;smoothedSpeedFactor=0;bypassComposer=!1;logicalWidth=1280;logicalHeight=720;currentPixelRatio=1;constructor(e,t,o,s){this.renderer=e,this.scene=t,this.camera=o,this.renderer.toneMapping=St,this.renderer.toneMappingExposure=1.05,this.renderer.outputColorSpace=Ue,this.renderer.shadowMap.enabled=!0,this.renderer.shadowMap.type=Ct;const i=this.renderer.getSize(new qe);this.logicalWidth=Math.max(1,i.width),this.logicalHeight=Math.max(1,i.height),this.currentPixelRatio=this.renderer.getPixelRatio(),this.composer=new Ot(this.renderer),this.attachDepthTexture(this.composer.renderTarget1),this.attachDepthTexture(this.composer.renderTarget2);const a=Math.max(1,Math.floor(this.logicalWidth*this.currentPixelRatio)),n=Math.max(1,Math.floor(this.logicalHeight*this.currentPixelRatio));this.renderPass=new Nt(this.scene,this.camera),this.composer.addPass(this.renderPass),this.ssaoPass=new fs(this.camera,a,n),this.composer.addPass(this.ssaoPass),this.bloomPass=new Wt(new qe(a,n),.34,.52,.88),this.composer.addPass(this.bloomPass),this.opticsPass=new kt(ms),this.opticsPass.material.toneMapped=!1,this.composer.addPass(this.opticsPass),s&&this.applyQuality(s)}attachDepthTexture(e){const t=new _t(e.width,e.height);t.format=qt,t.type=Ut,t.minFilter=ct,t.magFilter=ct,t.generateMipmaps=!1,e.depthBuffer=!0,e.depthTexture=t}setSceneAndCamera(e,t){this.scene=e,this.camera=t,this.renderPass.scene=e,this.renderPass.camera=t,this.ssaoPass.setCamera(t)}setSpeedFactor(e){this.targetSpeedFactor=Math.max(0,Math.min(1,e))}applyQuality(e){this.currentPixelRatio=e.pixelRatio,this.renderer.setPixelRatio(e.pixelRatio),this.composer.setPixelRatio(e.pixelRatio),this.composer.setSize(this.logicalWidth,this.logicalHeight),this.ssaoPass.enabled=e.enableSSAO,this.bloomPass.enabled=e.enableBloom,this.opticsPass.uniforms.uEnableChromatic.value=e.enableChromatic?1:0,e.preset==="ULTRA"?(this.ssaoPass.uniforms.uAOIntensity.value=1.2,this.bloomPass.strength=.36):e.preset==="HIGH"?(this.ssaoPass.uniforms.uAOIntensity.value=1,this.bloomPass.strength=.3):(this.ssaoPass.uniforms.uAOIntensity.value=.85,this.bloomPass.strength=.24),this.bypassComposer=e.preset==="MOBILE_PERF"&&!e.enableBloom&&!e.enableSSAO&&!e.enableChromatic;const t=Math.max(512,Math.min(4096,Math.round(e.shadowMapSize)));this.scene.traverse(o=>{if(o.isLight){const s=o;s.castShadow&&s.shadow&&(s.shadow.mapSize.x!==t||s.shadow.mapSize.y!==t)&&(s.shadow.mapSize.set(t,t),s.shadow.map&&(s.shadow.map.dispose(),s.shadow.map=null))}})}setSize(e,t,o){this.logicalWidth=Math.max(1,Math.floor(e)),this.logicalHeight=Math.max(1,Math.floor(t)),this.currentPixelRatio=Math.max(.5,o),this.renderer.setPixelRatio(this.currentPixelRatio),this.renderer.setSize(this.logicalWidth,this.logicalHeight,!1),this.composer.setPixelRatio(this.currentPixelRatio),this.composer.setSize(this.logicalWidth,this.logicalHeight)}render(e){const t=Math.max(0,Math.min(.1,e)),o=1-Math.exp(-t*8);if(this.smoothedSpeedFactor+=(this.targetSpeedFactor-this.smoothedSpeedFactor)*o,this.bypassComposer){this.renderer.render(this.scene,this.camera);return}this.opticsPass.uniforms.uSpeedFactor.value=this.smoothedSpeedFactor,this.opticsPass.uniforms.uExposure.value=this.renderer.toneMappingExposure,this.composer.render(t)}dispose(){this.composer.renderTarget1.depthTexture?.dispose(),this.composer.renderTarget2.depthTexture?.dispose(),this.ssaoPass.dispose(),this.bloomPass.dispose(),this.opticsPass.dispose(),this.composer.dispose()}}const Pt=[{steepness:.24,wavelength:48,dirX:.88,dirZ:.47,speed:1.05},{steepness:.18,wavelength:26,dirX:.42,dirZ:-.91,speed:1.12},{steepness:.14,wavelength:13.5,dirX:-.76,dirZ:.65,speed:1.18},{steepness:.1,wavelength:6.8,dirX:.25,dirZ:.97,speed:1.25}],vs=9.81,ws=Math.PI*2;function ft(f,e,t,o){let s=0,i=0,a=0,n=1,r=0,l=0,c=0,d=0,h=1;const u=Math.min(4,o.length);for(let C=0;C<u;C++){const M=o[C],x=Math.hypot(M.dirX,M.dirZ)||1,T=M.dirX/x,k=M.dirZ/x,w=Math.max(.5,M.wavelength),U=ws/w,G=Math.sqrt(vs*U)*M.speed,P=M.steepness,v=P/U,Q=U*(T*f+k*e)-G*t,B=Math.sin(Q),F=Math.cos(Q);s+=T*v*F,i+=v*B,a+=k*v*F,n-=P*T*T*B,r+=P*T*F,l-=P*T*k*B,c-=P*T*k*B,d+=P*k*F,h-=P*k*k*B}const p=d*l-h*r,m=h*n-c*l,g=c*r-d*n,y=1/(Math.hypot(p,m,g)||1);return{dx:s,dy:i,dz:a,nx:p*y,ny:m*y,nz:g*y}}function Zs(f,e,t,o=Pt){let s=f,i=e;for(let n=0;n<2;n++){const r=ft(s,i,t,o);s=f-r.dx,i=e-r.dz}const a=ft(s,i,t,o);return{height:a.dy,normal:new le(a.nx,a.ny,a.nz)}}function ys(f){const e=[],t=[0,0,0,0];for(let o=0;o<4;o++){const s=f[o]??{steepness:0,wavelength:10,dirX:1,dirZ:0,speed:1},i=Math.hypot(s.dirX,s.dirZ)||1;e.push(new ht(s.dirX/i,s.dirZ/i,s.steepness,Math.max(.5,s.wavelength))),t[o]=s.speed}return{waveDirSteepLen:e,waveSpeedVec:new ht(t[0],t[1],t[2],t[3])}}const bs=`
uniform float uTime;
uniform vec4 uWaves[4]; // xy = normalized dir, z = steepness, w = wavelength
uniform vec4 uWaveSpeeds;

varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying float vWaveHeight;
varying float vJacobianFoam;

const float TWO_PI = 6.28318530718;
const float GRAVITY = 9.81;

void main() {
  #ifdef USE_INSTANCING
    vec4 worldBase = modelMatrix * instanceMatrix * vec4(position, 1.0);
  #else
    vec4 worldBase = modelMatrix * vec4(position, 1.0);
  #endif

  vec2 restXZ = worldBase.xz;
  vec3 disp = vec3(0.0);

  vec3 dPdx = vec3(1.0, 0.0, 0.0);
  vec3 dPdz = vec3(0.0, 0.0, 1.0);
  float jacobianDiag = 1.0;

  for (int i = 0; i < 4; i++) {
    vec4 w = uWaves[i];
    float speed = (i == 0) ? uWaveSpeeds.x : (i == 1) ? uWaveSpeeds.y : (i == 2) ? uWaveSpeeds.z : uWaveSpeeds.w;
    vec2 dir = w.xy;
    float q = w.z;
    float k = TWO_PI / max(w.w, 0.5);
    float omega = sqrt(GRAVITY * k) * speed;
    float amp = q / k;

    float phase = k * dot(dir, restXZ) - omega * uTime;
    float s = sin(phase);
    float c = cos(phase);

    disp.x += dir.x * amp * c;
    disp.y += amp * s;
    disp.z += dir.y * amp * c;

    dPdx.x -= q * dir.x * dir.x * s;
    dPdx.y += q * dir.x * c;
    dPdx.z -= q * dir.x * dir.y * s;

    dPdz.x -= q * dir.x * dir.y * s;
    dPdz.y += q * dir.y * c;
    dPdz.z -= q * dir.y * dir.y * s;

    jacobianDiag -= q * s * 0.45;
  }

  vec3 worldPos = worldBase.xyz + disp;
  vec3 analyticalNormal = normalize(cross(dPdz, dPdx));

  vWorldPos = worldPos;
  vWorldNormal = analyticalNormal;
  vWaveHeight = disp.y;
  vJacobianFoam = clamp(1.0 - jacobianDiag, 0.0, 1.0);

  gl_Position = projectionMatrix * viewMatrix * vec4(worldPos, 1.0);
}
`,xs=`
uniform float uTime;
uniform vec3 uSunDirection;
uniform vec3 uCameraPos;
uniform vec3 uDeepColor;
uniform vec3 uShallowColor;

varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying float vWaveHeight;
varying float vJacobianFoam;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float noise2D(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash12(i);
  float b = hash12(i + vec2(1.0, 0.0));
  float c = hash12(i + vec2(0.0, 1.0));
  float d = hash12(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm2D(vec2 p) {
  float sum = 0.0;
  float amp = 0.5;
  mat2 rot = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 4; i++) {
    sum += amp * noise2D(p);
    p = rot * p * 2.05 + vec2(19.3, 41.7);
    amp *= 0.5;
  }
  return sum;
}

// Animated dual-grid cellular caustics pattern
float causticsPattern(vec2 uv, float t) {
  vec2 p1 = uv * 0.55 + vec2(t * 0.18, -t * 0.14);
  vec2 p2 = uv * 0.72 + vec2(-t * 0.15, t * 0.21);
  float n1 = abs(noise2D(p1 * 3.2) - 0.5) * 2.0;
  float n2 = abs(noise2D(p2 * 3.6 + vec2(7.4, 3.1)) - 0.5) * 2.0;
  float ridges = pow(1.0 - min(n1, n2), 4.5);
  return ridges;
}

void main() {
  vec3 viewVec = uCameraPos - vWorldPos;
  float dist = length(viewVec);
  vec3 V = viewVec / max(dist, 0.0001);
  vec3 L = normalize(uSunDirection);

  // Fine capillary micro-ripples attenuated over distance to avoid aliasing
  float microFade = 1.0 - smoothstep(25.0, 260.0, dist);
  vec2 wp = vWorldPos.xz;
  float r1 = noise2D(wp * 1.45 + vec2(uTime * 0.85, uTime * 0.42));
  float r2 = noise2D(wp * 3.10 - vec2(uTime * 0.62, uTime * 0.95));
  vec3 ripplePerturb = vec3((r1 - 0.5) * 0.18 + (r2 - 0.5) * 0.10, 0.0, (r2 - 0.5) * 0.18 - (r1 - 0.5) * 0.10) * microFade;

  vec3 N = normalize(vWorldNormal + ripplePerturb);
  float NdotV = max(dot(N, V), 0.001);
  float NdotL = max(dot(N, L), 0.0);

  // Schlick Fresnel (water IOR 1.333 -> F0 = 0.02)
  float fresnel = 0.02 + 0.98 * pow(1.0 - NdotV, 5.0);

  // Sky reflection gradient adapting to sun elevation
  float sunElev = L.y;
  float dayAmt = smoothstep(-0.08, 0.28, sunElev);
  float sunsetAmt = exp(-pow((sunElev - 0.02) / 0.16, 2.0));
  vec3 reflDir = reflect(-V, N);
  float reflUp = clamp(reflDir.y, 0.0, 1.0);

  vec3 skyZenith = mix(vec3(0.01, 0.02, 0.06), vec3(0.08, 0.28, 0.65), dayAmt);
  vec3 skyHorizon = mix(vec3(0.03, 0.05, 0.11), vec3(0.46, 0.72, 0.94), dayAmt);
  skyHorizon += vec3(1.05, 0.42, 0.14) * sunsetAmt * 0.85;
  vec3 skyReflection = mix(skyHorizon, skyZenith, pow(reflUp, 0.65));

  // Depth absorption & translucent emerald wave-crest subsurface scattering
  float shallowMix = clamp(pow(1.0 - NdotV, 1.8) * 0.35 + smoothstep(-0.8, 1.8, vWaveHeight) * 0.45, 0.0, 1.0);
  vec3 waterBody = mix(uDeepColor, uShallowColor, shallowMix) * (0.22 + 0.78 * dayAmt + 0.18 * sunsetAmt);

  float backLight = pow(max(dot(V, -L + N * 0.55), 0.0), 3.2);
  float crestMask = smoothstep(0.15, 1.65, vWaveHeight);
  vec3 sssColor = uShallowColor * 1.65 * backLight * (0.35 + 0.65 * crestMask) * max(dayAmt, sunsetAmt * 0.6);

  // Procedural underwater solar caustics
  float caustics = causticsPattern(wp + N.xz * 1.4, uTime) * NdotL * (1.0 - smoothstep(15.0, 140.0, dist));
  waterBody += uShallowColor * caustics * 0.55 * dayAmt;

  vec3 color = mix(waterBody + sssColor, skyReflection, clamp(fresnel, 0.0, 0.92));

  // Dual-lobe solar specular glitter (tight diamond sparkles + warm sun path)
  vec3 H = normalize(L + V);
  float NdotH = max(dot(N, H), 0.0);
  float sunVis = smoothstep(-0.04, 0.08, sunElev);
  vec3 sunSpecTint = mix(vec3(1.2, 0.52, 0.22), vec3(1.0, 0.97, 0.90), dayAmt);
  float specSharp = pow(NdotH, 340.0) * 4.2;
  float specBroad = pow(NdotH, 36.0) * 0.24;
  color += sunSpecTint * (specSharp + specBroad) * sunVis;

  // Turbulent crest & shoreline whitecap foam
  float foamTex = fbm2D(wp * 0.48 + vec2(uTime * 0.16, -uTime * 0.12));
  float slopeSteep = 1.0 - clamp(vWorldNormal.y, 0.0, 1.0);
  float crestSignal = smoothstep(0.52, 1.45, vWaveHeight + slopeSteep * 1.9 + vJacobianFoam * 0.65);
  float lacyFoam = smoothstep(0.42, 0.72, crestSignal * 0.75 + foamTex * 0.52) * crestSignal;
  vec3 foamColor = mix(vec3(0.18, 0.22, 0.30), vec3(0.95, 0.97, 1.0), dayAmt + sunsetAmt * 0.4);
  color = mix(color, foamColor, clamp(lacyFoam * 0.88, 0.0, 0.92));

  // Aerial perspective horizon blend
  float haze = 1.0 - exp(-dist * 0.00045);
  color = mix(color, skyHorizon, clamp(haze, 0.0, 0.88));

  gl_FragColor = vec4(max(color, vec3(0.0)), 0.96);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;function Ms(f){const e=ys(f?.waves??Pt),t=(f?.sunDirection??new le(.45,.75,.48)).clone().normalize(),o=new ae(f?.deepColor??269876),s=new ae(f?.shallowColor??887446);return new Ve({name:"GerstnerOceanMaterial",vertexShader:bs,fragmentShader:xs,transparent:!0,side:at,toneMapped:!0,fog:!1,uniforms:{uTime:{value:0},uWaves:{value:e.waveDirSteepLen},uWaveSpeeds:{value:e.waveSpeedVec},uSunDirection:{value:t},uCameraPos:{value:new le(0,10,0)},uDeepColor:{value:o},uShallowColor:{value:s}}})}function Ss(f,e,t,o){f.uniforms.uTime&&(f.uniforms.uTime.value=e),f.uniforms.uSunDirection&&f.uniforms.uSunDirection.value.copy(t).normalize(),f.uniforms.uCameraPos&&f.uniforms.uCameraPos.value.copy(o)}function Ks(f,e=.35,t=4){const o={value:0},s={value:e},i={value:Math.max(.1,t)},a=f.onBeforeCompile.bind(f),n=`omniverse_wind_${e.toFixed(3)}_${t.toFixed(2)}`;return f.customProgramCacheKey=()=>n,f.onBeforeCompile=(r,l)=>{a(r,l),r.uniforms.uWindTime=o,r.uniforms.uWindStrength=s,r.uniforms.uWindHeightScale=i,r.vertexShader=r.vertexShader.replace("#include <common>",`
      #include <common>
      uniform float uWindTime;
      uniform float uWindStrength;
      uniform float uWindHeightScale;
      `),r.vertexShader=r.vertexShader.replace("#include <begin_vertex>",`
      #include <begin_vertex>
      {
        #ifdef USE_INSTANCING
          vec4 windAnchor = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        #else
          vec4 windAnchor = modelMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        #endif
        float hNorm = clamp(max(position.y, 0.0) / uWindHeightScale, 0.0, 1.75);
        float bend = hNorm * hNorm;
        float phase = windAnchor.x * 0.21 + windAnchor.z * 0.17;
        float gust = 0.66 + 0.34 * sin(uWindTime * 0.78 + phase * 0.42);
        float swayX = sin(uWindTime * 2.15 + phase + position.y * 0.32);
        float swayZ = cos(uWindTime * 1.74 + phase * 1.27 + position.x * 0.28) * 0.68;
        float leafFlutter = sin(uWindTime * 6.2 + dot(position, vec3(3.3, 2.5, 3.7))) * 0.075 * hNorm;
        transformed.x += (swayX * bend + leafFlutter) * uWindStrength * gust;
        transformed.z += (swayZ * bend + leafFlutter * 0.75) * uWindStrength * gust;
        transformed.y -= abs(swayX) * bend * uWindStrength * 0.07;
      }
      `)},f.needsUpdate=!0,{update(r){o.value=r}}}const Cs=`
varying vec2 vUv;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying float vBuildingSeed;

float hash12v(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  vUv = uv;

  #ifdef USE_INSTANCING
    mat4 worldMat = modelMatrix * instanceMatrix;
  #else
    mat4 worldMat = modelMatrix;
  #endif

  vec4 worldPos = worldMat * vec4(position, 1.0);
  vec4 originWorld = worldMat * vec4(0.0, 0.0, 0.0, 1.0);

  vWorldPos = worldPos.xyz;
  vWorldNormal = normalize(mat3(worldMat) * normal);
  vBuildingSeed = hash12v(floor(originWorld.xz * 0.25) + vec2(13.7, 29.3));

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`,ks=`
uniform sampler2D uFacadeMap;
uniform sampler2D uRoughnessMap;
uniform sampler2D uMetalnessMap;
uniform float uFloors;
uniform float uRoomsPerFloor;
uniform float uNightFactor;
uniform float uTime;
uniform vec3 uSunDirection;
uniform vec3 uCameraPos;

varying vec2 vUv;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying float vBuildingSeed;

float hash13(vec3 p3) {
  p3 = fract(p3 * 0.1031);
  p3 += dot(p3, p3.zyx + 31.32);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  vec3 N = normalize(vWorldNormal);
  vec3 L = normalize(uSunDirection);
  vec3 V = normalize(uCameraPos - vWorldPos);

  float dayAmt = smoothstep(-0.08, 0.28, L.y);
  float NdotL = max(dot(N, L), 0.0);
  vec3 outColor = vec3(0.0);

  // Horizontal rooftop surfaces render weathered architectural concrete/gravel
  if (abs(N.y) > 0.72) {
    vec3 roofTex = texture2D(uFacadeMap, vWorldPos.xz * 0.12).rgb;
    outColor = roofTex * (0.14 + 0.86 * NdotL * dayAmt + 0.12 * (1.0 - uNightFactor));
  } else {
    // Orthonormal facade wall basis: X = wallRight, Y = wallUp, +Z = inward into room
    vec3 worldUp = vec3(0.0, 1.0, 0.0);
    vec3 wallRight = normalize(cross(worldUp, N));
    vec3 wallUp = normalize(cross(N, wallRight));

    // Tile room grid cleanly using UVs scaled by roomsPerFloor x floors
    vec2 gridCoord = vec2(vUv.x * uRoomsPerFloor, vUv.y * uFloors);
    vec2 roomIdx = floor(gridCoord);
    vec2 cellUv = fract(gridCoord);

    // Structural masonry/curtain-wall mullion frame vs recessed glass window opening
    float frameMarginX = 0.13;
    float frameMarginBottom = 0.16;
    float frameMarginTop = 0.12;

    bool isWindow =
      cellUv.x > frameMarginX &&
      cellUv.x < (1.0 - frameMarginX) &&
      cellUv.y > frameMarginBottom &&
      cellUv.y < (1.0 - frameMarginTop);

    vec2 texUv = vec2(vUv.x * (uRoomsPerFloor * 0.5), vUv.y * (uFloors * 0.5));
    vec3 facadeAlbedo = texture2D(uFacadeMap, texUv).rgb;
    float facadeRough = texture2D(uRoughnessMap, texUv).g;
    float facadeMetal = texture2D(uMetalnessMap, texUv).b;

    vec3 sunColor = mix(vec3(1.05, 0.50, 0.24), vec3(1.0, 0.96, 0.90), dayAmt) * dayAmt;
    vec3 skyAmb = mix(vec3(0.035, 0.05, 0.095), vec3(0.26, 0.34, 0.46), dayAmt);

    if (!isWindow) {
      vec3 H = normalize(L + V);
      float spec = pow(max(dot(N, H), 0.0), mix(12.0, 64.0, 1.0 - facadeRough)) * (0.04 + facadeMetal * 0.35);
      outColor = facadeAlbedo * (skyAmb + sunColor * NdotL) + sunColor * spec;
    } else {
      // Normalized window-pane coordinates in [0, 1]^2
      vec2 winUv = vec2(
        (cellUv.x - frameMarginX) / (1.0 - 2.0 * frameMarginX),
        (cellUv.y - frameMarginBottom) / (1.0 - frameMarginBottom - frameMarginTop)
      );

      // Ray-box parallax Interior Mapping inside unit room [0,1] x [0,1] x [0, roomDepth]
      float roomDepth = 0.82;
      vec3 viewRayWorld = -V;
      vec3 localRay = vec3(
        dot(viewRayWorld, wallRight),
        dot(viewRayWorld, wallUp),
        max(dot(viewRayWorld, -N), 0.04)
      );

      float eps = 0.0001;
      float targetX = localRay.x >= 0.0 ? 1.0 : 0.0;
      float targetY = localRay.y >= 0.0 ? 1.0 : 0.0;
      float denomX = abs(localRay.x) < eps ? (localRay.x >= 0.0 ? eps : -eps) : localRay.x;
      float denomY = abs(localRay.y) < eps ? (localRay.y >= 0.0 ? eps : -eps) : localRay.y;

      float tBack = roomDepth / localRay.z;
      float tSide = (targetX - winUv.x) / denomX;
      float tVert = (targetY - winUv.y) / denomY;

      float tHit = min(tBack, min(tSide, tVert));
      vec3 hit = vec3(winUv, 0.0) + localRay * tHit;

      bool hitCeiling = (tVert <= tBack && tVert <= tSide && localRay.y > 0.0);
      bool hitFloor = (tVert <= tBack && tVert <= tSide && localRay.y <= 0.0);
      bool hitBack = (tBack <= tSide && tBack <= tVert);

      // Per-room deterministic seed & occupancy state
      float rSeed = hash13(vec3(roomIdx, floor(vBuildingSeed * 127.0)));
      float rTone = hash13(vec3(roomIdx + vec2(41.0, 17.0), floor(vBuildingSeed * 63.0)));
      float blindHeight = 0.72 + 0.28 * hash13(vec3(roomIdx + vec2(9.0, 83.0), 3.0));

      // Window Venetian blinds at top of pane
      float blindMask = smoothstep(blindHeight - 0.02, blindHeight + 0.02, winUv.y);
      float blindSlats = 0.72 + 0.28 * sin(winUv.y * 95.0);

      // Room color palette (warm tungsten residential, crisp daylight office, cyan-magenta studio)
      vec3 warmLamp = vec3(1.28, 0.86, 0.46);
      vec3 coolOffice = vec3(0.82, 0.94, 1.18);
      vec3 studioAccent = vec3(0.62, 0.78, 1.25);
      vec3 lightTint = (rTone < 0.56) ? warmLamp : (rTone < 0.88 ? coolOffice : studioAccent);

      // Procedural interior geometry shading on ceiling, back wall, side walls, and floor
      vec3 roomSurface = vec3(0.18, 0.17, 0.16);
      float fixtureEmit = 0.0;

      if (hitCeiling) {
        // Glowing recessed ceiling light panel
        float panelX = smoothstep(0.24, 0.30, hit.x) * (1.0 - smoothstep(0.70, 0.76, hit.x));
        float panelZ = smoothstep(0.22, 0.30, hit.z / roomDepth) * (1.0 - smoothstep(0.68, 0.76, hit.z / roomDepth));
        fixtureEmit = panelX * panelZ * 1.65;
        roomSurface = vec3(0.62, 0.62, 0.65);
      } else if (hitFloor) {
        float planks = 0.85 + 0.15 * sin(hit.x * 32.0);
        roomSurface = vec3(0.24, 0.17, 0.12) * planks;
      } else if (hitBack) {
        // Back wall with desk/console silhouette & monitor glow
        float desk = (hit.y < 0.34 && hit.x > 0.15 && hit.x < 0.85) ? 0.28 : 1.0;
        float monitorGlow = (hit.y > 0.34 && hit.y < 0.52 && hit.x > 0.40 && hit.x < 0.62 && rSeed > 0.5) ? 0.85 : 0.0;
        float wallGrad = 0.55 + 0.45 * hit.y;
        roomSurface = mix(vec3(0.36, 0.34, 0.32), vec3(0.52, 0.50, 0.47), rTone) * wallGrad * desk;
        fixtureEmit += monitorGlow * (0.88 + 0.12 * sin(uTime * 3.7 + rSeed * 30.0));
      } else {
        // Side walls with bookshelf horizontal bands
        float shelves = (hit.z > 0.25 * roomDepth && fract(hit.y * 4.0) < 0.14) ? 0.42 : 1.0;
        roomSurface = vec3(0.42, 0.40, 0.38) * (0.5 + 0.5 * hit.y) * shelves;
      }

      float depthAO = 1.0 - 0.45 * (hit.z / roomDepth);
      float litProbability = mix(0.14, 0.68, uNightFactor);
      float isRoomLit = step(1.0 - litProbability, rSeed);
      float subtleFlicker = 0.96 + 0.04 * sin(uTime * 1.9 + rSeed * 50.0);

      float interiorExposure = mix(0.22 * dayAmt, (0.95 + fixtureEmit) * subtleFlicker, isRoomLit * max(uNightFactor, 0.22));
      vec3 interiorColor = (roomSurface * depthAO * lightTint * interiorExposure) + lightTint * fixtureEmit * isRoomLit * uNightFactor;
      interiorColor = mix(interiorColor, vec3(0.14, 0.13, 0.12) * blindSlats * (0.2 + interiorExposure * 0.45), blindMask * 0.88);

      // Exterior architectural glass Fresnel reflection + solar specular highlight
      float NdotV = max(dot(N, V), 0.01);
      float glassFresnel = 0.05 + 0.90 * pow(1.0 - NdotV, 4.2);
      vec3 reflDir = reflect(-V, N);
      vec3 skyRefl = mix(
        mix(vec3(0.02, 0.03, 0.07), vec3(0.45, 0.68, 0.92), dayAmt),
        mix(vec3(0.006, 0.012, 0.03), vec3(0.08, 0.25, 0.60), dayAmt),
        clamp(reflDir.y, 0.0, 1.0)
      );
      vec3 H = normalize(L + V);
      float glassSpec = pow(max(dot(N, H), 0.0), 180.0) * 2.2 * dayAmt;

      float glassReflectivity = clamp(glassFresnel * mix(0.32, 0.82, dayAmt), 0.06, 0.88);
      outColor = mix(interiorColor, skyRefl, glassReflectivity) + sunColor * glassSpec;
    }
  }

  gl_FragColor = vec4(max(outColor, vec3(0.0)), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;function Ts(f,e){const t=Math.max(1,e?.floors??12),o=Math.max(1,e?.roomsPerFloor??6),s=be.clamp(e?.nightFactor??.35,0,1);return new Ve({name:"InteriorMappingMaterial",vertexShader:Cs,fragmentShader:ks,side:at,toneMapped:!0,fog:!1,uniforms:{uFacadeMap:{value:f.map},uRoughnessMap:{value:f.roughnessMap},uMetalnessMap:{value:f.metalnessMap},uFloors:{value:t},uRoomsPerFloor:{value:o},uNightFactor:{value:s},uTime:{value:0},uSunDirection:{value:new le(.45,.72,.52).normalize()},uCameraPos:{value:new le(0,10,20)}}})}function Es(f,e,t,o,s){f.uniforms.uTime&&(f.uniforms.uTime.value=e),f.uniforms.uSunDirection&&f.uniforms.uSunDirection.value.copy(t).normalize(),f.uniforms.uCameraPos&&f.uniforms.uCameraPos.value.copy(o),f.uniforms.uNightFactor&&(f.uniforms.uNightFactor.value=be.clamp(s,0,1))}function ei(f,e=.75){const t=be.clamp(e,0,1),o={value:t},s=new _e({name:"WetAsphaltPhysicalMaterial",map:f.map,normalMap:f.normalMap,normalScale:new qe(.95,.95),roughnessMap:f.roughnessMap,roughness:1,metalnessMap:f.metalnessMap,metalness:.05,bumpMap:f.bumpMap,bumpScale:.015,clearcoat:Math.max(.15,t),clearcoatRoughness:.08,ior:1.5,reflectivity:.7});return s.userData.uWetness=o,s.userData.setWetness=i=>{o.value=be.clamp(i,0,1)},s.customProgramCacheKey=()=>"omniverse_wet_asphalt_v1",s.onBeforeCompile=i=>{i.uniforms.uWetness=o,i.vertexShader=i.vertexShader.replace("#include <common>",`
      #include <common>
      varying vec3 vWetWorldPos;
      `),i.vertexShader=i.vertexShader.replace("#include <begin_vertex>",`
      #include <begin_vertex>
      #ifdef USE_INSTANCING
        vWetWorldPos = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
      #else
        vWetWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
      #endif
      `),i.fragmentShader=i.fragmentShader.replace("#include <common>",`
      #include <common>
      uniform float uWetness;
      varying vec3 vWetWorldPos;

      float wetHash12(vec2 p) {
        vec3 p3 = fract(vec3(p.xyx) * 0.1031);
        p3 += dot(p3, p3.yzx + 33.33);
        return fract((p3.x + p3.y) * p3.z);
      }

      float wetNoise2D(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = wetHash12(i);
        float b = wetHash12(i + vec2(1.0, 0.0));
        float c = wetHash12(i + vec2(0.0, 1.0));
        float d = wetHash12(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      float evaluatePuddleField(vec2 xz) {
        float n1 = wetNoise2D(xz * 0.075);
        float n2 = wetNoise2D(xz * 0.19 + vec2(17.3, 43.1));
        float n3 = wetNoise2D(xz * 0.42 + vec2(81.7, 12.9));
        return n1 * 0.56 + n2 * 0.30 + n3 * 0.14;
      }
      `),i.fragmentShader=i.fragmentShader.replace("#include <map_fragment>",`
      #include <map_fragment>
      float puddleRaw = evaluatePuddleField(vWetWorldPos.xz);
      float puddleThreshold = mix(0.85, 0.40, uWetness);
      float puddleDamp = smoothstep(puddleThreshold - 0.14, puddleThreshold + 0.06, puddleRaw) * uWetness;
      float puddleStanding = smoothstep(puddleThreshold + 0.02, puddleThreshold + 0.16, puddleRaw) * uWetness;
      // Wet porous asphalt absorbs light and darkens
      diffuseColor.rgb *= mix(1.0, 0.44, clamp(puddleDamp * 0.85 + uWetness * 0.25, 0.0, 1.0));
      `),i.fragmentShader=i.fragmentShader.replace("#include <roughnessmap_fragment>",`
      #include <roughnessmap_fragment>
      roughnessFactor = mix(roughnessFactor, 0.22, uWetness * 0.45);
      roughnessFactor = mix(roughnessFactor, 0.05, puddleStanding);
      `),i.fragmentShader=i.fragmentShader.replace("#include <normal_fragment_maps>",`
      #include <normal_fragment_maps>
      // Standing water puddles level out coarse asphalt aggregate normals into a mirror film
      normal = normalize(mix(normal, nonPerturbedNormal, puddleStanding * 0.88));
      `),i.fragmentShader=i.fragmentShader.replace("#include <lights_physical_fragment>",`
      #include <lights_physical_fragment>
      #ifdef USE_CLEARCOAT
        material.clearcoat = clamp(mix(uWetness * 0.35, 1.0, puddleStanding), 0.0, 1.0);
        material.clearcoatRoughness = mix(0.16, 0.045, puddleStanding);
      #endif
      `)},s}const Ps=`
uniform float uTime;
uniform float uWindSway;

varying vec3 vWorldNormal;
varying vec3 vWorldPos;
varying vec3 vBaseTint;

void main() {
  vec3 pos = position;

  #ifdef USE_INSTANCING
    mat4 worldMat = modelMatrix * instanceMatrix;
  #else
    mat4 worldMat = modelMatrix;
  #endif

  vec4 anchorWorld = worldMat * vec4(0.0, 0.0, 0.0, 1.0);

  if (uWindSway > 0.0005) {
    float hMask = clamp(max(pos.y, 0.0) * 0.25, 0.0, 1.6);
    float bend = hMask * hMask;
    float phase = anchorWorld.x * 0.24 + anchorWorld.z * 0.19;
    float gust = 0.70 + 0.30 * sin(uTime * 0.85 + phase * 0.5);
    pos.x += sin(uTime * 2.3 + phase + pos.y * 0.4) * bend * uWindSway * gust;
    pos.z += cos(uTime * 1.9 + phase * 1.3 + pos.x * 0.3) * bend * uWindSway * 0.7 * gust;
  }

  vec3 tint = vec3(1.0);
  #if defined(USE_COLOR_ALPHA) || defined(USE_COLOR)
    tint *= color.rgb;
  #endif
  #ifdef USE_INSTANCING_COLOR
    tint *= instanceColor.rgb;
  #endif
  vBaseTint = tint;

  vec4 worldPos = worldMat * vec4(pos, 1.0);
  vWorldPos = worldPos.xyz;
  vWorldNormal = normalize(mat3(worldMat) * normal);

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`,Rs=`
uniform vec3 uBaseColor;
uniform vec3 uRimColor;
uniform vec3 uSunDirection;
uniform float uSteps;

varying vec3 vWorldNormal;
varying vec3 vWorldPos;
varying vec3 vBaseTint;

void main() {
  vec3 N = normalize(vWorldNormal);
  vec3 L = normalize(uSunDirection);
  vec3 V = normalize(cameraPosition - vWorldPos);

  float dayAmt = smoothstep(-0.10, 0.25, L.y);
  float halfLambert = dot(N, L) * 0.5 + 0.5;

  // Anti-aliased N-band cel quantization (3 crisp anime shading bands by default)
  float bands = max(2.0, uSteps);
  float scaled = halfLambert * bands;
  float bandIdx = floor(scaled);
  float bandFrac = fract(scaled);
  float smoothEdge = smoothstep(0.44, 0.56, bandFrac);
  float celLevel = clamp((bandIdx + smoothEdge) / bands, 0.0, 1.0);

  vec3 albedo = uBaseColor * vBaseTint;

  // Stylized anime cool lavender-indigo shadow vs warm sunlit key color
  vec3 shadowTone = albedo * mix(vec3(0.24, 0.26, 0.40), vec3(0.42, 0.44, 0.58), dayAmt);
  vec3 midTone = albedo * mix(vec3(0.42, 0.48, 0.64), vec3(0.86, 0.85, 0.88), dayAmt);
  vec3 litTone = albedo * mix(vec3(0.58, 0.66, 0.86), vec3(1.14, 1.10, 1.02), dayAmt);

  vec3 shaded = celLevel < 0.5
    ? mix(shadowTone, midTone, celLevel * 2.0)
    : mix(midTone, litTone, (celLevel - 0.5) * 2.0);

  // Quantized anime specular highlight pill
  vec3 H = normalize(L + V);
  float NdotH = max(dot(N, H), 0.0);
  float celSpec = smoothstep(0.91, 0.94, pow(NdotH, 24.0)) * 0.22 * dayAmt;

  // Crisp sunlit Fresnel rim-light silhouette
  float NdotV = max(dot(N, V), 0.0);
  float rimRaw = pow(1.0 - NdotV, 3.6) * smoothstep(-0.2, 0.45, dot(N, L));
  float crispRim = smoothstep(0.36, 0.48, rimRaw);
  vec3 rimContribution = uRimColor * crispRim * mix(0.28, 0.72, dayAmt);

  vec3 finalColor = shaded + vec3(celSpec) + rimContribution;

  gl_FragColor = vec4(max(finalColor, vec3(0.0)), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;function ti(f,e){const t=new ae(f),o=new ae(e?.rimColor??16773572),s=Math.max(2,Math.round(e?.steps??3)),i=e?.windSway??0;return new Ve({name:"CelToonMaterial",vertexShader:Ps,fragmentShader:Rs,side:at,toneMapped:!0,fog:!1,uniforms:{uBaseColor:{value:t},uRimColor:{value:o},uSunDirection:{value:new le(.45,.78,.42).normalize()},uSteps:{value:s},uTime:{value:0},uWindSway:{value:i}}})}function si(f,e,t){f.uniforms.uTime&&(f.uniforms.uTime.value=e),f.uniforms.uSunDirection&&f.uniforms.uSunDirection.value.copy(t).normalize()}const As=`
uniform float uThickness;

void main() {
  #ifdef USE_INSTANCING
    mat4 worldMat = modelMatrix * instanceMatrix;
  #else
    mat4 worldMat = modelMatrix;
  #endif

  vec4 worldBase = worldMat * vec4(position, 1.0);
  vec3 worldNorm = normalize(mat3(worldMat) * normal);

  // Subtle distance compensation keeps anime ink lines legible without distant bloat
  float camDist = length(cameraPosition - worldBase.xyz);
  float distScale = clamp(0.65 + camDist * 0.018, 0.65, 2.4);

  vec3 extrudedWorld = worldBase.xyz + worldNorm * (uThickness * distScale);
  gl_Position = projectionMatrix * viewMatrix * vec4(extrudedWorld, 1.0);
}
`,Is=`
uniform vec3 uOutlineColor;

void main() {
  gl_FragColor = vec4(uOutlineColor, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;function ii(f=.035,e=1315357){return new Ve({name:"InvertedHullOutlineMaterial",vertexShader:As,fragmentShader:Is,side:xt,depthWrite:!0,toneMapped:!0,fog:!1,uniforms:{uThickness:{value:f},uOutlineColor:{value:new ae(e)}}})}const Ls=`
uniform float uTime;
uniform float uIntensity;

varying vec2 vUv;
varying vec3 vLocalPos;

void main() {
  vUv = uv;
  vLocalPos = position;

  // Relativistic radial breathing distortion during quantum jump
  vec3 warpedPos = position;
  float wave = sin(position.z * 0.12 + uTime * 14.0) * 0.045 * uIntensity;
  warpedPos.xy *= 1.0 + wave;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(warpedPos, 1.0);
}
`,Ds=`
uniform float uTime;
uniform float uIntensity;

varying vec2 vUv;
varying vec3 vLocalPos;

float warpHash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float warpNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = warpHash12(i);
  float b = warpHash12(i + vec2(1.0, 0.0));
  float c = warpHash12(i + vec2(0.0, 1.0));
  float d = warpHash12(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void main() {
  float intensity = clamp(uIntensity, 0.0, 1.5);
  if (intensity <= 0.001) {
    discard;
  }

  // Works seamlessly on cylindrical tunnels, cones, or full-screen quads
  float angle = atan(vLocalPos.y, vLocalPos.x);
  float normAngle = angle * 0.15915494 + 0.5; // [-pi, pi] -> [0, 1]
  float axial = vUv.y;

  // Helical twist & relativistic star-streak rush
  float twist = normAngle + axial * 0.22 * sin(uTime * 1.4) + uTime * 0.08;
  float rushSpeed = uTime * (4.5 + intensity * 12.0);

  // Layer 1: High-velocity Cherenkov star-streaks
  float angularLanes1 = floor(twist * 96.0);
  float laneFrac1 = abs(fract(twist * 96.0) - 0.5) * 2.0;
  float laneSeed1 = warpHash12(vec2(angularLanes1, 11.0));
  float streakZ1 = fract(axial * 3.0 + rushSpeed * (0.6 + laneSeed1 * 0.9) + laneSeed1 * 17.0);
  float streakLen1 = mix(0.06, 0.72, clamp(intensity, 0.0, 1.0));
  float streak1 =
    (1.0 - smoothstep(0.0, 0.42, laneFrac1)) *
    smoothstep(1.0 - streakLen1, 1.0, streakZ1) *
    step(0.32, laneSeed1);

  // Layer 2: Dense hyper-luminous inner filaments
  float angularLanes2 = floor((normAngle - uTime * 0.05) * 160.0);
  float laneFrac2 = abs(fract((normAngle - uTime * 0.05) * 160.0) - 0.5) * 2.0;
  float laneSeed2 = warpHash12(vec2(angularLanes2, 47.0));
  float streakZ2 = fract(axial * 5.0 + rushSpeed * (1.1 + laneSeed2 * 0.8) + laneSeed2 * 31.0);
  float streak2 =
    (1.0 - smoothstep(0.0, 0.35, laneFrac2)) *
    smoothstep(0.35, 1.0, streakZ2) *
    step(0.45, laneSeed2);

  // Quantum plasma nebula waves & shockwave rings
  float plasma = warpNoise(vec2(twist * 14.0, axial * 6.0 + rushSpeed * 0.35));
  float plasma2 = warpNoise(vec2(normAngle * 22.0 - uTime * 0.9, axial * 10.0 + rushSpeed * 0.55));
  float shockRing = pow(0.5 + 0.5 * sin(axial * 28.0 + rushSpeed * 2.2), 6.0);

  // Relativistic Doppler shift palette (electric cyan -> royal violet -> white-gold core)
  vec3 cherenkovCyan = vec3(0.12, 0.78, 1.65);
  vec3 quantumViolet = vec3(0.72, 0.22, 1.45);
  vec3 coreGold = vec3(1.85, 1.65, 1.25);

  vec3 color =
    cherenkovCyan * (streak1 * 2.4 + plasma * plasma2 * 0.85) +
    quantumViolet * (plasma * 0.65 + shockRing * 0.55) +
    coreGold * (streak2 * 2.8);

  // Smooth fade at both ends of tunnel geometry so no hard mesh edges appear
  float edgeFade = sin(clamp(vUv.y, 0.0, 1.0) * 3.14159265);
  float alpha = clamp((streak1 * 0.9 + streak2 * 0.9 + plasma * 0.38 + shockRing * 0.25) * edgeFade * intensity, 0.0, 1.0);

  gl_FragColor = vec4(color * intensity * edgeFade, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;function oi(){return new Ve({name:"QuantumWarpTunnelMaterial",vertexShader:Ls,fragmentShader:Ds,transparent:!0,blending:jt,depthWrite:!1,side:je,toneMapped:!0,fog:!1,uniforms:{uTime:{value:0},uIntensity:{value:0}}})}class Pe{currentConfig;autoScale=!0;listeners=new Set;samples=[];sampleDurationSum=0;smoothedFps=60;cooldownRemaining=2.5;highFpsDuration=0;autoDownscaled=!1;initialPreset;constructor(e){const t=typeof navigator<"u"&&typeof window<"u"&&navigator.maxTouchPoints>1&&window.innerWidth<1024;this.initialPreset=e??(t?"HIGH":"ULTRA"),this.currentConfig=Pe.createConfigForPreset(this.initialPreset)}get config(){return this.currentConfig}static createConfigForPreset(e){const t=typeof window<"u"&&Number.isFinite(window.devicePixelRatio)&&window.devicePixelRatio>0?window.devicePixelRatio:1;switch(e){case"ULTRA":return{preset:"ULTRA",pixelRatio:Math.min(t,2),shadowMapSize:2048,enableBloom:!0,enableSSAO:!0,enableChromatic:!0,chunkRadius:4,maxInstancesMultiplier:1,textureSize:1024};case"HIGH":return{preset:"HIGH",pixelRatio:Math.min(t,1.5),shadowMapSize:1536,enableBloom:!0,enableSSAO:!1,enableChromatic:!0,chunkRadius:3,maxInstancesMultiplier:.75,textureSize:1024};case"MOBILE_PERF":return{preset:"MOBILE_PERF",pixelRatio:Math.min(t,1.15),shadowMapSize:1024,enableBloom:!1,enableSSAO:!1,enableChromatic:!1,chunkRadius:2,maxInstancesMultiplier:.45,textureSize:512}}}setPreset(e){this.currentConfig=Pe.createConfigForPreset(e),this.autoDownscaled=!1,this.highFpsDuration=0,this.cooldownRemaining=2.5,this.clearRollingSamples(),this.emitChange()}recordFrame(e){if(!Number.isFinite(e)||e<=0)return this.smoothedFps;if(e>.4)return this.cooldownRemaining=Math.max(this.cooldownRemaining,1.5),this.smoothedFps;const t=Math.max(.001,Math.min(.25,e)),o=1/t,s=1-Math.exp(-t*6);for(this.smoothedFps+=(o-this.smoothedFps)*s,this.samples.push({dt:t}),this.sampleDurationSum+=t;this.sampleDurationSum>3&&this.samples.length>2;){const a=this.samples.shift();a&&(this.sampleDurationSum-=a.dt)}if(this.cooldownRemaining>0)return this.cooldownRemaining=Math.max(0,this.cooldownRemaining-t),this.smoothedFps;if(!this.autoScale||this.sampleDurationSum<2.85||this.samples.length<20)return this.smoothedFps;const i=this.samples.length/this.sampleDurationSum;return i<44?(this.highFpsDuration=0,this.stepDownQuality()):this.autoDownscaled&&i>58&&this.smoothedFps>58?(this.highFpsDuration+=t,this.highFpsDuration>=8&&(this.highFpsDuration=0,this.gentlyRestoreDpr())):i<56&&(this.highFpsDuration=0),this.smoothedFps}onChange(e){return this.listeners.add(e),()=>{this.listeners.delete(e)}}stepDownQuality(){if(this.currentConfig.preset==="ULTRA"){this.currentConfig=Pe.createConfigForPreset("HIGH"),this.autoDownscaled=!0,this.cooldownRemaining=3.5,this.clearRollingSamples(),this.emitChange();return}if(this.currentConfig.preset==="HIGH"){this.currentConfig=Pe.createConfigForPreset("MOBILE_PERF"),this.autoDownscaled=!0,this.cooldownRemaining=3.5,this.clearRollingSamples(),this.emitChange();return}this.currentConfig.pixelRatio>.85&&(this.currentConfig={...this.currentConfig,pixelRatio:.85},this.autoDownscaled=!0,this.cooldownRemaining=4.5,this.clearRollingSamples(),this.emitChange())}gentlyRestoreDpr(){const e=Pe.createConfigForPreset(this.currentConfig.preset).pixelRatio,t=Pe.createConfigForPreset(this.initialPreset).pixelRatio,o=Math.max(e,Math.min(t,e+.25));if(this.currentConfig.pixelRatio<o-.02){const s=Math.min(o,Number((this.currentConfig.pixelRatio+.15).toFixed(2)));this.currentConfig={...this.currentConfig,pixelRatio:s},s>=t-.02&&this.currentConfig.preset===this.initialPreset&&(this.autoDownscaled=!1),this.cooldownRemaining=5,this.clearRollingSamples(),this.emitChange()}else this.autoDownscaled=!1}clearRollingSamples(){this.samples.length=0,this.sampleDurationSum=0}emitChange(){const e={...this.currentConfig};for(const t of this.listeners)t(e)}}const Ne={hub:{bpm:76,padChords:[[146.83,220,277.18,329.63,440],[123.47,185,220,293.66,369.99],[196,246.94,293.66,369.99,440],[164.81,220,246.94,329.63,415.3]],arpNotes:[587.33,659.25,739.99,880,1108.73,1174.66],bassNotes:[73.42,61.74,98,82.41],padWaveform:"sine",arpWaveform:"sine",padFilterHz:1150,reverbSend:.58,pulseBass:!1,percussionChance:.12},metropolis:{bpm:104,padChords:[[130.81,155.56,196,233.08,293.66],[103.83,155.56,196,261.63,311.13],[174.61,207.65,261.63,311.13,392],[98,146.83,174.61,233.08,293.66]],arpNotes:[261.63,311.13,392,466.16,523.25,587.33,622.25],bassNotes:[65.41,51.91,87.31,49],padWaveform:"sawtooth",arpWaveform:"triangle",padFilterHz:780,reverbSend:.42,pulseBass:!0,percussionChance:.35},starfield:{bpm:64,padChords:[[174.61,261.63,329.63,369.99,440],[174.61,220,261.63,329.63,493.88],[196,246.94,293.66,392,493.88],[146.83,220,261.63,329.63,440]],arpNotes:[523.25,659.25,783.99,987.77,1046.5,1174.66],bassNotes:[87.31,87.31,98,73.42],padWaveform:"triangle",arpWaveform:"sine",padFilterHz:950,reverbSend:.68,pulseBass:!1,percussionChance:.08},valheim:{bpm:72,padChords:[[146.83,220,293.66,329.63],[130.81,196,261.63,293.66],[196,293.66,349.23,392],[146.83,220,261.63,329.63]],arpNotes:[293.66,329.63,349.23,440,493.88,523.25,587.33],bassNotes:[73.42,65.41,98,73.42],padWaveform:"triangle",arpWaveform:"triangle",padFilterHz:680,reverbSend:.52,pulseBass:!1,percussionChance:.25},seaOfLegends:{bpm:92,padChords:[[196,233.08,293.66,392],[174.61,220,261.63,349.23],[130.81,196,246.94,329.63],[146.83,220,293.66,349.23]],arpNotes:[392,440,466.16,587.33,659.25,698.46,783.99],bassNotes:[98,87.31,65.41,73.42],padWaveform:"sawtooth",arpWaveform:"triangle",padFilterHz:840,reverbSend:.46,pulseBass:!1,percussionChance:.3},aetheria:{bpm:80,padChords:[[155.56,233.08,293.66,349.23,466.16],[130.81,196,233.08,293.66,392],[207.65,261.63,311.13,392,466.16],[116.54,174.61,220,261.63,349.23]],arpNotes:[622.25,698.46,783.99,932.33,1046.5,1174.66,1396.91],bassNotes:[77.78,65.41,103.83,58.27],padWaveform:"sine",arpWaveform:"sine",padFilterHz:1400,reverbSend:.62,pulseBass:!1,percussionChance:.1},extremeHorizon:{bpm:124,padChords:[[164.81,246.94,329.63,392],[130.81,196,246.94,329.63],[146.83,220,293.66,369.99],[123.47,185,246.94,293.66]],arpNotes:[329.63,392,493.88,587.33,659.25,783.99],bassNotes:[82.41,65.41,73.42,61.74],padWaveform:"sawtooth",arpWaveform:"sawtooth",padFilterHz:1100,reverbSend:.36,pulseBass:!0,percussionChance:.45}};class Bs{ctx=null;masterCompressor=null;masterGain=null;sfxBus=null;sfxReverbSend=null;musicBus=null;musicReverbSend=null;convolver=null;reverbReturnGain=null;whiteNoiseBuffer=null;pinkNoiseBuffer=null;vehicleGraph=null;ambienceGraph=null;spaceGraph=null;masterVolume=.82;musicVolume=.38;currentWorld="hub";lastFootstepAt=0;padOscillators=[];padGain=null;padFilter=null;musicTimerId=null;stepIndex=0;chordIndex=0;constructor(){if(typeof window<"u"){const e=()=>{this.unlock()};window.addEventListener("pointerdown",e,{once:!0,passive:!0}),window.addEventListener("keydown",e,{once:!0,passive:!0}),window.addEventListener("touchstart",e,{once:!0,passive:!0})}}unlock(){this.ctx||this.initializeContext(),this.ctx&&this.ctx.state==="suspended"&&this.ctx.resume()}initializeContext(){if(typeof window>"u")return;const e=window.AudioContext??window.webkitAudioContext;if(e)try{const t=new e;this.ctx=t;const o=t.createDynamicsCompressor();o.threshold.value=-14,o.knee.value=18,o.ratio.value=4.2,o.attack.value=.004,o.release.value=.18;const s=t.createGain();s.gain.value=this.masterVolume,o.connect(s),s.connect(t.destination);const i=t.createConvolver();i.buffer=this.createStereoReverbImpulse(t,2.6,2.8);const a=t.createGain();a.gain.value=.42,i.connect(a),a.connect(o);const n=t.createGain();n.gain.value=.92,n.connect(o);const r=t.createGain();r.gain.value=.22,n.connect(r),r.connect(i);const l=t.createGain();l.gain.value=this.musicVolume,l.connect(o);const c=t.createGain();c.gain.value=Ne[this.currentWorld].reverbSend,l.connect(c),c.connect(i),this.masterCompressor=o,this.masterGain=s,this.convolver=i,this.reverbReturnGain=a,this.sfxBus=n,this.sfxReverbSend=r,this.musicBus=l,this.musicReverbSend=c,this.whiteNoiseBuffer=this.createNoiseBuffer(t,3,"white"),this.pinkNoiseBuffer=this.createNoiseBuffer(t,3.5,"pink"),this.buildVehicleGraph(t,n),this.buildAmbienceGraph(t,n),this.buildSpaceGraph(t,n),this.startSoundscapeEngine()}catch{this.ctx=null}}createStereoReverbImpulse(e,t,o){const s=e.sampleRate,i=Math.floor(s*t),a=e.createBuffer(2,i,s);for(let n=0;n<2;n++){const r=a.getChannelData(n);let l=0;for(let c=0;c<i;c++){const d=c/i,h=Math.pow(1-d,o),u=c<s*.045&&c%397<6?.55:0,p=(Math.random()*2-1)*h+u*(Math.random()*2-1),m=.38-d*.24;l+=m*(p-l),r[c]=l*.65}}return a}createNoiseBuffer(e,t,o){const s=Math.floor(e.sampleRate*t),i=e.createBuffer(1,s,e.sampleRate),a=i.getChannelData(0);if(o==="white"){for(let p=0;p<s;p++)a[p]=Math.random()*2-1;return i}let n=0,r=0,l=0,c=0,d=0,h=0,u=0;for(let p=0;p<s;p++){const m=Math.random()*2-1;n=.99886*n+m*.0555179,r=.99332*r+m*.0750759,l=.969*l+m*.153852,c=.8665*c+m*.3104856,d=.55*d+m*.5329522,h=-.7616*h-m*.016898,a[p]=(n+r+l+c+d+h+u+m*.5362)*.11,u=m*.115926}return i}createSoftClipCurve(e){const o=new Float32Array(512),s=Math.max(1,e);for(let i=0;i<512;i++){const a=i*2/511-1;o[i]=(1+s)*a/(1+s*Math.abs(a))}return o}buildVehicleGraph(e,t){if(!this.whiteNoiseBuffer)return;const o=e.createOscillator();o.type="sawtooth",o.frequency.value=65;const s=e.createOscillator();s.type="triangle",s.frequency.value=32.5;const i=e.createOscillator();i.type="sawtooth",i.frequency.value=97.5;const a=e.createOscillator();a.type="sine",a.frequency.value=130;const n=e.createGain();n.gain.value=18,a.connect(n),n.connect(o.frequency);const r=e.createGain();r.gain.value=.55,s.connect(r);const l=e.createGain();l.gain.value=.32,i.connect(l);const c=e.createWaveShaper();c.curve=this.createSoftClipCurve(3.5),c.oversample="2x",o.connect(c),r.connect(c),l.connect(c);const d=e.createBiquadFilter();d.type="bandpass",d.frequency.value=220,d.Q.value=1.65;const h=e.createBiquadFilter();h.type="lowshelf",h.frequency.value=140,h.gain.value=5.5;const u=e.createGain();u.gain.value=0,c.connect(d),d.connect(h),h.connect(u),u.connect(t);const p=e.createBufferSource();p.buffer=this.whiteNoiseBuffer,p.loop=!0;const m=e.createBiquadFilter();m.type="bandpass",m.frequency.value=1850,m.Q.value=15;const g=e.createBiquadFilter();g.type="bandpass",g.frequency.value=2620,g.Q.value=18;const y=e.createGain();y.gain.value=0,p.connect(m),p.connect(g),m.connect(y),g.connect(y),y.connect(t),o.start(),s.start(),i.start(),a.start(),p.start(),this.vehicleGraph={oscPrimary:o,oscSub:s,oscHarmonic:i,oscFmMod:a,fmModGain:n,exhaustFilter:d,driveShaper:c,engineGain:u,tireNoise:p,tireFilterA:m,tireFilterB:g,tireGain:y}}buildAmbienceGraph(e,t){if(!this.pinkNoiseBuffer||!this.whiteNoiseBuffer)return;const o=e.createBufferSource();o.buffer=this.pinkNoiseBuffer,o.loop=!0;const s=e.createBiquadFilter();s.type="bandpass",s.frequency.value=320,s.Q.value=1.4;const i=e.createBiquadFilter();i.type="bandpass",i.frequency.value=950,i.Q.value=2.2;const a=e.createGain();a.gain.value=0,o.connect(s),o.connect(i),s.connect(a),i.connect(a),a.connect(t);const n=e.createBufferSource();n.buffer=this.whiteNoiseBuffer,n.loop=!0;const r=e.createBiquadFilter();r.type="bandpass",r.frequency.value=1950,r.Q.value=.65;const l=e.createBiquadFilter();l.type="highshelf",l.frequency.value=5400,l.gain.value=4;const c=e.createGain();c.gain.value=0,n.connect(r),r.connect(l),l.connect(c),c.connect(t),o.start(),n.start(),this.ambienceGraph={windSource:o,windFilterLow:s,windFilterHigh:i,windGain:a,rainSource:n,rainBand:r,rainHighShelf:l,rainGain:c}}buildSpaceGraph(e,t){if(!this.pinkNoiseBuffer)return;const o=e.createOscillator();o.type="sawtooth",o.frequency.value=48;const s=e.createBiquadFilter();s.type="lowpass",s.frequency.value=180;const i=e.createBufferSource();i.buffer=this.pinkNoiseBuffer,i.loop=!0;const a=e.createBiquadFilter();a.type="bandpass",a.frequency.value=280,a.Q.value=1.9;const n=e.createGain();n.gain.value=0,o.connect(s),s.connect(n),i.connect(a),a.connect(n),n.connect(t);const r=[130.81,196,293.66,369.99,440],l=e.createBiquadFilter();l.type="lowpass",l.frequency.value=1600,l.Q.value=2;const c=e.createGain();c.gain.value=0;const d=[];for(let h=0;h<r.length;h++){const u=e.createOscillator();u.type=h%2===0?"sawtooth":"triangle",u.frequency.value=r[h],u.detune.value=(h-2)*7,u.connect(l),u.start(),d.push(u)}l.connect(c),c.connect(t),this.sfxReverbSend&&c.connect(this.sfxReverbSend),o.start(),i.start(),this.spaceGraph={rumbleOsc:o,plasmaNoise:i,plasmaFilter:a,thrusterGain:n,warpOscs:d,warpFilter:l,warpGain:c}}setMasterVolume(e){this.masterVolume=Math.max(0,Math.min(1,e)),this.ctx&&this.masterGain&&this.masterGain.gain.setTargetAtTime(this.masterVolume,this.ctx.currentTime,.05)}setMusicVolume(e){this.musicVolume=Math.max(0,Math.min(1,e)),this.ctx&&this.musicBus&&this.musicBus.gain.setTargetAtTime(this.musicVolume,this.ctx.currentTime,.08)}setWorldSoundscape(e){const t=this.currentWorld!==e;if(this.currentWorld=e,this.chordIndex=0,this.stepIndex=0,!this.ctx||!this.musicBus)return;const o=Ne[e];this.musicReverbSend&&this.musicReverbSend.gain.setTargetAtTime(o.reverbSend,this.ctx.currentTime,.35),(t||this.padOscillators.length===0)&&(this.rebuildSoundscapePad(),this.restartSoundscapeTimer())}startSoundscapeEngine(){this.rebuildSoundscapePad(),this.restartSoundscapeTimer()}rebuildSoundscapePad(){if(!this.ctx||!this.musicBus)return;const e=this.ctx.currentTime;if(this.padGain){const n=this.padGain,r=this.padOscillators;n.gain.setTargetAtTime(1e-4,e,.35),window.setTimeout(()=>{for(const l of r)try{l.stop(),l.disconnect()}catch{}n.disconnect()},1500)}const t=Ne[this.currentWorld],o=t.padChords[0],s=this.ctx.createBiquadFilter();s.type="lowpass",s.frequency.value=t.padFilterHz,s.Q.value=.85;const i=this.ctx.createGain();i.gain.setValueAtTime(1e-4,e),i.gain.setTargetAtTime(.11,e+.05,.7),s.connect(i),i.connect(this.musicBus);const a=[];for(let n=0;n<o.length;n++){const r=this.ctx.createOscillator();r.type=t.padWaveform,r.frequency.value=o[n],r.detune.value=(n%2===0?1:-1)*(3+n*1.5),r.connect(s),r.start(e),a.push(r)}this.padFilter=s,this.padGain=i,this.padOscillators=a}restartSoundscapeTimer(){if(typeof window>"u")return;this.musicTimerId!==null&&(window.clearInterval(this.musicTimerId),this.musicTimerId=null);const e=Ne[this.currentWorld],t=Math.max(140,Math.round(60/e.bpm/2*1e3));this.musicTimerId=window.setInterval(()=>{this.tickGenerativeMusic()},t)}tickGenerativeMusic(){if(!this.ctx||!this.musicBus||this.ctx.state!=="running"||this.musicVolume<=.005)return;const e=Ne[this.currentWorld],t=this.ctx.currentTime,o=this.stepIndex%16;if(o===0&&this.stepIndex>0){this.chordIndex=(this.chordIndex+1)%e.padChords.length;const a=e.padChords[this.chordIndex];for(let n=0;n<this.padOscillators.length;n++){const r=a[n%a.length];this.padOscillators[n].frequency.setTargetAtTime(r,t,.45)}if(this.padFilter){const n=e.padFilterHz*(.85+.3*Math.sin(this.chordIndex*1.4));this.padFilter.frequency.setTargetAtTime(n,t,.8)}}const s=e.bassNotes[this.chordIndex%e.bassNotes.length];e.pulseBass?o%2===0&&this.triggerSynthNote(s,"sawtooth",.22,.14,340,t):o===0&&this.triggerSynthNote(s,"sine",2.4,.14,240,t);const i=this.currentWorld==="metropolis"||this.currentWorld==="extremeHorizon"?.62:.42;if(Math.random()<i){const a=(o*2+Math.floor(Math.random()*3))%e.arpNotes.length,n=e.arpNotes[a],r=this.currentWorld==="aetheria"||this.currentWorld==="starfield"?1.35:.55,l=this.currentWorld==="valheim"?1500:2800;this.triggerSynthNote(n,e.arpWaveform,r,.065,l,t)}(o===0||o===8||o===12&&Math.random()<e.percussionChance)&&e.percussionChance>.15&&this.triggerSoftKickOrTom(o===0?92:120,.08,t),this.stepIndex++}triggerSynthNote(e,t,o,s,i,a){if(!this.ctx||!this.musicBus)return;const n=this.ctx.createOscillator();n.type=t,n.frequency.setValueAtTime(e,a);const r=this.ctx.createBiquadFilter();r.type="lowpass",r.frequency.setValueAtTime(i,a),r.frequency.exponentialRampToValueAtTime(Math.max(140,i*.35),a+o);const l=this.ctx.createGain();l.gain.setValueAtTime(1e-4,a),l.gain.linearRampToValueAtTime(s,a+.016),l.gain.exponentialRampToValueAtTime(1e-4,a+o),n.connect(r),r.connect(l),l.connect(this.musicBus),n.start(a),n.stop(a+o+.03)}triggerSoftKickOrTom(e,t,o){if(!this.ctx||!this.musicBus)return;const s=this.ctx.createOscillator();s.type="sine",s.frequency.setValueAtTime(e,o),s.frequency.exponentialRampToValueAtTime(36,o+.16);const i=this.ctx.createGain();i.gain.setValueAtTime(1e-4,o),i.gain.linearRampToValueAtTime(t,o+.006),i.gain.exponentialRampToValueAtTime(1e-4,o+.22),s.connect(i),i.connect(this.musicBus),s.start(o),s.stop(o+.25)}playFootstep(e,t=!1){if(!this.ctx||!this.sfxBus||!this.whiteNoiseBuffer)return;this.ctx.state==="suspended"&&this.ctx.resume();const o=performance.now();if(o-this.lastFootstepAt<65)return;this.lastFootstepAt=o;const s=this.ctx.currentTime,i=.92+Math.random()*.16,a=t?1.32:.92;switch(e){case"asphalt":{this.playFilteredNoiseBurst(1750*i,2.4,.055,.11*a,"bandpass",s),this.playPitchDropThump(125*i,52,.065,.16*a,"sine",s);break}case"grass":{this.playFilteredNoiseBurst(3400*i,1.3,.095,.085*a,"bandpass",s),this.playPitchDropThump(82*i,42,.055,.08*a,"sine",s);break}case"wood":{this.playFilteredNoiseBurst(680*i,5.2,.075,.14*a,"bandpass",s),this.playPitchDropThump(195*i,118,.085,.2*a,"triangle",s);break}case"metal":{this.playFilteredNoiseBurst(2600*i,3.2,.06,.12*a,"highpass",s);const n=this.ctx.createOscillator(),r=this.ctx.createOscillator(),l=this.ctx.createGain(),c=this.ctx.createGain();n.type="triangle",n.frequency.setValueAtTime(510*i,s),r.type="sine",r.frequency.setValueAtTime(793*i,s),l.gain.setValueAtTime(240,s),l.gain.exponentialRampToValueAtTime(8,s+.14),c.gain.setValueAtTime(.11*a,s),c.gain.exponentialRampToValueAtTime(1e-4,s+.16),r.connect(l),l.connect(n.frequency),n.connect(c),c.connect(this.sfxBus),r.start(s),n.start(s),r.stop(s+.17),n.stop(s+.17);break}case"water":{const n=this.ctx.createBufferSource();n.buffer=this.whiteNoiseBuffer,n.playbackRate.value=.85+Math.random()*.3;const r=this.ctx.createBiquadFilter();r.type="bandpass",r.Q.value=3.8,r.frequency.setValueAtTime(480*i,s),r.frequency.exponentialRampToValueAtTime(2100*i,s+.14);const l=this.ctx.createGain();l.gain.setValueAtTime(.001,s),l.gain.linearRampToValueAtTime(.18*a,s+.02),l.gain.exponentialRampToValueAtTime(1e-4,s+.22),n.connect(r),r.connect(l),l.connect(this.sfxBus),n.start(s,Math.random()*1.5,.25);break}case"sand":{this.playFilteredNoiseBurst(2350*i,1.15,.115,.11*a,"bandpass",s),this.playPitchDropThump(92*i,46,.06,.09*a,"sine",s);break}case"snow":{this.playFilteredNoiseBurst(1380*i,1.9,.12,.13*a,"bandpass",s),this.playFilteredNoiseBurst(4600*i,2.8,.075,.08*a,"highpass",s+.012);break}case"rock":{this.playFilteredNoiseBurst(2150*i,3.1,.055,.13*a,"bandpass",s),this.playPitchDropThump(148*i,64,.07,.18*a,"triangle",s);break}}}playFilteredNoiseBurst(e,t,o,s,i,a){if(!this.ctx||!this.sfxBus||!this.whiteNoiseBuffer)return;const n=this.ctx.createBufferSource();n.buffer=this.whiteNoiseBuffer;const r=this.ctx.createBiquadFilter();r.type=i,r.frequency.setValueAtTime(e,a),r.Q.setValueAtTime(t,a);const l=this.ctx.createGain();l.gain.setValueAtTime(1e-4,a),l.gain.linearRampToValueAtTime(s,a+.005),l.gain.exponentialRampToValueAtTime(1e-4,a+o),n.connect(r),r.connect(l),l.connect(this.sfxBus);const c=Math.random()*Math.max(.1,this.whiteNoiseBuffer.duration-o-.05);n.start(a,c,o+.02)}playPitchDropThump(e,t,o,s,i,a){if(!this.ctx||!this.sfxBus)return;const n=this.ctx.createOscillator();n.type=i,n.frequency.setValueAtTime(e,a),n.frequency.exponentialRampToValueAtTime(Math.max(18,t),a+o);const r=this.ctx.createGain();r.gain.setValueAtTime(1e-4,a),r.gain.linearRampToValueAtTime(s,a+.004),r.gain.exponentialRampToValueAtTime(1e-4,a+o),n.connect(r),r.connect(this.sfxBus),n.start(a),n.stop(a+o+.02)}updateVehicleEngine(e,t,o=.5,s=0){if(!this.ctx||!this.vehicleGraph)return;const i=this.ctx.currentTime,a=this.vehicleGraph;if(!e){a.engineGain.gain.setTargetAtTime(0,i,.08),a.tireGain.gain.setTargetAtTime(0,i,.06);return}const n=Math.max(0,Math.min(1,t)),r=Math.max(0,Math.min(1,o)),l=Math.max(0,Math.min(1,s)),c=60+n*260;a.oscPrimary.frequency.setTargetAtTime(c,i,.035),a.oscSub.frequency.setTargetAtTime(c*.5,i,.035),a.oscHarmonic.frequency.setTargetAtTime(c*1.5,i,.035),a.oscFmMod.frequency.setTargetAtTime(c*2,i,.035),a.fmModGain.gain.setTargetAtTime(10+r*42+n*24,i,.04);const d=190+n*1050+r*320;if(a.exhaustFilter.frequency.setTargetAtTime(d,i,.04),a.engineGain.gain.setTargetAtTime(.09+n*.11+r*.06,i,.05),l>.08){const h=Math.min(.18,(l-.08)*.22),u=Math.sin(performance.now()*.028)*110;a.tireFilterA.frequency.setTargetAtTime(1780+n*260+u,i,.03),a.tireFilterB.frequency.setTargetAtTime(2560+n*310-u*.7,i,.03),a.tireGain.gain.setTargetAtTime(h,i,.04)}else a.tireGain.gain.setTargetAtTime(0,i,.05)}updateWindRush(e){if(!this.ctx||!this.ambienceGraph)return;const t=this.ctx.currentTime,o=Math.max(0,Math.min(1,e)),s=this.ambienceGraph;s.windFilterLow.frequency.setTargetAtTime(240+o*820,t,.08),s.windFilterHigh.frequency.setTargetAtTime(680+o*1950,t,.08),s.windGain.gain.setTargetAtTime(o*o*.24,t,.09)}updateRainAmbience(e){if(!this.ctx||!this.ambienceGraph)return;const t=this.ctx.currentTime,o=Math.max(0,Math.min(1,e));this.ambienceGraph.rainBand.frequency.setTargetAtTime(1650+o*650,t,.15),this.ambienceGraph.rainGain.gain.setTargetAtTime(o*.2,t,.2)}updateSpaceThruster(e,t,o=!1){if(!this.ctx||!this.spaceGraph)return;const s=this.ctx.currentTime,i=this.spaceGraph;if(!e){i.thrusterGain.gain.setTargetAtTime(0,s,.1),i.warpGain.gain.setTargetAtTime(0,s,.12);return}const a=Math.max(0,Math.min(1,t));i.rumbleOsc.frequency.setTargetAtTime(42+a*74,s,.06),i.plasmaFilter.frequency.setTargetAtTime(160+a*760,s,.06),i.thrusterGain.gain.setTargetAtTime(.05+a*.19,s,.07),o?(i.warpFilter.frequency.setTargetAtTime(2600,s,.18),i.warpGain.gain.setTargetAtTime(.14,s,.16)):(i.warpFilter.frequency.setTargetAtTime(650,s,.15),i.warpGain.gain.setTargetAtTime(0,s,.14))}playCannonFire(e=0){if(this.unlock(),!this.ctx||!this.sfxBus||!this.pinkNoiseBuffer)return;const t=this.ctx.currentTime,o=1/(1+Math.max(0,e)*.018),s=Math.max(380,3800-Math.max(0,e)*14);this.playPitchDropThump(105,24,.52,.48*o,"sine",t);const i=this.ctx.createBufferSource();i.buffer=this.pinkNoiseBuffer;const a=this.ctx.createBiquadFilter();a.type="lowpass",a.frequency.setValueAtTime(s,t),a.frequency.exponentialRampToValueAtTime(160,t+.95);const n=this.ctx.createWaveShaper();n.curve=this.createSoftClipCurve(5);const r=this.ctx.createGain();r.gain.setValueAtTime(.001,t),r.gain.linearRampToValueAtTime(.46*o,t+.008),r.gain.exponentialRampToValueAtTime(1e-4,t+1.05),i.connect(n),n.connect(a),a.connect(r),r.connect(this.sfxBus),this.sfxReverbSend&&r.connect(this.sfxReverbSend),i.start(t,0,1.1)}playLaserPulse(){if(this.unlock(),!this.ctx||!this.sfxBus)return;const e=this.ctx.currentTime,t=this.ctx.createOscillator(),o=this.ctx.createOscillator(),s=this.ctx.createGain(),i=this.ctx.createBiquadFilter(),a=this.ctx.createGain();t.type="sawtooth",t.frequency.setValueAtTime(1680,e),t.frequency.exponentialRampToValueAtTime(185,e+.16),o.type="sine",o.frequency.setValueAtTime(420,e),s.gain.setValueAtTime(320,e),s.gain.exponentialRampToValueAtTime(12,e+.15),i.type="bandpass",i.frequency.setValueAtTime(1900,e),i.frequency.exponentialRampToValueAtTime(420,e+.16),i.Q.value=2.4,a.gain.setValueAtTime(.001,e),a.gain.linearRampToValueAtTime(.24,e+.005),a.gain.exponentialRampToValueAtTime(1e-4,e+.18),o.connect(s),s.connect(t.frequency),t.connect(i),i.connect(a),a.connect(this.sfxBus),o.start(e),t.start(e),o.stop(e+.19),t.stop(e+.19)}playSwordSlash(){if(this.unlock(),!this.ctx||!this.sfxBus||!this.whiteNoiseBuffer)return;const e=this.ctx.currentTime,t=this.ctx.createBufferSource();t.buffer=this.whiteNoiseBuffer;const o=this.ctx.createBiquadFilter();o.type="bandpass",o.Q.value=3.2,o.frequency.setValueAtTime(520,e),o.frequency.exponentialRampToValueAtTime(2900,e+.075),o.frequency.exponentialRampToValueAtTime(680,e+.21);const s=this.ctx.createGain();s.gain.setValueAtTime(.001,e),s.gain.linearRampToValueAtTime(.24,e+.045),s.gain.exponentialRampToValueAtTime(1e-4,e+.22),t.connect(o),o.connect(s),s.connect(this.sfxBus),t.start(e,Math.random(),.24);const i=this.ctx.createOscillator(),a=this.ctx.createGain();i.type="sine",i.frequency.setValueAtTime(2850,e),i.frequency.exponentialRampToValueAtTime(1420,e+.14),a.gain.setValueAtTime(.055,e),a.gain.exponentialRampToValueAtTime(1e-4,e+.15),i.connect(a),a.connect(this.sfxBus),i.start(e),i.stop(e+.16)}playBowShot(){if(this.unlock(),!this.ctx||!this.sfxBus)return;const e=this.ctx.currentTime,t=this.ctx.createOscillator(),o=this.ctx.createGain();t.type="triangle",t.frequency.setValueAtTime(192,e),t.frequency.exponentialRampToValueAtTime(128,e+.18),o.gain.setValueAtTime(.22,e),o.gain.exponentialRampToValueAtTime(1e-4,e+.2),t.connect(o),o.connect(this.sfxBus),t.start(e),t.stop(e+.21),this.playFilteredNoiseBurst(3800,2.6,.14,.15,"highpass",e+.01)}playMagicCast(e){if(this.unlock(),!this.ctx||!this.sfxBus||!this.pinkNoiseBuffer)return;const t=this.ctx.currentTime;if(e==="fire"){const s=this.ctx.createBufferSource();s.buffer=this.pinkNoiseBuffer;const i=this.ctx.createBiquadFilter();i.type="bandpass",i.Q.value=1.6,i.frequency.setValueAtTime(220,t),i.frequency.exponentialRampToValueAtTime(1450,t+.16),i.frequency.exponentialRampToValueAtTime(340,t+.58);const a=this.ctx.createGain();a.gain.setValueAtTime(.001,t),a.gain.linearRampToValueAtTime(.32,t+.05),a.gain.exponentialRampToValueAtTime(1e-4,t+.62),s.connect(i),i.connect(a),a.connect(this.sfxBus),s.start(t,Math.random(),.65),this.playPitchDropThump(160,48,.35,.24,"sawtooth",t);return}const o=[1567.98,2093,2637.02,3520];for(let s=0;s<o.length;s++){const i=t+s*.042,a=this.ctx.createOscillator(),n=this.ctx.createGain();a.type="sine",a.frequency.setValueAtTime(o[s],i),n.gain.setValueAtTime(.001,i),n.gain.linearRampToValueAtTime(.11,i+.008),n.gain.exponentialRampToValueAtTime(1e-4,i+.42),a.connect(n),n.connect(this.sfxBus),this.sfxReverbSend&&n.connect(this.sfxReverbSend),a.start(i),a.stop(i+.45)}this.playFilteredNoiseBurst(5200,3.5,.32,.09,"highpass",t)}playTreeChop(e=!1){if(this.unlock(),!this.ctx||!this.sfxBus)return;const t=this.ctx.currentTime;if(this.playPitchDropThump(165,62,.11,.34,"triangle",t),this.playFilteredNoiseBurst(860,4.4,.09,.24,"bandpass",t),e){const o=this.ctx.createOscillator(),s=this.ctx.createBiquadFilter(),i=this.ctx.createGain();o.type="sawtooth",o.frequency.setValueAtTime(118,t+.14),o.frequency.exponentialRampToValueAtTime(48,t+.95),s.type="bandpass",s.frequency.value=420,s.Q.value=4.5,i.gain.setValueAtTime(.001,t+.14),i.gain.linearRampToValueAtTime(.16,t+.3),i.gain.exponentialRampToValueAtTime(1e-4,t+1),o.connect(s),s.connect(i),i.connect(this.sfxBus),o.start(t+.14),o.stop(t+1.02),this.playFilteredNoiseBurst(1600,.9,.75,.26,"bandpass",t+.85),this.playPitchDropThump(88,28,.42,.35,"sine",t+.9)}}playBuildSnap(){if(this.unlock(),!this.ctx||!this.sfxBus)return;const e=this.ctx.currentTime;this.playPitchDropThump(280,160,.055,.2,"triangle",e),this.playPitchDropThump(540,380,.065,.18,"sine",e+.038),this.playFilteredNoiseBurst(1900,3.8,.045,.11,"bandpass",e+.035)}playHorn(){if(this.unlock(),!this.ctx||!this.sfxBus)return;const e=this.ctx.currentTime,t=[415.3,523.25],o=this.ctx.createBiquadFilter();o.type="lowpass",o.frequency.value=1750;const s=this.ctx.createGain();s.gain.setValueAtTime(.001,e),s.gain.linearRampToValueAtTime(.22,e+.018),s.gain.setValueAtTime(.2,e+.28),s.gain.exponentialRampToValueAtTime(1e-4,e+.42),o.connect(s),s.connect(this.sfxBus);for(const i of t){const a=this.ctx.createOscillator();a.type="sawtooth",a.frequency.setValueAtTime(i,e),a.connect(o),a.start(e),a.stop(e+.44)}}playSonicBoom(){if(this.unlock(),!this.ctx||!this.sfxBus||!this.pinkNoiseBuffer)return;const e=this.ctx.currentTime;this.playPitchDropThump(135,19,.85,.52,"sine",e),this.playFilteredNoiseBurst(2200,.8,.12,.38,"bandpass",e);const t=this.ctx.createBufferSource();t.buffer=this.pinkNoiseBuffer;const o=this.ctx.createBiquadFilter();o.type="lowpass",o.frequency.setValueAtTime(1200,e),o.frequency.exponentialRampToValueAtTime(95,e+1.4);const s=this.ctx.createGain();s.gain.setValueAtTime(.001,e),s.gain.linearRampToValueAtTime(.45,e+.015),s.gain.exponentialRampToValueAtTime(1e-4,e+1.45),t.connect(o),o.connect(s),s.connect(this.sfxBus),this.sfxReverbSend&&s.connect(this.sfxReverbSend),t.start(e,0,1.5)}playUIClick(){if(this.unlock(),!this.ctx||!this.sfxBus)return;const e=this.ctx.currentTime,t=this.ctx.createOscillator(),o=this.ctx.createGain();t.type="sine",t.frequency.setValueAtTime(1320,e),t.frequency.exponentialRampToValueAtTime(2240,e+.038),o.gain.setValueAtTime(.001,e),o.gain.linearRampToValueAtTime(.09,e+.003),o.gain.exponentialRampToValueAtTime(1e-4,e+.048),t.connect(o),o.connect(this.sfxBus),t.start(e),t.stop(e+.052)}}const gt=new le(0,1,0),Fs=new le(1,0,0),he={jump:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/><path d="M4 20h16"/></svg>',attack:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 17.5 3 6V3h3l11.5 11.5"/><path d="M13 19l6-6"/><path d="m16 16 4 4"/><path d="m19 21 2-2"/></svg>',interact:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>',sprint:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',radial:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="3" x2="12" y2="9"/><line x1="12" y1="15" x2="12" y2="21"/><line x1="3" y1="12" x2="9" y2="12"/><line x1="15" y1="12" x2="21" y2="12"/></svg>',pedalGas:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="2" width="10" height="20" rx="3"/><line x1="10" y1="7" x2="14" y2="7"/><line x1="10" y1="12" x2="14" y2="12"/><line x1="10" y1="17" x2="14" y2="17"/></svg>',pedalBrake:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="6" width="16" height="12" rx="2.5"/><line x1="8" y1="10" x2="8" y2="14"/><line x1="12" y1="10" x2="12" y2="14"/><line x1="16" y1="10" x2="16" y2="14"/></svg>',drift:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 18c3-3 3-9 8-12"/><path d="M11 19c3-3 3-9 8-12"/><circle cx="7" cy="19" r="2"/><circle cx="13" cy="19" r="2"/></svg>',horn:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>',exit:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',laser:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="7"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><circle cx="12" cy="12" r="2"/></svg>',warp:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/></svg>',switchMode:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>',sailMinus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v15"/><path d="M12 4C7 7 5 12 5 16h7"/><line x1="16" y1="12" x2="22" y2="12"/></svg>',sailPlus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3v15"/><path d="M10 4C5 7 3 12 3 16h7"/><line x1="15" y1="12" x2="21" y2="12"/><line x1="18" y1="9" x2="18" y2="15"/></svg>',cannon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="17" r="3"/><path d="M4 14 19 6l2 4-11 7"/><circle cx="21" cy="5" r="1.5"/></svg>',anchor:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="3"/><line x1="12" y1="22" x2="12" y2="8"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/></svg>'};class Hs{state={moveX:0,moveZ:0,lookDeltaX:0,lookDeltaY:0,cameraYaw:0,cameraPitch:-.22,sprint:!1,jump:!1,jumpJustPressed:!1,crouch:!1,interactJustPressed:!1,primaryAction:!1,primaryJustPressed:!1,secondaryAction:!1,secondaryJustPressed:!1,handbrake:!1,hornJustPressed:!1,switchModeJustPressed:!1,cameraToggleJustPressed:!1,radialMenuOpen:!1,throttle:0,brake:0,rollAxis:0,usingTouch:!1,usingGamepad:!1,pointerLocked:!1};contextMode="HUB";canvas;uiRoot;keysDown=new Set;mouseButtonsDown=0;lastMouseClientX=0;lastMouseClientY=0;isRightDragLooking=!1;accumLookDX=0;accumLookDY=0;zoomMultiplier=1;pendingJump=!1;pendingInteract=!1;pendingPrimary=!1;pendingSecondary=!1;pendingHorn=!1;pendingSwitchMode=!1;pendingCameraToggle=!1;prevGpJump=!1;prevGpPrimary=!1;prevGpSecondary=!1;prevGpInteract=!1;prevGpHorn=!1;prevGpSwitch=!1;prevGpCamToggle=!1;touchForced=null;touchLayer=null;touchActionCluster=null;leftStickZone=null;leftStickKnob=null;rightStickZone=null;rightStickKnob=null;throttleFillEl=null;throttleThumbEl=null;leftTouchId=null;leftOriginX=0;leftOriginY=0;touchMoveX=0;touchMoveZ=0;touchAutoSprint=!1;rightStickTouchId=null;rightStickOriginX=0;rightStickOriginY=0;rightStickRateX=0;rightStickRateY=0;swipeLookTouchId=null;swipeLastX=0;swipeLastY=0;throttleSliderTouchId=null;touchFlightThrottle=0;touchGasPedal=0;touchBrakePedal=0;touchRollMinus=!1;touchRollPlus=!1;touchJumpHeld=!1;touchPrimaryHeld=!1;touchSprintHeld=!1;touchCrouchHeld=!1;touchHandbrakeHeld=!1;touchRadialToggled=!1;raycaster=new Xt;tmpOffset=new le;tmpDir=new le;tmpUp=new le;tmpQuat=new it;safeCameraOut=new le;smoothedSafeRatio=1;constructor(e,t){this.canvas=e??(typeof document<"u"?document.getElementById("omniverse-canvas"):null),this.uiRoot=t??(typeof document<"u"?document.getElementById("omniverse-ui"):null),typeof window<"u"&&((typeof navigator<"u"&&navigator.maxTouchPoints>0||typeof window.matchMedia=="function"&&window.matchMedia("(pointer: coarse)").matches)&&(this.state.usingTouch=!0),this.bindKeyboardAndMouse(),this.createTouchOverlay(),this.refreshTouchOverlayVisibility(),window.addEventListener("omniverse:close-radial",()=>{this.touchRadialToggled=!1}))}setContextMode(e){const t=this.contextMode!==e;if(this.contextMode=e,e==="HUB"&&(this.touchRadialToggled=!1,this.touchFlightThrottle=0,typeof document<"u"&&document.pointerLockElement))try{document.exitPointerLock()}catch{}t&&(this.resetTransientTouchButtons(),this.rebuildContextualTouchButtons()),this.refreshTouchOverlayVisibility()}getContextMode(){return this.contextMode}setTouchOverlayForced(e){this.touchForced=e,e===!0&&(this.state.usingTouch=!0),this.refreshTouchOverlayVisibility()}isTypingInFormField(e){if(!(e instanceof HTMLElement))return!1;const t=e.tagName;return t==="INPUT"||t==="TEXTAREA"||t==="SELECT"||e.isContentEditable}bindKeyboardAndMouse(){window.addEventListener("keydown",t=>{if(t.code==="F9"){t.preventDefault(),this.setTouchOverlayForced(this.touchForced!==!0);return}if(this.isTypingInFormField(t.target))return;t.code==="Tab"&&this.contextMode!=="HUB"&&t.preventDefault();const o=t.repeat;this.keysDown.add(t.code),o||(t.code==="Space"&&(this.pendingJump=!0),(t.code==="KeyE"||t.code==="KeyF")&&(this.pendingInteract=!0),t.code==="KeyH"&&(this.pendingHorn=!0),t.code==="KeyV"&&(this.pendingSwitchMode=!0),(t.code==="KeyR"||t.code==="KeyC"&&this.contextMode==="DRIVING")&&(this.pendingCameraToggle=!0))}),window.addEventListener("keyup",t=>{this.keysDown.delete(t.code)}),window.addEventListener("blur",()=>{this.keysDown.clear(),this.mouseButtonsDown=0,this.isRightDragLooking=!1}),document.addEventListener("pointerlockchange",()=>{this.state.pointerLocked=!!(this.canvas&&document.pointerLockElement===this.canvas)}),(this.canvas??window).addEventListener("mousedown",t=>{const o=t;if(this.contextMode!=="HUB"){if(this.canvas&&o.target===this.canvas&&!this.state.usingTouch&&document.pointerLockElement!==this.canvas&&o.button===0)try{this.canvas.requestPointerLock()}catch{}this.mouseButtonsDown=o.buttons,this.lastMouseClientX=o.clientX,this.lastMouseClientY=o.clientY,o.button===0?this.pendingPrimary=!0:o.button===2&&(this.pendingSecondary=!0,this.isRightDragLooking=!0)}}),window.addEventListener("mouseup",t=>{this.mouseButtonsDown=t.buttons,t.button===2&&(this.isRightDragLooking=!1)}),window.addEventListener("contextmenu",t=>{this.contextMode!=="HUB"&&t.target===this.canvas&&t.preventDefault()}),window.addEventListener("mousemove",t=>{if(this.contextMode==="HUB")return;const o=.0022;if(this.canvas&&document.pointerLockElement===this.canvas)this.accumLookDX+=t.movementX*o,this.accumLookDY+=t.movementY*o;else if((this.isRightDragLooking||(this.mouseButtonsDown&1)!==0)&&(t.target===this.canvas||this.isRightDragLooking)){const s=t.clientX-this.lastMouseClientX,i=t.clientY-this.lastMouseClientY;this.accumLookDX+=s*o*1.35,this.accumLookDY+=i*o*1.35}this.lastMouseClientX=t.clientX,this.lastMouseClientY=t.clientY}),window.addEventListener("wheel",t=>{this.contextMode==="HUB"||this.isTypingInFormField(t.target)||(t.target===this.canvas||this.state.pointerLocked)&&(this.zoomMultiplier=Math.max(.55,Math.min(1.85,this.zoomMultiplier+Math.sign(t.deltaY)*.08)))},{passive:!0}),window.addEventListener("touchstart",()=>{this.state.usingTouch||(this.state.usingTouch=!0,this.refreshTouchOverlayVisibility())},{passive:!0})}createTouchOverlay(){if(typeof document>"u")return;if(!document.getElementById("omniverse-touch-styles")){const n=document.createElement("style");n.id="omniverse-touch-styles",n.textContent=`
        .omni-touch-layer {
          position: fixed;
          inset: 0;
          z-index: 5;
          pointer-events: none;
          user-select: none;
          -webkit-user-select: none;
          touch-action: none;
          font-family: 'Rajdhani', 'Inter', sans-serif;
        }
        .omni-touch-swipe-right {
          position: absolute;
          top: 16%;
          right: 0;
          width: 54%;
          height: 84%;
          pointer-events: auto;
          touch-action: none;
        }
        .omni-stick-zone {
          position: absolute;
          bottom: max(12px, env(safe-area-inset-bottom, 10px));
          width: 90px;
          height: 90px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(12, 24, 42, 0.45) 0%, rgba(6, 12, 22, 0.68) 100%);
          border: 1.3px solid rgba(56, 226, 255, 0.36);
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
          pointer-events: auto;
          touch-action: none;
          backdrop-filter: blur(5px);
          opacity: 0.82;
        }
        .omni-stick-zone.left {
          left: max(14px, env(safe-area-inset-left, 12px));
        }
        .omni-stick-zone.left.sprint-active {
          border-color: rgba(255, 190, 72, 0.9);
          box-shadow: 0 0 18px rgba(255, 179, 71, 0.38);
          opacity: 1;
        }
        .omni-stick-knob {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 34px;
          height: 34px;
          margin-left: -17px;
          margin-top: -17px;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 35%, rgba(92, 236, 255, 0.9), rgba(18, 128, 178, 0.82));
          border: 1.2px solid rgba(255, 255, 255, 0.65);
          box-shadow: 0 3px 10px rgba(0, 0, 0, 0.45);
          pointer-events: none;
          transition: transform 0.03s linear;
        }
        .omni-touch-actions {
          position: absolute;
          right: max(10px, env(safe-area-inset-right, 8px));
          bottom: max(10px, env(safe-area-inset-bottom, 8px));
          width: 146px;
          height: 136px;
          pointer-events: none;
        }
        .omni-touch-btn {
          position: absolute;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1px;
          width: 42px;
          height: 42px;
          padding: 0;
          border-radius: 50%;
          background: rgba(8, 17, 32, 0.74);
          border: 1.2px solid rgba(82, 224, 255, 0.44);
          color: #eaf6ff;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.42);
          pointer-events: auto;
          touch-action: none;
          backdrop-filter: blur(5px);
          transition: transform 0.08s ease, background 0.08s ease, border-color 0.08s ease;
        }
        .omni-touch-btn svg {
          width: 16px;
          height: 16px;
        }
        .omni-touch-btn span {
          font-size: 7.5px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          line-height: 1;
          opacity: 0.88;
        }
        .omni-touch-btn.primary {
          width: 52px;
          height: 52px;
          border-color: rgba(56, 226, 255, 0.85);
          background: radial-gradient(circle, rgba(24, 92, 132, 0.8), rgba(10, 22, 42, 0.86));
        }
        .omni-touch-btn.primary svg {
          width: 20px;
          height: 20px;
        }
        .omni-touch-btn.pedal {
          width: 40px;
          height: 68px;
          border-radius: 11px;
        }
        .omni-touch-btn.active {
          transform: scale(0.92);
          background: rgba(56, 226, 255, 0.34);
          border-color: #ffffff;
        }
        .omni-throttle-slider {
          position: absolute;
          right: 112px;
          bottom: 6px;
          width: 26px;
          height: 88px;
          border-radius: 13px;
          background: rgba(9, 17, 32, 0.78);
          border: 1.2px solid rgba(56, 226, 255, 0.42);
          pointer-events: auto;
          touch-action: none;
          overflow: hidden;
        }
        .omni-throttle-fill {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          height: 0%;
          background: linear-gradient(180deg, rgba(56, 226, 255, 0.72), rgba(20, 110, 190, 0.45));
          pointer-events: none;
        }
        .omni-throttle-thumb {
          position: absolute;
          left: 3px;
          right: 3px;
          bottom: 3px;
          height: 12px;
          border-radius: 6px;
          background: #eaf8ff;
          box-shadow: 0 0 8px rgba(56, 226, 255, 0.9);
          pointer-events: none;
        }
        @media (max-height: 520px), (max-width: 760px) {
          .omni-stick-zone {
            width: 76px;
            height: 76px;
            bottom: max(8px, env(safe-area-inset-bottom, 6px));
          }
          .omni-stick-knob {
            width: 28px;
            height: 28px;
            margin-left: -14px;
            margin-top: -14px;
          }
          .omni-touch-btn {
            width: 37px;
            height: 37px;
          }
          .omni-touch-btn svg {
            width: 14px;
            height: 14px;
          }
          .omni-touch-btn span {
            font-size: 7px;
          }
          .omni-touch-btn.primary {
            width: 46px;
            height: 46px;
          }
          .omni-touch-btn.primary svg {
            width: 18px;
            height: 18px;
          }
          .omni-touch-btn.pedal {
            width: 36px;
            height: 58px;
            border-radius: 9px;
          }
          .omni-throttle-slider {
            right: 98px;
            height: 76px;
            width: 24px;
          }
        }
      `,document.head.appendChild(n)}const e=document.createElement("div");e.className="omni-touch-layer",e.style.display="none";const t=document.createElement("div");t.className="omni-touch-swipe-right",this.bindSwipeLookZone(t),e.appendChild(t);const o=document.createElement("div");o.className="omni-stick-zone left";const s=document.createElement("div");s.className="omni-stick-knob",o.appendChild(s),this.bindLeftThumbstick(o,s),e.appendChild(o);const i=document.createElement("div");i.className="omni-touch-actions",e.appendChild(i),this.touchLayer=e,this.leftStickZone=o,this.leftStickKnob=s,this.rightStickZone=null,this.rightStickKnob=null,this.touchActionCluster=i,this.uiRoot||(this.uiRoot=document.getElementById("omniverse-ui")),(this.uiRoot??document.body).prepend(e),this.rebuildContextualTouchButtons()}bindLeftThumbstick(e,t){let o=34;const s=a=>{const n=a.clientX-this.leftOriginX,r=a.clientY-this.leftOriginY,l=Math.hypot(n,r),c=Math.min(o,l),d=Math.atan2(r,n),h=Math.cos(d)*c,u=Math.sin(d)*c;t.style.transform=`translate3d(${h.toFixed(1)}px, ${u.toFixed(1)}px, 0)`;const p=l/o;if(p<.1)this.touchMoveX=0,this.touchMoveZ=0,this.touchAutoSprint=!1;else{const m=Math.min(1,(p-.1)/.9);this.touchMoveX=Math.cos(d)*m,this.touchMoveZ=-Math.sin(d)*m,this.touchAutoSprint=p>.84}e.classList.toggle("sprint-active",this.touchAutoSprint)};e.addEventListener("touchstart",a=>{if(a.preventDefault(),this.leftTouchId!==null)return;const n=a.changedTouches[0];if(!n)return;const r=e.getBoundingClientRect();o=Math.max(24,r.width*.38),this.leftTouchId=n.identifier,this.leftOriginX=r.left+r.width*.5,this.leftOriginY=r.top+r.height*.5,s(n)},{passive:!1}),e.addEventListener("touchmove",a=>{a.preventDefault();for(let n=0;n<a.changedTouches.length;n++){const r=a.changedTouches[n];if(r.identifier===this.leftTouchId){s(r);break}}},{passive:!1});const i=a=>{for(let n=0;n<a.changedTouches.length;n++)if(a.changedTouches[n].identifier===this.leftTouchId){this.leftTouchId=null,this.touchMoveX=0,this.touchMoveZ=0,this.touchAutoSprint=!1,t.style.transform="translate3d(0, 0, 0)",e.classList.remove("sprint-active");break}};e.addEventListener("touchend",i,{passive:!0}),e.addEventListener("touchcancel",i,{passive:!0})}bindSwipeLookZone(e){e.addEventListener("touchstart",o=>{if(this.swipeLookTouchId!==null)return;const s=o.changedTouches[0];s&&(this.swipeLookTouchId=s.identifier,this.swipeLastX=s.clientX,this.swipeLastY=s.clientY)},{passive:!0}),e.addEventListener("touchmove",o=>{for(let s=0;s<o.changedTouches.length;s++){const i=o.changedTouches[s];if(i.identifier===this.swipeLookTouchId){const a=i.clientX-this.swipeLastX,n=i.clientY-this.swipeLastY;this.swipeLastX=i.clientX,this.swipeLastY=i.clientY,this.accumLookDX+=a*.0052,this.accumLookDY+=n*.0052;break}}},{passive:!0});const t=o=>{for(let s=0;s<o.changedTouches.length;s++)if(o.changedTouches[s].identifier===this.swipeLookTouchId){this.swipeLookTouchId=null;break}};e.addEventListener("touchend",t,{passive:!0}),e.addEventListener("touchcancel",t,{passive:!0})}resetTransientTouchButtons(){this.touchGasPedal=0,this.touchBrakePedal=0,this.touchRollMinus=!1,this.touchRollPlus=!1,this.touchJumpHeld=!1,this.touchPrimaryHeld=!1,this.touchSprintHeld=!1,this.touchCrouchHeld=!1,this.touchHandbrakeHeld=!1,this.throttleSliderTouchId=null}refreshTouchOverlayVisibility(){if(!this.touchLayer)return;if(this.uiRoot===null&&typeof document<"u"){const t=document.getElementById("omniverse-ui");t&&this.touchLayer.parentElement!==t&&(this.uiRoot=t,t.prepend(this.touchLayer))}const e=this.contextMode!=="HUB"&&(this.touchForced===!0||this.touchForced!==!1&&this.state.usingTouch);this.touchLayer.style.display=e?"block":"none"}createTouchButton(e){const t=document.createElement("button");t.type="button",t.className=`omni-touch-btn ${e.extraClass??""}`.trim(),t.style.right=`${e.rightPx}px`,t.style.bottom=`${e.bottomPx}px`,t.innerHTML=`${e.svg}<span>${e.label}</span>`;let o=null;const s=a=>{const n=t.getBoundingClientRect();return n.height<=1?1:Math.max(.2,Math.min(1,1-(a-n.top)/n.height*.78))};if(t.addEventListener("touchstart",a=>{a.preventDefault(),a.stopPropagation();const n=a.changedTouches[0];n&&(o=n.identifier,t.classList.add("active"),e.onPress(),e.onMoveRatio&&e.onMoveRatio(s(n.clientY)))},{passive:!1}),e.onMoveRatio){const a=e.onMoveRatio;t.addEventListener("touchmove",n=>{n.preventDefault(),n.stopPropagation();for(let r=0;r<n.changedTouches.length;r++){const l=n.changedTouches[r];if(l.identifier===o){a(s(l.clientY));break}}},{passive:!1})}const i=a=>{for(let n=0;n<a.changedTouches.length;n++)if(a.changedTouches[n].identifier===o){o=null,t.classList.remove("active"),e.onRelease?.();break}};return t.addEventListener("touchend",i,{passive:!0}),t.addEventListener("touchcancel",i,{passive:!0}),t}rebuildContextualTouchButtons(){const e=this.touchActionCluster;if(e&&(e.innerHTML="",this.throttleFillEl=null,this.throttleThumbEl=null,this.contextMode!=="HUB")){if(this.contextMode==="ON_FOOT"){e.appendChild(this.createTouchButton({label:"Action",svg:he.attack,rightPx:2,bottomPx:2,extraClass:"primary",onPress:()=>{this.touchPrimaryHeld=!0,this.pendingPrimary=!0},onRelease:()=>{this.touchPrimaryHeld=!1}})),e.appendChild(this.createTouchButton({label:"Saut",svg:he.jump,rightPx:60,bottomPx:4,onPress:()=>{this.touchJumpHeld=!0,this.pendingJump=!0},onRelease:()=>{this.touchJumpHeld=!1}})),e.appendChild(this.createTouchButton({label:"Sprint",svg:he.sprint,rightPx:54,bottomPx:52,onPress:()=>{this.touchSprintHeld=!0,this.touchCrouchHeld=!0},onRelease:()=>{this.touchSprintHeld=!1,this.touchCrouchHeld=!1}})),e.appendChild(this.createTouchButton({label:"Activer",svg:he.interact,rightPx:4,bottomPx:60,onPress:()=>{this.pendingInteract=!0}})),e.appendChild(this.createTouchButton({label:"Roue",svg:he.radial,rightPx:106,bottomPx:4,onPress:()=>{this.touchRadialToggled=!this.touchRadialToggled}}));return}if(this.contextMode==="DRIVING"){e.appendChild(this.createTouchButton({label:"Gaz",svg:he.pedalGas,rightPx:2,bottomPx:2,extraClass:"pedal primary",onPress:()=>{this.touchGasPedal=1},onMoveRatio:t=>{this.touchGasPedal=t},onRelease:()=>{this.touchGasPedal=0}})),e.appendChild(this.createTouchButton({label:"Frein",svg:he.pedalBrake,rightPx:48,bottomPx:2,extraClass:"pedal",onPress:()=>{this.touchBrakePedal=1},onMoveRatio:t=>{this.touchBrakePedal=t},onRelease:()=>{this.touchBrakePedal=0}})),e.appendChild(this.createTouchButton({label:"Drift",svg:he.drift,rightPx:94,bottomPx:4,onPress:()=>{this.touchHandbrakeHeld=!0},onRelease:()=>{this.touchHandbrakeHeld=!1}})),e.appendChild(this.createTouchButton({label:"Klaxon",svg:he.horn,rightPx:48,bottomPx:76,onPress:()=>{this.pendingHorn=!0}})),e.appendChild(this.createTouchButton({label:"Sortir",svg:he.exit,rightPx:2,bottomPx:76,onPress:()=>{this.pendingInteract=!0}}));return}if(this.contextMode==="FLIGHT_SPACE"){const t=document.createElement("div");t.className="omni-throttle-slider",t.style.right="106px",t.style.bottom="4px";const o=document.createElement("div");o.className="omni-throttle-fill";const s=document.createElement("div");s.className="omni-throttle-thumb",t.appendChild(o),t.appendChild(s),this.throttleFillEl=o,this.throttleThumbEl=s,this.updateThrottleSliderUI(this.touchFlightThrottle);const i=n=>{const r=t.getBoundingClientRect();if(r.height<=1)return;const l=Math.max(0,Math.min(1,1-(n-r.top)/r.height));this.touchFlightThrottle=l,this.updateThrottleSliderUI(l)};t.addEventListener("touchstart",n=>{n.preventDefault(),n.stopPropagation();const r=n.changedTouches[0];r&&(this.throttleSliderTouchId=r.identifier,i(r.clientY))},{passive:!1}),t.addEventListener("touchmove",n=>{n.preventDefault(),n.stopPropagation();for(let r=0;r<n.changedTouches.length;r++){const l=n.changedTouches[r];if(l.identifier===this.throttleSliderTouchId){i(l.clientY);break}}},{passive:!1});const a=n=>{for(let r=0;r<n.changedTouches.length;r++)if(n.changedTouches[r].identifier===this.throttleSliderTouchId){this.throttleSliderTouchId=null;break}};t.addEventListener("touchend",a,{passive:!0}),t.addEventListener("touchcancel",a,{passive:!0}),e.appendChild(t),e.appendChild(this.createTouchButton({label:"Tir",svg:he.laser,rightPx:2,bottomPx:2,extraClass:"primary",onPress:()=>{this.touchPrimaryHeld=!0,this.pendingPrimary=!0},onRelease:()=>{this.touchPrimaryHeld=!1}})),e.appendChild(this.createTouchButton({label:"Boost",svg:he.warp,rightPx:58,bottomPx:6,onPress:()=>{this.touchSprintHeld=!0,this.touchJumpHeld=!0,this.pendingJump=!0},onRelease:()=>{this.touchSprintHeld=!1,this.touchJumpHeld=!1}})),e.appendChild(this.createTouchButton({label:"Mode",svg:he.switchMode,rightPx:56,bottomPx:54,onPress:()=>{this.pendingSwitchMode=!0}})),e.appendChild(this.createTouchButton({label:"Sortir",svg:he.exit,rightPx:4,bottomPx:60,onPress:()=>{this.pendingInteract=!0}}));return}this.contextMode==="NAVAL"&&(e.appendChild(this.createTouchButton({label:"Canons",svg:he.cannon,rightPx:2,bottomPx:2,extraClass:"primary",onPress:()=>{this.touchPrimaryHeld=!0,this.pendingPrimary=!0},onRelease:()=>{this.touchPrimaryHeld=!1}})),e.appendChild(this.createTouchButton({label:"Voile -",svg:he.sailMinus,rightPx:60,bottomPx:4,onPress:()=>{this.touchRollMinus=!0},onRelease:()=>{this.touchRollMinus=!1}})),e.appendChild(this.createTouchButton({label:"Voile +",svg:he.sailPlus,rightPx:54,bottomPx:52,onPress:()=>{this.touchRollPlus=!0},onRelease:()=>{this.touchRollPlus=!1}})),e.appendChild(this.createTouchButton({label:"Ancre",svg:he.anchor,rightPx:106,bottomPx:4,onPress:()=>{this.touchHandbrakeHeld=!0,this.touchCrouchHeld=!0},onRelease:()=>{this.touchHandbrakeHeld=!1,this.touchCrouchHeld=!1}})),e.appendChild(this.createTouchButton({label:"Quitter",svg:he.exit,rightPx:4,bottomPx:60,onPress:()=>{this.pendingInteract=!0}})))}}updateThrottleSliderUI(e){this.throttleFillEl&&(this.throttleFillEl.style.height=`${(e*100).toFixed(1)}%`),this.throttleThumbEl&&(this.throttleThumbEl.style.bottom=`calc(${(e*82).toFixed(1)}% + 2px)`)}applyRadialDeadzoneAndCubic(e,t){const s=Math.hypot(e,t);if(s<=.14)return{x:0,y:0};const i=Math.min(1,(s-.14)/(1-.14)),n=(.32*i+.68*i*i*i)/s;return{x:e*n,y:t*n}}update(e){const t=Math.max(.001,Math.min(.1,e)),o=this.keysDown.has("KeyW")||this.keysDown.has("KeyZ")||this.keysDown.has("ArrowUp")?1:0,s=this.keysDown.has("KeyS")||this.keysDown.has("ArrowDown")?1:0,i=this.keysDown.has("KeyA")||this.keysDown.has("KeyQ")||this.keysDown.has("ArrowLeft")?1:0;let n=(this.keysDown.has("KeyD")||this.keysDown.has("ArrowRight")?1:0)-i,r=o-s;const l=Math.hypot(n,r);l>1&&(n/=l,r/=l);const c=this.keysDown.has("ShiftLeft")||this.keysDown.has("ShiftRight"),d=this.keysDown.has("Space"),h=this.keysDown.has("ControlLeft")||this.keysDown.has("ControlRight")||this.keysDown.has("KeyC")&&this.contextMode!=="DRIVING",u=this.keysDown.has("Space"),p=this.keysDown.has("Tab");let m=0,g=0,y=0,C=0,M=0,x=0,T=!1,k=!1,w=!1,U=!1,G=!1,P=!1,v=!1,Q=!1,B=!1;if(typeof navigator<"u"&&typeof navigator.getGamepads=="function"){const H=navigator.getGamepads();for(let W=0;W<H.length;W++){const E=H[W];if(!E||!E.connected)continue;const re=this.applyRadialDeadzoneAndCubic(E.axes[0]??0,E.axes[1]??0),ee=this.applyRadialDeadzoneAndCubic(E.axes[2]??0,E.axes[3]??0);m=re.x,g=-re.y,y=ee.x*2.85*t,C=ee.y*2.25*t,T=!!E.buttons[0]?.pressed,k=!!E.buttons[1]?.pressed,w=!!E.buttons[2]?.pressed,U=!!E.buttons[3]?.pressed,G=!!E.buttons[4]?.pressed,P=!!E.buttons[5]?.pressed,x=E.buttons[6]?.value??0,M=E.buttons[7]?.value??0,v=!!E.buttons[10]?.pressed,Q=!!E.buttons[11]?.pressed,(Math.hypot(m,g)>.01||Math.hypot(ee.x,ee.y)>.01||M>.05||x>.05||T||k||w||U||G||P)&&(B=!0);break}}B?this.state.usingGamepad=!0:(l>0||this.accumLookDX!==0||this.accumLookDY!==0)&&(this.state.usingGamepad=!1);const F=T&&!this.prevGpJump,O=w&&!this.prevGpPrimary,j=x>.45&&!this.prevGpSecondary,J=U&&!this.prevGpInteract,Z=v&&this.contextMode==="DRIVING"&&!this.prevGpHorn,A=P&&!this.prevGpSwitch,X=Q&&!this.prevGpCamToggle;this.prevGpJump=T,this.prevGpPrimary=w,this.prevGpSecondary=x>.45,this.prevGpInteract=U,this.prevGpHorn=v&&this.contextMode==="DRIVING",this.prevGpSwitch=P,this.prevGpCamToggle=Q;let ne=n+m+this.touchMoveX,I=r+g+this.touchMoveZ;this.contextMode==="DRIVING"&&(this.touchGasPedal>0||this.touchBrakePedal>0?I+=this.touchGasPedal-this.touchBrakePedal:(M>.02||x>.02)&&(I+=M-x)),ne=Math.max(-1,Math.min(1,ne)),I=Math.max(-1,Math.min(1,I));const se=this.rightStickRateX*2.75*t,pe=this.rightStickRateY*2.15*t,de=this.accumLookDX+y+se,V=this.accumLookDY+C+pe;this.accumLookDX=0,this.accumLookDY=0,this.state.lookDeltaX=de,this.state.lookDeltaY=V,this.state.cameraYaw-=de,this.state.cameraPitch=Math.max(-1.38,Math.min(1.28,this.state.cameraPitch-V));let _=Math.max(o,M,this.touchGasPedal,this.contextMode==="FLIGHT_SPACE"?Math.max(this.touchFlightThrottle,Math.max(0,I)):Math.max(0,I)),L=Math.max(s,x,this.touchBrakePedal,Math.max(0,-I));_=Math.max(0,Math.min(1,_)),L=Math.max(0,Math.min(1,L));let R=0;if(this.touchRollMinus||this.touchRollPlus)R=(this.touchRollPlus?1:0)-(this.touchRollMinus?1:0);else if(this.contextMode==="NAVAL"){const H=(P?1:0)-(G?1:0);R=H!==0?H:ne}else R=ne;this.state.moveX=ne,this.state.moveZ=I,this.state.throttle=_,this.state.brake=L,this.state.rollAxis=Math.max(-1,Math.min(1,R)),this.state.sprint=c||v&&this.contextMode!=="DRIVING"||this.touchAutoSprint||this.touchSprintHeld,this.state.jump=d||T||this.touchJumpHeld,this.state.jumpJustPressed=this.pendingJump||F,this.state.crouch=h||k&&this.contextMode!=="DRIVING"||this.touchCrouchHeld,this.state.handbrake=u||k&&this.contextMode==="DRIVING"||this.touchHandbrakeHeld;const N=(this.mouseButtonsDown&1)!==0&&this.contextMode!=="HUB",z=(this.mouseButtonsDown&2)!==0&&this.contextMode!=="HUB";this.state.primaryAction=N||w||M>.65||this.touchPrimaryHeld,this.state.primaryJustPressed=this.pendingPrimary||O,this.state.secondaryAction=z||x>.45,this.state.secondaryJustPressed=this.pendingSecondary||j,this.state.interactJustPressed=this.pendingInteract||J,this.state.hornJustPressed=this.pendingHorn||Z,this.state.switchModeJustPressed=this.pendingSwitchMode||A&&this.contextMode!=="NAVAL",this.state.cameraToggleJustPressed=this.pendingCameraToggle||X,this.state.radialMenuOpen=this.contextMode!=="HUB"&&(p||G&&this.contextMode!=="NAVAL"||this.touchRadialToggled),this.pendingJump=!1,this.pendingInteract=!1,this.pendingPrimary=!1,this.pendingSecondary=!1,this.pendingHorn=!1,this.pendingSwitchMode=!1,this.pendingCameraToggle=!1}vibrate(e=110,t=.55,o=.25){if(!(typeof navigator>"u")){if(typeof navigator.getGamepads=="function"){const s=navigator.getGamepads();for(let i=0;i<s.length;i++){const a=s[i];if(!a||!a.connected)continue;const n=a.vibrationActuator;n&&typeof n.playEffect=="function"&&n.playEffect("dual-rumble",{startDelay:0,duration:Math.max(15,Math.min(2e3,e)),strongMagnitude:Math.max(0,Math.min(1,t)),weakMagnitude:Math.max(0,Math.min(1,o))}).catch(()=>{})}}if(this.state.usingTouch&&typeof navigator.vibrate=="function")try{navigator.vibrate(Math.min(200,Math.round(e*.45)))}catch{}}}computeSafeCameraPosition(e,t,o,s){const i=Math.max(.5,t*this.zoomMultiplier),a=this.state.cameraYaw,n=this.state.cameraPitch,r=Math.cos(n);this.tmpOffset.set(Math.sin(a)*r,-Math.sin(n),Math.cos(a)*r),s&&s.lengthSq()>1e-4&&(this.tmpUp.copy(s).normalize(),this.tmpUp.dot(gt)<-.9995?this.tmpQuat.setFromAxisAngle(Fs,Math.PI):this.tmpQuat.setFromUnitVectors(gt,this.tmpUp),this.tmpOffset.applyQuaternion(this.tmpQuat)),this.tmpDir.copy(this.tmpOffset).normalize();let l=1;if(o.length>0){this.raycaster.set(e,this.tmpDir),this.raycaster.near=.25,this.raycaster.far=i+.35;const d=this.raycaster.intersectObjects(o,!0);for(let h=0;h<d.length;h++){const u=d[h];if(!u.object.visible||u.object instanceof Tt)continue;const p=Math.max(.45,u.distance-.3);l=Math.min(l,p/i);break}}l<this.smoothedSafeRatio?this.smoothedSafeRatio+=(l-this.smoothedSafeRatio)*.55:this.smoothedSafeRatio+=(l-this.smoothedSafeRatio)*.14;const c=Math.max(.45,i*this.smoothedSafeRatio);return this.safeCameraOut.copy(e).addScaledVector(this.tmpDir,c)}}class Rt{root=new q;bodyPivot=new q;pelvisGroup=new q;spineGroup=new q;headGroup=new q;backpackGroup=new q;capeRoot=new q;capeSegments=[];paragliderGroup=new q;leftShoulder=new q;leftElbow=new q;leftHand=new q;rightShoulder=new q;rightElbow=new q;rightHand=new q;rightToolMount=new q;leftToolMount=new q;leftHip=new q;leftKnee=new q;leftAnkle=new q;rightHip=new q;rightKnee=new q;rightAnkle=new q;thrusterConeL;thrusterConeR;thrusterInnerL;thrusterInnerR;armorPrimaryMat;armorDarkMat;jointMetalMat;accentEmissiveMat;capeClothMat;flameOuterMat;flameCoreMat;toolMeshes=new Map;equippedTool="none";paragliderExplicitVisible=!1;paragliderScale=0;jetpackIntensity=0;gaitPhase=0;idleTime=0;rollAngle=0;attackPhase=0;nameplateSprite=null;nameplateTexture=null;lastNameplateKey="";constructor(e="#28e0ff"){this.root.name="PlayerAvatar";const t=new ae(e);this.armorPrimaryMat=new _e({color:14410992,roughness:.28,metalness:.45,clearcoat:.75,clearcoatRoughness:.2}),this.armorDarkMat=new ve({color:1975862,roughness:.46,metalness:.62}),this.jointMetalMat=new ve({color:3753305,roughness:.35,metalness:.82}),this.accentEmissiveMat=new _e({color:t,emissive:t,emissiveIntensity:1.85,roughness:.14,metalness:.25,clearcoat:1,clearcoatRoughness:.08}),this.capeClothMat=new ve({color:1450035,roughness:.78,metalness:.08,side:je}),this.flameOuterMat=new ve({color:16743209,emissive:16733440,emissiveIntensity:3.2,roughness:.2,metalness:0,transparent:!0,opacity:.86,depthWrite:!1}),this.flameCoreMat=new ve({color:15138815,emissive:7139583,emissiveIntensity:4.5,roughness:.1,metalness:0,transparent:!0,opacity:.95,depthWrite:!1}),this.bodyPivot.position.set(0,.9,0),this.root.add(this.bodyPivot),this.buildTorsoAndHead();const{coneL:o,coneR:s,innerL:i,innerR:a}=this.buildBackpackAndCape();this.thrusterConeL=o,this.thrusterConeR=s,this.thrusterInnerL=i,this.thrusterInnerR=a,this.buildArms(),this.buildLegs(),this.buildParaglider(),this.buildAttachableTools(),this.enableShadowsRecursive(this.bodyPivot),this.thrusterConeL.castShadow=!1,this.thrusterConeR.castShadow=!1,this.thrusterInnerL.castShadow=!1,this.thrusterInnerR.castShadow=!1,this.setJetpackFlame(0),this.setEquippedTool("none")}buildTorsoAndHead(){const e=new b(new te(.155,.135,.14,12),this.armorDarkMat);e.scale.set(1.12,1,.82),this.pelvisGroup.add(e);const t=new b(new $(.09,.055,.04),this.accentEmissiveMat);t.position.set(0,.02,.13),this.pelvisGroup.add(t),this.bodyPivot.add(this.pelvisGroup),this.spineGroup.position.set(0,.07,0),this.bodyPivot.add(this.spineGroup);const o=new b(new te(.15,.135,.18,12),this.armorDarkMat);o.position.set(0,.09,0),o.scale.set(1.06,1,.78),this.spineGroup.add(o);const s=new b(new te(.21,.16,.3,12),this.armorPrimaryMat);s.position.set(0,.29,.01),s.scale.set(1.16,1,.78),this.spineGroup.add(s);const i=new b(new $(.26,.22,.08),this.armorPrimaryMat);i.position.set(0,.3,.125),this.spineGroup.add(i);const a=new b(new Ze(.048,1),this.accentEmissiveMat);a.position.set(0,.31,.168),a.scale.set(1.1,1.3,.45),this.spineGroup.add(a);const n=new b(new Ke(.115,.024,10,20),this.jointMetalMat);n.rotation.x=Math.PI*.5,n.position.set(0,.45,.01),this.spineGroup.add(n),this.headGroup.position.set(0,.48,.01),this.spineGroup.add(this.headGroup);const r=new b(new te(.068,.078,.09,10),this.armorDarkMat);r.position.set(0,.04,0),this.headGroup.add(r);const l=new b(new Se(.145,20,16),this.armorPrimaryMat);l.position.set(0,.165,0),l.scale.set(.95,1.06,1.08),this.headGroup.add(l);const c=new b(new $(.17,.085,.16),this.armorDarkMat);c.position.set(0,.1,.045),this.headGroup.add(c);const d=new b(new Se(.138,18,12,-Math.PI*.34,Math.PI*.68,Math.PI*.3,Math.PI*.34),this.accentEmissiveMat);d.rotation.y=Math.PI*.5;const h=new q;h.position.set(0,.17,.022),d.rotation.set(0,0,0),d.rotation.y=-Math.PI*.5,h.add(d),this.headGroup.add(h);const u=new b(new $(.026,.065,.21),this.accentEmissiveMat);u.position.set(0,.295,-.02),u.rotation.x=-.18,this.headGroup.add(u);for(const p of[-1,1]){const m=new b(new te(.042,.042,.035,12),this.jointMetalMat);m.rotation.z=Math.PI*.5,m.position.set(p*.142,.165,-.005),this.headGroup.add(m)}}buildBackpackAndCape(){this.backpackGroup.position.set(0,.28,-.155),this.spineGroup.add(this.backpackGroup);const e=new b(new $(.26,.3,.11),this.armorDarkMat);this.backpackGroup.add(e);const t=new b(new $(.06,.24,.03),this.accentEmissiveMat);t.position.set(0,.01,-.062),this.backpackGroup.add(t);const o=l=>{const c=new b(new te(.052,.064,.22,12),this.armorPrimaryMat);c.position.set(l*.11,-.02,-.03),c.rotation.z=l*-.12,this.backpackGroup.add(c);const d=new b(new te(.042,.056,.06,12),this.jointMetalMat);d.position.set(l*.122,-.145,-.035),this.backpackGroup.add(d);const h=new ot(.048,.36,12);h.rotateX(Math.PI),h.translate(0,-.18,0);const u=new b(h,this.flameOuterMat);u.position.set(l*.122,-.17,-.035),this.backpackGroup.add(u);const p=new ot(.026,.22,10);p.rotateX(Math.PI),p.translate(0,-.11,0);const m=new b(p,this.flameCoreMat);return m.position.set(l*.122,-.17,-.035),this.backpackGroup.add(m),{outer:u,inner:m}},s=o(1),i=o(-1);this.capeRoot.position.set(0,.41,-.165),this.spineGroup.add(this.capeRoot);let a=this.capeRoot;const n=4,r=.2;for(let l=0;l<n;l++){const c=new q;c.position.set(0,l===0?0:-r,0);const d=.3+l*.035,h=new b(new $(d,r+.015,.012),this.capeClothMat);if(h.position.set(0,-r*.5,-.008),c.add(h),l===n-1){const u=new b(new $(d,.022,.016),this.accentEmissiveMat);u.position.set(0,-r+.01,-.008),c.add(u)}a.add(c),this.capeSegments.push(c),a=c}return{coneL:s.outer,coneR:i.outer,innerL:s.inner,innerR:i.inner}}buildArms(){const e=(t,o,s,i,a)=>{o.position.set(t*.265,.39,0),this.spineGroup.add(o);const n=new b(new Se(.095,14,12,0,Math.PI*2,0,Math.PI*.62),this.armorPrimaryMat);n.position.set(t*.02,.03,0),n.rotation.z=t*-.35,o.add(n);const r=new b(new Ke(.078,.011,8,16),this.accentEmissiveMat);r.rotation.x=Math.PI*.5,r.rotation.y=t*.35,r.position.set(t*.02,.005,0),o.add(r);const l=new b(new te(.056,.048,.27,10),this.armorDarkMat);l.position.set(0,-.145,0),o.add(l),s.position.set(0,-.28,0),o.add(s);const c=new b(new Se(.05,10,10),this.jointMetalMat);s.add(c);const d=new b(new te(.052,.042,.25,10),this.armorPrimaryMat);d.position.set(0,-.13,0),s.add(d);const h=new b(new $(.07,.12,.075),this.armorDarkMat);h.position.set(0,-.16,.008),s.add(h),i.position.set(0,-.265,0),s.add(i);const u=new b(new $(.062,.075,.075),this.jointMetalMat);u.position.set(0,-.025,.01),i.add(u),a.position.set(0,-.035,.035),i.add(a)};e(1,this.leftShoulder,this.leftElbow,this.leftHand,this.leftToolMount),e(-1,this.rightShoulder,this.rightElbow,this.rightHand,this.rightToolMount)}buildLegs(){const e=(t,o,s,i)=>{o.position.set(t*.13,0,0),this.bodyPivot.add(o);const a=new b(new Se(.068,10,10),this.jointMetalMat);o.add(a);const n=new b(new te(.084,.066,.4,12),this.armorPrimaryMat);n.position.set(0,-.21,0),o.add(n);const r=new b(new $(.11,.24,.045),this.armorDarkMat);r.position.set(t*.03,-.19,.055),o.add(r),s.position.set(0,-.42,0),o.add(s);const l=new b(new $(.095,.095,.095),this.jointMetalMat);l.position.set(0,0,.028),s.add(l);const c=new b(new te(.068,.054,.38,12),this.armorPrimaryMat);c.position.set(0,-.2,0),s.add(c);const d=new b(new $(.024,.22,.025),this.accentEmissiveMat);d.position.set(0,-.19,.062),s.add(d),i.position.set(0,-.4,0),s.add(i);const h=new b(new $(.115,.09,.22),this.armorDarkMat);h.position.set(0,-.035,.045),i.add(h);const u=new b(new $(.11,.055,.08),this.armorPrimaryMat);u.position.set(0,-.052,.135),i.add(u)};e(1,this.leftHip,this.leftKnee,this.leftAnkle),e(-1,this.rightHip,this.rightKnee,this.rightAnkle)}buildParaglider(){this.paragliderGroup.position.set(0,1.12,.05),this.paragliderGroup.visible=!1,this.spineGroup.add(this.paragliderGroup);const e=new ve({color:1713984,roughness:.42,metalness:.25,side:je});for(const o of[-1,1]){const s=new q;s.rotation.z=o*-.12,s.rotation.y=o*-.18;const i=new b(new $(1.38,.032,.66),e);i.position.set(o*.68,.36,-.08),s.add(i);const a=new b(new te(.026,.018,1.4,10),this.armorPrimaryMat);a.rotation.z=Math.PI*.5,a.position.set(o*.68,.37,.25),s.add(a);const n=new b(new $(.14,.042,.56),this.accentEmissiveMat);n.position.set(o*1.35,.365,-.08),s.add(n),this.paragliderGroup.add(s)}const t=new b(new te(.016,.016,.64,10),this.jointMetalMat);t.rotation.z=Math.PI*.5,t.position.set(0,-.1,.14),this.paragliderGroup.add(t);for(const o of[-1,1]){const s=new b(new te(.008,.008,.52,8),this.jointMetalMat);s.position.set(o*.28,.14,.06),s.rotation.z=o*-.16,s.rotation.x=.28,this.paragliderGroup.add(s)}}buildAttachableTools(){const e=new ve({color:7227174,roughness:.78,metalness:.06}),t=new ve({color:12766424,roughness:.26,metalness:.88}),o=new ve({color:16738842,emissive:16729344,emissiveIntensity:3.4,roughness:.2,metalness:.1}),s=new _e({color:10219263,emissive:2938111,emissiveIntensity:2.2,roughness:.08,metalness:.1,clearcoat:1}),i=new q,a=new b(new te(.018,.02,.18,10),this.armorDarkMat);a.rotation.x=Math.PI*.5,i.add(a);const n=new b(new $(.22,.035,.045),this.jointMetalMat);n.position.set(0,0,.095),i.add(n);const r=new b(new $(.045,.016,.86),t);r.position.set(0,0,.53),i.add(r);const l=new b(new $(.054,.008,.84),this.accentEmissiveMat);l.position.set(0,0,.53),i.add(l),this.rightToolMount.add(i),this.toolMeshes.set("sword",i);const c=new q,d=new b(new Ke(.42,.018,8,24,Math.PI*.86),e);d.rotation.y=Math.PI*.5,d.rotation.z=-Math.PI*.43,d.position.set(0,0,-.06),c.add(d);const h=new b(new te(.004,.004,.8,6),this.accentEmissiveMat);h.position.set(0,0,-.05),c.add(h),this.leftToolMount.add(c),this.toolMeshes.set("bow",c);const u=new q,p=new b(new $(.075,.13,.46),this.armorDarkMat);p.position.set(0,.02,.16),u.add(p);const m=new b(new te(.022,.026,.34,12),this.jointMetalMat);m.rotation.x=Math.PI*.5,m.position.set(0,.045,.46),u.add(m);const g=new b(new $(.082,.036,.24),this.accentEmissiveMat);g.position.set(0,.05,.24),u.add(g),this.rightToolMount.add(u),this.toolMeshes.set("laser",u);const y=new q,C=new b(new te(.019,.022,.68,10),e);C.rotation.x=Math.PI*.5,C.position.set(0,0,.26),y.add(C);const M=new b(new $(.035,.22,.16),t);M.position.set(0,-.04,.52),y.add(M),this.rightToolMount.add(y),this.toolMeshes.set("axe",y);const x=new q,T=new b(new te(.02,.022,.62,10),e);T.rotation.x=Math.PI*.5,T.position.set(0,0,.24),x.add(T);const k=new b(new $(.16,.22,.15),t);k.position.set(0,0,.5),x.add(k),this.rightToolMount.add(x),this.toolMeshes.set("hammer",x);const w=new q,U=new b(new te(.016,.02,.92,10),this.armorDarkMat);U.rotation.x=Math.PI*.5,U.position.set(0,0,.34),w.add(U);const G=new b(new Ze(.085,1),o);G.position.set(0,0,.86),w.add(G),this.rightToolMount.add(w),this.toolMeshes.set("magic_fire",w);const P=new q,v=new b(new te(.016,.02,.92,10),this.armorPrimaryMat);v.rotation.x=Math.PI*.5,v.position.set(0,0,.34),P.add(v);const Q=new b(new Ze(.09,0),s);Q.scale.set(.75,.75,1.5),Q.position.set(0,0,.88),P.add(Q),this.rightToolMount.add(P),this.toolMeshes.set("magic_ice",P)}enableShadowsRecursive(e){e.traverse(t=>{t instanceof b&&(t.castShadow=!0,t.receiveShadow=!0)})}setAccentColor(e){const t=new ae(e);this.accentEmissiveMat.color.copy(t),this.accentEmissiveMat.emissive.copy(t)}setEquippedTool(e){this.equippedTool=e;for(const[t,o]of this.toolMeshes.entries())o.visible=t===e}getEquippedTool(){return this.equippedTool}setParagliderVisible(e){this.paragliderExplicitVisible=e,e&&(this.paragliderGroup.visible=!0)}setJetpackFlame(e){this.jetpackIntensity=Math.max(0,Math.min(2,e));const t=this.jetpackIntensity>.02;if(this.thrusterConeL.visible=t,this.thrusterConeR.visible=t,this.thrusterInnerL.visible=t,this.thrusterInnerR.visible=t,t){const o=.88+Math.sin(performance.now()*.055)*.14,s=Math.max(.15,this.jetpackIntensity*o),i=.75+this.jetpackIntensity*.35;this.thrusterConeL.scale.set(i,s,i),this.thrusterConeR.scale.set(i,s,i),this.thrusterInnerL.scale.set(i*.85,s*.8,i*.85),this.thrusterInnerR.scale.set(i*.85,s*.8,i*.85)}}setNameplate(e,t="#28e0ff"){const o=e.trim().slice(0,22);if(!o){this.nameplateSprite&&(this.nameplateSprite.visible=!1);return}const s=`${o}|${t}`;if(s===this.lastNameplateKey&&this.nameplateSprite){this.nameplateSprite.visible=!0;return}if(this.lastNameplateKey=s,typeof document>"u")return;const i=document.createElement("canvas");i.width=512,i.height=128;const a=i.getContext("2d");if(!a)return;a.clearRect(0,0,i.width,i.height);const n=28,r=24,l=i.width-n*2,c=i.height-r*2,d=38;a.beginPath(),a.roundRect(n,r,l,c,d),a.fillStyle="rgba(7, 12, 24, 0.82)",a.fill(),a.lineWidth=4,a.strokeStyle=t,a.stroke(),a.beginPath(),a.arc(n+40,i.height*.5,11,0,Math.PI*2),a.fillStyle=t,a.fill(),a.font='700 38px "Rajdhani", "Inter", sans-serif',a.fillStyle="#f4f8ff",a.textAlign="center",a.textBaseline="middle",a.fillText(o,i.width*.5+14,i.height*.5+2),this.nameplateTexture&&this.nameplateTexture.dispose();const h=new $t(i);if(h.colorSpace=Ue,h.needsUpdate=!0,this.nameplateTexture=h,this.nameplateSprite)this.nameplateSprite.material.map=h,this.nameplateSprite.material.needsUpdate=!0,this.nameplateSprite.visible=!0;else{const u=new Qt({map:h,transparent:!0,depthWrite:!1});this.nameplateSprite=new Tt(u),this.nameplateSprite.position.set(0,2.12,0),this.nameplateSprite.scale.set(1.45,.36,1),this.root.add(this.nameplateSprite)}}updateAnimation(e,t,o,s=0,i=0){const a=Math.max(1e-4,Math.min(.1,e)),n=1-Math.exp(-a*14);this.idleTime+=a;const l=this.paragliderExplicitVisible||t==="glide"?1:0;this.paragliderScale+=(l-this.paragliderScale)*(1-Math.exp(-a*12)),this.paragliderScale>.01?(this.paragliderGroup.visible=!0,this.paragliderGroup.scale.setScalar(this.paragliderScale)):this.paragliderGroup.visible=!1,this.jetpackIntensity>.02&&this.setJetpackFlame(this.jetpackIntensity);let c=.9,d=0,h=Math.max(-.38,Math.min(.38,-s*.25)),u=0,p=0,m=0,g=0,y=Math.max(-.4,Math.min(.4,s*.16)),C=0,M=0,x=.03,T=-.03,k=.05,w=.05,U=0,G=0,P=0,v=0,Q=.1,B=-.1,F=-.18,O=-.18;const j=Math.max(-.7,Math.min(.7,i));switch(t){case"idle":{const A=Math.sin(this.idleTime*2.1);c=.9+A*.008,u=A*.02,Q=.11+A*.015,B=-.11-A*.015,this.equippedTool!=="none"&&(v=-.35,O=-.55),this.rollAngle=0,this.attackPhase=0;break}case"walk":case"run":{const A=Math.max(.25,Math.min(1.6,o/(t==="run"?8.5:4.2))),X=(t==="run"?10.5:6.8)*(.75+A*.35);this.gaitPhase+=a*X;const ne=(t==="run"?.82:.48)*Math.min(1.25,A),I=Math.sin(this.gaitPhase),se=Math.sin(this.gaitPhase+Math.PI),pe=t==="run"?.048:.024,de=Math.abs(j)*.08;c=.9+Math.abs(Math.cos(this.gaitPhase))*pe-de,u=(t==="run"?.18:.07)+j*.25,p=-I*.09,g=-u*.55;const V=Math.max(0,j)*.45;C=-I*ne-(I>0?V*.5:0),M=-se*ne-(se>0?V*.5:0);const _=Math.max(0,Math.cos(this.gaitPhase-.35)),L=Math.max(0,Math.cos(this.gaitPhase+Math.PI-.35));k=.08+_*(t==="run"?1.18:.68)+(I>0?V:0),w=.08+L*(t==="run"?1.18:.68)+(se>0?V:0),U=-(C+k)*.35-j*.4,G=-(M+w)*.35-j*.4;const R=t==="run"?.76:.42;P=I*R,v=se*R,F=t==="run"?-.82-Math.max(0,-I)*.3:-.32,O=t==="run"?-.82-Math.max(0,-se)*.3:-.32,this.equippedTool==="laser"&&(v=-.65,O=-.65),this.rollAngle=0,this.attackPhase=0;break}case"jump":{c=.94,u=.12,C=-.52,M=-.28,k=.88,w=.55,P=.35,v=.35,Q=.38,B=-.38,F=-.45,O=-.45,this.rollAngle=0;break}case"roll":{this.rollAngle=(this.rollAngle+a*Math.PI*3.4)%(Math.PI*2),c=.56,d=this.rollAngle,u=.55,g=.42,C=-1.45,M=-1.45,k=1.95,w=1.95,P=-1.1,v=-1.1,F=-1.6,O=-1.6;break}case"swim":{this.gaitPhase+=a*4.8;const A=Math.sin(this.gaitPhase),X=Math.sin(this.gaitPhase*2);c=.65+Math.sin(this.idleTime*2.4)*.04,d=Math.PI*.43,g=-.58,P=-1.35+A*.85,v=-1.35-A*.85,Q=.45+Math.max(0,A)*.45,B=-.45-Math.max(0,-A)*.45,F=-.45-Math.max(0,-A)*.5,O=-.45-Math.max(0,A)*.5,C=X*.34,M=-X*.34,k=.22+Math.max(0,-X)*.32,w=.22+Math.max(0,X)*.32,U=.5,G=.5,this.rollAngle=0;break}case"climb":{const A=Math.max(.2,o);this.gaitPhase+=a*(3.2+A*1.4);const X=Math.sin(this.gaitPhase);c=.9,u=-.08,g=-.42,P=-2.35-X*.48,v=-2.35+X*.48,Q=.22,B=-.22,F=-.55+X*.25,O=-.55-X*.25,C=-.82+X*.55,M=-.82-X*.55,x=.16,T=-.16,k=1.15-X*.55,w=1.15+X*.55,this.rollAngle=0;break}case"drive":{c=.52,h=Math.max(-.22,Math.min(.22,-s*.15)),u=-.08,C=-1.38,M=-1.38,x=.12,T=-.12,k=1.42,w=1.42;const A=Math.max(-.5,Math.min(.5,s*.35));P=-1.08+A*.28,v=-1.08-A*.28,Q=.04,B=-.04,F=-.42,O=-.42,this.rollAngle=0;break}case"glide":{const A=Math.sin(this.idleTime*2.8);c=.88,d=.16,P=-2.68,v=-2.68,Q=.24,B=-.24,F=-.28,O=-.28,C=.22+A*.06,M=.14-A*.06,k=.48,w=.62,this.rollAngle=0;break}case"attack":{this.attackPhase=(this.attackPhase+a*7.5)%(Math.PI*2);const A=Math.sin(this.attackPhase);c=.87,u=.16,p=A*.48,this.equippedTool==="bow"?(P=-1.48,F=-.08,v=-1.42,O=-1.35-Math.max(0,A)*.35):this.equippedTool==="laser"?(v=-1.42+Math.max(0,A)*.12,O=-.25,P=-1.25,Q=-.28,F=-.65):(v=-1.85+A*1.45,B=-.32+A*.25,O=-.48,P=.35,Q=.32,F=-.55),C=-.25,M=.22,k=.38,w=.28,this.rollAngle=0;break}}this.bodyPivot.position.y+=(c-this.bodyPivot.position.y)*n,t==="roll"?this.bodyPivot.rotation.x=d:this.bodyPivot.rotation.x+=(d-this.bodyPivot.rotation.x)*n,this.bodyPivot.rotation.z+=(h-this.bodyPivot.rotation.z)*n,this.spineGroup.rotation.x+=(u-this.spineGroup.rotation.x)*n,this.spineGroup.rotation.y+=(p-this.spineGroup.rotation.y)*n,this.spineGroup.rotation.z+=(m-this.spineGroup.rotation.z)*n,this.headGroup.rotation.x+=(g-this.headGroup.rotation.x)*n,this.headGroup.rotation.y+=(y-this.headGroup.rotation.y)*n,this.leftHip.rotation.x+=(C-this.leftHip.rotation.x)*n,this.rightHip.rotation.x+=(M-this.rightHip.rotation.x)*n,this.leftHip.rotation.z+=(x-this.leftHip.rotation.z)*n,this.rightHip.rotation.z+=(T-this.rightHip.rotation.z)*n,this.leftKnee.rotation.x+=(k-this.leftKnee.rotation.x)*n,this.rightKnee.rotation.x+=(w-this.rightKnee.rotation.x)*n,this.leftAnkle.rotation.x+=(U-this.leftAnkle.rotation.x)*n,this.rightAnkle.rotation.x+=(G-this.rightAnkle.rotation.x)*n,this.leftShoulder.rotation.x+=(P-this.leftShoulder.rotation.x)*n,this.rightShoulder.rotation.x+=(v-this.rightShoulder.rotation.x)*n,this.leftShoulder.rotation.z+=(Q-this.leftShoulder.rotation.z)*n,this.rightShoulder.rotation.z+=(B-this.rightShoulder.rotation.z)*n,this.leftElbow.rotation.x+=(F-this.leftElbow.rotation.x)*n,this.rightElbow.rotation.x+=(O-this.rightElbow.rotation.x)*n;const J=Math.min(1.2,o/10),Z=t==="glide"?.92:t==="jump"?.65:.08+J*.68;for(let A=0;A<this.capeSegments.length;A++){const X=this.capeSegments[A],ne=Math.sin(this.idleTime*(4.2+J*5)-A*.85)*(.04+J*.09),I=(A===0?Z:.08)+ne,se=Math.max(-.25,Math.min(.25,s*.08*(A+1)));X.rotation.x+=(I-X.rotation.x)*n,X.rotation.z+=(se-X.rotation.z)*n}}dispose(){this.nameplateTexture&&(this.nameplateTexture.dispose(),this.nameplateTexture=null),this.root.traverse(e=>{e instanceof b&&e.geometry.dispose()}),this.armorPrimaryMat.dispose(),this.armorDarkMat.dispose(),this.jointMetalMat.dispose(),this.accentEmissiveMat.dispose(),this.capeClothMat.dispose(),this.flameOuterMat.dispose(),this.flameCoreMat.dispose()}}const Qe="ABCDEFGHJKLMNPQRSTUVWXYZ23456789",Gs="axeldelaro-3dgames-omniverse-v1",Vs=95,vt=62,wt=["#28e0ff","#ffb347","#66f2a5","#ff6b8b","#a78bfa","#ffd166"];function Ge(f,e,t,o,s){const i=s*s,a=i*s,n=2*a-3*i+1,r=a-2*i+s,l=-2*a+3*i,c=a-i;return n*f+r*e+l*t+c*o}function zs(f,e,t){let o=(e-f+Math.PI)%(Math.PI*2)-Math.PI;return o<-Math.PI&&(o+=Math.PI*2),f+o*t}class Re{selfPeerId;_roomCode;_isHost=!0;playerName;playerColor;selfJoinedAt=Date.now();currentLocalWorldId="metropolis";lastSentAnim="idle";lastSentVehicleId=null;lastSentTool="none";lastPlayerSendMs=0;lastVehicleSendMs=new Map;trysteroRoom=null;sendPlrAction=null;sendVehAction=null;sendEvtAction=null;sendCtlAction=null;peerJsInstance=null;isPeerJsHub=!1;peerJsConnections=new Set;heartbeatTimerId=null;msgSeq=0;seenMsgIds=new Set;seenMsgQueue=[];peers=new Map;remoteVehicles=new Map;vehicleOccupancy=new Map;worldEventListeners=new Set;peersChangedListeners=new Set;tmpQuatA=new it;tmpQuatB=new it;tmpSeatVec=new le;constructor(){this.selfPeerId=Re.generateRandomId("omni",10);const e=Math.floor(Math.random()*wt.length);this.playerColor=wt[e],this.playerName=`Pilote-${this.selfPeerId.slice(-4).toUpperCase()}`;const t=Re.extractRoomFromUrl();this._roomCode=t??Re.generateRoomCode()}get roomCode(){return this._roomCode}get isHost(){return this._isHost}static generateRandomId(e,t){let o=`${e}_`;for(let s=0;s<t;s++)o+=Qe[Math.floor(Math.random()*Qe.length)].toLowerCase();return o}static generateRoomCode(){let e="";for(let t=0;t<4;t++)e+=Qe[Math.floor(Math.random()*Qe.length)];return e}static sanitizeRoomCode(e){const t=e.trim().toUpperCase().replace(/^OMNI-/,"").replace(/[^A-Z0-9]/g,"").slice(0,4);return t.length>=3?t.padEnd(4,"X"):Re.generateRoomCode()}static extractRoomFromUrl(){if(typeof window>"u")return null;try{const t=new URLSearchParams(window.location.search).get("room");if(t&&t.trim().length>=3)return Re.sanitizeRoomCode(t)}catch{}return null}nextMsgId(){return this.msgSeq=(this.msgSeq+1)%1e9,`${this.selfPeerId}:${this.msgSeq.toString(36)}`}markMessageSeen(e){if(!e||this.seenMsgIds.has(e))return!1;if(this.seenMsgIds.add(e),this.seenMsgQueue.push(e),this.seenMsgQueue.length>600){const t=this.seenMsgQueue.shift();t&&this.seenMsgIds.delete(t)}return!0}async joinOrCreateRoom(e){const t=e.trim()?Re.sanitizeRoomCode(e):this._roomCode;await this.leaveRoom(),this._roomCode=t;try{const o=`OMNI-${this._roomCode}`,s=is({appId:Gs},o);this.trysteroRoom=s;const i=s.makeAction("plr"),a=s.makeAction("veh"),n=s.makeAction("evt"),r=s.makeAction("ctl");this.sendPlrAction=l=>i.send(l),this.sendVehAction=l=>a.send(l),this.sendEvtAction=l=>n.send(l),this.sendCtlAction=l=>r.send(l),i.onMessage((l,c)=>{this.handleIncomingPlayer(l,c.peerId)}),a.onMessage(l=>{this.handleIncomingVehicle(l)}),n.onMessage(l=>{this.handleIncomingWorldEvent(l)}),r.onMessage((l,c)=>{this.handleIncomingControl(l,c.peerId)}),s.onPeerJoin(l=>{this.sendHello(l.peerId)}),s.onPeerLeave(l=>{for(const[c,d]of this.peers.entries())d.trysteroPeerId===l.peerId&&this.peerJsConnections.size===0&&this.removePeer(c)}),s.onError(()=>{})}catch{this.trysteroRoom=null}this.startPeerJsBridge(this._roomCode),typeof window<"u"&&(this.heartbeatTimerId=window.setInterval(()=>{this.tickHeartbeat()},2e3)),this.recomputeHostElection(),this.emitPeersChanged()}startPeerJsBridge(e){if(typeof window>"u")return;const t=`omni-3dgames-v1-${e.toLowerCase()}`;try{const o=new dt(t);this.peerJsInstance=o,this.isPeerJsHub=!1,o.on("open",()=>{this.peerJsInstance===o&&(this.isPeerJsHub=!0,this.recomputeHostElection())}),o.on("connection",s=>{this.attachPeerJsConnection(s,!0)}),o.on("error",s=>{if(s.type==="unavailable-id"&&this.peerJsInstance===o){try{o.destroy()}catch{}this.connectAsPeerJsClient(t)}})}catch{this.peerJsInstance=null}}connectAsPeerJsClient(e){try{const t=new dt;this.peerJsInstance=t,this.isPeerJsHub=!1,t.on("open",()=>{if(this.peerJsInstance!==t)return;const o=t.connect(e,{reliable:!0});this.attachPeerJsConnection(o,!1)}),t.on("connection",o=>{this.attachPeerJsConnection(o,!1)}),t.on("error",()=>{})}catch{this.peerJsInstance=null}}attachPeerJsConnection(e,t){e.on("open",()=>{this.peerJsConnections.add(e),this.sendHello(null)}),e.on("data",s=>{if(!s||typeof s!="object")return;const i=s;if(!(!("ch"in i)||!("data"in i))){if(t&&this.isPeerJsHub){for(const a of this.peerJsConnections)if(a!==e&&a.open)try{a.send(i)}catch{}}switch(i.ch){case"plr":this.handleIncomingPlayer(i.data,null);break;case"veh":this.handleIncomingVehicle(i.data);break;case"evt":this.handleIncomingWorldEvent(i.data);break;case"ctl":this.handleIncomingControl(i.data,null);break}}});const o=()=>{this.peerJsConnections.delete(e)};e.on("close",o),e.on("error",o)}dispatchFrame(e){this.markMessageSeen(e.data.msgId);try{e.ch==="plr"&&this.sendPlrAction?this.sendPlrAction(e.data).catch(()=>{}):e.ch==="veh"&&this.sendVehAction?this.sendVehAction(e.data).catch(()=>{}):e.ch==="evt"&&this.sendEvtAction?this.sendEvtAction(e.data).catch(()=>{}):e.ch==="ctl"&&this.sendCtlAction&&this.sendCtlAction(e.data).catch(()=>{})}catch{}for(const t of this.peerJsConnections)if(t.open)try{t.send(e)}catch{}}sendHello(e){const t={msgId:this.nextMsgId(),kind:"hello",senderId:this.selfPeerId,targetId:e,name:this.playerName,color:this.playerColor,worldId:this.currentLocalWorldId,joinedAt:this.selfJoinedAt,t0:Date.now()};this.dispatchFrame({ch:"ctl",data:t})}tickHeartbeat(){const e=Date.now(),t={msgId:this.nextMsgId(),kind:"ping",senderId:this.selfPeerId,targetId:null,name:this.playerName,color:this.playerColor,worldId:this.currentLocalWorldId,joinedAt:this.selfJoinedAt,t0:e};if(this.dispatchFrame({ch:"ctl",data:t}),this.trysteroRoom)for(const s of this.peers.values())s.trysteroPeerId&&this.trysteroRoom.ping(s.trysteroPeerId).then(i=>{Number.isFinite(i)&&i>0&&(s.pingMs=Math.round(s.pingMs*.6+i*.4),s.lastSeenMs=Date.now())}).catch(()=>{});let o=!1;for(const[s,i]of this.peers.entries())e-i.lastSeenMs>16e3&&(this.disposePeerVisuals(i),this.peers.delete(s),o=!0);o?(this.rebuildOccupancyTable(),this.recomputeHostElection(),this.emitPeersChanged()):this.emitPeersChanged()}async leaveRoom(){if(this.trysteroRoom||this.peerJsConnections.size>0){const e={msgId:this.nextMsgId(),kind:"bye",senderId:this.selfPeerId,targetId:null,name:this.playerName,color:this.playerColor,worldId:this.currentLocalWorldId,joinedAt:this.selfJoinedAt,t0:Date.now()};this.dispatchFrame({ch:"ctl",data:e})}if(this.heartbeatTimerId!==null&&typeof window<"u"&&(window.clearInterval(this.heartbeatTimerId),this.heartbeatTimerId=null),this.trysteroRoom){try{await this.trysteroRoom.leave()}catch{}this.trysteroRoom=null}this.sendPlrAction=null,this.sendVehAction=null,this.sendEvtAction=null,this.sendCtlAction=null;for(const e of this.peerJsConnections)try{e.close()}catch{}if(this.peerJsConnections.clear(),this.peerJsInstance){try{this.peerJsInstance.destroy()}catch{}this.peerJsInstance=null}this.isPeerJsHub=!1;for(const e of this.peers.values())this.disposePeerVisuals(e);this.peers.clear();for(const e of this.remoteVehicles.values())e.mesh&&e.mesh.parent&&e.mesh.parent.remove(e.mesh);this.remoteVehicles.clear(),this.vehicleOccupancy.clear(),this._isHost=!0,this.emitPeersChanged()}getInviteUrl(){if(typeof window<"u"){const e=window.location.hostname;if(e==="localhost"||e==="127.0.0.1")return`${window.location.origin}${window.location.pathname}?room=${this._roomCode}`}return`https://axeldelaro.github.io/3dgames/?room=${this._roomCode}`}getConnectedPeers(){const e=this.determineHostPeerId(),t=[];for(const o of this.peers.values())t.push({peerId:o.peerId,name:o.name,color:o.color,pingMs:o.pingMs,isHost:o.peerId===e,worldId:o.worldId});return t.sort((o,s)=>o.name.localeCompare(s.name)),t}getVehicleSeats(e){return this.vehicleOccupancy.get(e)??new Map}broadcastLocalPlayer(e){this.currentLocalWorldId=e.worldId;const t=performance.now();if(!(e.anim!==this.lastSentAnim||e.vehicleId!==this.lastSentVehicleId||e.tool!==this.lastSentTool)&&t-this.lastPlayerSendMs<vt||(this.lastPlayerSendMs=t,this.lastSentAnim=e.anim,this.lastSentVehicleId=e.vehicleId,this.lastSentTool=e.tool,this.updateSeatOccupancy(this.selfPeerId,e.vehicleId,e.seatIndex),!this.trysteroRoom&&this.peerJsConnections.size===0))return;const s={msgId:this.nextMsgId(),peerId:this.selfPeerId,name:this.playerName,color:this.playerColor,worldId:e.worldId,x:e.x,y:e.y,z:e.z,vx:e.vx,vy:e.vy,vz:e.vz,yaw:e.yaw,pitch:e.pitch,anim:e.anim,tool:e.tool,vehicleId:e.vehicleId,seatIndex:e.seatIndex,joinedAt:this.selfJoinedAt,ts:Date.now()};this.dispatchFrame({ch:"plr",data:s})}broadcastVehicle(e){if(!this.trysteroRoom&&this.peerJsConnections.size===0)return;const t=performance.now(),o=this.lastVehicleSendMs.get(e.vehicleId)??0;if(t-o<vt)return;this.lastVehicleSendMs.set(e.vehicleId,t);const s={msgId:this.nextMsgId(),vehicleId:e.vehicleId,kind:e.kind,ownerId:this.selfPeerId,x:e.x,y:e.y,z:e.z,vx:e.vx,vy:e.vy,vz:e.vz,qx:e.qx,qy:e.qy,qz:e.qz,qw:e.qw,steering:e.steering,wheelSpin:e.wheelSpin,extra:e.extra,ts:Date.now()};this.dispatchFrame({ch:"veh",data:s})}broadcastWorldEvent(e,t,o){if(!this.trysteroRoom&&this.peerJsConnections.size===0)return;const s={msgId:this.nextMsgId(),type:e,senderId:this.selfPeerId,worldId:t,payloadJson:JSON.stringify(o),ts:Date.now()};this.dispatchFrame({ch:"evt",data:s})}onWorldEvent(e){return this.worldEventListeners.add(e),()=>{this.worldEventListeners.delete(e)}}onPeersChanged(e){return this.peersChangedListeners.add(e),()=>{this.peersChangedListeners.delete(e)}}handleIncomingControl(e,t){if(e.senderId===this.selfPeerId||!this.markMessageSeen(e.msgId))return;if(e.kind==="bye"){this.removePeer(e.senderId);return}const o=Date.now();let s=this.peers.get(e.senderId),i=!1;if(s?(t&&(s.trysteroPeerId=t),s.name=e.name,s.color=e.color,s.worldId=e.worldId,s.joinedAt=Math.min(s.joinedAt,e.joinedAt),s.lastSeenMs=o):(s={peerId:e.senderId,trysteroPeerId:t,name:e.name,color:e.color,worldId:e.worldId,joinedAt:e.joinedAt,pingMs:36,lastSeenMs:o,anim:"idle",tool:"none",vehicleId:null,seatIndex:0,snapshots:[],prevYaw:0,avatar:null},this.peers.set(e.senderId,s),i=!0),e.kind==="hello"&&(e.targetId===null||e.targetId===this.selfPeerId)){if(i){const a={msgId:this.nextMsgId(),kind:"hello",senderId:this.selfPeerId,targetId:e.senderId,name:this.playerName,color:this.playerColor,worldId:this.currentLocalWorldId,joinedAt:this.selfJoinedAt,t0:o};this.dispatchFrame({ch:"ctl",data:a})}}else if(e.kind==="ping"){const a={msgId:this.nextMsgId(),kind:"pong",senderId:this.selfPeerId,targetId:e.senderId,name:this.playerName,color:this.playerColor,worldId:this.currentLocalWorldId,joinedAt:this.selfJoinedAt,t0:e.t0};this.dispatchFrame({ch:"ctl",data:a})}else if(e.kind==="pong"&&e.targetId===this.selfPeerId){const a=Math.max(4,Math.min(999,o-e.t0));s.pingMs=Math.round(s.pingMs*.55+a*.45)}i&&(this.recomputeHostElection(),this.emitPeersChanged())}handleIncomingPlayer(e,t){if(e.peerId===this.selfPeerId||!this.markMessageSeen(e.msgId))return;const o=performance.now(),s=Date.now();let i=this.peers.get(e.peerId),a=!1;i?((i.name!==e.name||i.color!==e.color||i.worldId!==e.worldId)&&(a=!0),t&&(i.trysteroPeerId=t),i.name=e.name,i.color=e.color,i.worldId=e.worldId,i.joinedAt=Math.min(i.joinedAt,e.joinedAt||i.joinedAt),i.lastSeenMs=s,i.anim=e.anim,i.tool=e.tool,i.vehicleId=e.vehicleId,i.seatIndex=e.seatIndex):(i={peerId:e.peerId,trysteroPeerId:t,name:e.name,color:e.color,worldId:e.worldId,joinedAt:e.joinedAt||s,pingMs:38,lastSeenMs:s,anim:e.anim,tool:e.tool,vehicleId:e.vehicleId,seatIndex:e.seatIndex,snapshots:[],prevYaw:e.yaw,avatar:null},this.peers.set(e.peerId,i),a=!0),i.snapshots.push({x:e.x,y:e.y,z:e.z,vx:e.vx,vy:e.vy,vz:e.vz,yaw:e.yaw,pitch:e.pitch,recvMs:o}),i.snapshots.length>10&&i.snapshots.shift(),this.updateSeatOccupancy(e.peerId,e.vehicleId,e.seatIndex),a&&(this.recomputeHostElection(),this.emitPeersChanged())}handleIncomingVehicle(e){if(e.ownerId===this.selfPeerId||!this.markMessageSeen(e.msgId))return;const t=performance.now(),o=Date.now();let s=this.remoteVehicles.get(e.vehicleId);s?(s.ownerId=e.ownerId,s.kind=e.kind,s.lastSeenMs=o):(s={vehicleId:e.vehicleId,kind:e.kind,ownerId:e.ownerId,lastSeenMs:o,snapshots:[],mesh:null},this.remoteVehicles.set(e.vehicleId,s)),s.snapshots.push({x:e.x,y:e.y,z:e.z,vx:e.vx,vy:e.vy,vz:e.vz,qx:e.qx,qy:e.qy,qz:e.qz,qw:e.qw,steering:e.steering,wheelSpin:e.wheelSpin,extra:e.extra,recvMs:t}),s.snapshots.length>10&&s.snapshots.shift()}handleIncomingWorldEvent(e){if(e.senderId===this.selfPeerId||!this.markMessageSeen(e.msgId))return;let t={};try{const s=JSON.parse(e.payloadJson);s&&typeof s=="object"&&!Array.isArray(s)&&(t=s)}catch{t={}}const o={type:e.type,senderId:e.senderId,worldId:e.worldId,payload:t,ts:e.ts};for(const s of this.worldEventListeners)s(o)}updateSeatOccupancy(e,t,o){for(const[s,i]of this.vehicleOccupancy.entries()){for(const[a,n]of i.entries())n===e&&(s!==t||a!==o)&&i.delete(a);i.size===0&&this.vehicleOccupancy.delete(s)}if(t){let s=this.vehicleOccupancy.get(t);s||(s=new Map,this.vehicleOccupancy.set(t,s)),s.set(o,e)}}rebuildOccupancyTable(){this.vehicleOccupancy.clear();for(const e of this.peers.values())e.vehicleId&&this.updateSeatOccupancy(e.peerId,e.vehicleId,e.seatIndex)}determineHostPeerId(){let e=this.selfPeerId,t=this.selfJoinedAt;for(const o of this.peers.values())(o.joinedAt<t||o.joinedAt===t&&o.peerId<e)&&(t=o.joinedAt,e=o.peerId);return e}recomputeHostElection(){this._isHost=this.determineHostPeerId()===this.selfPeerId}removePeer(e){const t=this.peers.get(e);t&&(this.disposePeerVisuals(t),this.peers.delete(e),this.rebuildOccupancyTable(),this.recomputeHostElection(),this.emitPeersChanged())}disposePeerVisuals(e){e.avatar&&(e.avatar.root.parent&&e.avatar.root.parent.remove(e.avatar.root),e.avatar.dispose(),e.avatar=null)}emitPeersChanged(){const e=this.getConnectedPeers();for(const t of this.peersChangedListeners)t(e)}createStylizedVehicleProxy(e){const t=new q,o=new _e({color:e==="galleon"?7292712:2241101,roughness:e==="galleon"?.72:.24,metalness:e==="galleon"?.1:.7,clearcoat:e==="galleon"?.1:.85}),s=new ve({color:2679039,emissive:1616076,emissiveIntensity:1.5,roughness:.25,metalness:.5});if(e==="jet"||e==="starfighter"){const i=new b(new ot(.9,6.2,10),o);i.rotation.x=Math.PI*.5,t.add(i);const a=new b(new $(5.6,.14,1.9),o);a.position.set(0,0,-.4),t.add(a);const n=new b(new te(.45,.55,.5,12),s);n.rotation.x=Math.PI*.5,n.position.set(0,0,-3.1),t.add(n)}else if(e==="galleon"){const i=new b(new $(4.4,2.2,12),o);i.position.y=.8,t.add(i);const a=new ve({color:15788760,roughness:.82,metalness:.04,side:je}),n=new b(new $(3.8,4.8,.12),a);n.position.set(0,4.4,.4),t.add(n)}else if(e==="heli"){const i=new b(new Se(1.25,14,12),o);i.scale.set(.95,.9,1.65),i.position.y=1.3,t.add(i);const a=new b(new $(7.2,.06,.28),s);a.position.set(0,2.55,0),a.name="rotor",t.add(a)}else{const i=e==="moto"?.72:1.95,a=e==="truck4x4"?1.35:.85,n=e==="moto"?2.1:4.4,r=new b(new $(i,a,n),o);r.position.y=a*.5+.35,r.castShadow=!0,t.add(r);const l=new b(new $(i*.82,.12,.08),s);l.position.set(0,a*.45+.35,n*.5),t.add(l)}return t}samplePlayerHermite(e,t){const o=e.length;if(o===0)return null;if(o===1){const c=e[0];return{x:c.x,y:c.y,z:c.z,vx:c.vx,vy:c.vy,vz:c.vz,yaw:c.yaw}}let s=o-2;for(let c=0;c<o-1;c++)if(t>=e[c].recvMs&&t<=e[c+1].recvMs){s=c;break}const i=e[s],a=e[s+1];if(t>e[o-1].recvMs){const c=e[o-1],d=Math.min(.18,(t-c.recvMs)/1e3);return{x:c.x+c.vx*d,y:c.y+c.vy*d,z:c.z+c.vz*d,vx:c.vx,vy:c.vy,vz:c.vz,yaw:c.yaw}}const n=Math.max(16,a.recvMs-i.recvMs),r=n/1e3,l=Math.max(0,Math.min(1,(t-i.recvMs)/n));return{x:Ge(i.x,i.vx*r,a.x,a.vx*r,l),y:Ge(i.y,i.vy*r,a.y,a.vy*r,l),z:Ge(i.z,i.vz*r,a.z,a.vz*r,l),vx:i.vx+(a.vx-i.vx)*l,vy:i.vy+(a.vy-i.vy)*l,vz:i.vz+(a.vz-i.vz)*l,yaw:zs(i.yaw,a.yaw,l)}}syncRemoteEntities(e,t,o){this.currentLocalWorldId=t;const s=[],i=performance.now()-Vs,a=Date.now(),n=Math.max(.001,Math.min(.1,o));for(const[r,l]of this.remoteVehicles.entries()){const c=this.peers.get(l.ownerId);if(!(c&&c.worldId===t&&a-l.lastSeenMs<1e4)||l.snapshots.length===0){l.mesh&&l.mesh.parent&&l.mesh.parent.remove(l.mesh),a-l.lastSeenMs>15e3&&this.remoteVehicles.delete(r);continue}l.mesh||(l.mesh=this.createStylizedVehicleProxy(l.kind)),l.mesh.parent!==e&&e.add(l.mesh);const h=l.snapshots,u=h.length-1;let p=h[Math.max(0,u-1)],m=h[u];for(let k=0;k<u;k++)if(i>=h[k].recvMs&&i<=h[k+1].recvMs){p=h[k],m=h[k+1];break}const g=Math.max(16,m.recvMs-p.recvMs),y=g/1e3,C=Math.max(0,Math.min(1,(i-p.recvMs)/g)),M=Ge(p.x,p.vx*y,m.x,m.vx*y,C),x=Ge(p.y,p.vy*y,m.y,m.vy*y,C),T=Ge(p.z,p.vz*y,m.z,m.vz*y,C);if(l.mesh.position.set(M,x,T),this.tmpQuatA.set(p.qx,p.qy,p.qz,p.qw),this.tmpQuatB.set(m.qx,m.qy,m.qz,m.qw),l.mesh.quaternion.slerpQuaternions(this.tmpQuatA,this.tmpQuatB,C),l.kind==="heli"){const k=l.mesh.getObjectByName("rotor");k&&(k.rotation.y+=n*28)}s.push({id:`veh_${l.vehicleId}`,x:M,z:T,color:"#ffb347",type:"vehicle",label:l.kind.toUpperCase()})}for(const r of this.peers.values()){if(r.worldId!==t||r.snapshots.length===0){r.avatar&&r.avatar.root.parent&&r.avatar.root.parent.remove(r.avatar.root);continue}r.avatar||(r.avatar=new Rt(r.color)),r.avatar.root.parent!==e&&e.add(r.avatar.root),r.avatar.setAccentColor(r.color),r.avatar.setNameplate(r.name,r.color),r.avatar.getEquippedTool()!==r.tool&&r.avatar.setEquippedTool(r.tool);const l=this.samplePlayerHermite(r.snapshots,i);if(!l)continue;const c=r.vehicleId?this.remoteVehicles.get(r.vehicleId):void 0;if(r.vehicleId&&c&&c.mesh&&c.mesh.parent===e){const d=r.seatIndex%2===0?-.44:.44,h=Math.floor(r.seatIndex/2)*-.9;this.tmpSeatVec.set(c.kind==="moto"?0:d,.32,.15+h),this.tmpSeatVec.applyQuaternion(c.mesh.quaternion),r.avatar.root.position.copy(c.mesh.position).add(this.tmpSeatVec),r.avatar.root.quaternion.copy(c.mesh.quaternion),r.avatar.updateAnimation(n,"drive",0,0,0)}else{r.avatar.root.rotation.set(0,l.yaw,0),r.avatar.root.position.set(l.x,l.y,l.z);let d=l.yaw-r.prevYaw;d>Math.PI&&(d-=Math.PI*2),d<-Math.PI&&(d+=Math.PI*2);const h=d/n;r.prevYaw=l.yaw;const u=Math.hypot(l.vx,l.vz);r.avatar.setParagliderVisible(r.anim==="glide"),r.avatar.setJetpackFlame(r.anim==="jump"&&l.vy>2.5?.85:0),r.avatar.updateAnimation(n,r.anim,u,h,0)}s.push({id:r.peerId,x:r.avatar.root.position.x,z:r.avatar.root.position.z,color:r.color,type:"peer",label:r.name})}return s}getAveragePing(){if(this.peers.size===0)return 0;let e=0;for(const t of this.peers.values())e+=t.pingMs;return Math.round(e/this.peers.size)}}const We=200,S=We*.5,ke=95,Te=88,Ee=83,yt={player:0,poi:1,vehicle:2,danger:3,objective:4,peer:5},Os={player:"#eef6ff",peer:"#38e2ff",vehicle:"#19d4c6",poi:"#ffd166",objective:"#ffb347",danger:"#ff5e57"};class Ns{canvas;ctx;rangeMeters;currentDpr=0;sortedBuffer=[];constructor(e,t=220){this.canvas=e??document.createElement("canvas"),this.canvas.id=this.canvas.id||"omniverse-radar-canvas",this.rangeMeters=Math.max(40,t);const o=this.canvas.getContext("2d",{alpha:!0});if(!o)throw new Error("Minimap3DRadar: Unable to initialize 2D rendering context.");this.ctx=o,this.syncResolution()}setRangeMeters(e){this.rangeMeters=Math.max(40,e)}getRangeMeters(){return this.rangeMeters}syncResolution(){const e=Math.min(typeof window<"u"&&window.devicePixelRatio||1,2.5);Math.abs(e-this.currentDpr)<.01||(this.currentDpr=e,this.canvas.width=Math.round(We*e),this.canvas.height=Math.round(We*e),this.ctx.setTransform(e,0,0,e,0,0))}render(e,t,o,s){this.syncResolution();const i=this.ctx,a=typeof performance<"u"?performance.now():Date.now(),n=.5+.5*Math.sin(a*.0055),r=Ee/this.rangeMeters,l=-Math.PI*.5-t;i.clearRect(0,0,We,We);const c=i.createRadialGradient(S,S,6,S,S,ke);c.addColorStop(0,"rgba(12, 28, 48, 0.92)"),c.addColorStop(.68,"rgba(6, 14, 26, 0.95)"),c.addColorStop(1,"rgba(3, 8, 16, 0.98)"),i.beginPath(),i.arc(S,S,ke,0,Math.PI*2),i.fillStyle=c,i.fill(),i.save(),i.beginPath(),i.arc(S,S,Te,0,Math.PI*2),i.clip();const d=a*.0011%(Math.PI*2);i.save(),i.translate(S,S),i.rotate(d);const h=i.createLinearGradient(0,0,Te,26);h.addColorStop(0,"rgba(56, 226, 255, 0.09)"),h.addColorStop(1,"rgba(56, 226, 255, 0)"),i.beginPath(),i.moveTo(0,0),i.arc(0,0,Te,-.38,.04),i.closePath(),i.fillStyle=h,i.fill(),i.restore(),i.lineWidth=1;for(let C=1;C<=3;C++){const M=Te/3*C;i.beginPath(),i.arc(S,S,M,0,Math.PI*2),i.strokeStyle=C===3?"rgba(56, 226, 255, 0.24)":"rgba(56, 226, 255, 0.12)",i.stroke()}i.save(),i.setLineDash([3,5]),i.strokeStyle="rgba(56, 226, 255, 0.13)",i.beginPath(),i.moveTo(S-Te,S),i.lineTo(S+Te,S),i.moveTo(S,S-Te),i.lineTo(S,S+Te),i.stroke(),i.restore();const u=.54,p=68,m=S+Math.cos(l)*p,g=S+Math.sin(l)*p,y=i.createRadialGradient(S,S,4,S,S,p);y.addColorStop(0,"rgba(56, 226, 255, 0.34)"),y.addColorStop(.65,"rgba(56, 226, 255, 0.11)"),y.addColorStop(1,"rgba(56, 226, 255, 0)"),i.beginPath(),i.moveTo(S,S),i.arc(S,S,p,l-u,l+u),i.closePath(),i.fillStyle=y,i.fill(),i.strokeStyle="rgba(56, 226, 255, 0.38)",i.lineWidth=1,i.beginPath(),i.moveTo(S,S),i.lineTo(S+Math.cos(l-u)*(p*.88),S+Math.sin(l-u)*(p*.88)),i.moveTo(S,S),i.lineTo(S+Math.cos(l+u)*(p*.88),S+Math.sin(l+u)*(p*.88)),i.stroke(),i.strokeStyle="rgba(255, 179, 71, 0.25)",i.beginPath(),i.moveTo(S,S),i.lineTo(m,g),i.stroke(),s&&s.length>=2&&this.drawGPSRoute(i,e,s,r,a,n),o.length>0&&this.drawMarkers(i,e,o,r,n),i.restore(),this.drawCompassRing(i),this.drawLocalPlayerChevron(i,l)}drawGPSRoute(e,t,o,s,i,a){const n=o[0],r=S+(n.x-t.x)*s,l=S+(n.z-t.z)*s,c=o[o.length-1],d=S+(c.x-t.x)*s,h=S+(c.z-t.z)*s;e.save(),e.lineCap="round",e.lineJoin="round";const u=()=>{e.beginPath(),e.moveTo(r,l);for(let x=1;x<o.length;x++){const T=o[x];e.lineTo(S+(T.x-t.x)*s,S+(T.z-t.z)*s)}};u(),e.strokeStyle="rgba(56, 226, 255, 0.26)",e.lineWidth=6.5,e.stroke();const p=e.createLinearGradient(r,l,d,h);p.addColorStop(0,"#38e2ff"),p.addColorStop(.65,"#4ee8d8"),p.addColorStop(1,"#ffb347"),u(),e.strokeStyle=p,e.lineWidth=2.6,e.stroke(),e.setLineDash([5,11]),e.lineDashOffset=-(i*.036%16),u(),e.strokeStyle="rgba(255, 248, 224, 0.85)",e.lineWidth=1.3,e.stroke(),e.restore();const m=d-S,g=h-S,y=Math.hypot(m,g),C=y>Ee?S+m/y*Ee:d,M=y>Ee?S+g/y*Ee:h;e.save(),e.beginPath(),e.arc(C,M,5+a*3.5,0,Math.PI*2),e.strokeStyle=`rgba(255, 179, 71, ${(.7-a*.45).toFixed(2)})`,e.lineWidth=1.4,e.stroke(),e.beginPath(),e.arc(C,M,3.3,0,Math.PI*2),e.fillStyle="#ffb347",e.fill(),e.strokeStyle="#ffffff",e.lineWidth=1,e.stroke(),e.restore()}drawMarkers(e,t,o,s,i){this.sortedBuffer.length=0;for(let a=0;a<o.length;a++){const n=o[a];n.type!=="player"&&this.sortedBuffer.push(n)}this.sortedBuffer.sort((a,n)=>yt[a.type]-yt[n.type]);for(let a=0;a<this.sortedBuffer.length;a++){const n=this.sortedBuffer[a],r=(n.x-t.x)*s,l=(n.z-t.z)*s,c=Math.hypot(r,l),d=n.color||Os[n.type],h=c>Ee;if(h&&n.type==="vehicle")continue;const u=Math.atan2(l,r),p=h?S+Math.cos(u)*Ee:S+r,m=h?S+Math.sin(u)*Ee:S+l;if(h){this.drawClampedRimPointer(e,p,m,u,d);continue}switch(n.type){case"peer":this.drawPeerBlip(e,p,m,d,n.label,i);break;case"objective":this.drawObjectiveBlip(e,p,m,d,i);break;case"danger":this.drawDangerBlip(e,p,m,d,i);break;case"vehicle":this.drawVehicleBlip(e,p,m,d);break;case"poi":this.drawPoiBlip(e,p,m,d);break}}}drawClampedRimPointer(e,t,o,s,i){e.save(),e.translate(t,o),e.rotate(s),e.beginPath(),e.moveTo(4.2,0),e.lineTo(-3.2,-3.2),e.lineTo(-1.8,0),e.lineTo(-3.2,3.2),e.closePath(),e.fillStyle=i,e.fill(),e.strokeStyle="rgba(4, 9, 18, 0.9)",e.lineWidth=1,e.stroke(),e.restore()}drawPeerBlip(e,t,o,s,i,a){if(e.save(),e.beginPath(),e.arc(t,o,5.2+a*1.8,0,Math.PI*2),e.fillStyle="rgba(56, 226, 255, 0.2)",e.fill(),e.translate(t,o),e.beginPath(),e.moveTo(0,-4.6),e.lineTo(4.6,0),e.lineTo(0,4.6),e.lineTo(-4.6,0),e.closePath(),e.fillStyle=s,e.fill(),e.strokeStyle="#ffffff",e.lineWidth=1.2,e.stroke(),i){const n=i.length>9?`${i.slice(0,8)}…`:i;e.font="700 9px Rajdhani, sans-serif",e.textAlign="center",e.textBaseline="bottom",e.fillStyle="rgba(4, 9, 18, 0.85)",e.fillText(n,.6,-5.4),e.fillStyle="#eef6ff",e.fillText(n,0,-6)}e.restore()}drawObjectiveBlip(e,t,o,s,i){e.save(),e.beginPath(),e.arc(t,o,5+i*5,0,Math.PI*2),e.strokeStyle=s,e.globalAlpha=Math.max(.15,.85-i*.65),e.lineWidth=1.3,e.stroke(),e.globalAlpha=1,e.translate(t,o),e.beginPath(),e.moveTo(0,-5),e.lineTo(5,0),e.lineTo(0,5),e.lineTo(-5,0),e.closePath(),e.fillStyle=s,e.fill(),e.strokeStyle="#fff8eb",e.lineWidth=1.2,e.stroke(),e.restore()}drawDangerBlip(e,t,o,s,i){e.save(),e.translate(t,o);const a=.92+i*.22;e.scale(a,a),e.beginPath(),e.moveTo(0,-5),e.lineTo(4.6,3.8),e.lineTo(-4.6,3.8),e.closePath(),e.fillStyle=s,e.fill(),e.strokeStyle="#140608",e.lineWidth=1.1,e.stroke(),e.restore()}drawVehicleBlip(e,t,o,s){e.save(),e.translate(t,o),e.beginPath(),e.roundRect(-3.8,-2.5,7.6,5,2),e.fillStyle=s,e.fill(),e.strokeStyle="#07101e",e.lineWidth=1,e.stroke(),e.restore()}drawPoiBlip(e,t,o,s){e.save(),e.translate(t,o),e.beginPath();for(let i=0;i<8;i++){const a=i%2===0?4.2:1.8,n=i*Math.PI/4-Math.PI/2;i===0?e.moveTo(Math.cos(n)*a,Math.sin(n)*a):e.lineTo(Math.cos(n)*a,Math.sin(n)*a)}e.closePath(),e.fillStyle=s,e.fill(),e.restore()}drawCompassRing(e){e.save(),e.beginPath(),e.arc(S,S,ke,0,Math.PI*2),e.strokeStyle="rgba(56, 226, 255, 0.45)",e.lineWidth=1.5,e.stroke();for(let s=0;s<360;s+=10){const i=(s-90)*Math.PI/180,a=s%90===0,n=s%45===0,r=ke-1.5,l=a?ke-7.5:n?ke-5.5:ke-3.5;e.beginPath(),e.moveTo(S+Math.cos(i)*l,S+Math.sin(i)*l),e.lineTo(S+Math.cos(i)*r,S+Math.sin(i)*r),e.strokeStyle=s===0?"#ffb347":a?"rgba(124, 238, 255, 0.9)":"rgba(56, 226, 255, 0.28)",e.lineWidth=a?1.8:1,e.stroke()}e.font="800 9.5px Orbitron, sans-serif",e.textAlign="center",e.textBaseline="middle";const t=[{label:"N",angleDeg:0,color:"#ffb347"},{label:"E",angleDeg:90,color:"#7ceeff"},{label:"S",angleDeg:180,color:"#bfd8f2"},{label:"O",angleDeg:270,color:"#7ceeff"}],o=ke-13.5;for(let s=0;s<t.length;s++){const i=t[s],a=(i.angleDeg-90)*Math.PI/180,n=S+Math.cos(a)*o,r=S+Math.sin(a)*o;e.fillStyle="rgba(3, 8, 16, 0.9)",e.fillText(i.label,n+.6,r+.8),e.fillStyle=i.color,e.fillText(i.label,n,r)}e.restore()}drawLocalPlayerChevron(e,t){e.save(),e.translate(S,S),e.rotate(t),e.shadowColor="rgba(56, 226, 255, 0.85)",e.shadowBlur=8,e.beginPath(),e.moveTo(7.2,0),e.lineTo(-5.4,-5),e.lineTo(-2.6,0),e.lineTo(-5.4,5),e.closePath(),e.fillStyle="#eef6ff",e.fill(),e.shadowBlur=0,e.strokeStyle="#38e2ff",e.lineWidth=1.3,e.stroke(),e.restore()}}const Ws="https://github.com/axeldelaro/3dgames/releases/latest/download/3dgames.apk",et="https://axeldelaro.github.io/3dgames/",tt=[{hex:"#38e2ff",name:"Cyan Glaciaire"},{hex:"#ffb347",name:"Ambre Solaire"},{hex:"#66f2a5",name:"Menthe Bio"},{hex:"#19d4c6",name:"Teal Océanique"},{hex:"#ffd166",name:"Or Éthéré"},{hex:"#ff6b57",name:"Corail Supersonique"},{hex:"#e6f4ff",name:"Titane Polaire"}],bt="ABCDEFGHJKLMNPQRSTUVWXYZ23456789",_s={HUB:"HUB",ON_FOOT:"À PIED",DRIVING:"CONDUITE",FLIGHT_SPACE:"VOL",NAVAL:"NAVIRE"},qs={ULTRA:"ULTRA",HIGH:"ÉLEVÉ",MOBILE_PERF:"MOBILE"},Us={weapon:"ARME",tool:"OUTIL",vehicle:"VÉHICULE",emote:"ACTION"},st=289;class js{onSelectWorld;onReturnHub;network;quality;audio;avatar;root;hubEl;hudEl;controlsModalEl;radialWheelEl;toastStackEl;loaderEl;pwaBtnEl;resumeBtnEl;toggleLobbyBtnEl;toggleSettingsBtnEl;lobbyDrawerEl;settingsDrawerEl;netStatusPillEl;playerNameInputEl;colorSwatchesEl;roomCodeInputEl;leaveRoomBtnEl;inviteBtnEl;invitePreviewEl;squadListEl;qualityButtons=new Map;autoScaleBtnEl;masterValEl;musicValEl;minimap;radarCoordsEl;healthRowEl;healthFillEl;staminaRowEl;staminaFillEl;creditsRowEl;creditsValEl;worldTitleHudEl;contextTagHudEl;weatherTagHudEl;statusHintHudEl;toolbarToggleBtnEl;worldToolbarEl;telFpsEl;telDrawEl;telPingEl;telPresetEl;hudInviteBtnEl;hudInviteLabelEl;speedGaugeEl;gaugeArcFillEl;speedValueEl;speedUnitEl;gearBadgeEl;subMetricLeftEl;subMetricRightEl;windRoseWrapEl;windArrowSvgEl;crosshairEl;fighterHudEl;fighterPitchGroupEl;fighterRollGroupEl;fighterMachTextEl;fighterAltTextEl;fighterStallEl;radialContainerEl;radialSvgEl;radialLabelsLayerEl;radialCenterCatEl;radialCenterNameEl;loaderArcEl;loaderPctEl;loaderStatusEl;hubVisible=!0;hasActiveWorld=!1;controlsModalOpen=!1;toolbarCollapsed=!1;deferredInstallPrompt=null;inviteCopiedTimer=null;lobbyRefreshInterval=null;radialItems=[];onRadialSelect=null;radialOpen=!1;inputRadialHeld=!1;manualRadialLatch=!1;radialCommitted=!1;hoveredRadialIndex=-1;radialSliceEls=[];radialLabelEls=[];radialVirtualX=0;radialVirtualY=0;lastHudCache={fpsText:"",fpsWarn:!1,drawText:"",pingText:"",presetText:"",worldTitle:"",contextMode:"",weather:"",hint:"",coords:"",credits:-1,gaugeVisible:!1,speedVal:"",gearVal:"",subLeft:"",subRight:""};constructor(e){this.onSelectWorld=e.onSelectWorld,this.onReturnHub=e.onReturnHub,this.network=e.network,this.quality=e.quality,this.audio=e.audio,this.avatar=e.avatar,this.root=e.container??document.getElementById("omniverse-ui")??document.body,this.hubEl=this.createHubDOM(),this.hudEl=this.createHudDOM(),this.radialWheelEl=this.createRadialWheelDOM(),this.controlsModalEl=this.createControlsModalDOM(),this.toastStackEl=this.createToastStackDOM(),this.loaderEl=this.createLoaderDOM(),this.root.appendChild(this.hudEl),this.root.appendChild(this.radialWheelEl),this.root.appendChild(this.hubEl),this.root.appendChild(this.controlsModalEl),this.root.appendChild(this.toastStackEl),this.root.appendChild(this.loaderEl),this.pwaBtnEl=this.mustQuery(this.hubEl,"#omni-pwa-install-btn"),this.resumeBtnEl=this.mustQuery(this.hubEl,"#omni-resume-world-btn"),this.toggleLobbyBtnEl=this.mustQuery(this.hubEl,"#omni-toggle-lobby-btn"),this.toggleSettingsBtnEl=this.mustQuery(this.hubEl,"#omni-toggle-settings-btn"),this.lobbyDrawerEl=this.mustQuery(this.hubEl,"#omni-lobby-drawer"),this.settingsDrawerEl=this.mustQuery(this.hubEl,"#omni-settings-drawer"),this.netStatusPillEl=this.mustQuery(this.hubEl,"#omni-net-status-pill"),this.playerNameInputEl=this.mustQuery(this.hubEl,"#omni-player-name"),this.colorSwatchesEl=this.mustQuery(this.hubEl,"#omni-color-swatches"),this.roomCodeInputEl=this.mustQuery(this.hubEl,"#omni-room-code"),this.leaveRoomBtnEl=this.mustQuery(this.hubEl,"#omni-leave-room-btn"),this.inviteBtnEl=this.mustQuery(this.hubEl,"#omni-copy-invite-btn"),this.invitePreviewEl=this.mustQuery(this.hubEl,"#omni-invite-preview"),this.squadListEl=this.mustQuery(this.hubEl,"#omni-squad-list"),this.autoScaleBtnEl=this.mustQuery(this.hubEl,"#omni-autoscale-btn"),this.masterValEl=this.mustQuery(this.hubEl,"#omni-master-val"),this.musicValEl=this.mustQuery(this.hubEl,"#omni-music-val");const t=this.mustQuery(this.hudEl,"#omniverse-radar-canvas");this.minimap=new Ns(t,180),this.radarCoordsEl=this.mustQuery(this.hudEl,"#omni-radar-coords"),this.healthRowEl=this.mustQuery(this.hudEl,"#omni-health-row"),this.healthFillEl=this.mustQuery(this.hudEl,"#omni-health-fill"),this.staminaRowEl=this.mustQuery(this.hudEl,"#omni-stamina-row"),this.staminaFillEl=this.mustQuery(this.hudEl,"#omni-stamina-fill"),this.creditsRowEl=this.mustQuery(this.hudEl,"#omni-credits-row"),this.creditsValEl=this.mustQuery(this.hudEl,"#omni-credits-val"),this.worldTitleHudEl=this.mustQuery(this.hudEl,"#omni-hud-world-title"),this.contextTagHudEl=this.mustQuery(this.hudEl,"#omni-hud-context-tag"),this.weatherTagHudEl=this.mustQuery(this.hudEl,"#omni-hud-weather-tag"),this.statusHintHudEl=this.mustQuery(this.hudEl,"#omni-hud-status-hint"),this.toolbarToggleBtnEl=this.mustQuery(this.hudEl,"#omni-toolbar-toggle-btn"),this.worldToolbarEl=this.mustQuery(this.hudEl,"#omniverse-world-toolbar"),this.telFpsEl=this.mustQuery(this.hudEl,"#omni-tel-fps"),this.telDrawEl=this.mustQuery(this.hudEl,"#omni-tel-draws"),this.telPingEl=this.mustQuery(this.hudEl,"#omni-tel-ping"),this.telPresetEl=this.mustQuery(this.hudEl,"#omni-tel-preset"),this.hudInviteBtnEl=this.mustQuery(this.hudEl,"#omni-hud-invite-btn"),this.hudInviteLabelEl=this.mustQuery(this.hudEl,"#omni-hud-invite-label"),this.speedGaugeEl=this.mustQuery(this.hudEl,"#omniverse-speed-gauge"),this.gaugeArcFillEl=this.mustQuery(this.hudEl,"#omni-gauge-arc-fill"),this.speedValueEl=this.mustQuery(this.hudEl,"#omni-speed-value"),this.speedUnitEl=this.mustQuery(this.hudEl,"#omni-speed-unit"),this.gearBadgeEl=this.mustQuery(this.hudEl,"#omni-gear-badge"),this.subMetricLeftEl=this.mustQuery(this.hudEl,"#omni-gauge-sub-left"),this.subMetricRightEl=this.mustQuery(this.hudEl,"#omni-gauge-sub-right"),this.windRoseWrapEl=this.mustQuery(this.hudEl,"#omni-wind-rose"),this.windArrowSvgEl=this.mustQuery(this.hudEl,"#omni-wind-arrow-svg"),this.crosshairEl=this.mustQuery(this.hudEl,"#omniverse-crosshair"),this.fighterHudEl=this.mustQuery(this.hudEl,"#omniverse-fighter-hud"),this.fighterPitchGroupEl=this.mustQuery(this.fighterHudEl,"#omni-fighter-pitch-group"),this.fighterRollGroupEl=this.mustQuery(this.fighterHudEl,"#omni-fighter-roll-group"),this.fighterMachTextEl=this.mustQuery(this.fighterHudEl,"#omni-fighter-mach"),this.fighterAltTextEl=this.mustQuery(this.fighterHudEl,"#omni-fighter-alt"),this.fighterStallEl=this.mustQuery(this.fighterHudEl,"#omni-fighter-stall"),this.radialContainerEl=this.mustQuery(this.radialWheelEl,".omni-radial-container"),this.radialSvgEl=this.mustQuery(this.radialWheelEl,".omni-radial-svg"),this.radialLabelsLayerEl=this.mustQuery(this.radialWheelEl,"#omni-radial-labels"),this.radialCenterCatEl=this.mustQuery(this.radialWheelEl,"#omni-radial-center-cat"),this.radialCenterNameEl=this.mustQuery(this.radialWheelEl,"#omni-radial-center-name"),this.loaderArcEl=this.mustQuery(this.loaderEl,"#omni-loader-arc"),this.loaderPctEl=this.mustQuery(this.loaderEl,"#omni-loader-pct"),this.loaderStatusEl=this.mustQuery(this.loaderEl,"#omni-loader-status"),this.initializeSwatchesAndCards(),this.bindEvents(),this.syncQualityUI(),this.refreshLobbyUI(),this.showHub(!0)}showHub(e){if(this.hubVisible=e,this.hubEl.classList.toggle("is-hidden",!e),this.hudEl.classList.toggle("is-hidden",e),document.body.classList.toggle("omni-hub-open",e),this.resumeBtnEl.classList.toggle("is-hidden",!this.hasActiveWorld),e){if(this.radialOpen&&(this.hoveredRadialIndex=-1,this.manualRadialLatch=!1,this.inputRadialHeld=!1,this.applyRadialState(!1)),typeof document<"u"&&document.pointerLockElement)try{document.exitPointerLock()}catch{}this.refreshLobbyUI()}else this.closeAllHubDrawers()}isHubVisible(){return this.hubVisible}setLoading(e,t,o){if(this.loaderEl.classList.toggle("is-hidden",!e),!e)return;this.loaderStatusEl.textContent=t??"Compilation des shaders WebGL2 PBR & streaming procédural…";const s=264;if(typeof o=="number"&&Number.isFinite(o)){const i=o>=0&&o<=1?o*100:o,a=Math.max(0,Math.min(100,Math.round(i))),n=s*(1-a/100);this.loaderArcEl.style.strokeDashoffset=`${n.toFixed(1)}`,this.loaderPctEl.textContent=`${a}%`}else this.loaderArcEl.style.strokeDashoffset="84",this.loaderPctEl.textContent="PBR"}notify(e,t,o="info"){for(;this.toastStackEl.children.length>=2;){const l=this.toastStackEl.firstElementChild;if(l)l.remove();else break}const s=document.createElement("div");s.className=`omni-toast ${o==="success"?"is-success":o==="warning"?"is-warning":""}`;const i=document.createElement("div");i.className="omni-toast-icon",i.innerHTML=this.getToastIconSVG(o);const a=document.createElement("div");a.className="omni-toast-body";const n=document.createElement("div");n.className="omni-toast-title",n.textContent=e;const r=document.createElement("div");r.className="omni-toast-msg",r.textContent=t,a.appendChild(n),a.appendChild(r),s.appendChild(i),s.appendChild(a),this.toastStackEl.appendChild(s),window.setTimeout(()=>{s.classList.add("is-leaving"),window.setTimeout(()=>{s.remove()},220)},2900)}updateTelemetry(e){const t=Math.max(0,Math.round(e.fps)),o=`${t} FPS`;o!==this.lastHudCache.fpsText&&(this.lastHudCache.fpsText=o,this.telFpsEl.textContent=o);const s=t<42;s!==this.lastHudCache.fpsWarn&&(this.lastHudCache.fpsWarn=s,this.telFpsEl.classList.toggle("is-warn",s));const i=`${e.drawCalls} DC`;i!==this.lastHudCache.drawText&&(this.lastHudCache.drawText=i,this.telDrawEl.textContent=i);const a=e.peerCount>0?`${Math.round(e.pingMs)}ms•${e.peerCount}P`:"P2P";a!==this.lastHudCache.pingText&&(this.lastHudCache.pingText=a,this.telPingEl.textContent=a);const n=qs[e.qualityPreset];if(n!==this.lastHudCache.presetText&&(this.lastHudCache.presetText=n,this.telPresetEl.textContent=n,this.syncQualityUI()),e.worldTitle!==this.lastHudCache.worldTitle){this.lastHudCache.worldTitle=e.worldTitle;const d=(e.worldTitle||"OMNIVERSE").split("—")[0].split("&")[0].trim();this.worldTitleHudEl.textContent=d}if(e.contextMode!==this.lastHudCache.contextMode){this.lastHudCache.contextMode=e.contextMode,this.contextTagHudEl.textContent=_s[e.contextMode];const d=e.contextMode==="ON_FOOT"||e.contextMode==="FLIGHT_SPACE"||e.contextMode==="NAVAL";this.crosshairEl.classList.toggle("is-hidden",!d)}const r=e.weatherLabel??"";r!==this.lastHudCache.weather&&(this.lastHudCache.weather=r,this.weatherTagHudEl.textContent=r?`• ${r}`:"",this.weatherTagHudEl.classList.toggle("is-hidden",!r));const l=e.statusHint??"";if(l!==this.lastHudCache.hint&&(this.lastHudCache.hint=l,this.statusHintHudEl.textContent=l?`• ${l}`:"",this.statusHintHudEl.classList.toggle("is-hidden",!l)),e.healthRatio!==void 0){const d=Math.max(0,Math.min(1,e.healthRatio));this.healthRowEl.classList.remove("is-hidden"),this.healthFillEl.style.width=`${(d*100).toFixed(1)}%`,this.healthFillEl.classList.toggle("is-critical",d<.28)}else this.healthRowEl.classList.add("is-hidden");if(e.staminaRatio!==void 0){const d=Math.max(0,Math.min(1,e.staminaRatio));this.staminaRowEl.classList.remove("is-hidden"),this.staminaFillEl.style.width=`${(d*100).toFixed(1)}%`,this.staminaFillEl.classList.toggle("is-low",d<.25)}else this.staminaRowEl.classList.add("is-hidden");if(e.credits!==void 0){const d=Math.round(e.credits);d!==this.lastHudCache.credits&&(this.lastHudCache.credits=d,this.creditsValEl.textContent=`$ ${d.toLocaleString("fr-FR")}`),this.creditsRowEl.classList.remove("is-hidden")}else this.creditsRowEl.classList.add("is-hidden");const c=e.contextMode==="DRIVING"||e.contextMode==="FLIGHT_SPACE"||e.contextMode==="NAVAL";if(c!==this.lastHudCache.gaugeVisible&&(this.lastHudCache.gaugeVisible=c,this.speedGaugeEl.classList.toggle("is-hidden",!c)),c){const d=Math.max(0,e.speedKmh??0),h=`${Math.round(d)}`;h!==this.lastHudCache.speedVal&&(this.lastHudCache.speedVal=h,this.speedValueEl.textContent=h),this.speedUnitEl.textContent=e.contextMode==="NAVAL"?"KTS":"KM/H";const u=e.contextMode==="FLIGHT_SPACE"?2400:e.contextMode==="NAVAL"?90:280,p=e.rpm!==void 0&&e.contextMode==="DRIVING"?Math.max(0,Math.min(1,e.rpm/8e3)):Math.max(0,Math.min(1,d/u)),m=st*(1-p);this.gaugeArcFillEl.style.strokeDashoffset=m.toFixed(1);const g=e.gear??(e.contextMode==="FLIGHT_SPACE"?e.mach!==void 0&&e.mach>=1?"MACH+":"THR":e.contextMode==="NAVAL"?"VOILES":"D");g!==this.lastHudCache.gearVal&&(this.lastHudCache.gearVal=g,this.gearBadgeEl.textContent=g);const y=e.altitudeM!==void 0?`${Math.round(e.altitudeM)}m`:e.rpm!==void 0?`${Math.round(e.rpm)}tr`:e.headingDeg!==void 0?`${Math.round(e.headingDeg)}°`:"PBR";if(y!==this.lastHudCache.subLeft&&(this.lastHudCache.subLeft=y,this.subMetricLeftEl.textContent=y),e.windAngleDeg!==void 0)this.windRoseWrapEl.classList.remove("is-hidden"),this.subMetricRightEl.classList.add("is-hidden"),this.windArrowSvgEl.style.transform=`rotate(${e.windAngleDeg.toFixed(0)}deg)`;else{this.windRoseWrapEl.classList.add("is-hidden"),this.subMetricRightEl.classList.remove("is-hidden");const C=e.mach!==void 0?`M${e.mach.toFixed(1)}`:e.headingDeg!==void 0?`${Math.round(e.headingDeg)}°`:"";C!==this.lastHudCache.subRight&&(this.lastHudCache.subRight=C,this.subMetricRightEl.textContent=C)}}}updateMinimap(e,t,o,s){this.minimap.render(e,t,o,s);const i=(Math.round(-t*180/Math.PI)%360+360)%360,a=`${String(i).padStart(3,"0")}° • ${Math.round(e.x)},${Math.round(e.z)}`;a!==this.lastHudCache.coords&&(this.lastHudCache.coords=a,this.radarCoordsEl.textContent=a)}setWorldToolbarHTML(e,t){const o=e.trim();this.worldToolbarEl.innerHTML=o;const s=o.length===0;this.worldToolbarEl.classList.toggle("is-empty",s),this.toolbarToggleBtnEl.classList.toggle("is-hidden",s),this.worldToolbarEl.classList.toggle("is-collapsed",!s&&this.toolbarCollapsed),!s&&t&&t(this.worldToolbarEl)}setRadialItems(e,t){this.radialItems=e.slice(),this.onRadialSelect=t,this.hoveredRadialIndex=-1,this.rebuildRadialSlices()}openRadialMenu(e){this.inputRadialHeld=e,this.applyRadialState(this.inputRadialHeld||this.manualRadialLatch)}applyRadialState(e){if(e!==this.radialOpen)if(e){if(this.hubVisible||this.radialItems.length===0)return;this.radialOpen=!0,this.radialCommitted=!1,this.radialVirtualX=0,this.radialVirtualY=0,this.setHoveredRadialSlice(-1),this.radialWheelEl.classList.remove("is-hidden"),this.audio.playUIClick()}else{const t=this.hoveredRadialIndex,o=!this.radialCommitted&&t>=0&&t<this.radialItems.length;if(this.radialOpen=!1,this.manualRadialLatch=!1,this.hoveredRadialIndex=-1,this.radialWheelEl.classList.add("is-hidden"),window.dispatchEvent(new CustomEvent("omniverse:close-radial")),o){this.radialCommitted=!0;const s=this.radialItems[t];this.audio.playUIClick(),this.onRadialSelect?.(s)}}}isRadialMenuOpen(){return this.radialOpen}setFighterHUDVisible(e,t=0,o=0,s=0,i=0,a=!1){if(this.fighterHudEl.classList.toggle("is-hidden",!e),!e)return;const n=Math.max(-110,Math.min(110,t*3.1));this.fighterPitchGroupEl.setAttribute("transform",`rotate(${(-o).toFixed(1)} 200 160) translate(0 ${n.toFixed(1)})`),this.fighterRollGroupEl.setAttribute("transform",`rotate(${(-o).toFixed(1)} 200 160)`),this.fighterMachTextEl.textContent=`MACH ${s.toFixed(2)}`,this.fighterAltTextEl.textContent=`ALT ${Math.round(i)} M`,this.fighterStallEl.classList.toggle("is-hidden",!a)}createHubDOM(){const e=document.createElement("section");return e.id="omniverse-hub",e.setAttribute("aria-label","3D GAMES : OMNIVERSE AAA Hub Principal"),e.innerHTML=`
      <header class="omni-hub-header">
        <div class="omni-brand-cluster">
          <div class="omni-brand-emblem" aria-hidden="true">
            <svg viewBox="0 0 32 32" fill="none">
              <polygon points="16,2 29,9.5 29,22.5 16,30 3,22.5 3,9.5" stroke="#38e2ff" stroke-width="2" fill="rgba(56,226,255,0.12)"/>
              <circle cx="16" cy="16" r="4" fill="#ffb347"/>
            </svg>
          </div>
          <div class="omni-brand-title-row">
            <h1 class="omni-brand-title">3D GAMES : <span>OMNIVERSE</span></h1>
            <span class="omni-engine-badge"><span class="omni-pulse-dot"></span>PBR • P2P</span>
          </div>
        </div>

        <div class="omni-header-actions">
          <button type="button" id="omni-resume-world-btn" class="omni-resume-btn is-hidden">
            ▶ Reprendre
          </button>
          <button type="button" id="omni-toggle-lobby-btn" class="omni-hdr-btn" title="Salon Multijoueur WebRTC P2P">
            🌐 <span>Salon</span>
            <span id="omni-net-status-pill" class="omni-net-status-pill">SOLO</span>
          </button>
          <button type="button" id="omni-toggle-settings-btn" class="omni-hdr-btn" title="Qualité Graphique PBR & Audio">
            ⚙ <span class="omni-btn-label-long">Options</span>
          </button>
          <button type="button" id="omni-open-controls-btn" class="omni-hdr-btn" title="Aide & Commandes">
            🎮 <span class="omni-btn-label-long">Aide</span>
          </button>
          <button type="button" id="omni-pwa-install-btn" class="omni-pwa-btn is-hidden">
            ⚡ App
          </button>
          <a
            class="omni-apk-btn"
            href="${Ws}"
            target="_blank"
            rel="noopener"
            title="Télécharger l'APK Android natif (3dgames.apk)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>
            </svg>
            <span>APK</span>
          </a>
        </div>
      </header>

      <!-- Slide-Over Popover 1: Serverless WebRTC P2P Lobby -->
      <aside id="omni-lobby-drawer" class="omni-hub-drawer is-hidden" aria-label="Salon Multijoueur WebRTC P2P">
        <div class="omni-panel-header">
          <div class="omni-panel-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="5" r="3"/><circle cx="5" cy="19" r="3"/><circle cx="19" cy="19" r="3"/>
              <line x1="10.5" y1="7.5" x2="6.5" y2="16.5"/><line x1="13.5" y1="7.5" x2="17.5" y2="16.5"/>
            </svg>
            <span>SALON MULTIJOUEUR P2P</span>
          </div>
          <button type="button" id="omni-close-lobby-btn" class="omni-drawer-close-btn" aria-label="Fermer">✕</button>
        </div>

        <div class="omni-field-group">
          <label class="omni-field-label" for="omni-player-name">Pseudo Joueur</label>
          <input
            id="omni-player-name"
            class="omni-input"
            type="text"
            maxlength="18"
            placeholder="Pilote-Alpha"
            autocomplete="off"
            spellcheck="false"
          />
        </div>

        <div class="omni-field-group">
          <span class="omni-field-label">Couleur Avatar</span>
          <div id="omni-color-swatches" class="omni-color-swatches" role="radiogroup" aria-label="Couleur Avatar"></div>
        </div>

        <div class="omni-field-group">
          <label class="omni-field-label" for="omni-room-code">Code Salon (4 caract.)</label>
          <div class="omni-room-row">
            <input
              id="omni-room-code"
              class="omni-room-code-input"
              type="text"
              maxlength="4"
              placeholder="ABCD"
              autocomplete="off"
              spellcheck="false"
            />
            <div class="omni-room-actions">
              <button type="button" id="omni-create-room-btn" class="omni-btn is-amber">Créer</button>
              <button type="button" id="omni-join-room-btn" class="omni-btn">Joindre</button>
              <button type="button" id="omni-leave-room-btn" class="omni-btn is-danger is-hidden" title="Quitter">✕</button>
            </div>
          </div>
        </div>

        <button type="button" id="omni-copy-invite-btn" class="omni-invite-btn">
          <span>🔗 Copier lien d'invitation</span>
        </button>
        <div id="omni-invite-preview" class="omni-invite-url-preview">${et}?room=----</div>

        <div class="omni-squad-section">
          <span class="omni-field-label">Escouade Connectée</span>
          <div id="omni-squad-list" class="omni-squad-list"></div>
        </div>
      </aside>

      <!-- Slide-Over Popover 2: PBR Graphics & Audio Settings -->
      <aside id="omni-settings-drawer" class="omni-hub-drawer is-hidden" aria-label="Options Graphiques et Audio">
        <div class="omni-panel-header">
          <div class="omni-panel-title">
            <span>⚙ QUALITÉ PBR & AUDIO</span>
          </div>
          <button type="button" id="omni-close-settings-btn" class="omni-drawer-close-btn" aria-label="Fermer">✕</button>
        </div>

        <div class="omni-field-group">
          <span class="omni-field-label">Préréglage Rendu PBR</span>
          <div class="omni-segmented" role="group" aria-label="Qualité Graphique">
            <button type="button" class="omni-seg-btn" data-preset="ULTRA">Ultra</button>
            <button type="button" class="omni-seg-btn" data-preset="HIGH">Élevé</button>
            <button type="button" class="omni-seg-btn" data-preset="MOBILE_PERF">Mobile</button>
          </div>
        </div>

        <button type="button" id="omni-autoscale-btn" class="omni-toggle-btn">
          <span>Auto-Scale 60 FPS</span>
          <span class="omni-toggle-track"><span class="omni-toggle-thumb"></span></span>
        </button>

        <div class="omni-field-group">
          <span class="omni-field-label">Volume Principal</span>
          <div class="omni-slider-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
            </svg>
            <input id="omni-master-vol" class="omni-range" type="range" min="0" max="100" value="80" />
            <span id="omni-master-val" class="omni-slider-val">80%</span>
          </div>
        </div>

        <div class="omni-field-group">
          <span class="omni-field-label">Musique Adaptative</span>
          <div class="omni-slider-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
            </svg>
            <input id="omni-music-vol" class="omni-range" type="range" min="0" max="100" value="55" />
            <span id="omni-music-val" class="omni-slider-val">55%</span>
          </div>
        </div>
      </aside>

      <!-- Centered 6 Open-World Cards -->
      <main class="omni-hub-main">
        <div id="omni-worlds-grid" class="omni-worlds-grid" aria-label="Catalogue des 6 Mondes Ouverts"></div>
      </main>
    `,e}createHudDOM(){const e=document.createElement("section");return e.id="omniverse-hud",e.className="is-hidden",e.setAttribute("aria-label","Interface tête haute en jeu"),e.innerHTML=`
      <!-- Top-Left: Side-by-Side Compact Radar + Vitals -->
      <div class="omni-hud-topleft">
        <div class="omni-radar-shell">
          <div class="omni-radar-bezel">
            <canvas id="omniverse-radar-canvas"></canvas>
          </div>
        </div>

        <div class="omni-topleft-side">
          <div id="omni-radar-coords" class="omni-radar-coords">000° • 0,0</div>
          <div class="omni-vitals-stack">
            <div id="omni-health-row" class="omni-vital-bar-row is-hidden">
              <span class="omni-vital-label">PV</span>
              <div class="omni-vital-track">
                <div id="omni-health-fill" class="omni-vital-fill is-health"></div>
              </div>
            </div>
            <div id="omni-stamina-row" class="omni-vital-bar-row is-hidden">
              <span class="omni-vital-label">END</span>
              <div class="omni-vital-track">
                <div id="omni-stamina-fill" class="omni-vital-fill is-stamina"></div>
              </div>
            </div>
            <div id="omni-credits-row" class="omni-credits-row is-hidden">
              <span id="omni-credits-val">$ 0</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Top-Center: Compact Status Pill + Collapsible Single-Row World Toolbar -->
      <div class="omni-hud-topcenter">
        <div class="omni-world-status-pill">
          <span id="omni-hud-world-title">OMNIVERSE</span>
          <span id="omni-hud-context-tag" class="omni-context-tag">À PIED</span>
          <span id="omni-hud-weather-tag" class="omni-weather-tag is-hidden"></span>
          <span id="omni-hud-status-hint" class="omni-status-hint is-hidden"></span>
          <button type="button" id="omni-toolbar-toggle-btn" class="omni-toolbar-toggle-btn is-hidden" title="Afficher / Masquer les outils du monde">
            ▴
          </button>
        </div>
        <div id="omniverse-world-toolbar" class="is-empty"></div>
      </div>

      <!-- Top-Right: Single-Row Compact Telemetry & Actions -->
      <div class="omni-hud-topright">
        <div class="omni-telemetry-pill">
          <span id="omni-tel-fps" class="omni-tel-fps">60 FPS</span>
          <span class="omni-tel-sep omni-tel-extra">•</span>
          <span id="omni-tel-draws" class="omni-tel-extra">0 DC</span>
          <span class="omni-tel-sep omni-tel-ping-wrap">•</span>
          <span id="omni-tel-ping" class="omni-tel-ping-wrap">P2P</span>
          <span class="omni-tel-sep omni-tel-extra">•</span>
          <span id="omni-tel-preset" class="omni-tel-extra">ULTRA</span>
        </div>

        <div class="omni-topright-row">
          <button type="button" id="omni-hud-radial-btn" class="omni-hud-action-btn" title="Roue d'équipement (Tab)">
            ☸
          </button>
          <button type="button" id="omni-hud-invite-btn" class="omni-hud-action-btn is-amber" title="Copier le lien d'invitation P2P">
            🔗 <span id="omni-hud-invite-label" class="omni-btn-label-long">P2P</span>
          </button>
          <button type="button" id="omni-hud-hub-btn" class="omni-hud-action-btn" title="Retour au Hub des 6 Mondes">
            ⌂ <span>HUB</span>
          </button>
        </div>
      </div>

      <!-- Compact Vectorial Speedometer (Bottom-Right on PC, Bottom-Center on Mobile) -->
      <div id="omniverse-speed-gauge" class="is-hidden">
        <div class="omni-gauge-svg-wrap">
          <svg class="omni-gauge-svg" viewBox="0 0 160 120">
            <defs>
              <linearGradient id="omniGaugeGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#38e2ff"/>
                <stop offset="68%" stop-color="#66f2a5"/>
                <stop offset="100%" stop-color="#ffb347"/>
              </linearGradient>
            </defs>
            <path
              d="M 20.2 112.5 A 69 69 0 1 1 139.8 112.5"
              fill="none"
              stroke="rgba(56, 226, 255, 0.16)"
              stroke-width="9"
              stroke-linecap="round"
            />
            <path
              id="omni-gauge-arc-fill"
              d="M 20.2 112.5 A 69 69 0 1 1 139.8 112.5"
              fill="none"
              stroke="url(#omniGaugeGrad)"
              stroke-width="9"
              stroke-linecap="round"
              stroke-dasharray="${st}"
              stroke-dashoffset="${st}"
            />
          </svg>
          <div class="omni-gauge-center-readout">
            <span id="omni-speed-value" class="omni-speed-value">0</span>
            <span id="omni-speed-unit" class="omni-speed-unit">KM/H</span>
            <span id="omni-gear-badge" class="omni-gear-badge">D</span>
          </div>
        </div>

        <div class="omni-gauge-submetrics">
          <span id="omni-gauge-sub-left">0tr</span>
          <span id="omni-gauge-sub-right"></span>
          <span id="omni-wind-rose" class="omni-wind-rose is-hidden">
            <span>VENT</span>
            <svg id="omni-wind-arrow-svg" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="8.5" stroke="rgba(25,212,198,0.45)" stroke-width="1.2"/>
              <path d="M10 3 L13.5 14 L10 11.5 L6.5 14 Z" fill="#19d4c6"/>
            </svg>
          </span>
        </div>
      </div>

      <!-- Center Precision Crosshair -->
      <div id="omniverse-crosshair" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="1.8" fill="#eef6ff"/>
          <path d="M12 4v3.5M12 16.5V20M4 12h3.5M16.5 12H20" stroke="rgba(56,226,255,0.8)" stroke-width="1.4" stroke-linecap="round"/>
        </svg>
      </div>

      <!-- Center Holographic Fighter Jet Pitch-Ladder HUD -->
      <div id="omniverse-fighter-hud" class="is-hidden" aria-hidden="true">
        <svg viewBox="0 0 400 320" fill="none">
          <defs>
            <clipPath id="omniFighterLadderClip">
              <rect x="78" y="38" width="244" height="244" rx="14"/>
            </clipPath>
          </defs>
          <path d="M 130 56 A 92 92 0 0 1 270 56" stroke="rgba(56,226,255,0.55)" stroke-width="1.4"/>
          <g id="omni-fighter-roll-group">
            <polygon points="200,40 195,50 205,50" fill="#ffb347"/>
          </g>
          <g clip-path="url(#omniFighterLadderClip)">
            <g id="omni-fighter-pitch-group">
              <path d="M145 98h32v6 M255 98h-32v6" stroke="#38e2ff" stroke-width="1.5"/>
              <text x="136" y="102" fill="#38e2ff" font-family="Rajdhani, sans-serif" font-size="10" font-weight="700" text-anchor="end">+20</text>
              <path d="M152 129h26v5 M248 129h-26v5" stroke="#38e2ff" stroke-width="1.5"/>
              <text x="144" y="133" fill="#38e2ff" font-family="Rajdhani, sans-serif" font-size="10" font-weight="700" text-anchor="end">+10</text>
              <line x1="108" y1="160" x2="176" y2="160" stroke="#66f2a5" stroke-width="2"/>
              <line x1="224" y1="160" x2="292" y2="160" stroke="#66f2a5" stroke-width="2"/>
              <path d="M152 191h26v-5 M248 191h-26v-5" stroke="#ffb347" stroke-width="1.5" stroke-dasharray="5 3"/>
              <text x="144" y="195" fill="#ffb347" font-family="Rajdhani, sans-serif" font-size="10" font-weight="700" text-anchor="end">-10</text>
              <path d="M145 222h32v-6 M255 222h-32v-6" stroke="#ffb347" stroke-width="1.5" stroke-dasharray="5 3"/>
              <text x="136" y="226" fill="#ffb347" font-family="Rajdhani, sans-serif" font-size="10" font-weight="700" text-anchor="end">-20</text>
            </g>
          </g>
          <path d="M182 160h10l4 6 4-6 4 6 4-6h10" stroke="#eef6ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <rect x="8" y="144" width="76" height="30" rx="5" fill="rgba(5,12,22,0.72)" stroke="rgba(56,226,255,0.55)" stroke-width="1.3"/>
          <text id="omni-fighter-mach" x="46" y="163" fill="#7ceeff" font-family="Orbitron, sans-serif" font-size="10.5" font-weight="800" text-anchor="middle">MACH 0.00</text>
          <rect x="316" y="144" width="76" height="30" rx="5" fill="rgba(5,12,22,0.72)" stroke="rgba(56,226,255,0.55)" stroke-width="1.3"/>
          <text id="omni-fighter-alt" x="354" y="163" fill="#7ceeff" font-family="Orbitron, sans-serif" font-size="10.5" font-weight="800" text-anchor="middle">ALT 0 M</text>
        </svg>
        <div id="omni-fighter-stall" class="omni-fighter-stall is-hidden">⚠ DÉCROCHAGE</div>
      </div>
    `,e}createRadialWheelDOM(){const e=document.createElement("div");return e.id="omniverse-radial-wheel",e.className="is-hidden",e.setAttribute("aria-label","Roue radiale de sélection rapide"),e.innerHTML=`
      <div class="omni-radial-container">
        <svg class="omni-radial-svg" viewBox="-170 -170 340 340"></svg>
        <div id="omni-radial-labels"></div>
        <div class="omni-radial-center">
          <span id="omni-radial-center-cat" class="omni-radial-center-cat">ROUE</span>
          <span id="omni-radial-center-name" class="omni-radial-center-name">Choisir</span>
        </div>
      </div>
    `,e}createControlsModalDOM(){const e=document.createElement("div");return e.id="omniverse-controls-modal",e.className="is-hidden",e.innerHTML=`
      <div class="omni-modal-card" role="dialog" aria-modal="true" aria-labelledby="omni-controls-modal-title">
        <div class="omni-modal-header">
          <h3 id="omni-controls-modal-title" class="omni-modal-title">COMMANDES UNIVERSELLES — OMNIVERSE AAA</h3>
          <button type="button" id="omni-close-controls-btn" class="omni-btn">✕ Fermer</button>
        </div>

        <div class="omni-controls-columns">
          <div class="omni-controls-col">
            <h4>CLAVIER & SOURIS (PC)</h4>
            <div class="omni-bind-row"><span>Déplacement / Vol</span><span class="omni-kbd">ZQSD / WASD</span></div>
            <div class="omni-bind-row"><span>Caméra / Visée</span><span class="omni-kbd">Souris</span></div>
            <div class="omni-bind-row"><span>Sprint / Boost</span><span class="omni-kbd">Shift</span></div>
            <div class="omni-bind-row"><span>Saut / Paravoile</span><span class="omni-kbd">Espace</span></div>
            <div class="omni-bind-row"><span>Véhicule / Interagir</span><span class="omni-kbd">E / F</span></div>
            <div class="omni-bind-row"><span>Action / Tir</span><span class="omni-kbd">Clic G</span></div>
            <div class="omni-bind-row"><span>Viser / Frein</span><span class="omni-kbd">Clic D</span></div>
            <div class="omni-bind-row"><span>Roue Radiale</span><span class="omni-kbd">Tab</span></div>
            <div class="omni-bind-row"><span>Retour Hub</span><span class="omni-kbd">Échap</span></div>
          </div>

          <div class="omni-controls-col">
            <h4>MANETTE (XBOX / PS5)</h4>
            <div class="omni-bind-row"><span>Mouvement</span><span class="omni-kbd">Stick G</span></div>
            <div class="omni-bind-row"><span>Caméra 360°</span><span class="omni-kbd">Stick D</span></div>
            <div class="omni-bind-row"><span>Gaz / Tir</span><span class="omni-kbd">RT / R2</span></div>
            <div class="omni-bind-row"><span>Frein / Viser</span><span class="omni-kbd">LT / L2</span></div>
            <div class="omni-bind-row"><span>Saut / Planeur</span><span class="omni-kbd">A / Croix</span></div>
            <div class="omni-bind-row"><span>Interagir</span><span class="omni-kbd">X / Carré</span></div>
            <div class="omni-bind-row"><span>Roue Radiale</span><span class="omni-kbd">LB / L1</span></div>
          </div>

          <div class="omni-controls-col">
            <h4>TACTILE (ANDROID / APK)</h4>
            <div class="omni-bind-row"><span>Déplacement 360°</span><span class="omni-kbd">Stick Gauche</span></div>
            <div class="omni-bind-row"><span>Caméra Libre</span><span class="omni-kbd">Glisser Droite</span></div>
            <div class="omni-bind-row"><span>Actions Contextuelles</span><span class="omni-kbd">Boutons SVG</span></div>
            <div class="omni-bind-row"><span>Roue d'Équipement</span><span class="omni-kbd">☸ Haut-Droite</span></div>
            <div class="omni-bind-row"><span>Replier Outils Monde</span><span class="omni-kbd">▴ Haut-Centre</span></div>
          </div>
        </div>
      </div>
    `,e}createToastStackDOM(){const e=document.createElement("div");return e.id="omniverse-toast-stack",e.setAttribute("aria-live","polite"),e}createLoaderDOM(){const e=document.createElement("div");return e.id="omniverse-loader",e.className="is-hidden",e.innerHTML=`
      <div class="omni-loader-orbital">
        <svg viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="50" r="42" stroke="rgba(56,226,255,0.16)" stroke-width="4"/>
          <circle
            id="omni-loader-arc"
            cx="50"
            cy="50"
            r="42"
            stroke="#38e2ff"
            stroke-width="4"
            stroke-linecap="round"
            stroke-dasharray="264"
            stroke-dashoffset="84"
            transform="rotate(-90 50 50)"
          />
          <g class="omni-loader-spin-outer">
            <circle cx="50" cy="8" r="3" fill="#ffb347"/>
          </g>
          <g class="omni-loader-spin-inner">
            <circle cx="50" cy="50" r="29" stroke="rgba(255,179,71,0.35)" stroke-width="1.5" stroke-dasharray="18 14"/>
          </g>
        </svg>
        <span id="omni-loader-pct" class="omni-loader-pct">PBR</span>
      </div>
      <div class="omni-loader-title">3D GAMES : OMNIVERSE AAA</div>
      <div id="omni-loader-status" class="omni-loader-status">Initialisation du moteur WebGL2 PBR…</div>
    `,e}initializeSwatchesAndCards(){const e=this.network.playerColor||tt[0].hex;this.colorSwatchesEl.innerHTML="";for(let s=0;s<tt.length;s++){const i=tt[s],a=document.createElement("button");a.type="button",a.className=`omni-color-swatch ${i.hex.toLowerCase()===e.toLowerCase()?"is-active":""}`,a.style.setProperty("--swatch-color",i.hex),a.title=i.name,a.setAttribute("aria-label",i.name),a.addEventListener("click",()=>{this.audio.unlock(),this.audio.playUIClick(),this.network.playerColor=i.hex,this.avatar.setAccentColor(i.hex),this.colorSwatchesEl.querySelectorAll(".omni-color-swatch").forEach(r=>r.classList.remove("is-active")),a.classList.add("is-active"),this.refreshLobbyUI()}),this.colorSwatchesEl.appendChild(a)}const t=this.mustQuery(this.hubEl,"#omni-worlds-grid");t.innerHTML="";for(let s=0;s<Je.length;s++){const i=Je[s],a=this.buildWorldCard(i);t.appendChild(a)}this.hubEl.querySelectorAll(".omni-seg-btn[data-preset]").forEach(s=>{const i=s.dataset.preset;i&&this.qualityButtons.set(i,s)})}buildWorldCard(e){const t=document.createElement("article");t.className="omni-world-card",t.style.setProperty("--world-accent",e.accentColor);const o=e.features.slice(0,3).map(s=>`<span class="omni-feature-chip">${this.escapeHTML(s)}</span>`).join("");return t.innerHTML=`
      <div class="omni-world-card-head">
        <div class="omni-world-emblem" aria-hidden="true">
          ${this.getWorldEmblemSVG(e.id)}
        </div>
        <div class="omni-world-headings">
          <h2 class="omni-world-title">${this.escapeHTML(e.title)}</h2>
          <div class="omni-world-subtitle">${this.escapeHTML(e.subtitle)}</div>
        </div>
        <span class="omni-world-play-pill">JOUER →</span>
      </div>
      <p class="omni-world-desc">${this.escapeHTML(e.description)}</p>
      <div class="omni-world-features">${o}</div>
    `,t.addEventListener("click",()=>{this.audio.unlock(),this.audio.playUIClick(),this.hasActiveWorld=!0,this.showHub(!1),this.onSelectWorld(e.id)}),t}toggleHubDrawer(e){const t=!this.lobbyDrawerEl.classList.contains("is-hidden"),o=!this.settingsDrawerEl.classList.contains("is-hidden");if(e==="lobby"){const s=!t;this.lobbyDrawerEl.classList.toggle("is-hidden",!s),this.settingsDrawerEl.classList.add("is-hidden"),this.toggleLobbyBtnEl.classList.toggle("is-active",s),this.toggleSettingsBtnEl.classList.remove("is-active")}else{const s=!o;this.settingsDrawerEl.classList.toggle("is-hidden",!s),this.lobbyDrawerEl.classList.add("is-hidden"),this.toggleSettingsBtnEl.classList.toggle("is-active",s),this.toggleLobbyBtnEl.classList.remove("is-active")}}closeAllHubDrawers(){this.lobbyDrawerEl.classList.add("is-hidden"),this.settingsDrawerEl.classList.add("is-hidden"),this.toggleLobbyBtnEl.classList.remove("is-active"),this.toggleSettingsBtnEl.classList.remove("is-active")}bindEvents(){this.toggleLobbyBtnEl.addEventListener("click",h=>{h.stopPropagation(),this.audio.unlock(),this.audio.playUIClick(),this.toggleHubDrawer("lobby")}),this.toggleSettingsBtnEl.addEventListener("click",h=>{h.stopPropagation(),this.audio.unlock(),this.audio.playUIClick(),this.toggleHubDrawer("settings")}),this.mustQuery(this.hubEl,"#omni-close-lobby-btn").addEventListener("click",()=>{this.audio.playUIClick(),this.closeAllHubDrawers()}),this.mustQuery(this.hubEl,"#omni-close-settings-btn").addEventListener("click",()=>{this.audio.playUIClick(),this.closeAllHubDrawers()}),this.lobbyDrawerEl.addEventListener("click",h=>h.stopPropagation()),this.settingsDrawerEl.addEventListener("click",h=>h.stopPropagation()),this.hubEl.addEventListener("click",()=>{this.closeAllHubDrawers()}),this.toolbarToggleBtnEl.addEventListener("click",()=>{this.audio.playUIClick(),this.toolbarCollapsed=!this.toolbarCollapsed,this.worldToolbarEl.classList.toggle("is-collapsed",this.toolbarCollapsed),this.toolbarToggleBtnEl.textContent=this.toolbarCollapsed?"▾":"▴"}),this.playerNameInputEl.value=this.network.playerName||"Explorateur",this.playerNameInputEl.addEventListener("input",()=>{const h=this.playerNameInputEl.value.trim().slice(0,18);h.length>0&&(this.network.playerName=h,this.renderSquadList(this.network.getConnectedPeers()))});const e=new URLSearchParams(window.location.search),t=this.sanitizeRoomCode(e.get("room")??""),o=this.sanitizeRoomCode(this.network.roomCode)||t||this.generateRandomRoomCode();this.roomCodeInputEl.value=o,this.roomCodeInputEl.addEventListener("input",()=>{const h=this.sanitizeRoomCode(this.roomCodeInputEl.value);this.roomCodeInputEl.value=h,this.updateInvitePreviewText(h)}),this.roomCodeInputEl.addEventListener("keydown",h=>{h.key==="Enter"&&(h.preventDefault(),this.handleJoinRoom(this.roomCodeInputEl.value))}),this.mustQuery(this.hubEl,"#omni-create-room-btn").addEventListener("click",()=>{this.audio.unlock(),this.audio.playUIClick();const h=this.generateRandomRoomCode();this.roomCodeInputEl.value=h,this.handleJoinRoom(h)}),this.mustQuery(this.hubEl,"#omni-join-room-btn").addEventListener("click",()=>{this.audio.unlock(),this.audio.playUIClick();const h=this.sanitizeRoomCode(this.roomCodeInputEl.value)||this.generateRandomRoomCode();this.roomCodeInputEl.value=h,this.handleJoinRoom(h)}),this.leaveRoomBtnEl.addEventListener("click",()=>{this.audio.playUIClick(),this.network.leaveRoom().then(()=>{this.notify("Salon quitté","Mode Solo local activé.","info"),this.refreshLobbyUI()})}),this.inviteBtnEl.addEventListener("click",()=>{this.audio.unlock(),this.audio.playUIClick(),this.copyDirectInviteLink()}),this.hudInviteBtnEl.addEventListener("click",()=>{this.audio.playUIClick(),this.copyDirectInviteLink()}),this.network.onPeersChanged(()=>{this.refreshLobbyUI()}),this.lobbyRefreshInterval=window.setInterval(()=>{this.hubVisible&&this.refreshLobbyUI()},1800),this.qualityButtons.forEach((h,u)=>{h.addEventListener("click",()=>{this.audio.unlock(),this.audio.playUIClick(),this.quality.setPreset(u),this.syncQualityUI()})}),this.autoScaleBtnEl.addEventListener("click",()=>{this.audio.unlock(),this.audio.playUIClick(),this.quality.autoScale=!this.quality.autoScale,this.syncQualityUI()}),this.quality.onChange(()=>{this.syncQualityUI()});const a=this.mustQuery(this.hubEl,"#omni-master-vol"),n=this.mustQuery(this.hubEl,"#omni-music-vol");a.addEventListener("input",()=>{const h=Number(a.value);this.masterValEl.textContent=`${h}%`,this.audio.unlock(),this.audio.setMasterVolume(h/100)}),n.addEventListener("input",()=>{const h=Number(n.value);this.musicValEl.textContent=`${h}%`,this.audio.unlock(),this.audio.setMusicVolume(h/100)});const r=this.mustQuery(this.hubEl,"#omni-open-controls-btn"),l=this.mustQuery(this.controlsModalEl,"#omni-close-controls-btn");r.addEventListener("click",h=>{h.stopPropagation(),this.audio.playUIClick(),this.closeAllHubDrawers(),this.setControlsModalOpen(!0)}),l.addEventListener("click",()=>{this.audio.playUIClick(),this.setControlsModalOpen(!1)}),this.controlsModalEl.addEventListener("click",h=>{h.target===this.controlsModalEl&&this.setControlsModalOpen(!1)}),this.resumeBtnEl.addEventListener("click",()=>{this.audio.playUIClick(),this.showHub(!1)}),this.mustQuery(this.hudEl,"#omni-hud-hub-btn").addEventListener("click",()=>{this.audio.playUIClick(),this.onReturnHub(),this.showHub(!0)}),this.mustQuery(this.hudEl,"#omni-hud-radial-btn").addEventListener("click",()=>{this.manualRadialLatch=!this.radialOpen,this.applyRadialState(this.manualRadialLatch)}),window.addEventListener("beforeinstallprompt",h=>{h.preventDefault(),this.deferredInstallPrompt=h,this.pwaBtnEl.classList.remove("is-hidden")}),window.addEventListener("appinstalled",()=>{this.deferredInstallPrompt=null,this.pwaBtnEl.classList.add("is-hidden"),this.notify("Application installée","Omniverse AAA prêt sur votre appareil.","success")}),this.pwaBtnEl.addEventListener("click",()=>{if(this.audio.playUIClick(),!this.deferredInstallPrompt)return;const h=this.deferredInstallPrompt;h.prompt().then(()=>h.userChoice).then(u=>{u.outcome==="accepted"&&(this.pwaBtnEl.classList.add("is-hidden"),this.deferredInstallPrompt=null)})}),window.addEventListener("keydown",h=>{if(this.isTypingInInput(h.target)){h.key==="Escape"&&h.target.blur();return}if(h.code==="Escape"){if(this.controlsModalOpen){h.preventDefault(),this.setControlsModalOpen(!1);return}if(!this.lobbyDrawerEl.classList.contains("is-hidden")||!this.settingsDrawerEl.classList.contains("is-hidden")){h.preventDefault(),this.closeAllHubDrawers();return}if(this.radialOpen){h.preventDefault(),this.hoveredRadialIndex=-1,this.manualRadialLatch=!1,this.applyRadialState(!1);return}this.hubVisible?this.hasActiveWorld&&(h.preventDefault(),this.audio.playUIClick(),this.showHub(!1)):(h.preventDefault(),this.audio.playUIClick(),this.onReturnHub(),this.showHub(!0));return}h.code==="Tab"&&!this.hubVisible&&(h.preventDefault(),h.repeat||(this.inputRadialHeld=!0,this.applyRadialState(!0)))}),window.addEventListener("keyup",h=>{h.code==="Tab"&&this.radialOpen&&(h.preventDefault(),this.inputRadialHeld=!1,this.manualRadialLatch=!1,this.applyRadialState(!1))}),window.addEventListener("mousemove",h=>{if(this.radialOpen)if(document.pointerLockElement)this.radialVirtualX=Math.max(-110,Math.min(110,this.radialVirtualX+h.movementX)),this.radialVirtualY=Math.max(-110,Math.min(110,this.radialVirtualY+h.movementY)),this.updateRadialSelectionFromOffset(this.radialVirtualX,this.radialVirtualY);else{const u=this.radialContainerEl.getBoundingClientRect(),p=h.clientX-(u.left+u.width*.5),m=h.clientY-(u.top+u.height*.5);this.updateRadialSelectionFromOffset(p,m)}}),this.radialWheelEl.addEventListener("mousedown",h=>{if(this.radialOpen)if(this.hoveredRadialIndex>=0&&this.hoveredRadialIndex<this.radialItems.length){const u=this.radialItems[this.hoveredRadialIndex];this.radialCommitted=!0,this.audio.playUIClick(),this.onRadialSelect?.(u),this.manualRadialLatch=!1,this.applyRadialState(!1)}else h.target===this.radialWheelEl&&(this.manualRadialLatch=!1,this.applyRadialState(!1))}),this.radialWheelEl.addEventListener("touchstart",h=>{if(!this.radialOpen||h.touches.length===0)return;const u=h.touches[0],p=this.radialContainerEl.getBoundingClientRect(),m=u.clientX-(p.left+p.width*.5),g=u.clientY-(p.top+p.height*.5);this.updateRadialSelectionFromOffset(m,g)},{passive:!0}),this.radialWheelEl.addEventListener("touchmove",h=>{if(!this.radialOpen||h.touches.length===0)return;h.preventDefault();const u=h.touches[0],p=this.radialContainerEl.getBoundingClientRect(),m=u.clientX-(p.left+p.width*.5),g=u.clientY-(p.top+p.height*.5);this.updateRadialSelectionFromOffset(m,g)},{passive:!1}),this.radialWheelEl.addEventListener("touchend",h=>{if(this.radialOpen){if(h.changedTouches.length>0){const u=h.changedTouches[0],p=this.radialContainerEl.getBoundingClientRect(),m=u.clientX-(p.left+p.width*.5),g=u.clientY-(p.top+p.height*.5);this.updateRadialSelectionFromOffset(m,g)}this.manualRadialLatch=!1,this.inputRadialHeld=!1,this.applyRadialState(!1)}})}async handleJoinRoom(e){const t=this.sanitizeRoomCode(e);if(t.length<2){this.notify("Code Salon invalide","Entrez 4 caractères (ex: ABCD).","warning");return}this.netStatusPillEl.textContent="…";try{await this.network.joinOrCreateRoom(t),this.roomCodeInputEl.value=this.network.roomCode||t,this.refreshLobbyUI(),this.notify(`Salon P2P #${this.network.roomCode||t}`,"Synchronisation WebRTC active.","success")}catch{this.notify("Connexion P2P","Mode local maintenu.","warning"),this.refreshLobbyUI()}}async copyDirectInviteLink(){let e=this.sanitizeRoomCode(this.network.roomCode);if(!e){e=this.sanitizeRoomCode(this.roomCodeInputEl.value)||this.generateRandomRoomCode(),this.roomCodeInputEl.value=e;try{await this.network.joinOrCreateRoom(e)}catch{}this.refreshLobbyUI()}const t=this.network.getInviteUrl(),o=t&&t.includes("?room=")?t:`${et}?room=${encodeURIComponent(e)}`;let s=!1;if(navigator.clipboard&&navigator.clipboard.writeText)try{await navigator.clipboard.writeText(o),s=!0}catch{s=!1}if(!s){const i=document.createElement("textarea");i.value=o,i.style.position="fixed",i.style.opacity="0",document.body.appendChild(i),i.select();try{document.execCommand("copy"),s=!0}catch{s=!1}i.remove()}s&&(this.inviteBtnEl.classList.add("is-copied"),this.inviteBtnEl.innerHTML="<span>✓ Lien copié !</span>",this.hudInviteLabelEl.textContent="COPIÉ",this.notify("Invitation copiée !",o,"success"),this.inviteCopiedTimer!==null&&window.clearTimeout(this.inviteCopiedTimer),this.inviteCopiedTimer=window.setTimeout(()=>{this.inviteBtnEl.classList.remove("is-copied"),this.inviteBtnEl.innerHTML="<span>🔗 Copier lien d'invitation</span>",this.hudInviteLabelEl.textContent=this.network.roomCode?`#${this.network.roomCode}`:"P2P"},2e3))}refreshLobbyUI(){const e=this.sanitizeRoomCode(this.network.roomCode),t=this.network.getConnectedPeers();e?(this.roomCodeInputEl.value=e,this.netStatusPillEl.textContent=`#${e}`,this.netStatusPillEl.classList.add("is-online"),this.leaveRoomBtnEl.classList.remove("is-hidden"),this.hudInviteLabelEl.textContent=`#${e}`,this.updateInvitePreviewText(e)):(this.netStatusPillEl.textContent="SOLO",this.netStatusPillEl.classList.remove("is-online"),this.leaveRoomBtnEl.classList.add("is-hidden"),this.hudInviteLabelEl.textContent="P2P",this.updateInvitePreviewText(this.sanitizeRoomCode(this.roomCodeInputEl.value)||"----")),this.renderSquadList(t)}updateInvitePreviewText(e){const t=e||"----";this.invitePreviewEl.textContent=`${et}?room=${t}`}renderSquadList(e){this.squadListEl.innerHTML="";const t=document.createElement("div");t.className="omni-peer-row";const o=this.network.playerColor||"#38e2ff",s=this.network.roomCode?this.network.isHost?"HÔTE":"VOUS":"LOCAL";t.innerHTML=`
      <div class="omni-peer-ident">
        <span class="omni-peer-dot" style="color:${this.escapeHTML(o)};background:${this.escapeHTML(o)}"></span>
        <span class="omni-peer-name">${this.escapeHTML(this.network.playerName||"Vous")}</span>
        <span class="omni-peer-badge">${s}</span>
      </div>
      <div class="omni-peer-meta">
        <span class="omni-peer-ping">0 ms</span>
      </div>
    `,this.squadListEl.appendChild(t);for(let i=0;i<e.length;i++){const a=e[i];if(a.peerId===this.network.selfPeerId)continue;const n=Math.max(1,Math.round(a.pingMs)),r=n>=120?"is-high":n>=60?"is-mid":"",l=document.createElement("div");l.className="omni-peer-row",l.innerHTML=`
        <div class="omni-peer-ident">
          <span class="omni-peer-dot" style="color:${this.escapeHTML(a.color)};background:${this.escapeHTML(a.color)}"></span>
          <span class="omni-peer-name">${this.escapeHTML(a.name)}</span>
          ${a.isHost?'<span class="omni-peer-badge">HÔTE</span>':""}
        </div>
        <div class="omni-peer-meta">
          <span class="omni-peer-world">${this.escapeHTML(a.worldId)}</span>
          <span class="omni-peer-ping ${r}">${n} ms</span>
        </div>
      `,this.squadListEl.appendChild(l)}}syncQualityUI(){const e=this.quality.config.preset;this.qualityButtons.forEach((t,o)=>{t.classList.toggle("is-active",o===e)}),this.autoScaleBtnEl.classList.toggle("is-active",this.quality.autoScale)}setControlsModalOpen(e){this.controlsModalOpen=e,this.controlsModalEl.classList.toggle("is-hidden",!e)}rebuildRadialSlices(){this.radialSvgEl.innerHTML="",this.radialLabelsLayerEl.innerHTML="",this.radialSliceEls=[],this.radialLabelEls=[];const e=this.radialItems.length;if(e===0){this.radialCenterCatEl.textContent="VIDE",this.radialCenterNameEl.textContent="Aucun item";return}const t=62,o=156,s=109,i=Math.PI*2/e,a=e>1?.024:0;for(let n=0;n<e;n++){const r=this.radialItems[n],l=-Math.PI*.5+n*i,c=l-i*.5+a*.5,d=l+i*.5-a*.5,h=document.createElementNS("http://www.w3.org/2000/svg","path");h.setAttribute("class","omni-radial-slice"),h.setAttribute("d",this.describeAnnularSector(t,o,c,d,e===1)),this.radialSvgEl.appendChild(h),this.radialSliceEls.push(h);const u=document.createElement("div");u.className="omni-radial-item-label";const p=170+Math.cos(l)*s,m=170+Math.sin(l)*s;u.style.left=`${(p/340*100).toFixed(2)}%`,u.style.top=`${(m/340*100).toFixed(2)}%`;const g=document.createElement("div");g.className="omni-radial-item-icon",g.innerHTML=this.resolveRadialIconHTML(r.icon,r.category);const y=document.createElement("div");y.className="omni-radial-item-text",y.textContent=r.label,u.appendChild(g),u.appendChild(y),this.radialLabelsLayerEl.appendChild(u),this.radialLabelEls.push(u)}}describeAnnularSector(e,t,o,s,i){if(i)return[`M 0 ${-t}`,`A ${t} ${t} 0 1 1 0 ${t}`,`A ${t} ${t} 0 1 1 0 ${-t}`,`M 0 ${-e}`,`A ${e} ${e} 0 1 0 0 ${e}`,`A ${e} ${e} 0 1 0 0 ${-e}`,"Z"].join(" ");const a=Math.cos(o)*t,n=Math.sin(o)*t,r=Math.cos(s)*t,l=Math.sin(s)*t,c=Math.cos(s)*e,d=Math.sin(s)*e,h=Math.cos(o)*e,u=Math.sin(o)*e,p=s-o>Math.PI?1:0;return[`M ${a.toFixed(2)} ${n.toFixed(2)}`,`A ${t} ${t} 0 ${p} 1 ${r.toFixed(2)} ${l.toFixed(2)}`,`L ${c.toFixed(2)} ${d.toFixed(2)}`,`A ${e} ${e} 0 ${p} 0 ${h.toFixed(2)} ${u.toFixed(2)}`,"Z"].join(" ")}updateRadialSelectionFromOffset(e,t){const o=this.radialItems.length;if(o===0)return;if(Math.hypot(e,t)<18){this.setHoveredRadialSlice(-1);return}const i=Math.PI*2/o;let a=Math.atan2(t,e)+Math.PI*.5+i*.5;for(;a<0;)a+=Math.PI*2;a%=Math.PI*2;const n=Math.min(o-1,Math.floor(a/i));this.setHoveredRadialSlice(n)}setHoveredRadialSlice(e){if(!(e===this.hoveredRadialIndex&&e!==-1)){this.hoveredRadialIndex=e;for(let t=0;t<this.radialSliceEls.length;t++){const o=t===e;this.radialSliceEls[t].classList.toggle("is-hovered",o),this.radialLabelEls[t]?.classList.toggle("is-hovered",o)}if(e>=0&&e<this.radialItems.length){const t=this.radialItems[e];this.radialCenterCatEl.textContent=Us[t.category],this.radialCenterNameEl.textContent=t.label}else this.radialCenterCatEl.textContent="ROUE",this.radialCenterNameEl.textContent="Choisir"}}getWorldEmblemSVG(e){switch(e){case"metropolis":return`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="9" width="6" height="12"/><rect x="9" y="4" width="6" height="17"/><rect x="15" y="11" width="6" height="10"/>
        </svg>`;case"starfield":return`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="5.5"/>
          <ellipse cx="12" cy="12" rx="10.5" ry="3.8" transform="rotate(-24 12 12)"/>
        </svg>`;case"valheim":return`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="12,3 5,13 9,13 6,19 18,19 15,13 19,13"/><line x1="12" y1="19" x2="12" y2="22"/>
        </svg>`;case"seaOfLegends":return`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 3v12"/><path d="M12 4l7 9h-7"/><path d="M12 6l-5 7h5"/>
          <path d="M3 16h18l-2.5 3.5H5.5L3 16z"/>
        </svg>`;case"aetheria":return`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="14.5,3.5 20.5,3.5 20.5,9.5 10.5,19.5 4.5,13.5"/>
          <line x1="3.5" y1="20.5" x2="8.5" y2="15.5"/>
        </svg>`;case"extremeHorizon":return`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 3L10 14"/><polygon points="21,3 14,21 10,14 3,10"/>
        </svg>`}}getToastIconSVG(e){return e==="success"?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.3 2.3 4.8-5"/></svg>':e==="warning"?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12,3 22,20 2,20"/><line x1="12" y1="9" x2="12" y2="14"/><circle cx="12" cy="17.2" r="0.6" fill="currentColor"/></svg>':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16"/><circle cx="12" cy="8" r="0.6" fill="currentColor"/></svg>'}resolveRadialIconHTML(e,t){const o=e.trim();if(o.startsWith("<svg"))return o;switch(o.toLowerCase()){case"sword":return'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 4l5.5 5.5-9.5 9.5H5v-5.5L14.5 4z"/><path d="M3 21l4-4"/></svg>';case"bow":return'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 4c9 2 13 6 15 15"/><line x1="5" y1="4" x2="20" y2="19"/></svg>';case"laser":return'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>';case"axe":case"hammer":return'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 4l6 6-4 4-6-6 4-4z"/><line x1="4" y1="20" x2="13" y2="11"/></svg>';case"magic_fire":case"fire":return'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2c2 4 6 6 6 11a6 6 0 1 1-12 0c0-3 2-5 3-7 0 2 2 3 3-4z"/></svg>';case"magic_ice":case"ice":return'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/></svg>';case"car":case"moto":case"truck4x4":return'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 16l2-6h10l2 6"/><rect x="3" y="14" width="18" height="4" rx="1"/><circle cx="7" cy="19" r="2"/><circle cx="17" cy="19" r="2"/></svg>';case"heli":case"jet":case"starfighter":return'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="21,3 14,21 10,14 3,10"/></svg>';default:return o.length<=4?`<span>${this.escapeHTML(o)}</span>`:t==="vehicle"?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12,3 20,19 12,15 4,19"/></svg>':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12,2 22,12 12,22 2,12"/></svg>'}}sanitizeRoomCode(e){return e.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,4)}generateRandomRoomCode(){let e="";for(let t=0;t<4;t++){const o=Math.floor(Math.random()*bt.length);e+=bt[o]}return e}isTypingInInput(e){if(!(e instanceof HTMLElement))return!1;const t=e.tagName;return t==="INPUT"||t==="TEXTAREA"||t==="SELECT"||e.isContentEditable}escapeHTML(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}mustQuery(e,t){const o=e.querySelector(t);if(!o)throw new Error(`UIManager: Missing required element "${t}"`);return o}dispose(){this.lobbyRefreshInterval!==null&&(window.clearInterval(this.lobbyRefreshInterval),this.lobbyRefreshInterval=null),this.inviteCopiedTimer!==null&&(window.clearTimeout(this.inviteCopiedTimer),this.inviteCopiedTimer=null)}}class Xs{renderer;scene;camera;textures;sky;postFX;audio;input;network;quality;localAvatar;ui;activeWorld=null;hubDioramaGroup=null;hubOceanMat=null;hubInteriorMat=null;hubRingPlanet=null;clock=new Jt;elapsed=0;isSwitchingWorld=!1;rafId=0;telemetryTimer=0;constructor(e,t){this.renderer=new Yt({canvas:e,antialias:!1,powerPreference:"high-performance",stencil:!1,depth:!0}),this.renderer.outputColorSpace=Ue,this.renderer.toneMapping=St,this.renderer.toneMappingExposure=1.06,this.renderer.shadowMap.enabled=!0,this.renderer.shadowMap.type=Ct,this.renderer.info.autoReset=!1,this.scene=new Mt,this.camera=new Zt(62,Math.max(1,window.innerWidth)/Math.max(1,window.innerHeight),.15,18e3),this.camera.position.set(0,42,115),this.quality=new Pe,this.textures=new cs(this.quality.config.textureSize),this.sky=new us(this.scene),this.postFX=new gs(this.renderer,this.scene,this.camera,this.quality.config),this.audio=new Bs,this.input=new Hs(e,t),this.localAvatar=new Rt,this.network=new Re,this.ui=new js({container:t,onSelectWorld:s=>{this.audio.unlock(),this.audio.playUIClick(),this.switchWorld(s)},onReturnHub:()=>{this.audio.playUIClick(),this.returnToHub()},network:this.network,quality:this.quality,audio:this.audio,avatar:this.localAvatar}),this.applyQualitySettings(),this.quality.onChange(()=>this.applyQualitySettings());const o=()=>{this.audio.unlock(),window.removeEventListener("pointerdown",o),window.removeEventListener("keydown",o)};window.addEventListener("pointerdown",o,{passive:!0}),window.addEventListener("keydown",o,{passive:!0}),window.addEventListener("resize",()=>this.onResize()),this.network.onWorldEvent(s=>{if(s.type==="world_travel"&&s.senderId!==this.network.selfPeerId){const i=s.payload.worldId||s.worldId;if(i&&(!this.activeWorld||this.activeWorld.id!==i)){const a=Je.find(n=>n.id===i);this.ui.notify("Voyage d’Escouade P2P",`L’hôte vous emmène vers ${a?a.title:i}`,"info"),this.switchWorld(i,void 0,!0)}return}this.activeWorld&&s.worldId===this.activeWorld.id&&this.activeWorld.onWorldEvent?.(s)})}async boot(){this.ui.setLoading(!0,"Synthèse des textures PBR 1024×1024 & compilation des Shaders GLSL…",20),await new Promise(s=>requestAnimationFrame(s)),this.textures.getTextureSet("facade_glass"),this.textures.getTextureSet("asphalt"),this.textures.getTextureSet("rock"),this.textures.getTextureSet("carbon"),this.ui.setLoading(!0,"Génération de l’atmosphère Rayleigh & Mie + Probe PMREM…",65),await new Promise(s=>requestAnimationFrame(s)),this.sky.setTimeOfDay(18.35),this.sky.refreshEnvironmentMap(this.renderer),this.buildHubShowcaseDiorama();const t=new URLSearchParams(window.location.search).get("room");if(t&&t.trim().length>=2){const s=t.trim().toUpperCase().slice(0,8);this.network.joinOrCreateRoom(s).then(()=>{this.ui.notify("Salon Multijoueur Connecté",`Connecté automatiquement au salon P2P #${s}`,"success")})}this.input.setContextMode("HUB"),this.audio.setWorldSoundscape("hub"),this.ui.setLoading(!1),this.ui.showHub(!0),this.clock.start();const o=()=>{this.rafId=requestAnimationFrame(o),this.frame()};this.rafId=requestAnimationFrame(o)}buildHubShowcaseDiorama(){this.disposeHubDiorama();const e=new q;e.name="OmniverseHubDiorama";const t=new Kt(2400,2400,140,140);t.rotateX(-Math.PI/2),this.hubOceanMat=Ms({sunDirection:this.sky.sunDirection,deepColor:268331,shallowColor:1007482});const o=new b(t,this.hubOceanMat);o.position.y=0,e.add(o);const s=this.textures.createPBRMaterial("rock",{repeatX:8,repeatY:8,roughness:.85}),i=new te(92,118,8,48,2),a=new b(i,s);a.position.y=2.5,a.receiveShadow=!0,a.castShadow=!0,e.add(a);const n=this.textures.createPBRMaterial("asphalt",{repeatX:14,repeatY:14,roughness:.35,metalness:.15}),r=new b(new te(86,88,1.2,48),n);r.position.y=6.6,r.receiveShadow=!0,e.add(r);const l=this.textures.getTextureSet("facade_glass");this.hubInteriorMat=Ts(l,{floors:14,roomsPerFloor:6,nightFactor:.82});const c=68,d=new $(1,1,1),h=new es(d,this.hubInteriorMat,c);h.castShadow=!0,h.receiveShadow=!0;const u=new ts;for(let x=0;x<c;x++){const T=x<16?18+x%4*6:36+x*19%44,k=x/c*Math.PI*2*2.3,w=5.5+x*7%7,U=5.5+x*11%7,G=x===0?78:Math.max(14,62-T*.55+x*13%24);u.position.set(x===0?0:Math.cos(k)*T,7+G*.5,x===0?0:Math.sin(k)*T),u.rotation.set(0,x%4*(Math.PI*.5),0),u.scale.set(x===0?11:w,G,x===0?11:U),u.updateMatrix(),h.setMatrixAt(x,u.matrix)}h.instanceMatrix.needsUpdate=!0,e.add(h);const p=new q;p.position.set(-280,220,-620);const m=this.textures.createPBRMaterial("sand",{repeatX:4,repeatY:2,tint:7260415,roughness:.65,metalness:.1}),g=new b(new Se(76,48,32),m);p.add(g);const y=new ss(98,152,64);y.rotateX(Math.PI*.42);const C=new ve({color:16763256,emissive:3876364,roughness:.45,metalness:.35,side:je,transparent:!0,opacity:.72}),M=new b(y,C);p.add(M),p.rotation.z=.28,e.add(p),this.hubRingPlanet=p,this.scene.add(e),this.hubDioramaGroup=e}disposeHubDiorama(){this.hubDioramaGroup&&(this.scene.remove(this.hubDioramaGroup),this.hubDioramaGroup.traverse(e=>{if(e.isMesh){const t=e;t.geometry?.dispose();const o=Array.isArray(t.material)?t.material:[t.material];for(const s of o)s?.dispose()}}),this.hubDioramaGroup=null,this.hubOceanMat=null,this.hubInteriorMat=null,this.hubRingPlanet=null)}resetWorldEnvironmentState(){this.sky.setSpaceBlend(0),this.sky.setWeather("clear",0),this.sky.setTimeOfDay(14.5),this.postFX.setSpeedFactor(0),this.audio.updateVehicleEngine(!1,0,0,0),this.audio.updateWindRush(0),this.audio.updateRainAmbience(0),this.audio.updateSpaceThruster(!1,0,!1),this.ui.setFighterHUDVisible(!1),this.ui.setWorldToolbarHTML(""),this.localAvatar.setParagliderVisible(!1),this.localAvatar.setJetpackFlame(0),this.localAvatar.setEquippedTool("none"),this.localAvatar.root.rotation.set(0,0,0),this.localAvatar.root.visible=!0,this.camera.up.set(0,1,0),this.camera.fov=62,this.camera.updateProjectionMatrix()}async switchWorld(e,t,o=!1){if(this.isSwitchingWorld)return;this.isSwitchingWorld=!0;const s=Je.find(i=>i.id===e);this.ui.showHub(!1),this.ui.setLoading(!0,`Chargement dynamique : ${s?s.title:e}…`,18),await new Promise(i=>requestAnimationFrame(i));try{this.activeWorld&&(this.activeWorld.dispose(),this.activeWorld=null),this.disposeHubDiorama(),this.resetWorldEnvironmentState(),this.renderer.renderLists.dispose(),this.ui.setLoading(!0,`Initialisation du pipeline PBR & physique (${s?.title??e})…`,52),await new Promise(a=>requestAnimationFrame(a));let i;switch(e){case"metropolis":{const a=await De(()=>import("./MetropolisWorld-NBZ1FvMm.js"),__vite__mapDeps([0,1,2]),import.meta.url);i=new a.MetropolisWorld;break}case"starfield":{const a=await De(()=>import("./StarfieldWorld-DrpkfSQp.js"),__vite__mapDeps([3,1,2]),import.meta.url);i=new a.StarfieldWorld;break}case"valheim":{const a=await De(()=>import("./ValheimWorld-Ddqdf73z.js"),__vite__mapDeps([4,1,2]),import.meta.url);i=new a.ValheimWorld;break}case"seaOfLegends":{const a=await De(()=>import("./SeaOfLegendsWorld-DiJnKHIN.js"),__vite__mapDeps([5,1,2]),import.meta.url);i=new a.SeaOfLegendsWorld;break}case"aetheria":{const a=await De(()=>import("./AetheriaWorld-CFZmdTbM.js"),__vite__mapDeps([6,1,2]),import.meta.url);i=new a.AetheriaWorld;break}case"extremeHorizon":{const a=await De(()=>import("./ExtremeHorizonWorld-CsNnDVX5.js"),__vite__mapDeps([7,1,2]),import.meta.url);i=new a.ExtremeHorizonWorld;break}}this.scene.children.includes(this.localAvatar.root)||this.scene.add(this.localAvatar.root),this.ui.setLoading(!0,`Génération procédurale de l’environnement (${s?.title??e})…`,82),await i.load(this,t),this.sky.refreshEnvironmentMap(this.renderer),this.audio.setWorldSoundscape(e),this.activeWorld=i,!o&&this.network.isHost&&this.network.getConnectedPeers().length>0&&this.network.broadcastWorldEvent("world_travel",e,{worldId:e}),this.ui.setLoading(!1),this.ui.notify(s?.title??e,s?.subtitle??"Monde ouvert prêt — bon jeu !","success")}catch(i){console.error("[OmniverseEngine] Failed to load world:",i),this.ui.setLoading(!1),this.ui.notify("Erreur de chargement",i instanceof Error?i.message:"Impossible de charger ce monde.","warning"),this.returnToHub()}finally{this.isSwitchingWorld=!1,this.clock.getDelta()}}returnToHub(){this.activeWorld&&(this.activeWorld.dispose(),this.activeWorld=null),this.scene.children.includes(this.localAvatar.root)&&this.scene.remove(this.localAvatar.root),this.resetWorldEnvironmentState(),this.renderer.renderLists.dispose(),document.pointerLockElement&&document.exitPointerLock(),this.sky.setTimeOfDay(18.35),this.sky.refreshEnvironmentMap(this.renderer),this.buildHubShowcaseDiorama(),this.input.setContextMode("HUB"),this.audio.setWorldSoundscape("hub"),this.ui.showHub(!0)}applyQualitySettings(){const e=this.quality.config,t=Math.max(1,window.innerWidth),o=Math.max(1,window.innerHeight);this.renderer.setPixelRatio(e.pixelRatio),this.renderer.setSize(t,o,!1),this.camera.aspect=t/o,this.camera.updateProjectionMatrix(),this.postFX.applyQuality(e),this.postFX.setSize(t,o,e.pixelRatio)}onResize(){this.applyQualitySettings()}frame(){const e=Math.min(.05,Math.max(5e-4,this.clock.getDelta())),t=this.quality.recordFrame(e);this.input.update(e),this.activeWorld&&this.ui.openRadialMenu(this.input.state.radialMenuOpen);const s=!!(this.activeWorld&&(this.input.state.radialMenuOpen||this.ui.isRadialMenuOpen()))?.25:1,i=e*s;if(this.elapsed+=i,this.renderer.info.reset(),this.activeWorld){this.activeWorld.update(i,this.elapsed);const a=this.network.syncRemoteEntities(this.scene,this.activeWorld.id,e),r=[...this.activeWorld.getMinimapMarkers(),...a],l=this.activeWorld.getGPSRoute?.();this.ui.updateMinimap({x:this.localAvatar.root.position.x,z:this.localAvatar.root.position.z},this.input.state.cameraYaw,r,l)}else{const a=this.elapsed*.085,n=118+Math.sin(this.elapsed*.19)*16,r=36+Math.sin(this.elapsed*.14)*10;this.camera.position.set(Math.cos(a)*n,r,Math.sin(a)*n),this.camera.lookAt(0,22,0),this.sky.update(e,this.camera.position),this.hubOceanMat&&Ss(this.hubOceanMat,this.elapsed,this.sky.sunDirection,this.camera.position),this.hubInteriorMat&&Es(this.hubInteriorMat,this.elapsed,this.sky.sunDirection,this.camera.position,.84),this.hubRingPlanet&&(this.hubRingPlanet.rotation.y=this.elapsed*.03)}this.postFX.render(e),this.telemetryTimer+=e,this.telemetryTimer>=.1&&!this.activeWorld&&(this.telemetryTimer=0,this.ui.updateTelemetry({fps:Math.round(t),drawCalls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles,pingMs:Math.round(this.network.getAveragePing()),peerCount:this.network.getConnectedPeers().length,qualityPreset:this.quality.config.preset,autoScale:this.quality.autoScale,worldTitle:"OMNIVERSE HUB",contextMode:"HUB"}))}dispose(){cancelAnimationFrame(this.rafId),this.activeWorld&&(this.activeWorld.dispose(),this.activeWorld=null),this.disposeHubDiorama(),this.textures.dispose(),this.renderer.dispose()}}"serviceWorker"in navigator&&window.addEventListener("load",()=>{navigator.serviceWorker.register("./sw.js").catch(f=>{console.warn("[PWA] Service Worker registration skipped:",f)})});async function $s(){const f=document.getElementById("omniverse-canvas"),e=document.getElementById("omniverse-ui");if(!f||!e)throw new Error("Missing #omniverse-canvas or #omniverse-ui container in index.html");window.addEventListener("contextmenu",o=>{const s=o.target;(!s||s.tagName!=="INPUT")&&o.preventDefault()}),await new Xs(f,e).boot()}$s();export{Pt as D,Ae as P,ns as S,Je as W,Ms as a,Ks as b,ei as c,Ts as d,Ss as e,oi as f,Zs as g,ti as h,ii as i,si as j,Ys as s,Es as u};
