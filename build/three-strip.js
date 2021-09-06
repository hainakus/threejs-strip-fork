class t extends Error{constructor(){super("Buffer geometry has been disposed internally")}}class s extends Error{constructor(){super("Missing threejs lib; please assign it to `Strip.THREE`")}}function e(e){if(!e)throw new s;return function(s){return class extends s.LineSegments{#strip;#len;#c0;#c1;#c2;#nFrm;#colorNeedsUpdate;constructor(e,i=1,r="#ff0000",h="#00ff00",o="#0000ff"){if(!e.geometry||!e.frames)throw new t;super(new s.BufferGeometry,new s.LineBasicMaterial({vertexColors:!0})),this.#strip=e,this.#len=i,this.#c0=new s.Color(r),this.#c1=new s.Color(h),this.#c2=new s.Color(o),this.#nFrm=-1,this.#colorNeedsUpdate=!0,this.update()}setColors(t=this.#c0,e=this.#c1,i=this.#c2){t=new s.Color(t),e=new s.Color(e),i=new s.Color(i),this.#c0.equals(t)&&this.#c1.equals(e)&&this.#c2.equals(i)||(this.#c0=t,this.#c1=e,this.#c2=i,this.#colorNeedsUpdate=!0,this.update())}setLength(t){this.#len=t,this.update()}update(){if(this.geometry.dispose(),!this.#strip.geometry||!this.#strip.frames)return;this.#strip.frames.length!==this.#nFrm&&(this.geometry.setAttribute("color",new s.Float32BufferAttribute(18*this.#strip.frames.length,3)),this.#nFrm=this.#strip.frames.length,this.#colorNeedsUpdate=!0);const t=this.geometry.getAttribute("color"),e=this.#strip.curve.getSpacedPoints(this.#strip.segment),i=[];for(const[s,r]of this.#strip.frames.entries())i.push(e[s],r[1].clone().multiplyScalar(this.#len).add(e[s]),e[s],r[2].clone().multiplyScalar(this.#len).add(e[s]),e[s],r[0].clone().multiplyScalar(this.#len).add(e[s])),this.#colorNeedsUpdate&&t.array.set([this.#c0.r,this.#c0.g,this.#c0.b,this.#c0.r,this.#c0.g,this.#c0.b,this.#c1.r,this.#c1.g,this.#c1.b,this.#c1.r,this.#c1.g,this.#c1.b,this.#c2.r,this.#c2.g,this.#c2.b,this.#c2.r,this.#c2.g,this.#c2.b],18*s);this.geometry.setFromPoints(i),this.#colorNeedsUpdate&&(this.geometry.attributes.color.needsUpdate=!0),this.#colorNeedsUpdate=!1}}}(e)}class i{static#THREE=null;static#Helper;static get THREE(){return i.#THREE}static set THREE(t){i.#THREE=t,i.#Helper=e(t)}static get Helper(){if(!this.#Helper)throw new s;return this.#Helper}static UvFns=[(t,s)=>[0,t/s,1,t/s],(t,s)=>[t/s,1,t/s,0],(t,s)=>[1,1-t/s,0,1-t/s],(t,s)=>[1-t/s,0,1-t/s,1]];#crv;#seg;#r=.5;#tilt=0;#uv;#mrps;#geom;#frms;#rFn=()=>.5;#tiltFn=()=>0;constructor(t,e,r=.5,h=0,o=null){if(!i.#THREE)throw new s;this.#crv=t,this.#seg=e,this.#setR(r),this.#setTilt(h),this.#uv=o,this.#mrps=null,this.#geom=null,this.#frms=null,this.#geom=new i.#THREE.BufferGeometry,this.#update()}#setR(t){this.#r=t,this.#rFn="function"==typeof t?t:()=>t}#setTilt(t){this.#tilt=t,this.#tiltFn="function"==typeof t?t:()=>t}get curve(){return this.#crv}set curve(t){this.#crv=t,this.#update()}get segment(){return this.#seg}set segment(t){this.#seg=Math.max(1,0|t),this.#update()}get radius(){return this.#r}set radius(t){t!==this.#r&&(this.#setR(t),this.#update())}get tilt(){return this.#tilt}set tilt(t){t!==this.#tilt&&(this.#setTilt(t),this.#update())}get uv(){return this.#uv}set uv(t){this.#uv!==t&&(this.#uv=t,t?this.#update():this.#geom?.deleteAttribute("uv"))}get geometry(){return this.#geom}get frames(){return this.#frms}setMorphs(t){this.#mrps=t,this.#update()}setProps(t=this.#crv,s=this.#seg,e=this.#r,i=this.#tilt,r=this.#uv){const h=this.#crv!==t;h&&(this.#crv=t);const o=this.#seg!==s;o&&(this.#seg=s);const n=this.#r!==e;n&&this.#setR(e);const l=this.#tilt!==i;l&&this.#setTilt(i);const c=this.#uv!==r&&!!r;r||this.geometry?.deleteAttribute("uv"),this.#uv=r,(h||o||n||l||c)&&this.#update()}dispose(){this.#geom?.dispose(),this.#geom=null,this.#frms=null}#update(){if(!this.#geom)return;const t=i.THREE,s=this.#geom;s.dispose();const e=new t.Float32BufferAttribute(6*(this.#seg+1),3);s.setAttribute("position",e);const r=new t.Float32BufferAttribute(6*(this.#seg+1),3);s.setAttribute("normal",r);const h=[];this.#uv&&s.setAttribute("uv",new t.Float32BufferAttribute(4*(this.#seg+1),2));const o=s.getAttribute("uv"),n=this.#crv.getSpacedPoints(this.#seg),{tangents:l,binormals:c,normals:u}=this.#crv.computeFrenetFrames(this.#seg);this.#frms??=[],this.#frms.length=this.#seg;const a=this.#frms,p=this.#seg,g=new t.Vector3,m=new t.Vector3;for(let t=0,s=-1,i=NaN,r=NaN;t<=p;++t)i=this.#rFn(t,p),r=this.#tiltFn(t,p),a[t]??=[g,g,g],a[t][0]=l[t],a[t][1]=r?u[t].applyAxisAngle(l[t],r):u[t],a[t][2]=r?c[t].applyAxisAngle(l[t],r):c[t],g.copy(a[t][1]).multiplyScalar(i).add(n[t]),m.copy(a[t][1]).multiplyScalar(-i).add(n[t]),e.array.set([g.x,g.y,g.z,m.x,m.y,m.z],6*t),t<p&&h.push(s=2*t,s+1,s+2,s+2,s+1,s+3),this.#uv&&o.array.set(this.#uv(t,p),4*t);if(s.setIndex(h),1===this.#seg)g.addVectors(a[0][2],a[1][2]).divideScalar(2),r.array.set([g.x,g.y,g.z,g.x,g.y,g.z,g.x,g.y,g.z,g.x,g.y,g.z]);else for(let t=0,s=a.length;t<s;++t)0===t||t===a.length-1?r.array.set([a[t][2].x,a[t][2].y,a[t][2].z,a[t][2].x,a[t][2].y,a[t][2].z],6*t):(g.addVectors(a[t-1][2],a[t][2]).add(a[t+1][2]).divideScalar(3),r.array.set([g.x,g.y,g.z,g.x,g.y,g.z],6*t));if(this.#mrps){s.morphAttributes.position=[],s.morphAttributes.normal=[];for(const{curve:t,radius:e,tilt:r}of this.#mrps){const{geometry:h}=new i(t,this.#seg,e??.5,r??0);s.morphAttributes.position.push(h.getAttribute("position")),s.morphAttributes.normal.push(h.getAttribute("normal"))}}else s.morphAttributes.position=[],s.morphAttributes.normal=[]}}export{i as Strip};
