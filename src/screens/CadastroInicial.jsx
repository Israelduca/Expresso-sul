import { useState, useEffect, useCallback } from "react";
import { useDatabase } from "../context/DatabaseContext"; // IMPORTANTE: Ajuste este caminho se a sua pasta context estiver em outro lugar!

// ─── Utilities ──────────────────────────────────────────────────────────────────
const hashPw = async pw => {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pw + ":es_salt_2025"));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,"0")).join("");
};

const fmtCNPJ = v => {
  const d = v.replace(/\D/g,"").slice(0,14);
  return d.replace(/^(\d{2})(\d)/,"$1.$2")
          .replace(/^(\d{2}\.\d{3})(\d)/,"$1.$2")
          .replace(/^(\d{2}\.\d{3}\.\d{3})(\d)/,"$1/$2")
          .replace(/(\d{4})(\d{1,2})$/,"$1-$2");
};

const pwStrength = pw => {
  if (!pw) return null;
  let s = 0;
  if (pw.length >= 8)           s++;
  if (pw.length >= 12)          s++;
  if (/[A-Z]/.test(pw))        s++;
  if (/[0-9]/.test(pw))        s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return [null,
    { label:"Fraca",     pct:20,  color:"#B91C1C", bg:"#FEF2F2" },
    { label:"Regular",   pct:45,  color:"#B45309", bg:"#FFFBEB" },
    { label:"Boa",       pct:70,  color:"#1A5FAB", bg:"#EBF4FF" },
    { label:"Forte",     pct:88,  color:"#16A34A", bg:"#F0FDF4" },
    { label:"Excelente", pct:100, color:"#15803D", bg:"#DCFCE7" },
  ][Math.min(s,5)];
};

const validateField = (field, val, form) => {
  if (field==="transportadora") { if (!val.trim()) return "Obrigatório."; if (val.trim().length<3) return "Mínimo 3 caracteres."; }
  if (field==="cnpj") {
    const d = val.replace(/\D/g,"");
    if (!d) return "CNPJ obrigatório.";
    if (d.length!==14) return "Informe os 14 dígitos do CNPJ.";
  }
  if (field==="nomeAdmin")       { if (!val.trim()) return "Obrigatório."; if (val.trim().length<3) return "Mínimo 3 caracteres."; }
  if (field==="email") {
    if (!val.trim()) return "E-mail obrigatório.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return "Formato de e-mail inválido.";
  }
  if (field==="senha")          { if (!val) return "Senha obrigatória."; if (val.length<8) return "Mínimo 8 caracteres."; }
  if (field==="confirma")       { if (!val) return "Confirme a senha."; if (val!==form?.senha) return "Senhas não coincidem."; }
  return "";
};

// ─── SQL Schemas ────────────────────────────────────────────────────────────────
const SQL_USUARIOS = `
  CREATE TABLE IF NOT EXISTS Usuarios (
    id              INTEGER  PRIMARY KEY AUTOINCREMENT,
    nome_admin      TEXT     NOT NULL,
    email           TEXT     NOT NULL UNIQUE,
    senha_hash      TEXT     NOT NULL,
    transportadora  TEXT     NOT NULL,
    cnpj            TEXT     NOT NULL,
    tipo            TEXT     NOT NULL DEFAULT 'master',
    ativo           INTEGER  NOT NULL DEFAULT 1,
    criado_em       DATETIME DEFAULT (datetime('now','localtime'))
  );`;

const SQL_CONFIGS = `
  CREATE TABLE IF NOT EXISTS Configuracoes (
    id            INTEGER  PRIMARY KEY AUTOINCREMENT,
    chave         TEXT     NOT NULL UNIQUE,
    valor         TEXT,
    descricao     TEXT,
    atualizado_em DATETIME DEFAULT (datetime('now','localtime'))
  );`;

// ─── CSS ────────────────────────────────────────────────────────────────────────
const Styles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=DM+Sans:ital,wght@0,400;0,500;1,400&family=DM+Mono:wght@400;500&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    .es-root {
      min-height: 100vh; width: 100%;
      background: #0C1F35;
      display: flex; align-items: center; justify-content: center;
      padding: 24px 16px;
      position: relative; overflow: hidden;
      font-family: 'DM Sans', sans-serif; color: #0C1F35;
    }

    .bg-dots {
      position: fixed; inset: 0; pointer-events: none; z-index: 0;
      background-image: radial-gradient(circle, rgba(74,158,255,.1) 1px, transparent 1px);
      background-size: 28px 28px;
      animation: drift 40s linear infinite;
    }
    .bg-orb {
      position: fixed; border-radius: 50%; filter: blur(100px);
      pointer-events: none; z-index: 0;
    }
    .bg-orb-1 { width:400px; height:400px; background:rgba(26,95,171,.15); top:-100px; right:-100px; animation: orb-pulse 10s ease-in-out infinite; }
    .bg-orb-2 { width:300px; height:300px; background:rgba(46,125,209,.1);  bottom:-50px; left:-80px; animation: orb-pulse 14s ease-in-out infinite reverse; }

    @keyframes drift  { to { background-position: 56px 56px; } }
    @keyframes orb-pulse { 0%,100%{ transform:scale(1) } 50%{ transform:scale(1.15) } }
    @keyframes fade-up   { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
    @keyframes fade-in   { from{opacity:0} to{opacity:1} }
    @keyframes spin      { to{transform:rotate(360deg)} }
    @keyframes check-draw{ from{stroke-dashoffset:30} to{stroke-dashoffset:0} }
    @keyframes scale-in  { from{opacity:0;transform:scale(.94)} to{opacity:1;transform:scale(1)} }
    @keyframes pulse-glow{ 0%,100%{box-shadow:0 0 0 0 rgba(21,128,61,.3)} 50%{box-shadow:0 0 0 14px rgba(21,128,61,0)} }
    @keyframes slide-up  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
    @keyframes progress-fill { from{width:0} to{width:var(--w)} }
    @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.35} }
    @keyframes shimmer {
      0%   { background-position: -400px 0 }
      100% { background-position:  400px 0 }
    }

    .anim-up    { animation: fade-up  .5s ease-out both; }
    .anim-in    { animation: fade-in  .4s ease-out both; }
    .anim-scale { animation: scale-in .3s ease-out both; }

    /* Card */
    .card {
      position: relative; z-index: 1;
      background: #fff; border-radius: 16px;
      width: 100%; max-width: 600px;
      box-shadow: 0 32px 80px rgba(0,0,0,.35), 0 0 0 1px rgba(255,255,255,.04);
      overflow: hidden;
    }

    /* Card header */
    .card-head {
      background: linear-gradient(135deg, #0C1F35 0%, #162E4A 100%);
      padding: 28px 32px 24px;
      position: relative; overflow: hidden;
    }
    .card-head::before {
      content: '';
      position: absolute; inset: 0;
      background-image: radial-gradient(circle, rgba(74,158,255,.08) 1px, transparent 1px);
      background-size: 20px 20px;
    }
    .card-head-orb {
      position: absolute; border-radius: 50%; filter: blur(60px); pointer-events: none;
      width: 200px; height: 200px; background: rgba(26,95,171,.25);
      top: -60px; right: -40px;
    }

    /* Section label */
    .sec-label {
      font-family: 'Outfit'; font-size: 10px; font-weight: 700;
      letter-spacing: 1.5px; text-transform: uppercase; color: #64748B;
      margin-bottom: 14px; display: flex; align-items: center; gap: 8px;
    }
    .sec-label::after {
      content: ''; flex: 1; height: 1px; background: #F1F5F9;
    }

    /* Input */
    .es-inp {
      font-family: 'DM Sans'; font-size: 14px; color: #0C1F35;
      background: #F8FAFC; border: 1.5px solid #E2E8F0; border-radius: 9px;
      padding: 12px 12px 12px 40px; outline: none; width: 100%;
      transition: border-color .15s, box-shadow .15s, background .15s;
    }
    .es-inp::placeholder { color: #94A3B8; }
    .es-inp:hover:not(:disabled) { border-color: #CBD5E1; background: #fff; }
    .es-inp:focus { border-color: #1A5FAB; background: #fff; box-shadow: 0 0 0 3px rgba(26,95,171,.1); }
    .es-inp.err { border-color: #B91C1C; background: #FEF2F2; }
    .es-inp.err:focus { box-shadow: 0 0 0 3px rgba(185,28,28,.1); }
    .es-inp.ok  { border-color: #15803D; }

    .inp-wrap { position: relative; }
    .inp-ico  {
      position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
      color: #94A3B8; font-size: 16px; pointer-events: none; transition: color .15s;
    }
    .inp-wrap:focus-within .inp-ico { color: #1A5FAB; }
    .inp-wrap .es-inp.err ~ .inp-ico { color: #B91C1C; }

    /* Buttons */
    .btn-submit {
      font-family: 'Outfit'; font-size: 15px; font-weight: 700; letter-spacing: -.1px;
      background: linear-gradient(135deg, #1A5FAB, #2E7DD1);
      color: #fff; border: none; border-radius: 10px;
      padding: 14px 24px; cursor: pointer; width: 100%;
      display: flex; align-items: center; justify-content: center; gap: 8px;
      transition: all .2s; box-shadow: 0 4px 18px rgba(26,95,171,.3);
    }
    .btn-submit:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(26,95,171,.4); }
    .btn-submit:active:not(:disabled) { transform: scale(.99); }
    .btn-submit:disabled { background: #94A3B8; box-shadow: none; cursor: not-allowed; }

    .btn-ghost {
      font-family: 'DM Sans'; font-size: 13px; font-weight: 500;
      background: transparent; color: #64748B;
      border: 1px solid #E2E8F0; border-radius: 8px;
      padding: 8px 16px; cursor: pointer;
      display: inline-flex; align-items: center; gap: 5px;
      transition: background .15s, color .15s;
    }
    .btn-ghost:hover { background: #F1F5F9; color: #0C1F35; }

    /* Form grid */
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    @media(max-width:520px) { .form-grid { grid-template-columns: 1fr; } }

    /* Error message */
    .err-msg { font-size: 11px; color: #B91C1C; margin-top: 4px; display: flex; align-items: center; gap: 3px; }

    /* Creation step */
    .step-row {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 0; border-bottom: 1px solid #F1F5F9;
      animation: slide-up .3s ease-out both;
    }
    .step-row:last-child { border-bottom: none; }
    .step-icon {
      width: 32px; height: 32px; border-radius: 8px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
    }

    /* Engine badge */
    .engine-badge {
      display: inline-flex; align-items: center; gap: 4px;
      font-family: 'DM Mono'; font-size: 10px; font-weight: 500;
      padding: 3px 9px; border-radius: 10px;
    }

    /* DB preview card */
    .db-card {
      background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px;
      padding: 12px 16px; font-size: 12px;
    }
    .db-table-row {
      display: flex; align-items: center; gap: 8px; padding: 5px 0;
      border-bottom: 1px solid #F1F5F9; color: #475569;
    }
    .db-table-row:last-child { border-bottom: none; }

    /* Shimmer skeleton */
    .shimmer {
      background: linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%);
      background-size: 400px 100%; animation: shimmer 1.5s infinite;
      border-radius: 6px;
    }

    ::-webkit-scrollbar { width: 5px; }
    ::-webkit-scrollbar-track { background: #F1F5F9; }
    ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 3px; }
  `}</style>
);

// ─── Field Component ────────────────────────────────────────────────────────────
function Field({ label, required, error, hint, children, delay = "0ms" }) {
  return (
    <div className="anim-up" style={{ animationDelay: delay }}>
      <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#334155", marginBottom:5 }}>
        {label}
        {required && <span style={{ color:"#B91C1C", marginLeft:2 }}>*</span>}
      </label>
      {children}
      {error && <div className="err-msg"><i className="ti ti-alert-circle" style={{fontSize:11}} />{error}</div>}
      {hint && !error && <div style={{ fontSize:11, color:"#94A3B8", marginTop:4 }}>{hint}</div>}
    </div>
  );
}

function IcoInput({ icon, error, extra, ...props }) {
  return (
    <div className="inp-wrap">
      <i className={`ti ti-${icon} inp-ico`} />
      <input className={`es-inp${error?" err":""}`} {...props} />
      {extra}
    </div>
  );
}

// ─── Boot Screen ─────────────────────────────────────────────────────────────────
function BootScreen({ steps }) {
  return (
    <div className="card anim-scale" style={{ padding:"44px 40px", textAlign:"center" }}>
      <div style={{ width:56, height:56, borderRadius:14, background:"linear-gradient(135deg,#1A5FAB,#2E7DD1)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px", boxShadow:"0 8px 24px rgba(26,95,171,.35)" }}>
        <i className="ti ti-database" style={{ fontSize:26, color:"white" }} />
      </div>
      <h2 style={{ fontFamily:"Outfit", fontSize:20, fontWeight:800, color:"#0C1F35", marginBottom:6 }}>Iniciando Sistema</h2>
      <p style={{ fontSize:13, color:"#64748B", marginBottom:28 }}>Verificando banco de dados...</p>

      <div style={{ display:"flex", flexDirection:"column", gap:0, textAlign:"left", marginBottom:20 }}>
        {steps.map((s,i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 0", borderBottom:"1px solid #F8FAFC" }}>
            {s.done ? (
              <div style={{ width:22, height:22, borderRadius:"50%", background:"#F0FDF4", border:"1px solid #86EFAC", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <i className="ti ti-check" style={{ fontSize:12, color:"#15803D" }} />
              </div>
            ) : s.active ? (
              <div style={{ width:22, height:22, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <i className="ti ti-loader-2" style={{ fontSize:18, color:"#1A5FAB", animation:"spin .7s linear infinite" }} />
              </div>
            ) : (
              <div style={{ width:22, height:22, borderRadius:"50%", border:"1.5px solid #E2E8F0", flexShrink:0 }} />
            )}
            <span style={{ fontSize:13, color: s.done?"#15803D":s.active?"#1A5FAB":"#94A3B8", fontWeight: s.active?500:400, transition:"color .3s" }}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      <div style={{ height:3, background:"#F1F5F9", borderRadius:2, overflow:"hidden" }}>
        <div style={{ height:"100%", background:"linear-gradient(90deg,#1A5FAB,#2E7DD1)", borderRadius:2, transition:"width .5s ease", width:`${steps.filter(s=>s.done).length/steps.length*100}%` }} />
      </div>
    </div>
  );
}

// ─── Creation Animation ─────────────────────────────────────────────────────────
function CreationAnimation({ steps }) {
  return (
    <div className="card anim-scale" style={{ padding:"36px 40px" }}>
      <div style={{ textAlign:"center", marginBottom:28 }}>
        <div style={{ width:52, height:52, borderRadius:14, background:"linear-gradient(135deg,#0C1F35,#1A5FAB)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px", boxShadow:"0 8px 24px rgba(12,31,53,.4)" }}>
          <i className="ti ti-database-cog" style={{ fontSize:24, color:"white" }} />
        </div>
        <h2 style={{ fontFamily:"Outfit", fontSize:20, fontWeight:800, color:"#0C1F35", marginBottom:4 }}>Configurando Sistema</h2>
        <div style={{ display:"flex", justifyContent:"center", gap:6, alignItems:"center" }}>
          <span className="engine-badge" style={{ background:"#EBF4FF", color:"#1A5FAB", border:"1px solid #BFDBFE" }}>
            <i className="ti ti-database" style={{ fontSize:10 }} />
            SQLite Wasm (Worker)
          </span>
          <span style={{ fontSize:11, color:"#94A3B8" }}>·</span>
          <span style={{ fontSize:11, color:"#64748B" }}>Criando estrutura de dados</span>
        </div>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
        {steps.map((s, i) => (
          <div key={i} className={s.visible?"step-row":""} style={{ display: s.visible?"flex":"none", animationDelay:`${i*60}ms` }}>
            <div className="step-icon" style={{ background: s.done?"#F0FDF4":s.active?"#EBF4FF":"#F8FAFC", border:`1px solid ${s.done?"#86EFAC":s.active?"#BFDBFE":"#E2E8F0"}` }}>
              {s.done   ? <i className="ti ti-check"     style={{ fontSize:15, color:"#15803D" }} /> :
               s.active ? <i className="ti ti-loader-2" style={{ fontSize:15, color:"#1A5FAB", animation:"spin .7s linear infinite" }} /> :
                           <i className={`ti ti-${s.icon}`} style={{ fontSize:15, color:"#CBD5E1" }} />}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:500, color: s.done?"#0C1F35":s.active?"#1A5FAB":"#94A3B8", transition:"color .3s" }}>
                {s.label}
              </div>
              {s.detail && s.done && (
                <div style={{ fontSize:11, color:"#15803D", marginTop:2, fontFamily:"DM Mono" }}>{s.detail}</div>
              )}
            </div>
            {s.done && <span style={{ fontSize:11, color:"#15803D", fontFamily:"DM Mono", flexShrink:0 }}>OK</span>}
          </div>
        ))}
      </div>

      <div style={{ marginTop:20, height:3, background:"#F1F5F9", borderRadius:2, overflow:"hidden" }}>
        <div style={{ height:"100%", background:"linear-gradient(90deg,#1A5FAB,#15803D)", borderRadius:2, transition:"width .6s ease", width:`${steps.filter(s=>s.done).length/steps.length*100}%` }} />
      </div>
    </div>
  );
}

// ─── Success Screen ──────────────────────────────────────────────────────────────
function SuccessScreen({ form, onGoLogin }) {
  return (
    <div className="card anim-scale" style={{ padding:"40px 40px 32px" }}>
      <div style={{ textAlign:"center", marginBottom:28 }}>
        <div style={{ width:72, height:72, borderRadius:"50%", background:"linear-gradient(135deg,#15803D,#16A34A)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px", animation:"pulse-glow 1.5s ease-in-out 3", boxShadow:"0 8px 28px rgba(21,128,61,.3)" }}>
          <i className="ti ti-shield-check" style={{ fontSize:34, color:"white" }} />
        </div>
        <h2 style={{ fontFamily:"Outfit", fontSize:24, fontWeight:800, color:"#0C1F35", letterSpacing:-.4, marginBottom:6 }}>Sistema Configurado!</h2>
        <p style={{ fontSize:14, color:"#64748B" }}>
          O banco de dados foi criado e o administrador registrado com sucesso.
        </p>
      </div>

      {/* Summary */}
      <div style={{ background:"#F8FAFC", border:"1px solid #E2E8F0", borderRadius:12, padding:"16px 18px", marginBottom:20 }}>
        <div style={{ fontFamily:"Outfit", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"1px", color:"#64748B", marginBottom:12 }}>
          Resumo da Configuração
        </div>
        {[
          { icon:"building-store", label:"Transportadora", val:form.transportadora },
          { icon:"id-badge",       label:"CNPJ",           val:form.cnpj },
          { icon:"user-circle",    label:"Administrador",  val:form.nomeAdmin },
          { icon:"mail",           label:"E-mail",         val:form.email },
        ].map(r => (
          <div key={r.label} style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 0", borderBottom:"1px solid #F1F5F9", fontSize:13 }}>
            <i className={`ti ti-${r.icon}`} style={{ fontSize:15, color:"#1A5FAB", flexShrink:0 }} />
            <span style={{ color:"#64748B", minWidth:110, fontSize:12 }}>{r.label}</span>
            <span style={{ color:"#0C1F35", fontWeight:500 }}>{r.val}</span>
          </div>
        ))}
        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 0", fontSize:13 }}>
          <i className="ti ti-database" style={{ fontSize:15, color:"#1A5FAB", flexShrink:0 }} />
          <span style={{ color:"#64748B", minWidth:110, fontSize:12 }}>Engine</span>
          <span className="engine-badge" style={{ background:"#EBF4FF", color:"#1A5FAB", border:"1px solid #BFDBFE" }}>
            SQLite Wasm (Worker)
          </span>
        </div>
      </div>

      {/* Tables created */}
      <div className="db-card" style={{ marginBottom:20 }}>
        <div style={{ fontFamily:"Outfit", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"1px", color:"#64748B", marginBottom:10 }}>
          <i className="ti ti-table" style={{ marginRight:6, color:"#1A5FAB" }} />Tabelas criadas
        </div>
        {[
          { name:"Usuarios",       cols:"id, nome_admin, email, senha_hash, transportadora, cnpj, tipo, ativo, criado_em" },
          { name:"Configuracoes",  cols:"id, chave, valor, descricao, atualizado_em" },
        ].map(t => (
          <div key={t.name} className="db-table-row">
            <i className="ti ti-table" style={{ fontSize:13, color:"#2E7DD1", flexShrink:0 }} />
            <span style={{ fontFamily:"DM Mono", fontSize:12, fontWeight:500, color:"#0C1F35", flexShrink:0 }}>{t.name}</span>
            <span style={{ fontSize:11, color:"#94A3B8", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>({t.cols})</span>
          </div>
        ))}
      </div>

      <button className="btn-submit" onClick={onGoLogin}>
        <i className="ti ti-login" style={{ fontSize:17 }} />
        Ir para o Login
      </button>
    </div>
  );
}

// ─── Redirect Screen (user already exists) ──────────────────────────────────────
function ExistsScreen({ info, onGoLogin, onReset }) {
  const [counting, setCounting] = useState(5);
  useEffect(() => {
    if (counting <= 0) { onGoLogin(); return; }
    const t = setTimeout(() => setCounting(c => c-1), 1000);
    return () => clearTimeout(t);
  }, [counting, onGoLogin]);

  return (
    <div className="card anim-scale" style={{ padding:"40px", textAlign:"center" }}>
      <div style={{ width:64, height:64, borderRadius:"50%", background:"#EBF4FF", border:"2px solid #BFDBFE", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 18px" }}>
        <i className="ti ti-user-check" style={{ fontSize:30, color:"#1A5FAB" }} />
      </div>
      <div style={{ fontFamily:"Outfit", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"1.5px", color:"#1A5FAB", marginBottom:8 }}>Acesso Restrito</div>
      <h2 style={{ fontFamily:"Outfit", fontSize:22, fontWeight:800, color:"#0C1F35", letterSpacing:-.4, marginBottom:8 }}>
        Sistema já configurado
      </h2>
      <p style={{ fontSize:14, color:"#64748B", lineHeight:1.6, marginBottom:20 }}>
        O banco de dados já contém um usuário administrador registrado.<br/>
        Faça login para acessar a plataforma.
      </p>

      {info && (
        <div style={{ background:"#F8FAFC", border:"1px solid #E2E8F0", borderRadius:10, padding:"12px 16px", marginBottom:20, textAlign:"left" }}>
          <div style={{ fontFamily:"Outfit", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"1px", color:"#64748B", marginBottom:8 }}>
            Conta Administradora
          </div>
          {[
            { icon:"building-store", label:"Transportadora", val: info.transportadora },
            { icon:"user",           label:"Administrador",  val: info.nome_admin },
          ].map(r => (
            <div key={r.label} style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 0", fontSize:13 }}>
              <i className={`ti ti-${r.icon}`} style={{ fontSize:14, color:"#1A5FAB" }} />
              <span style={{ color:"#64748B", minWidth:100, fontSize:12 }}>{r.label}</span>
              <span style={{ color:"#0C1F35", fontWeight:500 }}>{r.val}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ background:"#EBF4FF", borderRadius:10, padding:"10px 16px", marginBottom:20, fontSize:13, color:"#1A5FAB", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
        <i className="ti ti-clock" style={{ fontSize:14 }} />
        Redirecionando para o login em <strong style={{ fontFamily:"DM Mono" }}>{counting}s</strong>
      </div>

      <div style={{ display:"flex", gap:10 }}>
        <button className="btn-submit" onClick={onGoLogin} style={{ flex:2 }}>
          <i className="ti ti-login" style={{ fontSize:16 }} />Ir para o Login
        </button>
        <button className="btn-ghost" onClick={onReset} title="Redefinir banco (apenas para desenvolvimento)" style={{ flex:1, borderColor:"#FCA5A5", color:"#B91C1C" }}>
          <i className="ti ti-trash" style={{ fontSize:14 }} />Reset DB
        </button>
      </div>
      <div style={{ fontSize:10, color:"#94A3B8", marginTop:8 }}>
        O botão "Reset DB" apaga o banco local. Use apenas em desenvolvimento.
      </div>
    </div>
  );
}

// ─── Setup Form ──────────────────────────────────────────────────────────────────
function SetupForm({ onSubmit }) {
  const [form,    setForm]    = useState({ transportadora:"", cnpj:"", nomeAdmin:"", email:"", senha:"", confirma:"" });
  const [errors,  setErrors]  = useState({});
  const [touched, setTouched] = useState({});
  const [showPw,  setShowPw]  = useState(false);
  const [showCfm, setShowCfm] = useState(false);
  const strength = pwStrength(form.senha);

  const set = (field, raw) => {
    const val = field==="cnpj" ? fmtCNPJ(raw) : raw;
    const updated = { ...form, [field]: val };
    setForm(updated);
    if (touched[field]) setErrors(e => ({ ...e, [field]: validateField(field, val, updated) }));
    if (field==="senha" && touched.confirma) setErrors(e => ({ ...e, confirma: validateField("confirma", updated.confirma, updated) }));
  };

  const blur = field => {
    setTouched(p => ({ ...p, [field]:true }));
    setErrors(p => ({ ...p, [field]: validateField(field, form[field], form) }));
  };

  const handleSubmit = () => {
    const fields = ["transportadora","cnpj","nomeAdmin","email","senha","confirma"];
    const allTouched = Object.fromEntries(fields.map(f=>[f,true]));
    const errs = Object.fromEntries(fields.map(f=>[f, validateField(f, form[f], form)]));
    setTouched(allTouched); setErrors(errs);
    if (fields.some(f => errs[f])) return;
    onSubmit(form);
  };

  const ok = f => touched[f] && !errors[f] && form[f];

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-head-orb" />
        <div style={{ position:"relative", zIndex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
            <div style={{ width:40, height:40, borderRadius:10, background:"linear-gradient(135deg,#2E7DD1,#4A9EFF)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 16px rgba(74,158,255,.3)" }}>
              <i className="ti ti-truck-delivery" style={{ fontSize:20, color:"white" }} />
            </div>
            <div>
              <div style={{ fontFamily:"Outfit", fontSize:16, fontWeight:800, color:"white", letterSpacing:-.3 }}>Expresso Sul</div>
              <div style={{ fontSize:10, color:"rgba(255,255,255,.4)", letterSpacing:"1px" }}>PLATAFORMA LOGÍSTICA</div>
            </div>
            <span className="engine-badge" style={{ marginLeft:"auto", background:"rgba(74,158,255,.15)", color:"rgba(74,158,255,.9)", border:"1px solid rgba(74,158,255,.2)" }}>
              <i className="ti ti-database" style={{ fontSize:10 }} />
              SQLite Wasm (Worker)
            </span>
          </div>

          <div>
            <div style={{ fontFamily:"Outfit", fontSize:11, fontWeight:600, color:"rgba(74,158,255,.8)", textTransform:"uppercase", letterSpacing:"1.5px", marginBottom:4 }}>
              Configuração Inicial
            </div>
            <h1 style={{ fontFamily:"Outfit", fontSize:22, fontWeight:800, color:"white", letterSpacing:-.4, marginBottom:4 }}>
              Criar conta administradora
            </h1>
            <p style={{ fontSize:13, color:"rgba(255,255,255,.45)" }}>
              Primeira execução detectada — configure os dados da sua transportadora para começar.
            </p>
          </div>
        </div>
      </div>

      <div style={{ padding:"24px 32px 28px", display:"flex", flexDirection:"column", gap:20 }}>
        {/* Section 1 */}
        <div>
          <div className="sec-label">
            <i className="ti ti-building-store" style={{ fontSize:12 }} />
            Dados da Transportadora
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <Field label="Nome da Transportadora" required error={touched.transportadora&&errors.transportadora} delay="0ms">
              <IcoInput icon="building" placeholder="Ex.: Trans Sul Logística Ltda."
                value={form.transportadora} error={touched.transportadora&&errors.transportadora}
                extra={ok("transportadora") && <i className="ti ti-check" style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",color:"#15803D",fontSize:15}} />}
                onChange={e=>set("transportadora",e.target.value)} onBlur={()=>blur("transportadora")}
              />
            </Field>
            <Field label="CNPJ" required error={touched.cnpj&&errors.cnpj}
              hint="Somente dígitos — formatação automática" delay="40ms">
              <IcoInput icon="id-badge" placeholder="00.000.000/0001-00"
                value={form.cnpj} error={touched.cnpj&&errors.cnpj}
                extra={ok("cnpj") && <i className="ti ti-check" style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",color:"#15803D",fontSize:15}} />}
                onChange={e=>set("cnpj",e.target.value)} onBlur={()=>blur("cnpj")}
              />
            </Field>
          </div>
        </div>

        <div style={{ height:1, background:"#F1F5F9" }} />

        {/* Section 2 */}
        <div>
          <div className="sec-label">
            <i className="ti ti-user-shield" style={{ fontSize:12 }} />
            Dados do Administrador
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div className="form-grid">
              <Field label="Nome do Administrador" required error={touched.nomeAdmin&&errors.nomeAdmin} delay="80ms">
                <IcoInput icon="user" placeholder="Seu nome completo"
                  value={form.nomeAdmin} error={touched.nomeAdmin&&errors.nomeAdmin}
                  extra={ok("nomeAdmin") && <i className="ti ti-check" style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",color:"#15803D",fontSize:15}} />}
                  onChange={e=>set("nomeAdmin",e.target.value)} onBlur={()=>blur("nomeAdmin")}
                />
              </Field>
              <Field label="E-mail" required error={touched.email&&errors.email} delay="100ms">
                <IcoInput icon="mail" type="email" placeholder="admin@transportadora.com.br"
                  value={form.email} error={touched.email&&errors.email}
                  extra={ok("email") && <i className="ti ti-check" style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",color:"#15803D",fontSize:15}} />}
                  onChange={e=>set("email",e.target.value)} onBlur={()=>blur("email")}
                />
              </Field>
            </div>

            <div className="form-grid">
              <div>
                <Field label="Senha" required error={touched.senha&&errors.senha} delay="120ms">
                  <div className="inp-wrap">
                    <i className="ti ti-lock inp-ico" />
                    <input type={showPw?"text":"password"}
                      className={`es-inp${touched.senha&&errors.senha?" err":""}`}
                      style={{ paddingRight:40 }} placeholder="Mín. 8 caracteres"
                      value={form.senha}
                      onChange={e=>set("senha",e.target.value)} onBlur={()=>blur("senha")}
                    />
                    <button type="button" onClick={()=>setShowPw(s=>!s)}
                      style={{ position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"#94A3B8",padding:4 }}>
                      <i className={`ti ti-eye${showPw?"-off":""}`} style={{ fontSize:16 }} />
                    </button>
                  </div>
                </Field>
                {strength && (
                  <div style={{ marginTop:7 }}>
                    <div style={{ height:3, background:"#F1F5F9", borderRadius:2, overflow:"hidden", marginBottom:4 }}>
                      <div style={{ height:"100%", background:strength.color, borderRadius:2, width:`${strength.pct}%`, transition:"all .3s" }} />
                    </div>
                    <div style={{ fontSize:11, color:strength.color, fontWeight:600 }}>
                      <i className="ti ti-shield" style={{ marginRight:4 }} />{strength.label}
                    </div>
                  </div>
                )}
              </div>

              <Field label="Confirmar Senha" required error={touched.confirma&&errors.confirma} delay="140ms">
                <div className="inp-wrap">
                  <i className="ti ti-lock-check inp-ico" />
                  <input type={showCfm?"text":"password"}
                    className={`es-inp${touched.confirma&&errors.confirma?" err":ok("confirma")?" ok":""}`}
                    style={{ paddingRight:40 }} placeholder="Repita a senha"
                    value={form.confirma}
                    onChange={e=>set("confirma",e.target.value)} onBlur={()=>blur("confirma")}
                  />
                  <button type="button" onClick={()=>setShowCfm(s=>!s)}
                    style={{ position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"#94A3B8",padding:4 }}>
                    <i className={`ti ti-eye${showCfm?"-off":""}`} style={{ fontSize:16 }} />
                  </button>
                </div>
              </Field>
            </div>
          </div>
        </div>

        <div className="db-card anim-up" style={{ animationDelay:"180ms" }}>
          <div style={{ fontFamily:"Outfit", fontSize:11, fontWeight:700, color:"#64748B", textTransform:"uppercase", letterSpacing:"1px", marginBottom:10, display:"flex", alignItems:"center", gap:6 }}>
            <i className="ti ti-database" style={{ fontSize:12, color:"#1A5FAB" }} />
            Será criado ao finalizar
          </div>
          <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
            {[
              { name:"Usuarios",      icon:"users", cols:9 },
              { name:"Configuracoes", icon:"settings", cols:5 },
            ].map(t => (
              <div key={t.name} style={{ display:"flex", alignItems:"center", gap:7, padding:"5px 10px", background:"#fff", border:"1px solid #E2E8F0", borderRadius:7, fontSize:12 }}>
                <i className={`ti ti-${t.icon}`} style={{ fontSize:14, color:"#1A5FAB" }} />
                <span style={{ fontFamily:"DM Mono", fontWeight:500, color:"#0C1F35" }}>{t.name}</span>
                <span style={{ fontSize:10, color:"#94A3B8" }}>{t.cols} colunas</span>
              </div>
            ))}
          </div>
        </div>

        <button className="btn-submit" onClick={handleSubmit} style={{ marginTop:4 }}>
          <i className="ti ti-database-plus" style={{ fontSize:17 }} />
          Finalizar Cadastro
        </button>

        <div style={{ display:"flex", justifyContent:"center", gap:20, flexWrap:"wrap" }}>
          {[
            { icon:"lock",         label:"SHA-256" },
            { icon:"database",     label:"SQLite Local" },
            { icon:"shield-lock",  label:"LGPD" },
          ].map(b => (
            <div key={b.label} style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, color:"#94A3B8" }}>
              <i className={`ti ti-${b.icon}`} style={{ fontSize:12, color:"#CBD5E1" }} />
              {b.label}
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding:"14px 32px", borderTop:"1px solid #F8FAFC", background:"#FAFCFF" }}>
        <p style={{ fontSize:11, color:"#94A3B8", textAlign:"center", lineHeight:1.7 }}>
          Ao finalizar, você concorda com a{" "}
          <span style={{ color:"#64748B", textDecoration:"underline", cursor:"pointer" }}>Política de Privacidade</span>
          {" "}e os{" "}
          <span style={{ color:"#64748B", textDecoration:"underline", cursor:"pointer" }}>Termos de Uso</span>
          {" "}do Expresso Sul.<br/>
          Os dados são armazenados localmente no dispositivo, em conformidade com a{" "}
          <strong style={{ color:"#64748B" }}>LGPD — Lei 13.709/2018</strong>.
          A senha é protegida com hash SHA-256 e nunca armazenada em texto simples.
        </p>
      </div>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────────
export default function CadastroInicial() {
  const { isReady, executeSql } = useDatabase(); // ✅ AGORA USANDO O WORKER OFICIAL
  
  const [phase,   setPhase]   = useState("booting");     // booting|setup|creating|done|exists|login
  const [bootSteps, setBootSteps] = useState([
    { label:"Carregando banco no Worker...",      done:false, active:true  },
    { label:"Abrindo conexão local...",       done:false, active:false },
    { label:"Verificando tabelas...",         done:false, active:false },
    { label:"Checando usuário administrador...",done:false,active:false },
  ]);
  const [createSteps, setCreateSteps] = useState([]);
  const [formData,  setFormData]  = useState(null);
  const [masterInfo,setMasterInfo] = useState(null);

  const advanceBoot = useCallback((idx) => {
    setBootSteps(prev => prev.map((s,i) => ({
      ...s,
      done:   i < idx,
      active: i === idx,
    })));
  }, []);

  // ── Boot sequence ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!isReady) return; // Espera o Worker inicializar

      const delay = ms => new Promise(r => setTimeout(r, ms));

      advanceBoot(0); await delay(400);
      advanceBoot(1); await delay(350);
      if (cancelled) return;

      advanceBoot(2);
      let hasTables = false;
      try {
        const res = await executeSql("SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name='Usuarios'");
        if (res && res[0] && res[0].count > 0) hasTables = true;
      } catch (e) {}
      await delay(300);
      if (cancelled) return;

      advanceBoot(3);
      let master = null;
      if (hasTables) {
        try {
          const r = await executeSql("SELECT nome_admin, transportadora, criado_em FROM Usuarios WHERE tipo='master' AND ativo=1 LIMIT 1");
          if (r && r.length > 0) master = r[0];
        } catch (e) {}
      }
      await delay(350);
      if (cancelled) return;

      setBootSteps(p => p.map(s => ({ ...s, done:true, active:false })));
      await delay(400);
      if (cancelled) return;

      if (master) {
        setMasterInfo(master);
        setPhase("exists");
      } else {
        setPhase("setup");
      }
    };
    run();
    return () => { cancelled = true; };
  }, [isReady, advanceBoot, executeSql]);

  // ── Creation sequence ─────────────────────────────────────────────────────────
  const runCreation = useCallback(async (form) => {
    const steps = [
      { label:"Inicializando Worker do Banco...",       icon:"database",    detail:"IndexedDB Background Worker", done:false, active:true,  visible:true  },
      { label:"Conectando ao arquivo local...",         icon:"file-plus",   detail:"expresso_sul_db_v1",          done:false, active:false, visible:false },
      { label:"Executando CREATE TABLE Usuarios...",    icon:"users",       detail:"9 colunas · PRIMARY KEY + UNIQUE(email)", done:false, active:false, visible:false },
      { label:"Executando CREATE TABLE Configuracoes...",icon:"settings",   detail:"5 colunas · 12 registros padrão", done:false, active:false, visible:false },
      { label:"Inserindo administrador master...",      icon:"user-plus",   detail:`${form.nomeAdmin} · hash SHA-256`, done:false, active:false, visible:false },
      { label:"Gravando configurações iniciais...",     icon:"device-floppy",detail:"12 chaves · moeda, fuso, versão...", done:false, active:false, visible:false },
      { label:"Persistindo no armazenamento nativo...", icon:"cloud-check", detail:"Banco serializado no IndexedDB", done:false, active:false, visible:false },
    ];
    setCreateSteps(steps);
    setPhase("creating");

    const delay = ms => new Promise(r => setTimeout(r, ms));

    const tick = (i) => setCreateSteps(p => p.map((s, idx) => ({
      ...s,
      done:    idx < i,
      active:  idx === i,
      visible: idx <= i,
    })));

    for (let i = 0; i < steps.length - 1; i++) {
      tick(i);
      await delay(i === 4 ? 500 : 380);
    }

    try {
      // ✅ AQUI A MÁGICA ACONTECE: Salvando no Worker real
      const hash = await hashPw(form.senha);
      await executeSql(SQL_USUARIOS);
      await executeSql(SQL_CONFIGS);
      await executeSql(
        "INSERT INTO Usuarios (nome_admin, email, senha_hash, transportadora, cnpj) VALUES (?, ?, ?, ?, ?)",
        [form.nomeAdmin, form.email, hash, form.transportadora, form.cnpj]
      );
      
      const defaultConfigs = [
        ["versao",         "1.0.0",                "Versão do sistema"],
        ["tema",           "claro",                "Tema da interface"],
        ["nome_sistema",   "Expresso Sul",         "Nome da plataforma"],
        ["transportadora", form.transportadora,    "Nome da transportadora"],
        ["cnpj",           form.cnpj,              "CNPJ da transportadora"],
        ["admin_email",    form.email,             "E-mail do administrador mestre"],
        ["configurado_em", new Date().toISOString(),"Data da configuração inicial"],
        ["moeda",          "BRL",                  "Moeda padrão"],
        ["fuso_horario",   "America/Sao_Paulo",    "Fuso horário padrão"],
        ["notificacoes",   "1",                    "Notificações ativas"],
        ["max_tentativas", "3",                    "Máximo de tentativas de login"],
        ["versao_db",      "1",                    "Versão do schema do banco"],
      ];

      for (const [c, v, d] of defaultConfigs) {
         await executeSql("INSERT OR IGNORE INTO Configuracoes(chave, valor, descricao) VALUES (?, ?, ?)", [c, v, d]);
      }

    } catch (err) {
      console.error("[ES] Worker setup error:", err);
    }

    tick(steps.length - 1);
    await delay(450);
    setCreateSteps(p => p.map(s => ({ ...s, done:true, active:false })));
    await delay(600);
    setFormData(form);
    setPhase("done");
  }, [executeSql]);

  const handleReset = async () => {
    // ✅ DELETA AS TABELAS DIRETAMENTE DO DISCO!
    try {
      await executeSql("DROP TABLE IF EXISTS Usuarios");
      await executeSql("DROP TABLE IF EXISTS Configuracoes");
    } catch(e) {}
    
    setPhase("booting");
    setBootSteps([
      { label:"Carregando banco no Worker...",      done:false, active:true  },
      { label:"Abrindo conexão local...",       done:false, active:false },
      { label:"Verificando tabelas...",         done:false, active:false },
      { label:"Checando usuário administrador...",done:false,active:false },
    ]);
    setCreateSteps([]);
    setFormData(null);
    setMasterInfo(null);
  };

  const goLogin = () => setPhase("login");

  // ── Login redirect stub ───────────────────────────────────────────────────────
  if (phase === "login") {
    return (
      <>
        <Styles />
        <div className="es-root">
          <div className="bg-dots" /><div className="bg-orb bg-orb-1" /><div className="bg-orb bg-orb-2" />
          <div className="card anim-scale" style={{ padding:"44px 40px", textAlign:"center" }}>
            <div style={{ width:56,height:56,borderRadius:14,background:"linear-gradient(135deg,#1A5FAB,#2E7DD1)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",boxShadow:"0 8px 24px rgba(26,95,171,.35)" }}>
              <i className="ti ti-lock" style={{ fontSize:26, color:"white" }} />
            </div>
            <h2 style={{ fontFamily:"Outfit",fontSize:20,fontWeight:800,color:"#0C1F35",marginBottom:6 }}>
              Redirecionando para o Login
            </h2>
            <p style={{ fontSize:13,color:"#64748B",marginBottom:20 }}>
              Em uma aplicação real, você seria direcionado para a tela de login.<br/>
              <span style={{ fontSize:12,color:"#94A3B8" }}>Monte os componentes juntos para o fluxo completo.</span>
            </p>
            <button className="btn-ghost" onClick={handleReset} style={{ margin:"0 auto" }}>
              <i className="ti ti-refresh" style={{ fontSize:13 }} />Reiniciar Demo
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Styles />
      <div className="es-root">
        <div className="bg-dots" />
        <div className="bg-orb bg-orb-1" />
        <div className="bg-orb bg-orb-2" />

        {phase === "booting" && <BootScreen steps={bootSteps} />}
        {phase === "setup"   && <SetupForm  onSubmit={runCreation} />}
        {phase === "creating"&& <CreationAnimation steps={createSteps} />}
        {phase === "done"    && formData && <SuccessScreen form={formData} onGoLogin={goLogin} />}
        {phase === "exists"  && <ExistsScreen info={masterInfo} onGoLogin={goLogin} onReset={handleReset} />}
      </div>
    </>
  );
}