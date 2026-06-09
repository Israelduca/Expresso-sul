import React, { useState, useEffect, useCallback } from "react";
// ✅ Importando o nosso motor do banco de dados!
import { useDatabase } from "../context/DatabaseContext";

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  navy:"#0C1F35", navyMid:"#162E4A", navyGlow:"rgba(26,95,171,.15)",
  blue700:"#1A5FAB", blue500:"#2E7DD1", blueAccent:"#4A9EFF",
  blueSubtle:"#EBF4FF", blueBorder:"#BFDBFE",
  slate800:"#1E293B", slate700:"#334155", slate600:"#475569",
  slate500:"#64748B", slate400:"#94A3B8", slate300:"#CBD5E1",
  slate200:"#E2E8F0", slate100:"#F1F5F9", slate50:"#F8FAFC", white:"#FFFFFF",
  green700:"#15803D", greenSubtle:"#F0FDF4", greenBd:"#86EFAC",
  amber700:"#B45309", amberSubtle:"#FFFBEB", amberBd:"#FCD34D",
  red700:"#B91C1C",  redSubtle:"#FEF2F2",  redBd:"#FCA5A5",
  purple:"#7C3AED",  purpleSubtle:"#F5F3FF",
};

const STATUS = {
  pendente:  { label:"Pendente",         color:C.slate600, bg:C.slate100,    bd:C.slate300,  icon:"clock",          bar:C.slate300, rowAccent:"transparent", pulse:false },
  em_rota:   { label:"Em Rota",          color:C.blue700,  bg:C.blueSubtle,  bd:C.blueBorder, icon:"truck",          bar:C.blue500,  rowAccent:C.blue700,     pulse:true  },
  entregue:  { label:"Entregue",         color:C.green700, bg:C.greenSubtle, bd:C.greenBd,    icon:"circle-check",   bar:C.green700, rowAccent:C.green700,    pulse:false },
  atrasado:  { label:"Atrasado",         color:C.red700,   bg:C.redSubtle,   bd:C.redBd,      icon:"alert-triangle", bar:C.red700,   rowAccent:C.red700,      pulse:false },
  tentativa: { label:"2ª Tentativa",     color:C.amber700, bg:C.amberSubtle, bd:C.amberBd,    icon:"refresh",        bar:C.amber700, rowAccent:C.amber700,    pulse:false },
  devolvido: { label:"Devolvido",        color:C.purple,   bg:C.purpleSubtle,bd:"#C4B5FD",    icon:"corner-up-left", bar:C.purple,   rowAccent:C.purple,      pulse:false },
};

const PRIORITY = {
  normal:  { label:"Normal",  dot:C.slate400 },
  urgente: { label:"Urgente", dot:C.amber700 },
  critico: { label:"Crítico", dot:C.red700   },
};

// Status sort order (lower = shown first)
const STATUS_ORDER = { atrasado:0, tentativa:1, em_rota:2, pendente:3, entregue:4, devolvido:5 };

const STATUS_OPTS = [
  { key:"em_rota",   label:"Em Rota",       icon:"truck",          color:C.blue700,  bg:C.blueSubtle  },
  { key:"entregue",  label:"Entregue",       icon:"circle-check",   color:C.green700, bg:C.greenSubtle },
  { key:"tentativa", label:"Tentativa",      icon:"refresh",        color:C.amber700, bg:C.amberSubtle },
  { key:"atrasado",  label:"Atrasado",       icon:"alert-triangle", color:C.red700,   bg:C.redSubtle   },
  { key:"devolvido", label:"Devolvido",      icon:"corner-up-left", color:C.purple,   bg:C.purpleSubtle},
  { key:"pendente",  label:"Pendente",       icon:"clock",          color:C.slate600, bg:C.slate100    },
];

// ─── Helpers do Banco ─────────────────────────────────────────────────────────
const getProgressByStatus = (status) => {
  const map = { pendente: 0, em_rota: 50, tentativa: 75, atrasado: 45, entregue: 100, devolvido: 100 };
  return map[status] || 0;
};

// ─── CSS ──────────────────────────────────────────────────────────────────────
const Styles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    .root{font-family:'DM Sans',sans-serif;background:${C.slate50};min-height:100vh;color:${C.navy}}
    .head{font-family:'Outfit',sans-serif}
    .mono{font-family:'DM Mono',monospace}

    @keyframes pulse-dot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.8)}}
    @keyframes pulse-ring{0%{transform:scale(1);opacity:.6}100%{transform:scale(2.2);opacity:0}}
    @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
    @keyframes fadeIn{from{opacity:0}to{opacity:1}}
    @keyframes scaleIn{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}
    @keyframes slideDown{from{opacity:0;max-height:0}to{opacity:1;max-height:600px}}
    @keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
    @keyframes countUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
    @keyframes toastIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
    @keyframes progressFill{from{width:0}to{width:var(--w)}}
    @keyframes alertPulse{0%,100%{box-shadow:0 0 0 0 rgba(185,28,28,.3)}50%{box-shadow:0 0 0 6px rgba(185,28,28,0)}}

    .anim-fade-up{animation:fadeUp .3s ease-out both}
    .anim-scale  {animation:scaleIn .2s ease-out}
    .anim-fade   {animation:fadeIn .2s ease-out}
    .anim-toast  {animation:toastIn .25s ease-out}

    .stat-card{
      background:${C.white};border:1px solid ${C.slate300};border-radius:12px;
      padding:18px 20px;position:relative;overflow:hidden;
      transition:transform .15s,box-shadow .15s;cursor:default;
    }
    .stat-card:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,.08)}
    .stat-card::before{content:'';position:absolute;top:0;left:0;width:4px;height:100%;border-radius:12px 0 0 12px;}
    .stat-card.blue::before{background:${C.blue700}}
    .stat-card.green::before{background:${C.green700}}
    .stat-card.red::before{background:${C.red700}}
    .stat-card.gray::before{background:${C.slate400}}
    .stat-card.red{animation:alertPulse 2.5s ease-in-out infinite}

    .del-row{border-left:3px solid transparent;transition:background .12s;}
    .del-row:hover{background:${C.slate50}!important}
    .del-row.atrasado  {border-left-color:${C.red700}!important;background:rgba(185,28,28,.025)!important}
    .del-row.atrasado:hover{background:rgba(185,28,28,.045)!important}
    .del-row.em_rota   {border-left-color:${C.blue700}!important}
    .del-row.tentativa {border-left-color:${C.amber700}!important}
    .del-row.entregue  {border-left-color:${C.green700}!important}
    .del-row.pendente  {border-left-color:${C.slate300}!important}

    .pulse-wrap{position:relative;display:inline-flex;align-items:center;justify-content:center}
    .pulse-ring{position:absolute;width:10px;height:10px;border-radius:50%;border:1.5px solid ${C.blue700};animation:pulse-ring 1.5s ease-out infinite;}
    .pulse-dot{width:8px;height:8px;border-radius:50%;background:${C.blue700};animation:pulse-dot 1.5s ease-in-out infinite;position:relative;z-index:1}

    .prog-bg{height:4px;background:${C.slate200};border-radius:2px;overflow:hidden;width:100%}
    .prog-fill{height:100%;border-radius:2px;transition:width .5s ease;animation:progressFill .6s ease-out both}

    .chip{
      font-family:'DM Sans';font-size:12px;font-weight:500;
      padding:5px 13px;border-radius:20px;cursor:pointer;
      border:1.5px solid transparent;transition:all .15s;white-space:nowrap;
      display:inline-flex;align-items:center;gap:5px;
    }
    .chip.active{font-weight:600}
    .expand-body{animation:slideDown .25s ease-out;overflow:hidden;}

    .btn-upd{
      font-family:'DM Sans';font-size:12px;font-weight:600;
      background:${C.blueSubtle};color:${C.blue700};
      border:1px solid ${C.blueBorder};border-radius:7px;
      padding:6px 12px;cursor:pointer;display:inline-flex;align-items:center;gap:5px;
      transition:all .15s;white-space:nowrap;
    }
    .btn-upd:hover{background:#dbeafe;box-shadow:0 2px 8px rgba(26,95,171,.15)}
    .btn-primary{
      font-family:'Outfit';font-size:14px;font-weight:700;
      background:linear-gradient(135deg,${C.blue700},${C.blue500});
      color:${C.white};border:none;border-radius:9px;
      padding:11px 24px;cursor:pointer;display:inline-flex;align-items:center;gap:7px;
      transition:all .2s;white-space:nowrap;
      box-shadow:0 4px 14px rgba(26,95,171,.28);
    }
    .btn-primary:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(26,95,171,.38)}
    .btn-ghost{
      font-family:'DM Sans';font-size:13px;font-weight:500;background:transparent;color:${C.slate600};
      border:1px solid ${C.slate300};border-radius:7px;padding:7px 14px;cursor:pointer;display:inline-flex;align-items:center;gap:5px;
      transition:background .15s,color .15s;
    }
    .btn-ghost:hover{background:${C.slate100};color:${C.navy}}

    .badge{display:inline-flex;align-items:center;gap:4px;font-family:'Outfit';font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;letter-spacing:.3px;white-space:nowrap;}

    .overlay{position:fixed;inset:0;background:rgba(12,31,53,.65);z-index:900;display:flex;align-items:center;justify-content:center;padding:16px}
    .modal{background:${C.white};border-radius:14px;width:100%;max-width:540px;max-height:90vh;overflow-y:auto;box-shadow:0 24px 64px rgba(0,0,0,.25)}
    .modal-hd{padding:20px 24px 16px;border-bottom:1px solid ${C.slate200};display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;background:${C.white};z-index:1}

    .status-opt{
      border:1.5px solid ${C.slate200};border-radius:9px;padding:10px 14px;
      cursor:pointer;display:flex;align-items:center;gap:10px;
      transition:all .15s;background:${C.white};flex:1;min-width:130px;
    }
    .status-opt:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(0,0,0,.08)}
    .status-opt.selected{border-width:2px}

    .tl-item{display:flex;gap:12px;position:relative;padding-bottom:16px}
    .tl-item:last-child{padding-bottom:0}
    .tl-item:last-child .tl-line{display:none}
    .tl-dot{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;z-index:1}
    .tl-line{position:absolute;left:14px;top:28px;bottom:0;width:1.5px;background:${C.slate200};transform:translateX(-50%)}

    .es-inp{
      font-family:'DM Sans';font-size:14px;color:${C.navy};
      background:${C.white};border:1.5px solid ${C.slate300};border-radius:8px;
      padding:9px 12px;outline:none;width:100%;
      transition:border-color .15s,box-shadow .15s;
    }
    .es-inp:focus{border-color:${C.blue700};box-shadow:0 0 0 3px rgba(26,95,171,.12)}

    .toast{
      position:fixed;top:20px;right:20px;z-index:1000;
      border-radius:9px;padding:11px 16px;display:flex;align-items:center;gap:10px;
      box-shadow:0 4px 24px rgba(0,0,0,.14);min-width:300px;max-width:400px;
    }

    .tbl-th{
      padding:9px 14px;text-align:left;font-family:'Outfit';font-size:10px;font-weight:700;
      text-transform:uppercase;letter-spacing:1px;color:${C.slate500};
      background:${C.slate50};border-bottom:1px solid ${C.slate300};
      white-space:nowrap;cursor:pointer;user-select:none;
    }
    .tbl-th:hover{color:${C.navy}}
    .tbl-td{padding:13px 14px;border-bottom:1px solid ${C.slate100};vertical-align:middle}

    ::-webkit-scrollbar{width:5px;height:5px}
    ::-webkit-scrollbar-track{background:${C.slate100}}
    ::-webkit-scrollbar-thumb{background:${C.slate300};border-radius:3px}
  `}</style>
);

const PulseDot = () => (
  <span className="pulse-wrap" style={{width:16,height:16}}>
    <span className="pulse-ring" />
    <span className="pulse-dot" />
  </span>
);

const SBadge = ({ statusKey }) => {
  const s = STATUS[statusKey] || STATUS.pendente;
  return (
    <span className="badge" style={{background:s.bg, color:s.color, border:`1px solid ${s.bd}`}}>
      {s.pulse && <PulseDot />}
      {!s.pulse && <i className={`ti ti-${s.icon}`} style={{fontSize:11}} />}
      {s.label}
    </span>
  );
};

const ETAChip = ({ hora, atrasadoMin, status }) => {
  if (status === "entregue") return <span style={{fontSize:12,color:C.green700,fontWeight:600,fontFamily:"DM Mono"}}>✓ {hora}</span>;
  if (status === "devolvido" || status === "pendente")
    return <span style={{fontSize:12,color:C.slate500,fontFamily:"DM Mono"}}>{hora}</span>;
  if (atrasadoMin) {
    const h = Math.floor(atrasadoMin/60), m = atrasadoMin%60;
    const txt = h > 0 ? `+${h}h${m>0?m+"m":""}` : `+${m}m`;
    return (
      <div>
        <div style={{fontFamily:"DM Mono",fontSize:11,fontWeight:700,color:C.red700}}>{hora}</div>
        <div style={{fontSize:10,background:C.redSubtle,color:C.red700,padding:"1px 6px",borderRadius:10,fontWeight:700,marginTop:2}}>{txt} atrasado</div>
      </div>
    );
  }
  return <span style={{fontFamily:"DM Mono",fontSize:12,color:status==="em_rota"?C.blue700:C.slate600,fontWeight:500}}>{hora}</span>;
};

const Timeline = ({ items }) => (
  <div style={{padding:"4px 0"}}>
    {items.length === 0 && <span style={{fontSize: 12, color: C.slate500}}>Nenhum histórico registrado.</span>}
    {items.map((item, i) => {
      const s = STATUS[item.status] || STATUS.pendente;
      return (
        <div key={i} className="tl-item">
          <div style={{position:"relative",flexShrink:0}}>
            <div className="tl-dot" style={{background:s.bg,border:`1.5px solid ${s.bd}`}}>
              <i className={`ti ti-${s.icon}`} style={{fontSize:13,color:s.color}} />
            </div>
            {i < items.length-1 && <div className="tl-line" />}
          </div>
          <div style={{paddingTop:4,flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}>
              <span style={{fontSize:12,fontWeight:600,color:C.navy,fontFamily:"Outfit"}}>{item.label}</span>
              <span style={{fontSize:11,color:C.slate500,fontFamily:"DM Mono"}}>{item.hora}</span>
            </div>
            {item.nota && <div style={{fontSize:12,color:C.slate600,lineHeight:1.5,background:C.slate50,padding:"5px 9px",borderRadius:6,borderLeft:`2px solid ${s.bd}`}}>{item.nota}</div>}
          </div>
        </div>
      );
    })}
  </div>
);

const ExpandedRow = ({ delivery }) => (
  <div className="expand-body" style={{background:"#FAFCFF",borderBottom:`2px solid ${C.blueBorder}`,padding:"16px 20px 20px 36px"}}>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
      <div>
        <div style={{fontFamily:"Outfit",fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.8px",color:C.blue700,marginBottom:10}}>
          <i className="ti ti-info-circle" style={{marginRight:5}} />Detalhes da Entrega
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:7}}>
          {[
            {icon:"map-pin",     label:"Origem",    val:delivery.origem},
            {icon:"map-pin-2",   label:"Destino",   val:delivery.destino},
            {icon:"user",        label:"Motorista", val:delivery.motorista},
            {icon:"truck",       label:"Veículo",   val:delivery.veiculo},
            {icon:"weight",      label:"Peso",      val:delivery.peso},
            {icon:"currency-dollar",label:"Valor",  val:delivery.valor},
          ].map(r => (
            <div key={r.label} style={{display:"flex",alignItems:"flex-start",gap:8,fontSize:12}}>
              <i className={`ti ti-${r.icon}`} style={{fontSize:14,color:C.blue500,flexShrink:0,marginTop:1}} />
              <span style={{color:C.slate500,minWidth:68,flexShrink:0}}>{r.label}</span>
              <span style={{color:C.navy,fontWeight:500}}>{r.val}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div style={{fontFamily:"Outfit",fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.8px",color:C.blue700,marginBottom:10}}>
          <i className="ti ti-history" style={{marginRight:5}} />Histórico de Status
        </div>
        <Timeline items={delivery.historico} />
      </div>
    </div>
  </div>
);

const UpdateModal = ({ delivery, onConfirm, onClose }) => {
  const [selected, setSelected] = useState(delivery.status);
  const [note, setNote]         = useState("");

  return (
    <div className="overlay anim-fade" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal anim-scale">
        <div className="modal-hd">
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:40,height:40,background:C.navy,borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <i className="ti ti-refresh" style={{fontSize:18,color:C.white}} />
            </div>
            <div>
              <div style={{fontFamily:"Outfit",fontSize:15,fontWeight:700,color:C.navy}}>Atualizar Status</div>
              <div style={{fontSize:11,color:C.slate500}}>{delivery.id} · {delivery.cliente}</div>
            </div>
          </div>
          <button className="btn-ghost" style={{padding:"6px 8px"}} onClick={onClose}>
            <i className="ti ti-x" style={{fontSize:15}} />
          </button>
        </div>

        <div style={{padding:"20px 24px"}}>
          <div style={{marginBottom:18}}>
            <div style={{fontSize:11,fontWeight:600,color:C.slate500,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:8,fontFamily:"Outfit"}}>Status Atual</div>
            <div style={{display:"flex",alignItems:"center",gap:10,background:C.slate50,border:`1px solid ${C.slate200}`,borderRadius:9,padding:"10px 14px"}}>
              <SBadge statusKey={delivery.status} />
              <span style={{fontSize:12,color:C.slate500}}>·</span>
              <span style={{fontSize:12,color:C.slate600}}>Atualizado {delivery.atualizado}</span>
              {delivery.atrasadoMin && (
                <span style={{marginLeft:"auto",fontSize:11,fontWeight:700,color:C.red700,background:C.redSubtle,padding:"2px 8px",borderRadius:10}}>
                  {Math.floor(delivery.atrasadoMin/60)}h{delivery.atrasadoMin%60}m de atraso
                </span>
              )}
            </div>
          </div>

          <div style={{background:C.blueSubtle,border:`1px solid ${C.blueBorder}`,borderRadius:8,padding:"10px 14px",marginBottom:18,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            <span style={{fontSize:12,color:C.navy,fontWeight:500}}>{delivery.origem}</span>
            <i className="ti ti-arrow-narrow-right" style={{fontSize:16,color:C.blue500}} />
            <span style={{fontSize:12,color:C.navy,fontWeight:500}}>{delivery.destino}</span>
            <span style={{marginLeft:"auto",fontSize:11,color:C.blue700,fontFamily:"DM Mono"}}>ETA: {delivery.etaHora}</span>
          </div>

          <div style={{marginBottom:18}}>
            <div style={{fontSize:11,fontWeight:600,color:C.slate500,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:10,fontFamily:"Outfit"}}>
              Novo Status
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              {STATUS_OPTS.map(opt => {
                const isSelected = selected === opt.key;
                return (
                  <button
                    key={opt.key}
                    className={`status-opt${isSelected?" selected":""}`}
                    style={{
                      background: isSelected ? opt.bg : C.white,
                      borderColor: isSelected ? opt.color : C.slate200,
                      maxWidth:"calc(50% - 4px)",
                    }}
                    onClick={() => setSelected(opt.key)}
                  >
                    <div style={{width:30,height:30,borderRadius:7,background:isSelected?opt.color:C.slate100,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"background .15s"}}>
                      <i className={`ti ti-${opt.icon}`} style={{fontSize:14,color:isSelected?C.white:C.slate500}} />
                    </div>
                    <span style={{fontSize:13,fontWeight:isSelected?700:500,color:isSelected?opt.color:C.slate700,fontFamily:"Outfit"}}>{opt.label}</span>
                    {isSelected && <i className="ti ti-check" style={{fontSize:13,color:opt.color,marginLeft:"auto"}} />}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{marginBottom:20}}>
            <label style={{fontSize:11,fontWeight:600,color:C.slate500,textTransform:"uppercase",letterSpacing:"0.8px",fontFamily:"Outfit",display:"block",marginBottom:8}}>
              Observação
              <span style={{color:C.slate400,textTransform:"none",fontWeight:400,letterSpacing:0,marginLeft:6}}>(opcional)</span>
            </label>
            <textarea
              className="es-inp" rows={3} style={{resize:"vertical",lineHeight:1.5}}
              placeholder="Descreva o que ocorreu, ponto de referência, contato no destino..."
              value={note} onChange={e => setNote(e.target.value)}
            />
          </div>

          <div style={{background:C.slate50,border:`1px solid ${C.slate200}`,borderRadius:10,padding:"14px 16px"}}>
            <div style={{fontSize:11,fontWeight:700,color:C.slate500,textTransform:"uppercase",letterSpacing:"0.8px",fontFamily:"Outfit",marginBottom:12}}>
              <i className="ti ti-history" style={{marginRight:5}} />Histórico
            </div>
            <Timeline items={delivery.historico} />
          </div>
        </div>

        <div style={{padding:"14px 24px 20px",borderTop:`1px solid ${C.slate100}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:12,color:C.slate500}}>
            {selected !== delivery.status
              ? <span style={{color:C.blue700,fontWeight:500}}><i className="ti ti-arrow-right" style={{fontSize:12,marginRight:3}} />Mudando para: {STATUS[selected]?.label}</span>
              : "Selecione um novo status"
            }
          </span>
          <div style={{display:"flex",gap:10}}>
            <button className="btn-ghost" onClick={onClose}>Cancelar</button>
            <button
              className="btn-primary"
              disabled={selected === delivery.status}
              style={selected===delivery.status?{opacity:.45,cursor:"not-allowed",transform:"none",boxShadow:"none"}:{}}
              onClick={() => onConfirm(selected, note)}
            >
              <i className="ti ti-check" style={{fontSize:15}} />
              Confirmar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Toast = ({ msg, type, onClose }) => {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  const cfg = {
    success:{ bg:C.greenSubtle, bd:C.greenBd, fg:C.green700, icon:"circle-check" },
    info:   { bg:C.blueSubtle,  bd:C.blueBorder, fg:C.blue700, icon:"info-circle" },
    error:  { bg:C.redSubtle,   bd:C.redBd,      fg:C.red700,  icon:"alert-circle" },
  }[type] || {};
  return (
    <div className="toast anim-toast" style={{background:cfg.bg,border:`1px solid ${cfg.bd}`,borderLeft:`3px solid ${cfg.fg}`}}>
      <i className={`ti ti-${cfg.icon}`} style={{fontSize:18,color:cfg.fg,flexShrink:0}} />
      <span style={{fontSize:13,color:cfg.fg,fontWeight:500,flex:1}}>{msg}</span>
      <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:cfg.fg,opacity:.7,padding:2}}>
        <i className="ti ti-x" style={{fontSize:14}} />
      </button>
    </div>
  );
};

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function AcompanhamentoEntregas() {
  const { isReady, dbRef, executeSql } = useDatabase();
  const [deliveries, setDeliveries] = useState([]);
  const [filter, setFilter]         = useState("todos");
  const [search, setSearch]         = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [modal, setModal]           = useState(null);
  const [toast, setToast]           = useState(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [refreshAnim, setRefreshAnim] = useState(false);

  const showToast = (msg, type="success") => setToast({ msg, type });

  // 📥 FUNÇÃO: Puxar Pedidos do Banco SQLite
  const loadDeliveries = useCallback(async () => {
    if (!isReady || !dbRef?.current) return;
    try {
      // Puxa os dados reais da tabela Pedidos
      const rows = dbRef.current.selectObjects("SELECT * FROM Pedidos ORDER BY id DESC");
      
      const mapped = rows.map(r => {
        // Mapeia o status do DB para a interface visual
        let st = r.status;
        if (st === "aguardando") st = "pendente";
        if (st === "vinculado") st = "em_rota";

        return {
          id: r.numero,
          cliente: r.cliente_nome,
          destino: r.destino,
          origem: "Central Expresso Sul", // Valor padrão logístico
          motorista: r.motorista_nome || "—",
          veiculo: r.veiculo_desc || "—",
          status: st,
          progresso: getProgressByStatus(st),
          etaHora: "16:00", // Fixado para MVP
          atrasadoMin: st === "atrasado" ? 45 : null,
          peso: `${r.peso} ${r.unidade}`,
          valor: r.valor_fmt,
          prioridade: r.prioridade || "normal",
          atualizado: "há 1 min",
          historico: [], // Você pode evoluir criando uma tabela de histórico depois
        };
      });

      // Ordena de acordo com o peso de importância do Status
      setDeliveries(mapped.sort((a,b) => (STATUS_ORDER[a.status]??9) - (STATUS_ORDER[b.status]??9)));
    } catch (err) {
      console.error("Erro ao carregar entregas:", err);
    }
  }, [isReady, dbRef]);

  // Carrega ao montar ou atualizar
  useEffect(() => {
    loadDeliveries();
  }, [loadDeliveries, lastRefresh]);

  // 📤 FUNÇÃO: Atualizar Status no Banco de Dados
  const handleUpdateStatus = async (delivery, newStatus, note) => {
    if (!isReady || !dbRef?.current) return;
    try {
      // 1. Atualiza no SQLite
      const sqlStatus = newStatus === "pendente" ? "aguardando" : (newStatus === "em_rota" ? "vinculado" : newStatus);
      
      if (executeSql) {
        await executeSql("UPDATE Pedidos SET status = ? WHERE numero = ?", [sqlStatus, delivery.id]);
      } else {
        dbRef.current.exec({
          sql: "UPDATE Pedidos SET status = ? WHERE numero = ?",
          bind: [sqlStatus, delivery.id]
        });
      }

      // 2. Atualiza a tela imediatamente (Optimistic Update)
      const hora = new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
      setDeliveries(prev => {
        const updated = prev.map(d => {
          if (d.id !== delivery.id) return d;
          const newEntry = { status:newStatus, label:STATUS[newStatus]?.label||newStatus, hora, nota:note };
          return {
            ...d, status:newStatus,
            progresso: getProgressByStatus(newStatus),
            atrasadoMin: newStatus==="atrasado" ? (d.atrasadoMin||0)+30 : null,
            atualizado: "agora mesmo",
            historico: [...d.historico, newEntry],
          };
        });
        return updated.sort((a,b) => (STATUS_ORDER[a.status]??9) - (STATUS_ORDER[b.status]??9));
      });

      setModal(null);
      showToast(`Pedido ${delivery.id} atualizado para "${STATUS[newStatus]?.label}".`);
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
      showToast("Erro ao atualizar status", "error");
    }
  };

  const handleRefresh = () => {
    setRefreshAnim(true);
    setTimeout(() => { 
      setLastRefresh(new Date()); 
      setRefreshAnim(false); 
      showToast("Dados atualizados com sucesso.", "info");
    }, 800);
  };

  const stats = {
    total:      deliveries.length,
    em_rota:    deliveries.filter(d => d.status==="em_rota").length,
    entregues:  deliveries.filter(d => d.status==="entregue").length,
    atrasadas:  deliveries.filter(d => d.status==="atrasado").length,
    pendentes:  deliveries.filter(d => d.status==="pendente").length,
    tentativa:  deliveries.filter(d => d.status==="tentativa").length,
  };

  const filtered = deliveries.filter(d => {
    const matchFilter = filter==="todos" || d.status===filter;
    const q = search.toLowerCase();
    const matchSearch = !q || d.id.toLowerCase().includes(q) || d.cliente.toLowerCase().includes(q) || d.destino.toLowerCase().includes(q) || d.motorista.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  const filterChips = [
    { key:"todos",     label:"Todos",     count:stats.total,     color:C.navy },
    { key:"atrasado",  label:"Atrasados", count:stats.atrasadas, color:C.red700 },
    { key:"tentativa", label:"Tentativa", count:stats.tentativa, color:C.amber700 },
    { key:"em_rota",   label:"Em Rota",   count:stats.em_rota,   color:C.blue700 },
    { key:"pendente",  label:"Pendente",  count:stats.pendentes, color:C.slate500 },
    { key:"entregue",  label:"Entregues", count:stats.entregues, color:C.green700 },
  ];
// forçando rebuild da vercel
  return (
    <>
      <Styles />
      <div className="root">

        {/* ── Top Bar ── */}
        <div style={{background:`linear-gradient(180deg, ${C.navy} 0%, ${C.navyMid} 100%)`,padding:"0 28px"}}>
          <div style={{display:"flex",alignItems:"center",gap:14,padding:"14px 0",borderBottom:"1px solid rgba(255,255,255,.07)"}}>
            <div style={{width:36,height:36,background:C.blue500,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <i className="ti ti-truck-delivery" style={{fontSize:18,color:C.white}} />
            </div>
            <span className="head" style={{fontSize:16,fontWeight:700,color:C.white,letterSpacing:-.3}}>Expresso Sul</span>
            <span style={{fontSize:11,color:"rgba(255,255,255,.3)",marginLeft:2}}>Plataforma Logística</span>

            <div style={{marginLeft:12,display:"flex",alignItems:"center",gap:6,background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",borderRadius:20,padding:"4px 12px"}}>
              <span className="pulse-wrap" style={{width:10,height:10}}>
                <span className="pulse-ring" style={{borderColor:"#22C55E"}} />
                <span className="pulse-dot" style={{background:"#22C55E",width:6,height:6}} />
              </span>
              <span style={{fontSize:11,color:"rgba(255,255,255,.6)",fontFamily:"DM Mono"}}>OPERAÇÃO AO VIVO</span>
            </div>

            <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:11,color:"rgba(255,255,255,.35)",fontFamily:"DM Mono"}}>
                {lastRefresh.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit",second:"2-digit"})}
              </span>
              <button onClick={handleRefresh} style={{background:"rgba(255,255,255,.08)",border:"1px solid rgba(255,255,255,.12)",borderRadius:7,padding:"6px 10px",cursor:"pointer",display:"flex",alignItems:"center",gap:5,color:"rgba(255,255,255,.6)",fontSize:12,transition:"background .15s"}}>
                <i className="ti ti-refresh" style={{fontSize:14,transition:"transform .8s",transform:refreshAnim?"rotate(360deg)":"none"}} />
                Atualizar
              </button>
              <div style={{width:30,height:30,background:C.blue500,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <span className="head" style={{fontSize:10,fontWeight:700,color:C.white}}>AU</span>
              </div>
            </div>
          </div>

          <div style={{display:"flex",alignItems:"center",gap:6,padding:"10px 0",fontSize:12,color:"rgba(255,255,255,.35)"}}>
            {["Painel","Operações","Acompanhamento de Entregas"].map((b,i,arr)=>(
              <span key={b} style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{color:i===arr.length-1?"#93C5FD":undefined,fontWeight:i===arr.length-1?500:400}}>{b}</span>
                {i<arr.length-1 && <i className="ti ti-chevron-right" style={{fontSize:11}} />}
              </span>
            ))}
          </div>
        </div>

        <div style={{padding:"24px 28px",maxWidth:1100,margin:"0 auto"}}>

          {/* ── Situation Banner ── */}
          {stats.atrasadas > 0 && (
            <div className="anim-fade-up" style={{
              background:`linear-gradient(135deg, ${C.redSubtle}, #fff5f5)`,
              border:`1.5px solid ${C.redBd}`,borderRadius:10,
              padding:"12px 18px",marginBottom:20,
              display:"flex",alignItems:"center",gap:12,
            }}>
              <div style={{width:36,height:36,background:C.red700,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <i className="ti ti-alert-triangle" style={{fontSize:18,color:C.white}} />
              </div>
              <div>
                <div className="head" style={{fontSize:13,fontWeight:700,color:C.red700}}>
                  {stats.atrasadas} entrega{stats.atrasadas>1?"s":""} {stats.atrasadas>1?"precisam":"precisa"} de atenção imediata
                </div>
                <div style={{fontSize:12,color:"#7f1d1d",marginTop:2}}>
                  Atrasos identificados • Verifique os itens marcados em vermelho na lista abaixo
                </div>
              </div>
              <button className="btn-ghost" style={{marginLeft:"auto",flexShrink:0,borderColor:C.redBd,color:C.red700}} onClick={() => setFilter("atrasado")}>
                Ver atrasadas
              </button>
            </div>
          )}

          {/* ── Stats Cards ── */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:22}}>
            {[
              { key:"total",    label:"Total de Entregas", val:stats.total,    icon:"package",        cls:"gray",   sub:`${stats.entregues} concluídas` },
              { key:"em_rota",  label:"Em Rota",           val:stats.em_rota,  icon:"truck",          cls:"blue",   sub:"Acompanhando em tempo real", pulse:true },
              { key:"entregue", label:"Entregues",         val:stats.entregues,icon:"circle-check",   cls:"green",  sub:`${Math.round(stats.entregues/Math.max(stats.total,1)*100)||0}% da operação` },
              { key:"atrasado", label:"Atrasadas",         val:stats.atrasadas,icon:"alert-triangle", cls:"red",    sub:stats.atrasadas>0?"Requer atenção":"Tudo no prazo" },
            ].map((s, idx) => (
              <div key={s.key} className={`stat-card ${s.cls} anim-fade-up`} style={{animationDelay:`${idx*60}ms`,cursor:s.val>0?"pointer":"default"}} onClick={() => s.val>0 && setFilter(s.key==="total"?"todos":s.key)}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                  <div style={{
                    width:38,height:38,borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",
                    background: s.cls==="blue"?C.blueSubtle:s.cls==="green"?C.greenSubtle:s.cls==="red"?C.redSubtle:C.slate100,
                  }}>
                    <i className={`ti ti-${s.icon}`} style={{fontSize:18,color:s.cls==="blue"?C.blue700:s.cls==="green"?C.green700:s.cls==="red"?C.red700:C.slate500}} />
                  </div>
                  {s.pulse && stats.em_rota > 0 && (
                    <span className="pulse-wrap" style={{width:14,height:14}}>
                      <span className="pulse-ring" />
                      <span className="pulse-dot" style={{width:7,height:7}} />
                    </span>
                  )}
                  {s.cls==="red" && s.val>0 && <i className="ti ti-chevron-right" style={{fontSize:14,color:C.red700,opacity:.6}} />}
                </div>
                <div className="head" style={{
                  fontSize:32,fontWeight:800,color:
                    s.cls==="blue"?C.blue700:s.cls==="green"?C.green700:s.cls==="red"&&s.val>0?C.red700:C.navy,
                  lineHeight:1,marginBottom:4,animation:"countUp .4s ease-out both",animationDelay:`${idx*80}ms`,
                }}>
                  {s.val}
                </div>
                <div style={{fontSize:12,fontWeight:600,color:C.slate700,marginBottom:3}}>{s.label}</div>
                <div style={{fontSize:11,color:C.slate500}}>{s.sub}</div>
                <div className="prog-bg" style={{marginTop:10}}>
                  <div className="prog-fill" style={{
                    width:`${Math.min(100,(s.val/Math.max(stats.total,1))*100)}%`,
                    background:s.cls==="blue"?C.blue500:s.cls==="green"?C.green700:s.cls==="red"?C.red700:C.slate300,
                    "--w":`${Math.min(100,(s.val/Math.max(stats.total,1))*100)}%`,
                  }} />
                </div>
              </div>
            ))}
          </div>

          {/* ── Filter + Search ── */}
          <div style={{background:C.white,border:`1px solid ${C.slate300}`,borderRadius:10,padding:"12px 16px",marginBottom:16,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",flex:1}}>
              {filterChips.map(chip => {
                const active = filter===chip.key;
                return (
                  <button
                    key={chip.key}
                    className={`chip${active?" active":""}`}
                    style={{
                      background: active ? chip.color : C.white,
                      borderColor: active ? chip.color : C.slate200,
                      color: active ? C.white : C.slate600,
                    }}
                    onClick={() => setFilter(chip.key)}
                  >
                    {chip.label}
                    <span style={{
                      background: active?"rgba(255,255,255,.25)":"rgba(0,0,0,.08)",
                      color: active?C.white:C.slate600,
                      borderRadius:10,padding:"1px 6px",fontSize:11,fontWeight:700,
                    }}>{chip.count}</span>
                  </button>
                );
              })}
            </div>
            <div style={{position:"relative",flexShrink:0}}>
              <i className="ti ti-search" style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:C.slate400,fontSize:14}} />
              <input
                className="es-inp"
                style={{paddingLeft:32,width:240,fontSize:13,padding:"7px 12px 7px 32px"}}
                placeholder="Buscar ID, cliente, destino..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button onClick={() => setSearch("")} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:C.slate400,padding:2}}>
                  <i className="ti ti-x" style={{fontSize:13}} />
                </button>
              )}
            </div>
          </div>

          {/* ── Delivery Table ── */}
          <div style={{background:C.white,border:`1px solid ${C.slate300}`,borderRadius:12,overflow:"hidden"}}>
            <div style={{padding:"12px 18px",borderBottom:`1px solid ${C.slate200}`,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <i className="ti ti-route" style={{fontSize:18,color:C.blue700}} />
                <span className="head" style={{fontSize:15,fontWeight:700,color:C.navy}}>Entregas em Operação</span>
                <span style={{background:C.blueSubtle,color:C.blue700,fontSize:11,fontWeight:600,padding:"2px 10px",borderRadius:20,fontFamily:"Outfit"}}>
                  {filtered.length} resultado{filtered.length!==1?"s":""}
                </span>
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <span style={{fontSize:11,color:C.slate400,fontFamily:"DM Mono"}}>
                  <i className="ti ti-clock" style={{marginRight:4}} />
                  Ordenado por urgência
                </span>
              </div>
            </div>

            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",minWidth:780}}>
                <thead>
                  <tr>
                    {["","Pedido","Cliente","Rota","Motorista","Progresso","ETA","Status","Ação"].map((h,i) => (
                      <th key={h} className="tbl-th" style={{textAlign:i>=7?"center":"left",paddingLeft:i===0?"8px":undefined}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={9} style={{textAlign:"center",padding:"48px 24px"}}>
                      <i className="ti ti-search-off" style={{fontSize:36,color:C.slate300,display:"block",marginBottom:10}} />
                      <div className="head" style={{fontSize:14,fontWeight:600,color:C.slate500}}>Nenhuma entrega encontrada</div>
                      <div style={{fontSize:12,color:C.slate400,marginTop:4}}>Verifique se há pedidos cadastrados no sistema</div>
                    </td></tr>
                  ) : filtered.map(d => {
                    const st = STATUS[d.status] || STATUS.pendente;
                    const isExpanded = expandedId === d.id;
                    const pri = PRIORITY[d.prioridade] || PRIORITY.normal;
                    return (
                      <React.Fragment key={d.id}>
                        <tr
                          className={`del-row ${d.status}`}
                          style={{cursor:"pointer"}}
                          onClick={() => setExpandedId(isExpanded ? null : d.id)}
                        >
                          <td className="tbl-td" style={{paddingLeft:10,paddingRight:4,width:28}}>
                            <i className={`ti ti-chevron-${isExpanded?"down":"right"}`} style={{fontSize:13,color:C.slate400,transition:"transform .2s"}} />
                          </td>

                          <td className="tbl-td">
                            <div style={{display:"flex",alignItems:"center",gap:7}}>
                              <span style={{width:8,height:8,borderRadius:"50%",background:pri.dot,flexShrink:0}} title={pri.label} />
                              <span className="mono" style={{fontSize:12,fontWeight:700,color:C.navy}}>{d.id}</span>
                            </div>
                            <div style={{fontSize:10,color:C.slate400,marginTop:2,marginLeft:15}}>{d.atualizado}</div>
                          </td>

                          <td className="tbl-td" style={{maxWidth:170}}>
                            <div style={{fontSize:13,fontWeight:500,color:C.navy,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:160}}>{d.cliente}</div>
                          </td>

                          <td className="tbl-td" style={{maxWidth:200}}>
                            <div style={{display:"flex",alignItems:"center",gap:5,fontSize:12}}>
                              <i className="ti ti-map-pin" style={{fontSize:11,color:C.slate400}} />
                              <span style={{color:C.slate600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:80}}>{d.origem.split("—")[0].trim()}</span>
                              <i className="ti ti-arrow-narrow-right" style={{fontSize:13,color:C.blue500,flexShrink:0}} />
                              <span style={{fontWeight:500,color:C.navy,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:90}}>{d.destino.split(",")[0]}</span>
                            </div>
                          </td>

                          <td className="tbl-td">
                            <div style={{fontSize:12,color:d.motorista==="—"?C.slate400:C.slate700}}>
                              {d.motorista==="—" ? (
                                <span style={{background:C.amberSubtle,color:C.amber700,fontSize:11,padding:"2px 8px",borderRadius:10,fontFamily:"Outfit",fontWeight:600}}>
                                  Sem motorista
                                </span>
                              ) : d.motorista}
                            </div>
                          </td>

                          <td className="tbl-td" style={{minWidth:120}}>
                            <div style={{display:"flex",alignItems:"center",gap:8}}>
                              <div className="prog-bg" style={{flex:1}}>
                                <div className="prog-fill" style={{
                                  width:`${d.progresso}%`,background:st.bar,
                                  "--w":`${d.progresso}%`,
                                }} />
                              </div>
                              <span className="mono" style={{fontSize:11,fontWeight:600,color:C.slate600,minWidth:30}}>{d.progresso}%</span>
                            </div>
                          </td>

                          <td className="tbl-td">
                            <ETAChip hora={d.etaHora} atrasadoMin={d.atrasadoMin} status={d.status} />
                          </td>

                          <td className="tbl-td" style={{textAlign:"center"}}>
                            <SBadge statusKey={d.status} />
                          </td>

                          <td className="tbl-td" style={{textAlign:"center"}} onClick={e => e.stopPropagation()}>
                            {d.status !== "entregue" && d.status !== "devolvido" ? (
                              <button className="btn-upd" onClick={() => setModal(d)}>
                                <i className="ti ti-refresh" style={{fontSize:12}} />
                                Atualizar
                              </button>
                            ) : (
                              <span style={{fontSize:11,color:C.green700,fontWeight:600,fontFamily:"Outfit"}}>
                                <i className="ti ti-lock" style={{fontSize:11,marginRight:3}} />Finalizado
                              </span>
                            )}
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr key={`${d.id}-exp`}>
                            <td colSpan={9} style={{padding:0}}>
                              <ExpandedRow delivery={d} />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div style={{padding:"11px 18px",borderTop:`1px solid ${C.slate100}`,background:C.slate50,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
              <div style={{display:"flex",gap:16,fontSize:11,color:C.slate500}}>
                {Object.entries(STATUS).filter(([k])=>k!=="devolvido").map(([key,s]) => {
                  const count = deliveries.filter(d=>d.status===key).length;
                  return count>0 ? (
                    <span key={key} style={{display:"flex",alignItems:"center",gap:4}}>
                      <span style={{width:7,height:7,borderRadius:"50%",background:s.bar}} />
                      {s.label}: <strong style={{color:C.navy,fontFamily:"DM Mono"}}>{count}</strong>
                    </span>
                  ) : null;
                })}
              </div>
              <span style={{fontSize:11,color:C.slate400,fontFamily:"DM Mono"}}>
                Clique em qualquer linha para expandir detalhes
              </span>
            </div>
          </div>
        </div>
      </div>

      {modal && (
        <UpdateModal
          delivery={modal}
          onConfirm={(newStatus, note) => handleUpdateStatus(modal, newStatus, note)}
          onClose={() => setModal(null)}
        />
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}