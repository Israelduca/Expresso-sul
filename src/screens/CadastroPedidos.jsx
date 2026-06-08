import { useState, useEffect, useRef, useCallback } from "react";
// ✅ Voltar uma pasta (../) para sair de 'screens' e entrar em 'context'
import { useDatabase } from "../context/DatabaseContext";

// ─── Design Tokens ────────────────────────────────────────────────────────────
const T = {
  navy:"#0C1F35", navyLight:"#162E4A",
  blue700:"#1A5FAB", blue600:"#2167B8", blue500:"#2E7DD1",
  blueAccent:"#4A9EFF", blueSubtle:"#EBF4FF", blueBorder:"#BFDBFE",
  slate800:"#1E293B", slate700:"#334155", slate600:"#475569",
  slate500:"#64748B", slate400:"#94A3B8", slate300:"#CBD5E1",
  slate200:"#E2E8F0", slate100:"#F1F5F9", slate50:"#F8FAFC", white:"#FFFFFF",
  success:"#15803D", successLight:"#DCFCE7", successBd:"#86EFAC",
  warning:"#B45309", warningLight:"#FEF3C7", warningBd:"#FCD34D",
  danger:"#B91C1C", dangerLight:"#FEE2E2", dangerBd:"#FCA5A5",
  amber:"#D97706", amberLight:"#FFFBEB", amberBd:"#FDE68A",
  purple:"#7C3AED", purpleLight:"#F5F3FF",
};

// ─── Dados Estáticos Auxiliares ───────────────────────────────────────────────
const DRIVERS = [
  { id:1, nome:"Carlos Mendes",   cnh:"E" },
  { id:2, nome:"Ana Ferreira",    cnh:"E" },
  { id:3, nome:"Roberto Costa",  cnh:"E" },
  { id:4, nome:"Marcos Lima",    cnh:"C/E" },
];
const VEHICLES = [
  { id:1, label:"VW Constellation 24.280 · ABC-1234",  cap:"10.000 kg" },
  { id:2, label:"Mercedes Actros 2646 · DEF-5678",     cap:"15.000 kg" },
  { id:3, label:"Scania R450 · GHI-9012",              cap:"20.000 kg" },
  { id:4, label:"Ford Cargo 2428 · JKL-3456",          cap:"8.000 kg" },
];

// ─── Utils ────────────────────────────────────────────────────────────────────
const fmtBRL = v => {
  const n = parseFloat(v.replace(/[^\d,]/g,"").replace(",","."));
  if (isNaN(n)) return "";
  return n.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
};
const parseBRL = str => str.replace(/[R$\s.]/g,"").replace(",",".");
const fmtWeight = (v,u) => v ? `${Number(v).toLocaleString("pt-BR")} ${u}` : "—";
const initials = str => str.split(" ").slice(0,2).map(w=>w[0]||"").join("").toUpperCase();
const todayISO = () => new Date().toISOString().slice(0,10);
const generateNum = (n) => `ES-${4820 + n}`;

const CARGO_TYPES = ["Carga Geral","Carga Fracionada","Carga Perigosa","Carga Refrigerada","Carga a Granel","Veículos","Encomenda Expressa"];
const PRIORIDADE_CFG = {
  normal:  { label:"Normal",  color:T.slate600, bg:T.slate100,  border:T.slate300,  icon:"clock",             dot:"#64748B" },
  urgente: { label:"Urgente", color:T.amber,    bg:T.amberLight,border:T.amberBd,  icon:"urgent",             dot:T.amber },
  critico: { label:"Crítico", color:T.danger,   bg:T.dangerLight,border:T.dangerBd, icon:"alert-triangle",     dot:T.danger },
};
const STATUS_CFG = {
  aguardando:{ label:"Aguardando",   bg:T.amberLight, color:T.amber,   bd:T.amberBd },
  vinculado: { label:"Vinculado",    bg:T.blueSubtle, color:T.blue700, bd:T.blueBorder },
  entregue:  { label:"Entregue",    bg:T.successLight,color:T.success,bd:T.successBd },
  cancelado: { label:"Cancelado",    bg:T.dangerLight, color:T.danger, bd:T.dangerBd },
};

const EMPTY_FORM = {
  clienteId:"", descricao:"", tipoCarga:"", peso:"", unidade:"kg",
  valorBRL:"", valorRaw:"", enderecoDestino:"", usarEndCliente:true,
  prioridade:"normal", observacoes:"",
};
const EMPTY_DELIVERY = { motoristaId:"", veiculoId:"", dataColeta:"", dataEntrega:"", obs:"" };

function validate(f) {
  const e = {};
  if (!f.clienteId)           e.clienteId       = "Selecione um cliente.";
  if (!f.descricao.trim())    e.descricao        = "Descreva a carga.";
  if (!f.tipoCarga)           e.tipoCarga        = "Selecione o tipo de carga.";
  if (!f.peso || Number(f.peso) <= 0) e.peso     = "Informe um peso válido.";
  if (!f.valorRaw || parseFloat(f.valorRaw) <= 0) e.valorBRL = "Informe o valor da mercadoria.";
  if (!f.enderecoDestino.trim()) e.enderecoDestino = "Endereço de destino obrigatório.";
  return e;
}

function validateDelivery(d) {
  const e = {};
  if (!d.motoristaId) e.motoristaId = "Selecione um motorista.";
  if (!d.veiculoId)   e.veiculoId   = "Selecione um veículo.";
  if (!d.dataColeta)  e.dataColeta  = "Informe a data de coleta.";
  if (!d.dataEntrega) e.dataEntrega = "Informe a previsão de entrega.";
  return e;
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const Styles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=DM+Sans:ital,wght@0,400;0,500;1,400&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    .es { font-family:'DM Sans',sans-serif; background:${T.slate50}; min-height:100vh; color:${T.navy}; }
    .es-h { font-family:'Outfit',sans-serif; }

    /* Input */
    .es-inp {
      font-family:'DM Sans',sans-serif; font-size:14px; color:${T.navy};
      background:${T.white}; border:1.5px solid ${T.slate300}; border-radius:8px;
      padding:9px 12px; outline:none; width:100%;
      transition:border-color .15s, box-shadow .15s;
    }
    .es-inp::placeholder { color:${T.slate400}; }
    .es-inp:hover:not(:disabled):not(.err) { border-color:${T.slate500}; }
    .es-inp:focus:not(.err) { border-color:${T.blue700}; box-shadow:0 0 0 3px rgba(26,95,171,.12); }
    .es-inp.err { border-color:${T.danger}; }
    .es-inp.err:focus { box-shadow:0 0 0 3px rgba(185,28,28,.1); }
    .es-inp:disabled { background:${T.slate100}; color:${T.slate500}; cursor:not-allowed; }
    .es-inp-ico { padding-left:38px; }

    /* Buttons */
    .btn-primary {
      font-family:'DM Sans'; font-weight:500; font-size:14px;
      background:${T.blue700}; color:white; border:none; border-radius:8px;
      padding:10px 20px; cursor:pointer; display:inline-flex; align-items:center; gap:7px;
      transition:background .15s, transform .1s; white-space:nowrap;
    }
    .btn-primary:hover { background:#154d8f; }
    .btn-primary:active { transform:scale(.98); }
    .btn-primary:disabled { background:${T.slate300}; cursor:not-allowed; }

    .btn-gen {
      font-family:'Outfit'; font-weight:700; font-size:15px; letter-spacing:-.2px;
      background:linear-gradient(135deg,${T.blue700} 0%,${T.blue500} 100%);
      color:white; border:none; border-radius:10px;
      padding:13px 28px; cursor:pointer; display:inline-flex; align-items:center; gap:8px;
      transition:all .2s; white-space:nowrap; width:100%;
      justify-content:center; box-shadow:0 4px 16px rgba(26,95,171,.3);
    }
    .btn-gen:hover { transform:translateY(-1px); box-shadow:0 6px 24px rgba(26,95,171,.4); }
    .btn-gen:active { transform:scale(.99) translateY(0); }
    .btn-gen:disabled { background:${T.slate300}; box-shadow:none; cursor:not-allowed; }

    .btn-success {
      font-family:'Outfit'; font-weight:700; font-size:15px;
      background:linear-gradient(135deg,${T.success} 0%,#16a34a 100%);
      color:white; border:none; border-radius:10px;
      padding:13px 28px; cursor:pointer; display:inline-flex; align-items:center; gap:8px;
      transition:all .2s; white-space:nowrap; width:100%; justify-content:center;
      box-shadow:0 4px 16px rgba(21,128,61,.3);
    }
    .btn-success:hover { transform:translateY(-1px); box-shadow:0 6px 24px rgba(21,128,61,.4); }

    .btn-ghost {
      font-family:'DM Sans'; font-weight:500; font-size:13px;
      background:transparent; color:${T.slate600};
      border:1px solid ${T.slate300}; border-radius:7px;
      padding:7px 14px; cursor:pointer; display:inline-flex; align-items:center; gap:5px;
      transition:background .15s,color .15s; white-space:nowrap;
    }
    .btn-ghost:hover { background:${T.slate100}; color:${T.navy}; }

    /* Sections */
    .card { background:${T.white}; border:1px solid ${T.slate300}; border-radius:12px; overflow:hidden; }
    .sec-head {
      display:flex; align-items:center; gap:10px; padding:14px 20px;
      border-bottom:1px solid ${T.slate100}; background:${T.slate50};
    }
    .sec-step {
      width:26px; height:26px; border-radius:50%; background:${T.navy};
      display:flex; align-items:center; justify-content:center; flex-shrink:0;
      font-family:'Outfit'; font-size:12px; font-weight:700; color:white;
    }
    .sec-step.done { background:${T.success}; }
    .sec-step.active { background:${T.blue700}; }
    .sec-title { font-family:'Outfit'; font-size:13px; font-weight:700; color:${T.navy}; }
    .sec-sub   { font-size:11px; color:${T.slate500}; margin-top:1px; }
    .sec-body  { padding:20px; }

    /* Priority Picker */
    .pri-group { display:flex; gap:8px; flex-wrap:wrap; }
    .pri-btn {
      font-family:'DM Sans'; font-weight:500; font-size:13px;
      border-radius:8px; padding:8px 14px; cursor:pointer;
      display:inline-flex; align-items:center; gap:6px;
      border:1.5px solid transparent; transition:all .15s;
    }

    /* Badge */
    .badge {
      display:inline-flex; align-items:center; gap:4px;
      font-family:'Outfit'; font-size:11px; font-weight:600;
      padding:3px 10px; border-radius:20px; letter-spacing:.3px; white-space:nowrap;
    }
    .badge::before { content:''; width:5px; height:5px; border-radius:50%; background:currentColor; opacity:.7; }

    /* Preview card */
    .preview-row { display:flex; justify-content:space-between; align-items:flex-start; padding:9px 0; border-bottom:1px solid ${T.slate100}; }
    .preview-row:last-child { border-bottom:none; }
    .preview-label { font-size:11px; color:${T.slate500}; font-weight:500; flex-shrink:0; width:110px; }
    .preview-val { font-size:13px; color:${T.navy}; font-weight:500; text-align:right; flex:1; word-break:break-word; }
    .preview-val.empty { color:${T.slate400}; font-weight:400; font-style:italic; }

    /* Checklist */
    .check-item { display:flex; align-items:center; gap:8px; padding:5px 0; font-size:12px; color:${T.slate600}; }
    .check-icon { width:18px; height:18px; border-radius:50%; border:1.5px solid ${T.slate300}; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:all .2s; }
    .check-icon.ok { background:${T.success}; border-color:${T.success}; }

    /* Table */
    .tbl { width:100%; border-collapse:collapse; min-width:700px; }
    .tbl th {
      padding:10px 15px; text-align:left;
      font-family:'Outfit'; font-size:11px; font-weight:600;
      text-transform:uppercase; letter-spacing:.8px; color:${T.slate500};
      background:${T.slate50}; border-bottom:1px solid ${T.slate300};
    }
    .tbl td { padding:12px 15px; border-bottom:1px solid ${T.slate100}; vertical-align:middle; }
    .tbl tr.new-row td { background:#EBF4FF; }
    .tbl tr:not(.new-row):hover td { background:${T.slate50}; }

    /* Overlay */
    .overlay { position:fixed; inset:0; background:rgba(12,31,53,.6); z-index:900; display:flex; align-items:center; justify-content:center; padding:16px; }
    .modal { background:${T.white}; border-radius:14px; width:100%; max-width:560px; max-height:90vh; overflow-y:auto; box-shadow:0 24px 64px rgba(0,0,0,.2); }
    .modal-head { padding:20px 24px 16px; border-bottom:1px solid ${T.slate200}; display:flex; align-items:center; justify-content:space-between; position:sticky; top:0; background:${T.white}; z-index:1; }

    /* Toast */
    .toast {
      position:fixed; top:20px; right:20px; z-index:1000;
      border-radius:9px; padding:11px 16px; display:flex; align-items:center; gap:10px;
      box-shadow:0 4px 20px rgba(0,0,0,.12); min-width:300px; max-width:400px;
    }

    /* Animations */
    @keyframes fadeSlide { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
    @keyframes fadeIn    { from{opacity:0} to{opacity:1} }
    @keyframes scaleIn   { from{opacity:0;transform:scale(.94)} to{opacity:1;transform:scale(1)} }
    @keyframes pulse     { 0%,100%{opacity:1} 50%{opacity:.5} }
    .anim-fade-slide { animation:fadeSlide .25s ease-out; }
    .anim-fade       { animation:fadeIn .2s ease-out; }
    .anim-scale      { animation:scaleIn .22s ease-out; }
    @keyframes es-spin   { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

    /* Layout */
    .two-col { display:grid; grid-template-columns:1fr 360px; gap:20px; }
    @media(max-width:860px) { .two-col { grid-template-columns:1fr; } }
    .form-grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
    @media(max-width:600px) { .form-grid-2 { grid-template-columns:1fr; } }

    ::-webkit-scrollbar { width:5px; height:5px; }
    ::-webkit-scrollbar-track { background:${T.slate100}; }
    ::-webkit-scrollbar-thumb { background:${T.slate300}; border-radius:3px; }

    .required { color:${T.danger}; margin-left:2px; }
    .err-msg { font-size:11px; color:${T.danger}; display:flex; align-items:center; gap:3px; margin-top:3px; }
    .hint { font-size:11px; color:${T.slate500}; margin-top:3px; }
    .lbl { font-size:12px; font-weight:500; color:${T.slate700}; margin-bottom:4px; display:block; }

    .progress-bar-bg { height:4px; background:${T.slate200}; border-radius:2px; overflow:hidden; }
    .progress-bar { height:100%; border-radius:2px; background:linear-gradient(90deg,${T.blue700},${T.blue500}); transition:width .3s ease; }
  `}</style>
);

// ─── DbStatusBadge ────────────────────────────────────────────────────────────
function DbStatusBadge({ isReady }) {
  const base = {
    display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0,
    fontSize: 11, fontFamily: "'DM Mono', monospace",
    padding: "3px 10px", borderRadius: 20, border: "1px solid",
    transition: "all 0.3s", userSelect: "none",
  };
  if (!isReady) {
    return (
      <span style={{ ...base, color: "rgba(255,255,255,0.45)", borderColor: "rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)" }}
        title="Conectando ao Worker Background...">
        <span style={{ display: "inline-block", width: 9, height: 9, flexShrink: 0, border: "1.5px solid rgba(255,255,255,0.35)", borderTopColor: "rgba(255,255,255,0.85)", borderRadius: "50%", animation: "es-spin 0.75s linear infinite" }} />
        Worker: iniciando
      </span>
    );
  }
  return (
    <span style={{ ...base, color: "rgba(134,239,172,0.95)", borderColor: "rgba(134,239,172,0.25)", background: "rgba(21,128,61,0.18)" }}
      title="Banco SQLite via Web Worker ativo">
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ade80", flexShrink: 0 }} />
      Worker: ativo
    </span>
  );
}

// ─── Field Component ──────────────────────────────────────────────────────────
function Field({ label, required, error, hint, children, style }) {
  return (
    <div style={style}>
      {label && <label className="lbl">{label}{required && <span className="required">*</span>}</label>}
      {children}
      {error && <div className="err-msg"><i className="ti ti-alert-circle" style={{fontSize:12}} />{error}</div>}
      {hint && !error && <div className="hint">{hint}</div>}
    </div>
  );
}

function IcoInput({ icon, error, ...props }) {
  return (
    <div style={{position:"relative"}}>
      {icon && <i className={`ti ti-${icon}`} style={{position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",color:error?T.danger:T.slate400,fontSize:15}} />}
      <input className={`es-inp${icon?" es-inp-ico":""}${error?" err":""}`} {...props} />
    </div>
  );
}

// ─── Priority Picker ──────────────────────────────────────────────────────────
function PriorityPicker({ value, onChange }) {
  return (
    <div className="pri-group">
      {Object.entries(PRIORIDADE_CFG).map(([key, cfg]) => {
        const active = value === key;
        return (
          <button
            key={key} type="button" className="pri-btn"
            style={{
              background: active ? cfg.bg : T.white,
              borderColor: active ? cfg.border : T.slate200,
              color: active ? cfg.color : T.slate600,
              fontWeight: active ? 600 : 400,
            }}
            onClick={() => onChange(key)}
          >
            <i className={`ti ti-${cfg.icon}`} style={{fontSize:14, color: active ? cfg.color : T.slate400}} />
            {cfg.label}
            {active && <i className="ti ti-check" style={{fontSize:12, marginLeft:2}} />}
          </button>
        );
      })}
    </div>
  );
}

// ─── Client Selector ──────────────────────────────────────────────────────────
function ClientSelector({ value, onChange, error, clients }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const client = clients.find(c => String(c.id) === String(value));

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} style={{position:"relative"}}>
      <button
        type="button"
        style={{
          width:"100%", textAlign:"left", background:T.white,
          border:`1.5px solid ${error ? T.danger : open ? T.blue700 : T.slate300}`,
          borderRadius:8, padding:"8px 12px", cursor:"pointer",
          display:"flex", alignItems:"center", gap:10,
          boxShadow: open ? `0 0 0 3px rgba(26,95,171,.12)` : "none",
          transition:"border-color .15s, box-shadow .15s",
        }}
        onClick={() => setOpen(o => !o)}
      >
        {client ? (
          <>
            <div style={{width:32, height:32, borderRadius:8, background:T.navy, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center"}}>
              <span style={{fontFamily:"Outfit", fontSize:11, fontWeight:700, color:"white"}}>{initials(client.nome)}</span>
            </div>
            <div style={{flex:1, overflow:"hidden"}}>
              <div style={{fontSize:13, fontWeight:500, color:T.navy, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{client.nome}</div>
              <div style={{fontSize:11, color:T.slate500}}>{client.doc}</div>
            </div>
          </>
        ) : (
          <>
            <div style={{width:32, height:32, borderRadius:8, background:T.slate100, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center"}}>
              <i className="ti ti-users" style={{fontSize:15, color:T.slate400}} />
            </div>
            <span style={{fontSize:14, color:T.slate400}}>Selecione o cliente...</span>
          </>
        )}
        <i className={`ti ti-chevron-${open?"up":"down"}`} style={{fontSize:14, color:T.slate400, marginLeft:"auto", flexShrink:0}} />
      </button>

      {open && (
        <div className="anim-fade-slide" style={{
          position:"absolute", top:"calc(100% + 4px)", left:0, right:0, zIndex:100,
          background:T.white, border:`1px solid ${T.slate200}`, borderRadius:10,
          boxShadow:"0 8px 28px rgba(0,0,0,.12)", overflow:"hidden",
        }}>
          <div style={{padding:"8px 12px", borderBottom:`1px solid ${T.slate100}`, background:T.slate50}}>
            <div style={{fontSize:11, color:T.slate500, fontWeight:500, textTransform:"uppercase", letterSpacing:"0.6px"}}>
              {clients.length} clientes encontrados no banco
            </div>
          </div>
          {clients.length === 0 ? (
            <div style={{padding:"16px", textAlign:"center", fontSize:13, color:T.slate400}}>
              Nenhum cliente cadastrado no banco de dados.
            </div>
          ) : clients.map(c => (
            <button key={c.id} type="button"
              style={{
                width:"100%", textAlign:"left", background: String(c.id)===String(value) ? T.blueSubtle : T.white,
                border:"none", padding:"10px 14px", cursor:"pointer",
                display:"flex", alignItems:"center", gap:10,
                borderBottom:`1px solid ${T.slate100}`,
                transition:"background .1s",
              }}
              onMouseOver={e => { if(String(c.id)!==String(value)) e.currentTarget.style.background=T.slate50; }}
              onMouseOut={e => { if(String(c.id)!==String(value)) e.currentTarget.style.background=T.white; }}
              onClick={() => { onChange(c); setOpen(false); }}
            >
              <div style={{width:34, height:34, borderRadius:8, background: String(c.id)===String(value) ? T.blue700 : T.navy, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center"}}>
                <span style={{fontFamily:"Outfit", fontSize:12, fontWeight:700, color:"white"}}>{initials(c.nome)}</span>
              </div>
              <div style={{flex:1, overflow:"hidden"}}>
                <div style={{fontSize:13, fontWeight:500, color:T.navy, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{c.nome}</div>
                <div style={{fontSize:11, color:T.slate500}}>{c.doc}</div>
              </div>
              {String(c.id)===String(value) && <i className="ti ti-check" style={{fontSize:14, color:T.blue700, flexShrink:0}} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Live Preview ─────────────────────────────────────────────────────────────
function LivePreview({ form, progress, clients }) {
  const client = clients.find(c => String(c.id) === String(form.clienteId));
  const pri = PRIORIDADE_CFG[form.prioridade];
  const valor = form.valorRaw ? parseFloat(form.valorRaw).toLocaleString("pt-BR",{style:"currency",currency:"BRL"}) : null;

  return (
    <div style={{display:"flex", flexDirection:"column", gap:14, position:"sticky", top:16}}>
      <div className="card">
        <div style={{padding:"14px 18px"}}>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10}}>
            <span className="es-h" style={{fontSize:12, fontWeight:700, color:T.navy, textTransform:"uppercase", letterSpacing:"0.8px"}}>Progresso</span>
            <span style={{fontSize:13, fontWeight:700, color: progress===100 ? T.success : T.blue700, fontFamily:"Outfit"}}>{progress}%</span>
          </div>
          <div className="progress-bar-bg">
            <div className="progress-bar" style={{width:`${progress}%`, background: progress===100 ? `linear-gradient(90deg,${T.success},#16a34a)` : undefined}} />
          </div>
          <div style={{marginTop:12, display:"flex", flexDirection:"column", gap:2}}>
            {[
              {key:"clienteId",      label:"Cliente selecionado",    ok:!!form.clienteId},
              {key:"descricao",      label:"Descrição da carga",     ok:!!form.descricao.trim()},
              {key:"tipoCarga",      label:"Tipo de carga",          ok:!!form.tipoCarga},
              {key:"peso",           label:"Peso informado",         ok:!!form.peso && Number(form.peso)>0},
              {key:"valorRaw",       label:"Valor da mercadoria",    ok:!!form.valorRaw && parseFloat(form.valorRaw)>0},
              {key:"enderecoDestino",label:"Endereço de destino",    ok:!!form.enderecoDestino.trim()},
            ].map(item => (
              <div key={item.key} className="check-item">
                <div className={`check-icon${item.ok?" ok":""}`}>
                  {item.ok && <i className="ti ti-check" style={{fontSize:10, color:"white"}} />}
                </div>
                <span style={{color: item.ok ? T.success : T.slate500, fontWeight: item.ok ? 500 : 400}}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{padding:"12px 16px", borderBottom:`1px solid ${T.slate100}`, background:T.slate50, display:"flex", alignItems:"center", gap:8}}>
          <i className="ti ti-file-description" style={{fontSize:15, color:T.blue700}} />
          <span className="es-h" style={{fontSize:12, fontWeight:700, color:T.navy}}>Prévia do Pedido</span>
        </div>
        <div style={{padding:"12px 16px"}}>
          <div style={{textAlign:"center", padding:"8px 0 12px", borderBottom:`1px solid ${T.slate100}`, marginBottom:8}}>
            <div style={{fontFamily:"monospace", fontSize:11, color:T.slate500, marginBottom:2}}>Nº DO PEDIDO</div>
            <div className="es-h" style={{fontSize:20, fontWeight:800, color:T.slate300, letterSpacing:1}}>ES-????</div>
          </div>
          <div className="preview-row">
            <span className="preview-label">Cliente</span>
            <span className={`preview-val${!client?" empty":""}`}>{client ? client.nome : "Não selecionado"}</span>
          </div>
          <div className="preview-row">
            <span className="preview-label">Tipo de carga</span>
            <span className={`preview-val${!form.tipoCarga?" empty":""}`}>{form.tipoCarga || "—"}</span>
          </div>
          <div className="preview-row">
            <span className="preview-label">Peso</span>
            <span className={`preview-val${!form.peso?" empty":""}`}>{form.peso ? fmtWeight(form.peso, form.unidade) : "—"}</span>
          </div>
          <div className="preview-row">
            <span className="preview-label">Valor</span>
            <span className={`preview-val${!valor?" empty":""}`} style={{color: valor ? T.success : undefined, fontWeight: valor ? 700 : 400}}>{valor || "—"}</span>
          </div>
          <div className="preview-row">
            <span className="preview-label">Destino</span>
            <span className={`preview-val${!form.enderecoDestino?" empty":""}`} style={{fontSize:12}}>{form.enderecoDestino || "—"}</span>
          </div>
          <div className="preview-row" style={{borderBottom:"none"}}>
            <span className="preview-label">Prioridade</span>
            <span>
              <span className="badge" style={{background:pri.bg, color:pri.color, border:`1px solid ${pri.border}`}}>
                {pri.label}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Success Panel ───────────────────────────────────────────────────────────
function SuccessPanel({ order, onLinkDelivery, onNewOrder }) {
  return (
    <div className="anim-scale" style={{display:"flex", flexDirection:"column", gap:14, position:"sticky", top:16}}>
      <div className="card" style={{border:`1.5px solid ${T.successBd}`, overflow:"visible"}}>
        <div style={{padding:"20px 18px", textAlign:"center", borderBottom:`1px solid ${T.successBd}`, background:T.successLight}}>
          <div style={{width:52, height:52, borderRadius:"50%", background:T.success, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px"}}>
            <i className="ti ti-check" style={{fontSize:26, color:"white"}} />
          </div>
          <div className="es-h" style={{fontSize:13, fontWeight:700, color:T.success, textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:6}}>Pedido Gerado!</div>
          <div className="es-h" style={{fontSize:26, fontWeight:800, color:T.navy, letterSpacing:1}}>
            {order.numero}
          </div>
          <div style={{fontSize:12, color:T.slate500, marginTop:4}}>{order.criado_em || order.criadoEm}</div>
        </div>
        <div style={{padding:"14px 18px"}}>
          {[
            {label:"Cliente",   val: order.cliente_nome || order.clienteNome},
            {label:"Carga",     val: order.descricao},
            {label:"Peso",      val: fmtWeight(order.peso, order.unidade)},
            {label:"Valor",     val: order.valor_brl || order.valor},
          ].map(r => (
            <div key={r.label} className="preview-row">
              <span className="preview-label">{r.label}</span>
              <span className="preview-val">{r.val}</span>
            </div>
          ))}
        </div>
      </div>
      <button className="btn-success" onClick={onLinkDelivery}>
        <i className="ti ti-truck" style={{fontSize:17}} />
        Vincular Entrega
      </button>
      <button className="btn-ghost" style={{justifyContent:"center", width:"100%"}} onClick={onNewOrder}>
        <i className="ti ti-plus" style={{fontSize:14}} />
        Novo Pedido
      </button>
    </div>
  );
}

// ─── Vincular Entrega Modal ───────────────────────────────────────────────────
function VincularModal({ order, onConfirm, onClose }) {
  const [form, setForm] = useState({...EMPTY_DELIVERY, dataColeta: todayISO()});
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const set = (k, v) => {
    setForm(prev => ({...prev, [k]: v}));
    if (touched[k]) setErrors(prev => ({...prev, [k]: validateDelivery({...form, [k]: v})[k]}));
  };
  const blur = k => {
    setTouched(prev => ({...prev, [k]: true}));
    setErrors(prev => ({...prev, [k]: validateDelivery(form)[k]}));
  };

  const submit = () => {
    const all = {motoristaId:true, veiculoId:true, dataColeta:true, dataEntrega:true};
    setTouched(all);
    const errs = validateDelivery(form);
    setErrors(errs);
    if (!Object.keys(errs).length) onConfirm(form);
  };

  const driver  = DRIVERS.find(d => String(d.id) === String(form.motoristaId));
  const vehicle = VEHICLES.find(v => String(v.id) === String(form.veiculoId));

  return (
    <div className="overlay anim-fade" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal anim-scale">
        <div className="modal-head">
          <div style={{display:"flex", alignItems:"center", gap:12}}>
            <div style={{width:38, height:38, background:T.navy, borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center"}}>
              <i className="ti ti-truck" style={{fontSize:18, color:"white"}} />
            </div>
            <div>
              <div className="es-h" style={{fontSize:15, fontWeight:700, color:T.navy}}>Vincular Entrega</div>
              <div style={{fontSize:11, color:T.slate500}}>Pedido {order.numero} · {order.cliente_nome || order.clienteNome}</div>
            </div>
          </div>
          <button className="btn-ghost" style={{padding:"6px 8px"}} onClick={onClose}>
            <i className="ti ti-x" style={{fontSize:15}} />
          </button>
        </div>

        <div style={{padding:"20px 24px"}}>
          <div style={{background:T.blueSubtle, border:`1px solid ${T.blueBorder}`, borderRadius:8, padding:"10px 14px", marginBottom:20, display:"flex", gap:16, flexWrap:"wrap"}}>
            {[
              {icon:"package",      val:order.descricao},
              {icon:"weight",       val:fmtWeight(order.peso, order.unidade)},
              {icon:"map-pin",      val:order.destino},
            ].map(r => (
              <div key={r.icon} style={{display:"flex", alignItems:"center", gap:5, fontSize:12, color:T.navy}}>
                <i className={`ti ti-${r.icon}`} style={{fontSize:13, color:T.blue700}} />
                <span>{r.val}</span>
              </div>
            ))}
          </div>

          <div style={{display:"flex", flexDirection:"column", gap:16}}>
            <Field label="Motorista" required error={touched.motoristaId && errors.motoristaId}>
              <div style={{position:"relative"}}>
                <i className="ti ti-user" style={{position:"absolute", left:11, top:"50%", transform:"translateY(-50%)", color:T.slate400, fontSize:15}} />
                <select
                  className={`es-inp es-inp-ico${touched.motoristaId && errors.motoristaId ? " err" : ""}`}
                  style={{appearance:"none", backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat:"no-repeat", backgroundPosition:"right 12px center", paddingRight:36}}
                  value={form.motoristaId}
                  onChange={e => set("motoristaId", e.target.value)}
                  onBlur={() => blur("motoristaId")}
                >
                  <option value="">Selecione o motorista...</option>
                  {DRIVERS.map(d => <option key={d.id} value={d.id}>{d.nome} · CNH {d.cnh}</option>)}
                </select>
              </div>
            </Field>

            <Field label="Veículo" required error={touched.veiculoId && errors.veiculoId}>
              <div style={{position:"relative"}}>
                <i className="ti ti-truck" style={{position:"absolute", left:11, top:"50%", transform:"translateY(-50%)", color:T.slate400, fontSize:15}} />
                <select
                  className={`es-inp es-inp-ico${touched.veiculoId && errors.veiculoId ? " err" : ""}`}
                  style={{appearance:"none", backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat:"no-repeat", backgroundPosition:"right 12px center", paddingRight:36}}
                  value={form.veiculoId}
                  onChange={e => set("veiculoId", e.target.value)}
                  onBlur={() => blur("veiculoId")}
                >
                  <option value="">Selecione o veículo...</option>
                  {VEHICLES.map(v => <option key={v.id} value={v.id}>{v.label} · Cap. {v.cap}</option>)}
                </select>
              </div>
            </Field>

            <div className="form-grid-2">
              <Field label="Data de Coleta" required error={touched.dataColeta && errors.dataColeta}>
                <IcoInput icon="calendar" type="date" value={form.dataColeta}
                  onChange={e => set("dataColeta", e.target.value)}
                  onBlur={() => blur("dataColeta")}
                  error={touched.dataColeta && errors.dataColeta}
                />
              </Field>
              <Field label="Previsão de Entrega" required error={touched.dataEntrega && errors.dataEntrega}>
                <IcoInput icon="calendar-check" type="date" value={form.dataEntrega}
                  onChange={e => set("dataEntrega", e.target.value)}
                  onBlur={() => blur("dataEntrega")}
                  error={touched.dataEntrega && errors.dataEntrega}
                />
              </Field>
            </div>

            <Field label="Observações para a entrega">
              <textarea className="es-inp" rows={3} placeholder="Instruções especiais, horário de funcionamento, ponto de referência..."
                style={{resize:"vertical", lineHeight:1.5}}
                value={form.obs} onChange={e => set("obs", e.target.value)}
              />
            </Field>
          </div>

          {driver || vehicle ? (
            <div style={{marginTop:16, background:T.slate50, border:`1px solid ${T.slate200}`, borderRadius:8, padding:"10px 14px", fontSize:12, color:T.slate600}}>
              {driver && <div style={{marginBottom:4}}><i className="ti ti-user" style={{marginRight:6, color:T.blue700}} /><strong>{driver.nome}</strong></div>}
              {vehicle && <div><i className="ti ti-truck" style={{marginRight:6, color:T.blue700}} />{vehicle.label}</div>}
            </div>
          ) : null}
        </div>

        <div style={{padding:"14px 24px 20px", borderTop:`1px solid ${T.slate100}`, display:"flex", justifyContent:"flex-end", gap:10}}>
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={submit}>
            <i className="ti ti-link" style={{fontSize:15}} />
            Confirmar Vinculação
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  const C = {
    success:{ bg:T.successLight, bd:T.successBd, fg:T.success, icon:"circle-check" },
    info:   { bg:T.blueSubtle,   bd:T.blueBorder,fg:T.blue700,  icon:"info-circle" },
    error:  { bg:T.dangerLight,  bd:T.dangerBd,  fg:T.danger,   icon:"alert-circle" },
  }[type] || {};
  return (
    <div className="toast anim-fade-slide" style={{background:C.bg, border:`1px solid ${C.bd}`, borderLeft:`3px solid ${C.fg}`}}>
      <i className={`ti ti-${C.icon}`} style={{fontSize:18, color:C.fg, flexShrink:0}} />
      <span style={{fontSize:13, color:C.fg, fontWeight:500, flex:1}}>{msg}</span>
      <button onClick={onClose} style={{background:"none", border:"none", cursor:"pointer", color:C.fg, opacity:.7, padding:2}}>
        <i className="ti ti-x" style={{fontSize:14}} />
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CadastroPedidos() {
  const { isReady, executeSql } = useDatabase(); 
  
  const [form, setForm]                   = useState(EMPTY_FORM);
  const [errors, setErrors]               = useState({});
  const [touched, setTouched]             = useState({});
  const [orders, setOrders]               = useState([]);
  const [dbClients, setDbClients]         = useState([]); 
  const [step, setStep]                   = useState("form");
  const [generatedOrder, setGeneratedOrder] = useState(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [toast, setToast]                 = useState(null);
  const [newOrderId, setNewOrderId]       = useState(null);
  const topRef                            = useRef(null);

  const showToast = (msg, type = "success") => setToast({ msg, type });

  const carregarDadosDoBanco = useCallback(async () => {
    try {
      const listaPedidos = await executeSql("SELECT * FROM Pedidos ORDER BY id DESC");
      setOrders(listaPedidos || []);

      const listaClientes = await executeSql("SELECT id, nome, doc, endereco, telefone, email FROM Clientes ORDER BY nome ASC");
      setDbClients(listaClientes || []);
    } catch (err) {
      console.error("Erro ao sincronizar dados do SQLite:", err);
    }
  }, [executeSql]);

  useEffect(() => {
    if (!isReady) return;

    const iniciarTabelaPedidos = async () => {
      try {
        await executeSql(`
          CREATE TABLE IF NOT EXISTS Pedidos (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            numero       TEXT NOT NULL UNIQUE,
            cliente_id   TEXT NOT NULL,
            cliente_nome TEXT NOT NULL,
            descricao    TEXT NOT NULL,
            tipo_carga   TEXT NOT NULL,
            peso         TEXT NOT NULL,
            unidade      TEXT NOT NULL,
            valor_raw    TEXT NOT NULL,
            valor_brl    TEXT NOT NULL,
            destino      TEXT NOT NULL,
            prioridade   TEXT NOT NULL,
            observacoes  TEXT,
            status       TEXT NOT NULL DEFAULT 'aguardando',
            motorista    TEXT,
            veiculo      TEXT,
            criado_em    TEXT NOT NULL
          );
        `);
        await carregarDadosDoBanco();
      } catch (err) {
        console.error("Erro ao configurar tabela de Pedidos", err);
      }
    };

    iniciarTabelaPedidos();
  }, [isReady, carregarDadosDoBanco, executeSql]);

  const progress = Math.round(
    [!!form.clienteId, !!form.descricao.trim(), !!form.tipoCarga,
     !!form.peso && Number(form.peso)>0, !!form.valorRaw && parseFloat(form.valorRaw)>0,
     !!form.enderecoDestino.trim()].filter(Boolean).length / 6 * 100
  );

  const handleClientChange = useCallback(client => {
    setForm(prev => ({
      ...prev,
      clienteId: String(client.id),
      enderecoDestino: prev.usarEndCliente ? client.endereco : prev.enderecoDestino,
    }));
    if (touched.clienteId) setErrors(prev => ({...prev, clienteId: undefined}));
  }, [touched]);

  const set = (k, v) => {
    setForm(prev => {
      const updated = {...prev, [k]: v};
      if (k === "usarEndCliente" && v) {
        const c = dbClients.find(c => String(c.id) === String(prev.clienteId));
        if (c) updated.enderecoDestino = c.endereco;
      }
      if (touched[k]) setErrors(e => ({...e, [k]: validate(updated)[k]}));
      return updated;
    });
  };

  const blur = k => {
    setTouched(prev => ({...prev, [k]: true}));
    setErrors(prev => ({...prev, [k]: validate(form)[k]}));
  };

  const handleValorInput = (raw) => {
    const digits = raw.replace(/\D/g, "");
    if (!digits) { set("valorBRL", ""); set("valorRaw", ""); return; }
    const num = parseFloat(digits) / 100;
    set("valorBRL", num.toLocaleString("pt-BR", {style:"currency", currency:"BRL"}));
    set("valorRaw", String(num));
  };

  const handleSubmit = async () => {
    const allTouched = Object.fromEntries(Object.keys(EMPTY_FORM).map(k => [k, true]));
    setTouched(allTouched);
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length) { showToast("Corrija os campos obrigatórios antes de prosseguir.", "error"); return; }

    try {
      const client = dbClients.find(c => String(c.id) === String(form.clienteId));
      const num = generateNum(orders.length);
      const now = new Date().toLocaleDateString("pt-BR");

      await executeSql(`
        INSERT INTO Pedidos (
          numero, cliente_id, cliente_nome, descricao, tipo_carga, 
          peso, unidade, valor_raw, valor_brl, destino, prioridade, observacoes, status, criado_em
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        num, form.clienteId, client?.nome || "Desconhecido", form.descricao, form.tipoCarga,
        form.peso, form.unidade, form.valorRaw, form.valorBRL, form.enderecoDestino, form.prioridade, form.observacoes, "aguardando", now
      ]);

      const listaAtualizada = await executeSql("SELECT * FROM Pedidos ORDER BY id DESC");
      setOrders(listaAtualizada || []);

      const pedidoInserido = listaAtualizada.find(o => o.numero === num);
      if (pedidoInserido) {
        setNewOrderId(pedidoInserido.id);
        setGeneratedOrder(pedidoInserido);
      }
      
      setStep("generated");
      showToast(`Pedido ${num} gravado no banco de dados!`);
      topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      console.error("Erro ao gravar pedido:", err);
      showToast("Erro técnico ao salvar o pedido no HD.", "error");
    }
  };

  const handleLinkConfirm = async (delivery) => {
    try {
      const driver  = DRIVERS.find(d => String(d.id) === String(delivery.motoristaId));
      const vehicle = VEHICLES.find(v => String(v.id) === String(delivery.veiculoId));
      
      await executeSql(`
        UPDATE Pedidos 
        SET status = 'vinculado', motorista = ?, veiculo = ? 
        WHERE id = ?
      `, [driver?.nome || "", vehicle?.label || "", generatedOrder.id]);

      const listaAtualizada = await executeSql("SELECT * FROM Pedidos ORDER BY id DESC");
      setOrders(listaAtualizada || []);

      setGeneratedOrder(prev => ({ ...prev, status: "vinculado", motorista: driver?.nome, veiculo: vehicle?.label }));
      setShowLinkModal(false);
      showToast(`Entrega vinculada e salva no HD com sucesso!`);
    } catch (err) {
      console.error("Erro ao vincular entrega:", err);
      showToast("Não foi possível salvar o vínculo da entrega.", "error");
    }
  };

  const handleNewOrder = () => {
    setForm(EMPTY_FORM); setErrors({}); setTouched({});
    setStep("form"); setGeneratedOrder(null);
  };

  const rightPanel = step === "generated"
    ? <SuccessPanel order={generatedOrder} onLinkDelivery={() => setShowLinkModal(true)} onNewOrder={handleNewOrder} />
    : <LivePreview form={form} progress={progress} clients={dbClients} />;

  return (
    <>
      <Styles />
      <div className="es">

        {/* ── Top Bar ── */}
        <div style={{background:T.navy, padding:"0 28px"}}>
          <div style={{display:"flex", alignItems:"center", gap:14, padding:"14px 0", borderBottom:"1px solid rgba(255,255,255,.07)"}}>
            <div style={{width:36, height:36, background:T.blue500, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center"}}>
              <i className="ti ti-truck-delivery" style={{fontSize:18, color:"white"} } />
            </div>
            <span className="es-h" style={{fontSize:16, fontWeight:700, color:"white", letterSpacing:-.3}}>Expresso Sul</span>
            <span style={{fontSize:12, color:"rgba(255,255,255,.3)", marginLeft:2}}>Plataforma Logística</span>
            
            <DbStatusBadge isReady={isReady} />

            <div style={{marginLeft:"auto", display:"flex", alignItems:"center", gap:12}}>
              <span style={{fontSize:12, color:"rgba(255,255,255,.45)"}}>
                <i className="ti ti-clock" style={{marginRight:4}} />
                {new Date().toLocaleDateString("pt-BR",{weekday:"short",day:"2-digit",month:"short"})}
              </span>
              <div style={{width:30, height:30, background:T.blue500, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center"}}>
                <span className="es-h" style={{fontSize:10, fontWeight:700, color:"white"}}>AU</span>
              </div>
            </div>
          </div>
          <div style={{display:"flex", alignItems:"center", gap:6, padding:"10px 0", fontSize:12, color:"rgba(255,255,255,.35)"}}>
            {["Painel","Pedidos","Novo Pedido"].map((b,i,arr) => (
              <span key={b} style={{display:"flex", alignItems:"center", gap:6}}>
                <span style={{color: i===arr.length-1 ? T.blueAccent : undefined, fontWeight: i===arr.length-1 ? 500 : 400}}>{b}</span>
                {i<arr.length-1 && <i className="ti ti-chevron-right" style={{fontSize:11}} />}
              </span>
            ))}
          </div>
        </div>

        <div ref={topRef} style={{padding:"24px 28px", maxWidth:1040, margin:"0 auto"}}>

          {/* ── Page Header ── */}
          <div style={{display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:22, flexWrap:"wrap", gap:12}}>
            <div>
              <h1 className="es-h" style={{fontSize:24, fontWeight:800, color:T.navy, letterSpacing:-.4, marginBottom:3}}>
                {step==="generated" ? "Pedido Gerado" : "Novo Pedido"}
              </h1>
              <p style={{fontSize:13, color:T.slate500}}>
                {step==="generated"
                  ? `${generatedOrder.numero} criado com sucesso · pronto para vincular entrega`
                  : "Preencha os dados abaixo para registrar um novo pedido de frete"}
              </p>
            </div>
            {step==="generated" && (
              <button className="btn-ghost" onClick={handleNewOrder}>
                <i className="ti ti-plus" style={{fontSize:14}} /> Novo pedido
              </button>
            )}
          </div>

          {/* ── Two-column Layout ── */}
          <div className="two-col" style={{marginBottom:24}}>

            {/* ── LEFT: Form ── */}
            <div style={{display:"flex", flexDirection:"column", gap:16}}>

              {/* Section 1 — Cliente */}
              <div className="card">
                <div className="sec-head">
                  <div className={`sec-step${form.clienteId?" done":""}`}>
                    {form.clienteId ? <i className="ti ti-check" style={{fontSize:12}} /> : "1"}
                  </div>
                  <div>
                    <div className="sec-title">Cliente</div>
                    <div className="sec-sub">Selecione o cliente que origina este pedido</div>
                  </div>
                </div>
                <div className="sec-body">
                  <Field required error={touched.clienteId && errors.clienteId}>
                    <ClientSelector value={form.clienteId} onChange={handleClientChange} error={touched.clienteId && errors.clienteId} clients={dbClients} />
                    {touched.clienteId && errors.clienteId && (
                      <div className="err-msg"><i className="ti ti-alert-circle" style={{fontSize:12}} />{errors.clienteId}</div>
                    )}
                  </Field>

                  {form.clienteId && (() => {
                    const c = dbClients.find(cl => String(cl.id)===String(form.clienteId));
                    return c ? (
                      <div style={{marginTop:12, background:T.blueSubtle, border:`1px solid ${T.blueBorder}`, borderRadius:8, padding:"10px 14px", display:"flex", gap:12, flexWrap:"wrap"}}>
                        {[{icon:"phone", val:c.telefone},{icon:"mail",val:c.email}].map(r=>(
                          <div key={r.icon} style={{display:"flex", alignItems:"center", gap:5, fontSize:12, color:T.slate700}}>
                            <i className={`ti ti-${r.icon}`} style={{fontSize:13, color:T.blue700}} />{r.val}
                          </div>
                        ))}
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>

              {/* Section 2 — Carga */}
              <div className="card">
                <div className="sec-head">
                  <div className={`sec-step${form.descricao&&form.tipoCarga&&form.peso&&form.valorRaw?" done":form.descricao||form.tipoCarga||form.peso||form.valorRaw?" active":""}`}>
                    {form.descricao&&form.tipoCarga&&form.peso&&form.valorRaw ? <i className="ti ti-check" style={{fontSize:12}} /> : "2"}
                  </div>
                  <div>
                    <div className="sec-title">Dados da Carga</div>
                    <div className="sec-sub">Descreva o que será transportado</div>
                  </div>
                </div>
                <div className="sec-body" style={{display:"flex", flexDirection:"column", gap:14}}>

                  <Field label="Descrição da Carga" required error={touched.descricao && errors.descricao}>
                    <textarea
                      className={`es-inp${touched.descricao&&errors.descricao?" err":""}`}
                      rows={3} style={{resize:"vertical", lineHeight:1.5}}
                      placeholder="Descreva o conteúdo, embalagem e características relevantes da carga..."
                      value={form.descricao}
                      onChange={e => set("descricao", e.target.value)}
                      onBlur={() => blur("descricao")}
                    />
                  </Field>

                  <div className="form-grid-2">
                    <Field label="Tipo de Carga" required error={touched.tipoCarga && errors.tipoCarga}>
                      <div style={{position:"relative"}}>
                        <i className="ti ti-package" style={{position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",color:T.slate400,fontSize:15}} />
                        <select
                          className={`es-inp es-inp-ico${touched.tipoCarga&&errors.tipoCarga?" err":""}`}
                          style={{appearance:"none",backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,backgroundRepeat:"no-repeat",backgroundPosition:"right 12px center",paddingRight:36}}
                          value={form.tipoCarga}
                          onChange={e => set("tipoCarga", e.target.value)}
                          onBlur={() => blur("tipoCarga")}
                        >
                          <option value="">Selecione...</option>
                          {CARGO_TYPES.map(t => <option key={t}>{t}</option>)}
                        </select>
                      </div>
                    </Field>

                    <Field label="Peso da Carga" required error={touched.peso && errors.peso}
                      hint={form.peso && form.unidade==="t" ? `≈ ${(Number(form.peso)*1000).toLocaleString("pt-BR")} kg` : undefined}>
                      <div style={{display:"flex", gap:0}}>
                        <div style={{position:"relative", flex:1}}>
                          <i className="ti ti-weight" style={{position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",color:T.slate400,fontSize:15}} />
                          <input
                            type="number" min="0" step="0.01"
                            className={`es-inp es-inp-ico${touched.peso&&errors.peso?" err":""}`}
                            style={{borderRadius:"8px 0 0 8px", borderRight:"none"}}
                            placeholder="0.00" value={form.peso}
                            onChange={e => set("peso", e.target.value)}
                            onBlur={() => blur("peso")}
                          />
                        </div>
                        <select
                          className="es-inp"
                          style={{width:60, borderRadius:"0 8px 8px 0", borderLeft:`1px solid ${T.slate200}`, paddingLeft:8, paddingRight:8, flexShrink:0, background:T.slate50, cursor:"pointer"}}
                          value={form.unidade}
                          onChange={e => set("unidade", e.target.value)}
                        >
                          <option value="kg">kg</option>
                          <option value="t">t</option>
                        </select>
                      </div>
                    </Field>
                  </div>

                  <Field label="Valor da Mercadoria (NF-e)" required error={touched.valorBRL && errors.valorBRL}
                    hint="Valor declarado para seguro e documentação fiscal">
                    <div style={{position:"relative"}}>
                      <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",fontSize:13,fontWeight:500,color:T.slate500}}>R$</span>
                      <input
                        className={`es-inp${touched.valorBRL&&errors.valorBRL?" err":""}`}
                        style={{paddingLeft:38}}
                        placeholder="0,00"
                        value={form.valorBRL.replace("R$","").trim()}
                        onChange={e => handleValorInput(e.target.value)}
                        onBlur={() => blur("valorBRL")}
                      />
                    </div>
                  </Field>

                </div>
              </div>

              {/* Section 3 — Logística */}
              <div className="card">
                <div className="sec-head">
                  <div className={`sec-step${form.enderecoDestino?" done":""}`}>
                    {form.enderecoDestino ? <i className="ti ti-check" style={{fontSize:12}} /> : "3"}
                  </div>
                  <div>
                    <div className="sec-title">Logística</div>
                    <div className="sec-sub">Destino, prioridade e instruções operacionais</div>
                  </div>
                </div>
                <div className="sec-body" style={{display:"flex", flexDirection:"column", gap:14}}>

                  <Field label="Endereço de Destino" required error={touched.enderecoDestino && errors.enderecoDestino}>
                    {form.clienteId && (
                      <label style={{display:"flex", alignItems:"center", gap:7, fontSize:12, color:T.slate600, marginBottom:6, cursor:"pointer"}}>
                        <input
                          type="checkbox" checked={form.usarEndCliente}
                          onChange={e => set("usarEndCliente", e.target.checked)}
                          style={{accentColor:T.blue700, width:13, height:13}}
                        />
                        Usar endereço do cliente selecionado
                      </label>
                    )}
                    <div style={{position:"relative"}}>
                      <i className="ti ti-map-pin" style={{position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",color:T.slate400,fontSize:15}} />
                      <input
                        className={`es-inp es-inp-ico${touched.enderecoDestino&&errors.enderecoDestino?" err":""}`}
                        placeholder="Rua, número, complemento — Cidade, UF — CEP"
                        value={form.enderecoDestino}
                        onChange={e => { set("usarEndCliente", false); set("enderecoDestino", e.target.value); }}
                        onBlur={() => blur("enderecoDestino")}
                        disabled={form.usarEndCliente && !!form.clienteId}
                        style={form.usarEndCliente && form.clienteId ? {background:T.blueSubtle, color:T.blue700, borderColor:T.blueBorder} : {}}
                      />
                    </div>
                  </Field>

                  <Field label="Prioridade de Entrega">
                    <PriorityPicker value={form.prioridade} onChange={v => set("prioridade", v)} />
                    {form.prioridade === "critico" && (
                      <div style={{marginTop:8, background:T.dangerLight, border:`1px solid ${T.dangerBd}`, borderRadius:7, padding:"8px 12px", fontSize:12, color:T.danger, display:"flex", gap:6}}>
                        <i className="ti ti-alert-triangle" style={{fontSize:14, flexShrink:0, marginTop:1}} />
                        Pedido crítico requer confirmação com a supervisão antes do despacho.
                      </div>
                    )}
                  </Field>

                  <Field label="Observações Operacionais">
                    <textarea
                      className="es-inp" rows={2} style={{resize:"vertical", lineHeight:1.5}}
                      placeholder="Restrições de horário, equipamentos necessários, contato no destino..."
                      value={form.observacoes} onChange={e => set("observacoes", e.target.value)}
                    />
                  </Field>
                </div>
              </div>

              {/* CTA */}
              {step === "form" && (
                <button className="btn-gen" onClick={handleSubmit} disabled={progress < 20 || !isReady}>
                  <i className="ti ti-file-check" style={{fontSize:18}} />
                  {!isReady ? "Sincronizando banco..." : "Gerar Pedido"}
                  {progress === 100 && <span style={{background:"rgba(255,255,255,.2)", borderRadius:20, padding:"2px 10px", fontSize:12}}>Pronto</span>}
                </button>
              )}
            </div>

            {/* ── RIGHT: Preview / Success ── */}
            {rightPanel}
          </div>

          {/* ── Orders Table ── */}
          <div className="card">
            <div style={{padding:"13px 18px", borderBottom:`1px solid ${T.slate200}`, display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10}}>
              <div style={{display:"flex", alignItems:"center", gap:8}}>
                <i className="ti ti-list-check" style={{fontSize:17, color:T.blue700}} />
                <span className="es-h" style={{fontSize:14, fontWeight:700, color:T.navy}}>Pedidos Registrados</span>
                <span style={{background:T.blueSubtle, color:T.blue700, fontSize:11, fontWeight:600, padding:"2px 10px", borderRadius:20, fontFamily:"Outfit"}}>{orders.length}</span>
              </div>
              <button className="btn-ghost" style={{fontSize:12}}>
                <i className="ti ti-download" style={{fontSize:13}} />Exportar
              </button>
            </div>
            <div style={{overflowX:"auto"}}>
              <table className="tbl">
                <thead>
                  <tr>
                    {["Pedido","Cliente","Carga / Tipo","Peso","Valor NF-e","Destino","Status","Prioridade"].map((h)=>(
                      <th key={h} style={{whiteSpace:"nowrap"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr><td colSpan={8} style={{textAlign:"center", padding:"40px 24px", color:T.slate400}}>
                      <i className="ti ti-inbox" style={{fontSize:36, display:"block", marginBottom:8}} />Nenhum pedido registrado no SQLite
                    </td></tr>
                  ) : orders.map(o => {
                    const pri  = PRIORIDADE_CFG[o.prioridade];
                    const stat = STATUS_CFG[o.status] || STATUS_CFG.aguardando;
                    const isNew = o.id === newOrderId;
                    return (
                      <tr key={o.id} className={isNew ? "new-row highlight-new" : ""}>
                        <td>
                          <div style={{display:"flex", alignItems:"center", gap:6}}>
                            {isNew && <span style={{width:6,height:6,borderRadius:"50%",background:T.blue700,flexShrink:0,animation:"pulse 1.5s infinite"}} />}
                            <span style={{fontFamily:"monospace", fontSize:12, fontWeight:700, color:T.navy}}>{o.numero}</span>
                          </div>
                          <div style={{fontSize:10, color:T.slate500, marginTop:2}}>{o.criado_em || o.criadoEm}</div>
                        </td>
                        <td style={{maxWidth:150}}>
                          <div style={{fontSize:13, fontWeight:500, color:T.navy, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:140}}>{o.cliente_nome || o.clienteNome}</div>
                        </td>
                        <td>
                          <div style={{fontSize:12, color:T.slate700, marginBottom:3}}>{o.descricao}</div>
                          <span style={{fontSize:10, fontWeight:600, padding:"2px 7px", borderRadius:10, background:T.slate100, color:T.slate600, fontFamily:"Outfit"}}>{o.tipo_carga || o.tipoCarga}</span>
                        </td>
                        <td style={{fontSize:13, color:T.navy, fontFamily:"monospace", whiteSpace:"nowrap"}}>{fmtWeight(o.peso, o.unidade)}</td>
                        <td style={{fontSize:13, fontWeight:600, color:T.success, whiteSpace:"nowrap"}}>
                          {o.valor_brl || o.valor}
                        </td>
                        <td style={{fontSize:12, color:T.slate600, maxWidth:160}}>
                          <div style={{whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:150}}>{o.destino}</div>
                        </td>
                        <td>
                          <span className="badge" style={{background:stat.bg, color:stat.color, border:`1px solid ${stat.bd}`}}>{stat.label}</span>
                          {o.motorista && <div style={{fontSize:10, color:T.slate500, marginTop:3}}>{o.motorista}</div>}
                          {o.veiculo && <div style={{fontSize:10, color:T.slate400, marginTop:1}}>{o.veiculo.split('·')[0]}</div>}
                        </td>
                        <td>
                          <span className="badge" style={{background:pri.bg, color:pri.color, border:`1px solid ${pri.border}`}}>{pri.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {orders.length > 0 && (
              <div style={{padding:"10px 18px", borderTop:`1px solid ${T.slate100}`, background:T.slate50, display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                <span style={{fontSize:12, color:T.slate500}}>{orders.length} pedido{orders.length !== 1 ? "s" : ""} registrado{orders.length !== 1 ? "s" : ""}</span>
                <div style={{display:"flex", gap:16, fontSize:12, color:T.slate500}}>
                  {Object.entries(STATUS_CFG).map(([key,cfg]) => {
                    const count = orders.filter(o=>o.status===key).length;
                    return count>0 ? (
                      <span key={key} style={{display:"flex", alignItems:"center", gap:4}}>
                        <span style={{width:6,height:6,borderRadius:"50%",background:cfg.color}} />
                        {cfg.label}: <strong style={{color:T.navy}}>{count}</strong>
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {showLinkModal && generatedOrder && (
        <VincularModal order={generatedOrder} onConfirm={handleLinkConfirm} onClose={() => setShowLinkModal(false)} />
      )}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
} 