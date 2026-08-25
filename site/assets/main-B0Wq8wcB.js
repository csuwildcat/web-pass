const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./wallet-DjaaChiX.js","./utils-DCr-pfHk.js","./app-CdgB9NA-.js"])))=>i.map(i=>d[i]);
import{b as R,_ as L}from"./index-5BaBfA3V.js";globalThis.Buffer||(globalThis.Buffer=R.Buffer);await L(()=>import("./wallet-DjaaChiX.js"),__vite__mapDeps([0,1]),import.meta.url);await L(()=>import("./app-CdgB9NA-.js"),__vite__mapDeps([2,1]),import.meta.url);const f=document.getElementById("web-pass-create"),w=document.getElementById("web-pass-load"),S=document.getElementById("create-result"),W=document.getElementById("load-result"),b=document.getElementById("web-pass-connect"),C=document.getElementById("connect-result"),E="web-pass-demo-created",P=e=>{if(!e||typeof e!="object")return null;const t=typeof e.locator=="string"?e.locator:typeof e.email=="string"?e.email:"",l=typeof e.username=="string"?e.username:typeof e.label=="string"?e.label:"",a=typeof e.seed=="string"?e.seed:typeof e.password=="string"?e.password:"";return a?{...e,locator:t,username:l,seed:a}:null},o=e=>{typeof console<"u"&&console.info(e)},m=e=>String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");let g=null;try{g=(await L(()=>import("https://esm.sh/notyourface@1.3.0"),[],import.meta.url))?.default??null}catch{o("notyourface failed to load, using fallback avatar.")}const B=()=>{if(!window.localStorage)return null;try{const e=localStorage.getItem(E);if(!e)return null;const t=JSON.parse(e);return t&&typeof t=="object"?t:null}catch{return null}},h=e=>{if(window.localStorage)try{if(!e){localStorage.removeItem(E);return}localStorage.setItem(E,JSON.stringify(e))}catch{}},F=e=>{const l=e.trim().split(/\s+/).filter(Boolean).slice(0,2).map(a=>a[0]).join("");return l?l.toUpperCase():"WP"},T=(e,t)=>{const l=`${t} avatar`;if(g&&typeof g.imgEl=="function")return g.imgEl({seed:e,size:140,complexity:5,shapes:["circle"]},{class:"pass-avatar",alt:l,decoding:"async",loading:"lazy"});const a=document.createElement("div");return a.className="pass-avatar pass-avatar-fallback",a.textContent=F(t),a.setAttribute("role","img"),a.setAttribute("aria-label",l),a},A=(e,t)=>{e&&e.classList.toggle("is-flipped",t)},$=(e,t,l)=>{if(!e)return'<div class="pass-placeholder" aria-hidden="true"></div>';const a=e.username||"Web Pass",n=e.locator||"",r=m(a),s=m(n),p=m(e.seed||""),c=typeof e.seed=="string"?e.seed.trim().split(/\s+/).filter(Boolean).map(y=>`<span class="pass-seed-word">${m(y)}</span>`).join(""):"",d=n?s:"Locator unavailable",i=n?"":" disabled";return`
      <div class="pass-card" data-role="pass-card">
        <div class="pass-card-inner">
          <div class="pass-card-face pass-card-front">
            <div class="pass-card-bar pass-card-top-bar">
              <div class="pass-card-brand">
                <img class="pass-card-logo" src="logo.svg" alt="" aria-hidden="true">
                <span>Web Pass</span>
              </div>
            </div>
            <div class="pass-card-center">
              <div class="pass-avatar-slot" data-role="avatar"></div>
              <p class="pass-name">${r}</p>
            </div>
            <div class="pass-card-bar pass-card-bottom-bar">
              <div class="pass-locator-row">
                <span class="pass-locator">${d}</span>
                <wa-copy-button
                  value="${m(n)}"
                  copy-label="Copy locator"
                  success-label="Locator copied"
                  error-label="Copy failed"
                  class="pass-locator-copy"
                  data-role="copy-locator"${i}
                ></wa-copy-button>
              </div>
              <div class="pass-actions">
                <wa-button
                  type="button"
                  appearance="outlined"
                  variant="brand"
                  size="small"
                  data-role="reveal"
                >
                  Reveal seed
                </wa-button>
              </div>
            </div>
          </div>
          <div class="pass-card-face pass-card-back">
            <div class="pass-card-header">
              <div class="pass-card-title-group">
                <wa-button
                  type="button"
                  appearance="outlined"
                  variant="neutral"
                  size="small"
                  class="pass-hide-button"
                  data-role="hide"
                  aria-label="Hide seed"
                  title="Hide seed"
                >
                  <wa-icon name="arrow-left" aria-hidden="true"></wa-icon>
                </wa-button>
                <span class="pass-card-title">Seed phrase</span>
              </div>
              <div class="pass-actions">
                <wa-copy-button
                  value="${m(e.seed)}"
                  copy-label="Copy seed"
                  success-label="Seed copied"
                  error-label="Copy failed"
                  data-role="copy-seed"
                ></wa-copy-button>
              </div>
            </div>
            <code class="pass-seed" aria-label="${p}">${c}</code>
            <p class="pass-hint">Anyone with this seed can derive your pass credentials.</p>
          </div>
        </div>
      </div>
    `},v=(e,t,l,a)=>{if(!e||(e.innerHTML=$(t),e.classList.remove("is-hidden"),!t))return;const n=t.username||"Web Pass",r=e.querySelector('[data-role="pass-card"]'),s=e.querySelector('[data-role="avatar"]');if(s){const y=T(t.seed,n);s.replaceWith(y)}const p=e.querySelector('[data-role="reveal"]');p&&p.addEventListener("click",()=>A(r,!0));const c=e.querySelector('[data-role="hide"]');c&&c.addEventListener("click",()=>A(r,!1));const d=e.querySelector('[data-role="copy-seed"]');d&&(d.addEventListener("wa-copy",()=>o("Seed copied to clipboard.")),d.addEventListener("wa-error",()=>o("Failed to copy Seed.")));const i=e.querySelector('[data-role="copy-locator"]');i&&t.locator&&(i.addEventListener("wa-copy",()=>o("Locator copied to clipboard.")),i.addEventListener("wa-error",()=>o("Failed to copy Locator.")))},_=(e,t,l,a)=>{if(!e)return;if(e.innerHTML="",e.classList.remove("is-hidden"),e.style.display="grid",e.style.placeItems="",e.style.alignContent="",!t){e.style.placeItems="center",e.style.alignContent="center";const s=document.createElement("p");s.className="note",s.style.margin="0",s.style.textAlign="center",s.textContent=a,e.appendChild(s);return}const n=document.createElement("p");n.className="note",n.textContent=`Connect result: ${t.result||"unknown"}.`,e.appendChild(n);const r=(s,p)=>{if(!p)return;const c=document.createElement("div");c.className="result-row";const d=document.createElement("span");d.textContent=s;const i=document.createElement("code");i.textContent=p,c.append(d,i),e.appendChild(c)};if(r("Locator",t.locator),r("Public key",t.publicKey),r("Signature",t.signature),r("Auth JWT",t.authJwt||t.authzJwt),t.locator&&b?.authStore?.get){const s=b.authStore.get(t.locator);r("Stored JWT",s)}r("Error",t.error)};f?.addEventListener("webpass:create",e=>{const t=P(e.detail);t&&(h({...t,createdOnLoad:!0}),v(S,t),o("Generated Web Pass seed phrase."))});f?.addEventListener("webpass:error",e=>{const t=e.detail?.message||"Failed to generate Web Pass.";o(t)});w?.addEventListener("webpass:load",e=>{const t=P(e.detail);t&&(v(W,t),o("Loaded Web Pass seed phrase."))});b?.addEventListener("webpass:connect-response",e=>{const t=e.detail;!t||typeof t!="object"||(_(C,t,"Connect Response","Waiting for response"),o(`Connect response: ${t.result||"unknown"}.`))});b?.addEventListener("webpass:connect-error",e=>{const t=e.detail?.message||e.detail?.error||"Connect failed.";_(C,{result:"error",error:t},"Connect Response","Waiting for response"),o(t)});await customElements.whenDefined("web-pass-form");typeof f?.refreshFromAttributes=="function"&&f.refreshFromAttributes();typeof w?.refreshFromAttributes=="function"&&w.refreshFromAttributes();await customElements.whenDefined("web-pass-connect");typeof b?.refreshFromAttributes=="function"&&b.refreshFromAttributes();const u=B();if(u&&u.createdOnLoad){const e=P(u);e&&v(S,e);const t={...u};delete t.createdOnLoad,h(t)}else u&&h(null);const I=f?.form??f?.querySelector("form");I&&I.addEventListener("submit",e=>{e.preventDefault(),o("Form submitted to trigger a password manager save prompt.")});(!u||!u.createdOnLoad)&&v(S,null);v(W,null);_(C,null,"Connect Response","Waiting for response");o("Demo ready. Create or load a Web Pass to begin.");
