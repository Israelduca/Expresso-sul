import React, { useState, useEffect, useCallback } from "react";
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
  pendente:  { label:"Pendente",         color:C.slate600, bg:C.slate100,    bd:C.slate300,  icon:"clock",          bar:C.slate300, pulse:false },
  em_rota:   { label:"Em Rota",          color:C.blue700,  bg:C.blueSubtle,  bd:C.blueBorder, icon:"truck",          bar:C.blue500,  pulse:true  },
  entregue:  { label:"Entregue",         color:C.green700, bg:C.greenSubtle, bd:C.greenBd,    icon:"circle-check",   bar:C.green700, pulse:false },
  atrasado:  { label:"Atrasado",         color:C.red700,   bg:C.redSubtle,   bd:C.redBd,      icon:"alert-triangle", bar:C.red700,   pulse:false },
  tentativa: { label:"2ª Tentativa",     color:C.amber700, bg:C.amberSubtle, bd:C.amberBd,    icon:"refresh",        bar:C.amber700, pulse:false },
  devolvido: { label:"Devolvido",        color:C.purple,   bg:C.purpleSubtle,bd:"#C4B5FD",    icon:"corner-up-left", bar:C.purple,   pulse:false },
};

const PRIORITY = {
  normal:  { label:"Normal",  dot:C.slate400 },
  urgente: { label:"Urgente", dot:C.amber700 },
  critico: { label:"Crítico", dot:C.red700   },
};

const STATUS_ORDER = { atrasado:0, tentativa:1, em_rota:2, pendente:3, entregue:4, devolvido:5 };

const STATUS_OPTS = [
  { key:"em_rota",   label:"Em Rota",       icon:"truck",          color:C.blue700,  bg:C.blueSubtle  },
  { key:"entregue",  label:"Entregue",       icon:"circle-check",   color:C.green700, bg:C.greenSubtle },
  { key:"tentativa", label:"Tentativa",      icon:"refresh",        color:C.amber700, bg:C.amberSubtle },
  { key:"atrasado",  label:"Atrasado",       icon:"alert-triangle", color:C.red700,   bg:C.redSubtle   },
  { key:"devolvido", label:"Devolvido",      icon:"corner-up-left", color:C.purple,   bg:C.purpleSubtle},
  { key:"pendente",  label:"Pendente",       icon:"clock",          color:C.slate600, bg:C.slate100    },
];

const getProgressByStatus = (status) => {
  const map = { pendente: 0, em_rota: 50, tentativa: 75, atrasado: 45, entregue: 100, devolvido: 100 };
  return map[status] || 0;
};

const getInitials = (name) => {
  if (!name || name === "—") return "??";
  return name.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase();
};

// ─── CSS ──────────────────────────────────────────────────────────────────────
const Styles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=DM+Mono:wght@400;500;700&family=DM+Sans:wght@400;500;600;700&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    .root{font-family:'DM Sans',sans-serif;background:${C.slate50};min-height:100vh;color:${C.navy}}
    .head{font-family:'Outfit',sans-serif}
    .mono{font-family:'DM Mono',monospace}

    @keyframes pulse-dot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.8)}}
    @keyframes pulse-ring{0%{transform:scale(1);opacity:.6}100%{transform:scale(2.2);opacity:0}}
    @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
    @keyframes fadeIn{from{opacity:0}to{opacity:1}}
    @keyframes scaleIn{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}
    @keyframes progressFill{from{width:0}to{width:var(--w)}}

    .anim-fade-up{animation:fadeUp .3s ease-out both}
    .anim-scale  {animation:scaleIn .2s ease-out}
    .anim-fade   {animation:fadeIn .2s ease-out}

    /* Tabs */
    .tab-list { display: flex; gap: 24px; border-bottom: 2px solid ${C.slate200}; margin-bottom: 24px; overflow-x: auto; scrollbar-width: none; }
    .tab-list::-webkit-scrollbar { display: none; }
    .tab-btn {
      background: none; border: none; padding: 12px 4px; font-family: 'Outfit'; font-size: 15px; font-weight: 600;
      color: ${C.slate500}; cursor: pointer; position: relative; white-space: nowrap; transition: color .2s;
    }
    .tab-btn:hover { color: ${C.navy}; }
    .tab-btn.active { color: ${C.blue700}; }
    .tab-btn.active::after { content: ''; position: absolute; bottom: -2px; left: 0; width: 100%; height: 3px; background: ${C.blue700}; border-radius: 3px 3px 0 0; }
    .tab-badge { background: ${C.slate100}; color: ${C.slate600}; font-size: 11px; padding: 2px 8px; border-radius: 12px; margin-left: 8px; font-weight: 700; transition: all .2s; }
    .tab-btn.active .tab-badge { background: ${C.blue700}; color: white; }

    /* Cards */
    .del-card {
      background: ${C.white}; border: 1px solid ${C.slate200}; border-radius: 14px; padding: 20px;
      margin-bottom: 16px; transition: box-shadow .2s, border-color .2s; position: relative; overflow: hidden;
    }
    .del-card:hover { box-shadow: 0 12px 32px rgba(0,0,0,.06); border-color: ${C.slate300}; }
    .del-card::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; border-radius: 14px 0 0 14px; }
    .del-card.atrasado::before { background: ${C.red700}; }
    .del-card.em_rota::before { background: ${C.blue700}; }
    .del-card.entregue::before { background: ${C.green700}; }
    .del-card.pendente::before { background: ${C.slate300}; }
    .del-card.tentativa::before { background: ${C.amber700}; }

    .pulse-wrap{position:relative;display:inline-flex;align-items:center;justify-content:center}
    .pulse-ring{position:absolute;width:10px;height:10px;border-radius:50%;border:1.5px solid ${C.blue700};animation:pulse-ring 1.5s ease-out infinite;}
    .pulse-dot{width:8px;height:8px;border-radius:50%;background:${C.blue700};animation:pulse-dot 1.5s ease-in-out infinite;position:relative;z-index:1}

    .prog-bg{height:6px;background:${C.slate100};border-radius:3px;overflow:hidden;width:100%}
    .prog-fill{height:100%;border-radius:3px;transition:width .5s ease;animation:progressFill .6s ease-out both}

    .btn-action {
      font-family:'DM Sans'; font-size:13px; font-weight:600; padding:8px 16px; border-radius:8px; cursor:pointer;
      display:inline-flex; alignItems:center; gap:6px; transition:all .2s; border: none;
    }
    .btn-action.primary { background: ${C.blueSubtle}; color: ${C.blue700}; }
    .btn-action.primary:hover { background: #dbeafe; }
    .btn-action.outline { background: transparent; border: 1.5px solid ${C.slate200}; color: ${C.slate600}; }
    .btn-action.outline:hover { border-color: ${C.slate300}; color: ${C.navy}; background: ${C.slate50}; }

    .badge{display:inline-flex;align-items:center;gap:4px;font-family:'Outfit';font-size:11px;font-weight:700;padding:4px 10px;border-radius:6px;text-transform:uppercase;letter-spacing:0.5px;}

    .map-placeholder {
      background: #E2E8F0; border-radius: 16px; height: 260px; position: relative; overflow: hidden; margin-bottom: 24px;
      border: 1px solid ${C.slate200}; display: flex; align-items: center; justify-content: center;
    }
    .map-grid {
      position: absolute; inset: 0; background-image: radial-gradient(${C.slate400} 1px, transparent 1px);
      background-size: 24px 24px; opacity: 0.2;
    }

    /* Modal & Inputs */
    .overlay{position:fixed;inset:0;background:rgba(12,31,53,.65);z-index:900;display:flex;align-items:center;justify-content:center;padding:16px}
    .modal{background:${C.white};border-radius:14px;width:100%;max-width:540px;max-height:90vh;overflow-y:auto;box-shadow:0 24px 64px rgba(0,0,0,.25)}
    .modal-hd{padding:20px 24px 16px;border-bottom:1px solid ${C.slate200};display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;background:${C.white};z-index:1}
    .status-opt{border:1.5px solid ${C.slate200};border-radius:9px;padding:10px 14px;cursor:pointer;display:flex;align-items:center;gap:10px;transition:all .15s;background:${C.white};flex:1;min-width:130px;}
    .status-opt:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(0,0,0,.08)}
    .status-opt.selected{border-width:2px}
    .es-inp{font-family:'DM Sans';font-size:14px;color:${C.navy};background:${C.white};border:1.5px solid ${C.slate300};border-radius:8px;padding:9px 12px;outline:none;width:100%;transition:border-color .15s,box-shadow .15s;}
    .es-inp:focus{border-color:${C.blue700};box-shadow:0 0 0 3px rgba(26,95,171,.12)}
    .btn-ghost{font-family:'DM Sans';font-size:13px;font-weight:500;background:transparent;color:${C.slate600};border:1px solid ${C.slate300};border-radius:7px;padding:7px 14px;cursor:pointer;display:inline-flex;align-items:center;gap:5px;transition:background .15s,color .15s;}
    .btn-primary-m{font-family:'Outfit';font-size:14px;font-weight:700;background:linear-gradient(135deg,${C.blue700},${C.blue500});color:${C.white};border:none;border-radius:9px;padding:11px 24px;cursor:pointer;display:inline-flex;align-items:center;gap:7px;transition:all .2s;box-shadow:0 4px 14px rgba(26,95,171,.28);}
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
      {!s.pulse && <i className={`ti ti-${s.icon}`} style={{fontSize:13}} />}
      {s.label}
    </span>
  );
};

// ─── Modal de Atualização ─────────────────────────────────────────────────────
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
            </div>
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

          <div style={{marginBottom:10}}>
            <label style={{fontSize:11,fontWeight:600,color:C.slate500,textTransform:"uppercase",letterSpacing:"0.8px",fontFamily:"Outfit",display:"block",marginBottom:8}}>
              Observação <span style={{color:C.slate400,textTransform:"none",fontWeight:400,letterSpacing:0,marginLeft:6}}>(opcional)</span>
            </label>
            <textarea
              className="es-inp" rows={3} style={{resize:"vertical",lineHeight:1.5}}
              placeholder="Descreva o que ocorreu, ponto de referência, contato..."
              value={note} onChange={e => setNote(e.target.value)}
            />
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
              className="btn-primary-m"
              disabled={selected === delivery.status}
              style={selected===delivery.status?{opacity:.45,cursor:"not-allowed",boxShadow:"none"}:{}}
              onClick={() => onConfirm(selected, note)}
            >
              <i className="ti ti-check" style={{fontSize:15}} /> Confirmar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function AcompanhamentoEntregas() {
  // ✅ Removido o dbRef daqui, puxando apenas o isReady e executeSql corretos!
  const { isReady, executeSql } = useDatabase(); 
  
  const [deliveries, setDeliveries] = useState([]);
  const [filter, setFilter]         = useState("todos");
  const [search, setSearch]         = useState("");
  const [modal, setModal]           = useState(null);

  // 📥 FUNÇÃO: Carregar dados do SQLite (Corrigida com await executeSql)
  const loadDeliveries = useCallback(async () => {
    if (!isReady) return;
    try {
      const rows = await executeSql("SELECT * FROM Pedidos ORDER BY id DESC");
      
      if (!rows) return; // Segurança extra caso o banco retorne vazio

      const mapped = rows.map(r => {
        let st = r.status;
        if (st === "aguardando") st = "pendente";
        if (st === "vinculado") st = "em_rota";

        return {
          id: r.numero,
          cliente: r.cliente_nome,
          destino: r.destino,
          origem: "Central Expresso Sul", 
          motorista: r.motorista || "—", 
          veiculo: r.veiculo || "—",
          status: st,
          progresso: getProgressByStatus(st),
          etaHora: "16:00", 
          atrasadoMin: st === "atrasado" ? 45 : null,
          peso: `${r.peso} ${r.unidade}`,
          valor: r.valor_brl || r.valor_fmt,
          prioridade: r.prioridade || "normal",
          atualizado: "há 1 min",
        };
      });

      setDeliveries(mapped.sort((a,b) => (STATUS_ORDER[a.status]??9) - (STATUS_ORDER[b.status]??9)));
    } catch (err) {
      console.error("Erro ao carregar entregas:", err);
    }
  }, [isReady, executeSql]);

  useEffect(() => { loadDeliveries(); }, [loadDeliveries]);

  // 📤 FUNÇÃO: Atualizar Status (Corrigida com await executeSql)
  const handleUpdateStatus = async (delivery, newStatus, note) => {
    if (!isReady) return;
    try {
      const sqlStatus = newStatus === "pendente" ? "aguardando" : (newStatus === "em_rota" ? "vinculado" : newStatus);
      
      await executeSql("UPDATE Pedidos SET status = ? WHERE numero = ?", [sqlStatus, delivery.id]);

      setDeliveries(prev => {
        const updated = prev.map(d => {
          if (d.id !== delivery.id) return d;
          return {
            ...d, status:newStatus,
            progresso: getProgressByStatus(newStatus),
            atrasadoMin: newStatus==="atrasado" ? (d.atrasadoMin||0)+30 : null,
            atualizado: "agora mesmo",
          };
        });
        return updated.sort((a,b) => (STATUS_ORDER[a.status]??9) - (STATUS_ORDER[b.status]??9));
      });
      setModal(null);
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
    }
  };

  const stats = {
    total:      deliveries.length,
    em_rota:    deliveries.filter(d => d.status==="em_rota").length,
    entregues:  deliveries.filter(d => d.status==="entregue").length,
    atrasadas:  deliveries.filter(d => d.status==="atrasado").length,
    pendentes:  deliveries.filter(d => d.status==="pendente").length,
  };

  const filtered = deliveries.filter(d => {
    const matchFilter = filter==="todos" || d.status===filter;
    const q = search.toLowerCase();
    const matchSearch = !q || d.id.toLowerCase().includes(q) || d.cliente.toLowerCase().includes(q) || d.destino.toLowerCase().includes(q) || d.motorista.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  const tabs = [
    { key:"todos",     label:"Visão Geral", count:stats.total },
    { key:"em_rota",   label:"Em Rota",     count:stats.em_rota },
    { key:"pendente",  label:"Pendentes",   count:stats.pendentes },
    { key:"atrasado",  label:"Atrasadas",   count:stats.atrasadas },
    { key:"entregue",  label:"Concluídas",  count:stats.entregues },
  ];

  return (
    <>
      <Styles />
      <div className="root">
        
        {/* Top Bar Simplificada para o Exemplo */}
        <div style={{background:C.navy,padding:"16px 28px",color:"white",display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:32,height:32,background:C.blue500,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <i className="ti ti-map-2" style={{fontSize:18}} />
          </div>
          <span className="head" style={{fontSize:18,fontWeight:700}}>Acompanhamento de Entregas</span>
        </div>

        <div style={{padding:"24px 28px",maxWidth:1100,margin:"0 auto"}}>

          {/* 📍 Mapa Placeholder */}
          <div className="map-placeholder anim-fade-up">
            <div className="map-grid" />
            <div style={{background:"white",padding:"12px 24px",borderRadius:"30px",display:"flex",alignItems:"center",gap:10,boxShadow:"0 8px 24px rgba(0,0,0,.1)",zIndex:1}}>
              <span className="pulse-wrap" style={{width:14,height:14}}><span className="pulse-ring" style={{borderColor:C.blue700}}/><span className="pulse-dot"/></span>
              <span className="head" style={{color:C.navy,fontWeight:700,fontSize:14}}>Radar Ativo</span>
              <span style={{color:C.slate400,fontSize:13}}>• {stats.em_rota} veículos em movimento</span>
            </div>
            
            {/* Elementos decorativos do mapa */}
            <div style={{position:"absolute",top:"30%",left:"25%",background:C.navy,color:"white",padding:"4px 8px",borderRadius:6,fontSize:10,fontWeight:700,fontFamily:"DM Mono"}}><i className="ti ti-truck" style={{marginRight:4}}/>BR-101</div>
            <div style={{position:"absolute",bottom:"40%",right:"35%",background:C.blue500,color:"white",padding:"4px 8px",borderRadius:6,fontSize:10,fontWeight:700,fontFamily:"DM Mono"}}><i className="ti ti-truck" style={{marginRight:4}}/>PR-323</div>
          </div>

          {/* 🏷️ Abas de Navegação */}
          <div className="tab-list">
            {tabs.map(tab => (
              <button key={tab.key} className={`tab-btn ${filter === tab.key ? 'active' : ''}`} onClick={() => setFilter(tab.key)}>
                {tab.label}
                <span className="tab-badge">{tab.count}</span>
              </button>
            ))}
          </div>

          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
             <h2 className="head" style={{fontSize:20,fontWeight:700,color:C.navy}}>
               {filter === "todos" ? "Todas as Entregas" : tabs.find(t=>t.key===filter)?.label}
             </h2>
             <div style={{position:"relative",width:300}}>
                <i className="ti ti-search" style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:C.slate400}} />
                <input 
                  className="es-inp" style={{paddingLeft:36, borderRadius:20}} 
                  placeholder="Buscar pedido, cliente, motorista..." 
                  value={search} onChange={e => setSearch(e.target.value)} 
                />
             </div>
          </div>

          {/* 📦 Lista de Cards */}
          <div style={{display:"flex",flexDirection:"column"}}>
            {filtered.length === 0 ? (
               <div style={{textAlign:"center",padding:"60px 20px",background:C.white,borderRadius:14,border:`1px dashed ${C.slate300}`}}>
                 <i className="ti ti-route-off" style={{fontSize:40,color:C.slate300,marginBottom:12}} />
                 <h3 className="head" style={{color:C.navy,fontSize:18}}>Nenhuma entrega encontrada</h3>
                 <p style={{color:C.slate500,fontSize:14,marginTop:6}}>Altere os filtros ou busque por outro termo.</p>
               </div>
            ) : filtered.map((d, index) => {
               const st = STATUS[d.status] || STATUS.pendente;
               return (
                 <div key={d.id} className={`del-card ${d.status} anim-fade-up`} style={{animationDelay:`${index*50}ms`}}>
                   
                   {/* Card Header */}
                   <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,borderBottom:`1px solid ${C.slate100}`,paddingBottom:12}}>
                     <div style={{display:"flex",alignItems:"center",gap:12}}>
                        <SBadge statusKey={d.status} />
                        <span className="mono" style={{fontSize:14,fontWeight:700,color:C.navy}}>{d.id}</span>
                        <span style={{fontSize:12,color:C.slate400}}>Atualizado {d.atualizado}</span>
                     </div>
                     <div style={{fontSize:15,fontWeight:700,color:C.navy,fontFamily:"Outfit"}}>{d.valor}</div>
                   </div>

                   {/* Card Body (Grid 3 colunas) */}
                   <div style={{display:"grid",gridTemplateColumns:"1.2fr 1fr 1fr",gap:24,alignItems:"center"}}>
                     
                     {/* Coluna 1: Rota */}
                     <div style={{display:"flex",gap:12}}>
                        <div style={{display:"flex",flexDirection:"column",alignItems:"center",marginTop:4}}>
                           <div style={{width:12,height:12,borderRadius:"50%",border:`2.5px solid ${C.slate300}`}} />
                           <div style={{width:2,height:28,background:C.slate200,margin:"2px 0"}} />
                           <div style={{width:12,height:12,borderRadius:"50%",background:C.blue500,boxShadow:`0 0 0 3px ${C.blueSubtle}`}} />
                        </div>
                        <div style={{display:"flex",flexDirection:"column",justifyContent:"space-between"}}>
                           <div>
                              <div style={{fontSize:11,color:C.slate400,fontWeight:700,textTransform:"uppercase"}}>Origem</div>
                              <div style={{fontSize:13,color:C.navy,fontWeight:600}}>{d.origem.split("—")[0].trim()}</div>
                           </div>
                           <div style={{marginTop:8}}>
                              <div style={{fontSize:11,color:C.slate400,fontWeight:700,textTransform:"uppercase"}}>Destino</div>
                              <div style={{fontSize:13,color:C.navy,fontWeight:600}}>{d.destino.split(",")[0]}</div>
                           </div>
                        </div>
                     </div>

                     {/* Coluna 2: Motorista & Cliente */}
                     <div style={{display:"flex",flexDirection:"column",gap:12,borderLeft:`1px solid ${C.slate100}`,paddingLeft:24}}>
                        <div style={{display:"flex",alignItems:"center",gap:10}}>
                           <div style={{width:32,height:32,borderRadius:"50%",background:C.slate100,color:C.slate500,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,fontFamily:"Outfit"}}>
                             {getInitials(d.motorista)}
                           </div>
                           <div>
                              <div style={{fontSize:11,color:C.slate400,fontWeight:600}}>Motorista ({d.veiculo.split(" ")[0]})</div>
                              <div style={{fontSize:13,color:C.navy,fontWeight:600}}>{d.motorista}</div>
                           </div>
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:10}}>
                           <div style={{width:32,height:32,borderRadius:8,background:C.slate50,display:"flex",alignItems:"center",justifyContent:"center"}}>
                             <i className="ti ti-building" style={{color:C.slate400,fontSize:16}} />
                           </div>
                           <div>
                              <div style={{fontSize:11,color:C.slate400,fontWeight:600}}>Cliente</div>
                              <div style={{fontSize:13,color:C.navy,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:140}}>{d.cliente}</div>
                           </div>
                        </div>
                     </div>

                     {/* Coluna 3: Progresso e Botões */}
                     <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:16}}>
                        <div style={{width:"100%",textAlign:"right"}}>
                           <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                              <span style={{fontSize:11,fontWeight:600,color:C.slate500}}>Progresso</span>
                              <span className="mono" style={{fontSize:11,fontWeight:700,color:C.navy}}>{d.progresso}%</span>
                           </div>
                           <div className="prog-bg">
                              <div className="prog-fill" style={{ width:`${d.progresso}%`, background:st.bar, "--w":`${d.progresso}%` }} />
                           </div>
                           <div style={{fontSize:11,color:C.slate400,marginTop:6,fontFamily:"DM Mono"}}>
                              Previsão (ETA): <strong style={{color:C.navy}}>{d.etaHora}</strong>
                           </div>
                        </div>

                        <div style={{display:"flex",gap:8}}>
                           {d.status !== "entregue" && d.status !== "devolvido" && (
                             <button className="btn-action outline" onClick={() => setModal(d)}>
                               <i className="ti ti-edit" /> Atualizar
                             </button>
                           )}
                           <button className="btn-action primary">
                             Detalhes <i className="ti ti-arrow-right" />
                           </button>
                        </div>
                     </div>

                   </div>
                 </div>
               );
            })}
          </div>

        </div>
      </div>

      {/* Rende o Modal se existir */}
      {modal && (
        <UpdateModal delivery={modal} onConfirm={(newSt, note) => handleUpdateStatus(modal, newSt, note)} onClose={() => setModal(null)} />
      )}
    </>
  );
}