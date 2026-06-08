import React, { useState, useEffect, useRef } from "react";
// ✅ Importando o motor do banco de dados
import { useDatabase } from "../context/DatabaseContext";

const DEMO = { email: "operador@expressosul.com.br", password: "ExpressoSul@2025" };

// ─── Utilities de Criptografia (Garante o funcionamento sem erro de import) ───
const hashPw = async (pw) => {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(pw + ":es_salt_2025")
  );
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
};

const validateEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

// ─── Styles ───────────────────────────────────────────────────────────────────
const Styles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=DM+Sans:ital,wght@0,400;0,500;1,400&family=DM+Mono:wght@400;500&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    .root {
      font-family: 'DM Sans', sans-serif;
      display: flex; min-height: 100vh;
      background: #F8FAFC;
      color: #0C1F35;
    }

    /* ── LEFT PANEL ── */
    .panel-left {
      width: 440px; flex-shrink: 0;
      background: #0C1F35;
      position: relative; overflow: hidden;
      display: flex; flex-direction: column;
      padding: 40px 40px 36px;
    }

    /* Grid dot texture */
    .panel-left::before {
      content: '';
      position: absolute; inset: 0;
      background-image: radial-gradient(circle, rgba(74,158,255,0.12) 1px, transparent 1px);
      background-size: 26px 26px;
      pointer-events: none;
    }

    /* Glow orbs */
    .orb {
      position: absolute; border-radius: 50%;
      filter: blur(80px); pointer-events: none;
      animation: orb-float 8s ease-in-out infinite;
    }
    .orb-1 { width:260px; height:260px; background:rgba(26,95,171,.22); top:-60px; right:-80px; animation-delay:0s; }
    .orb-2 { width:180px; height:180px; background:rgba(46,125,209,.15); bottom:80px; left:-60px; animation-delay:-4s; }
    .orb-3 { width:120px; height:120px; background:rgba(74,158,255,.1); bottom:200px; right:40px; animation-delay:-2s; }

    /* Route lines decoration */
    .route-svg {
      position: absolute; inset: 0;
      opacity: .06; pointer-events: none;
    }
    .route-path { stroke-dasharray: 800; stroke-dashoffset: 800; animation: draw-route 4s ease-out forwards; }
    .route-path-2 { stroke-dasharray: 600; stroke-dashoffset: 600; animation: draw-route 4s ease-out 1s forwards; }

    @keyframes draw-route {
      to { stroke-dashoffset: 0; }
    }
    @keyframes orb-float {
      0%, 100% { transform: translateY(0) scale(1); }
      50%       { transform: translateY(-20px) scale(1.05); }
    }
    @keyframes blink-dot {
      0%, 100% { opacity: 1; transform: scale(1); }
      50%       { opacity: .3; transform: scale(.7); }
    }
    @keyframes ping {
      0%   { transform: scale(1); opacity: .6; }
      100% { transform: scale(2.4); opacity: 0; }
    }
    @keyframes count-up { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
    @keyframes fade-up  { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
    @keyframes fade-in  { from { opacity:0; } to { opacity:1; } }
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      15%, 45%, 75% { transform: translateX(-7px); }
      30%, 60%, 90% { transform: translateX(7px); }
    }
    @keyframes spin    { to { transform: rotate(360deg); } }
    @keyframes scale-in { from { opacity:0; transform:scale(.92); } to { opacity:1; transform:scale(1); } }
    @keyframes fill-bar { from { width:0; } to { width:100%; } }
    @keyframes success-glow {
      0%, 100% { box-shadow: 0 0 0 0 rgba(21,128,61,.3); }
      50%       { box-shadow: 0 0 0 12px rgba(21,128,61,0); }
    }
    @keyframes slide-down { from { opacity:0; transform:translateY(-8px); max-height:0; } to { opacity:1; transform:translateY(0); max-height:200px; } }

    .anim-fade-up { animation: fade-up .5s ease-out both; }
    .anim-fade-in { animation: fade-in .4s ease-out both; }
    .anim-scale   { animation: scale-in .3s ease-out; }

    /* Stats card */
    .stat-chip {
      background: rgba(255,255,255,.06);
      border: 1px solid rgba(255,255,255,.1);
      border-radius: 10px; padding: 12px 16px;
      display: flex; align-items: center; gap: 10px;
      backdrop-filter: blur(8px);
      transition: background .2s;
      animation: fade-up .5s ease-out both;
    }
    .stat-chip:hover { background: rgba(255,255,255,.1); }

    /* ── RIGHT PANEL ── */
    .panel-right {
      flex: 1; display: flex; flex-direction: column;
      align-items: center; justify-content: space-between;
      padding: 36px 48px;
      min-height: 100vh;
    }

    .form-card {
      width: 100%; max-width: 420px;
      margin: auto;
    }

    /* Input */
    .inp-wrap {
      position: relative;
      animation: fade-up .4s ease-out both;
    }
    .inp-ico {
      position: absolute; left: 13px; top: 50%; transform: translateY(-50%);
      color: #94A3B8; font-size: 16px; pointer-events: none;
      transition: color .15s;
    }
    .inp-field {
      font-family: 'DM Sans'; font-size: 14px; color: #0C1F35;
      background: #F8FAFC;
      border: 1.5px solid #E2E8F0;
      border-radius: 10px; padding: 13px 13px 13px 42px;
      outline: none; width: 100%;
      transition: border-color .15s, box-shadow .15s, background .15s;
    }
    .inp-field::placeholder { color: #94A3B8; }
    .inp-field:hover { border-color: #CBD5E1; background: #fff; }
    .inp-field:focus { border-color: #1A5FAB; background: #fff; box-shadow: 0 0 0 3px rgba(26,95,171,.11); }
    .inp-field.err   { border-color: #B91C1C; background: #FEF2F2; }
    .inp-field.err:focus { box-shadow: 0 0 0 3px rgba(185,28,28,.1); }
    .inp-field.ok    { border-color: #15803D; }
    .inp-field.ok:focus { box-shadow: 0 0 0 3px rgba(21,128,61,.1); }
    .inp-field:focus + .inp-ico, .inp-wrap:focus-within .inp-ico { color: #1A5FAB; }
    .inp-field.err ~ .inp-ico { color: #B91C1C; }

    /* Button */
    .btn-login {
      font-family: 'Outfit'; font-size: 15px; font-weight: 700;
      background: linear-gradient(135deg, #1A5FAB 0%, #2E7DD1 100%);
      color: white; border: none; border-radius: 10px;
      padding: 14px 24px; cursor: pointer; width: 100%;
      display: flex; align-items: center; justify-content: center; gap: 8px;
      transition: all .2s; letter-spacing: -.1px;
      box-shadow: 0 4px 18px rgba(26,95,171,.3);
      animation: fade-up .4s ease-out .3s both;
    }
    .btn-login:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(26,95,171,.38); }
    .btn-login:active:not(:disabled) { transform: scale(.99); }
    .btn-login:disabled { background: #94A3B8; box-shadow: none; cursor: not-allowed; }

    .btn-login-success {
      background: linear-gradient(135deg, #15803D, #16A34A) !important;
      box-shadow: 0 4px 18px rgba(21,128,61,.3) !important;
      animation: success-glow 1.2s ease-in-out infinite !important;
    }

    .shake { animation: shake .4s ease-out; }

    /* Security badge row */
    .sec-badge {
      display: flex; align-items: center; gap: 5px;
      font-size: 11px; font-weight: 500; color: #64748B;
    }
    .sec-badge i { font-size: 13px; }

    /* Demo hint */
    .demo-panel {
      background: #EBF4FF; border: 1px solid #BFDBFE; border-radius: 10px;
      padding: 12px 14px; font-size: 12px; color: #1A5FAB;
      animation: slide-down .3s ease-out;
    }

    /* Checkbox */
    .cb-label {
      display: flex; align-items: center; gap: 7px;
      font-size: 13px; color: #475569; cursor: pointer;
      user-select: none;
    }
    .cb-box {
      width: 16px; height: 16px; border-radius: 4px;
      border: 1.5px solid #CBD5E1; background: #F8FAFC;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; transition: all .15s; cursor: pointer;
    }
    .cb-box.checked { background: #1A5FAB; border-color: #1A5FAB; }

    /* Error alert */
    .err-alert {
      background: #FEF2F2; border: 1px solid #FCA5A5; border-left: 3px solid #B91C1C;
      border-radius: 9px; padding: 11px 14px;
      display: flex; align-items: flex-start; gap: 9px;
      font-size: 13px; color: #7f1d1d;
      animation: slide-down .25s ease-out;
    }

    /* Success screen */
    .success-screen {
      text-align: center;
      animation: scale-in .4s ease-out;
    }
    .success-icon {
      width: 72px; height: 72px; border-radius: 50%;
      background: linear-gradient(135deg, #15803D, #16A34A);
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 20px;
      box-shadow: 0 8px 28px rgba(21,128,61,.3);
      animation: success-glow 1.2s ease-in-out 3;
    }
    .access-bar-bg { height: 3px; background: #E2E8F0; border-radius: 2px; overflow: hidden; margin-top: 16px; }
    .access-bar    { height: 100%; background: linear-gradient(90deg, #15803D, #22C55E); border-radius: 2px; animation: fill-bar 2.5s linear forwards; }

    /* Footer */
    .footer-text {
      font-size: 11px; color: #94A3B8; text-align: center; line-height: 1.6;
      animation: fade-in .6s ease-out .5s both;
    }
    .footer-link {
      color: #64748B; text-decoration: underline; cursor: pointer;
      transition: color .15s;
    }
    .footer-link:hover { color: #1A5FAB; }

    ::-webkit-scrollbar { width: 5px; }
    ::-webkit-scrollbar-track { background: #F1F5F9; }
    ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 3px; }

    @media (max-width: 760px) {
      .root { flex-direction: column; }
      .panel-left { width: 100%; padding: 28px 24px 32px; }
      .panel-right { padding: 28px 24px 20px; }
    }
  `}</style>
);

// ─── Left Panel — Brand + Stats ───────────────────────────────────────────────
const LeftPanel = () => {
  const stats = [
    { icon:"package",      val:"142",   label:"Entregas Monitoradas", delay:"0ms"  },
    { icon:"truck",        val:"28",    label:"Veículos em Rota",     delay:"80ms" },
    { icon:"chart-line",   val:"96.4%", label:"Taxa de Sucesso",      delay:"160ms"},
  ];
  return (
    <div className="panel-left">
      <div className="orb orb-1" /><div className="orb orb-2" /><div className="orb orb-3" />
      <svg className="route-svg" viewBox="0 0 440 800" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path className="route-path"  d="M-20 100 Q 180 200, 220 400 T 460 700" stroke="white" strokeWidth="1.5" fill="none"/>
        <path className="route-path-2" d="M460 50 Q 260 150, 200 350 T -20 650"  stroke="white" strokeWidth="1"   fill="none"/>
        <circle cx="220" cy="400" r="5" fill="rgba(74,158,255,.4)" />
        <circle cx="220" cy="400" r="5" fill="rgba(74,158,255,.3)">
          <animate attributeName="r"       from="5"   to="20"  dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" from=".4"  to="0"   dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx="180" cy="200" r="3.5" fill="rgba(255,255,255,.3)" />
        <circle cx="280" cy="600" r="3"   fill="rgba(74,158,255,.4)" />
      </svg>
      <div style={{position:"relative", zIndex:1, display:"flex", flexDirection:"column", height:"100%"}}>
        <div className="anim-fade-up" style={{display:"flex", alignItems:"center", gap:12, marginBottom:48}}>
          <div style={{width:44, height:44, borderRadius:11, background:"linear-gradient(135deg,#2E7DD1,#1A5FAB)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 16px rgba(74,158,255,.3)"}}>
            <i className="ti ti-truck-delivery" style={{fontSize:22, color:"white"}} />
          </div>
          <div>
            <div style={{fontFamily:"Outfit", fontSize:18, fontWeight:800, color:"white", letterSpacing:-.4, lineHeight:1}}>Expresso Sul</div>
            <div style={{fontSize:11, color:"rgba(255,255,255,.4)", marginTop:2, letterSpacing:".5px"}}>PLATAFORMA LOGÍSTICA</div>
          </div>
        </div>
        <div style={{marginBottom:36}}>
          <div className="anim-fade-up" style={{animationDelay:"60ms"}}>
            <div style={{fontFamily:"Outfit", fontSize:11, fontWeight:600, color:"rgba(74,158,255,.9)", textTransform:"uppercase", letterSpacing:"1.5px", marginBottom:12}}>
              Controle Total da Operação
            </div>
            <h1 style={{fontFamily:"Outfit", fontSize:32, fontWeight:800, color:"white", lineHeight:1.15, letterSpacing:-.6, marginBottom:14}}>
              Visibilidade em<br/>
              <span style={{background:"linear-gradient(90deg,#4A9EFF,#93C5FD)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent"}}>tempo real</span>
            </h1>
            <p style={{fontSize:14, color:"rgba(255,255,255,.5)", lineHeight:1.7, maxWidth:300}}>
              Gerencie rotas, motoristas e entregas em uma única plataforma segura.
            </p>
          </div>
        </div>
        <div className="anim-fade-up" style={{animationDelay:"120ms", display:"flex", alignItems:"center", gap:8, marginBottom:28}}>
          <div style={{position:"relative", width:10, height:10}}>
            <div style={{width:10, height:10, borderRadius:"50%", background:"#22C55E", position:"absolute", animation:"blink-dot 2s ease-in-out infinite"}} />
            <div style={{width:10, height:10, borderRadius:"50%", border:"2px solid #22C55E", position:"absolute", animation:"ping 1.8s ease-out infinite"}} />
          </div>
          <span style={{fontSize:12, color:"rgba(255,255,255,.5)", fontFamily:"DM Mono"}}>Operação ativa · 27 veículos em campo</span>
        </div>
        <div style={{display:"flex", flexDirection:"column", gap:10, marginBottom:40}}>
          {stats.map((s,i) => (
            <div key={s.label} className="stat-chip" style={{animationDelay:s.delay}}>
              <div style={{width:36, height:36, borderRadius:9, background:"rgba(74,158,255,.15)", border:"1px solid rgba(74,158,255,.2)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0}}>
                <i className={`ti ti-${s.icon}`} style={{fontSize:17, color:"#4A9EFF"}} />
              </div>
              <div>
                <div style={{fontFamily:"Outfit", fontSize:18, fontWeight:800, color:"white", lineHeight:1, animation:`count-up .5s ease-out ${s.delay} both`}}>{s.val}</div>
                <div style={{fontSize:11, color:"rgba(255,255,255,.45)", marginTop:1}}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{marginTop:"auto"}}>
          <div style={{height:"1px", background:"rgba(255,255,255,.07)", marginBottom:20}} />
          <div className="anim-fade-up" style={{animationDelay:"300ms", display:"flex", gap:20, flexWrap:"wrap"}}>
            {[
              {icon:"shield-check", label:"TLS 1.3"},
              {icon:"lock",         label:"Criptografado"},
              {icon:"certificate",  label:"LGPD"},
            ].map(b => (
              <div key={b.label} style={{display:"flex", alignItems:"center", gap:5, fontSize:11, color:"rgba(255,255,255,.35)"}}>
                <i className={`ti ti-${b.icon}`} style={{fontSize:13, color:"rgba(74,158,255,.7)"}} />
                {b.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component (Agora integrado com o Banco de Dados) ────────────────────
export default function LoginExpressoSul({ onLoginSuccess }) {
  // ✅ Puxando a conexão do banco de dados real
 const { isReady, executeSql } = useDatabase();

  const [email,      setEmail]      = useState("");
  const [password,   setPassword]   = useState("");
  const [showPass,   setShowPass]   = useState(false);
  const [remember,   setRemember]   = useState(false);
  const [errors,     setErrors]     = useState({});
  const [touched,    setTouched]    = useState({});
  const [authError,  setAuthError]  = useState("");
  const [loading,    setLoading]    = useState(false);
  const [status,     setStatus]     = useState("idle"); // "idle"|"loading"|"success"
  const [showDemo,   setShowDemo]   = useState(false);
  const [attempts,   setAttempts]   = useState(0);
  const [locked,     setLocked]     = useState(false);
  const [lockTimer,  setLockTimer]  = useState(0);
  const [shakeKey,   setShakeKey]   = useState(0);
  const [loggedUser, setLoggedUser] = useState(null); // Armazena quem logou
  const formRef = useRef(null);

  // ✅ INJEÇÃO DO USUÁRIO DEMO NO BANCO DE DADOS
  useEffect(() => {
    // 🛑 BARREIRA: Só roda se o banco estiver 100% carregado e pronto
    if (!isReady || !executeSql) return;

    const seedDemoUser = async () => {
      try {
        // 1. Garante que a tabela existe antes de tentar ler
        await executeSql(`
          CREATE TABLE IF NOT EXISTS Usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome_admin TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            senha_hash TEXT NOT NULL,
            transportadora TEXT NOT NULL,
            cnpj TEXT NOT NULL
          );
        `);

        // 2. Verifica se a tabela está vazia
        const res = await executeSql("SELECT COUNT(*) as c FROM Usuarios");
        const count = res[0]?.c || 0;

        // 3. Se estiver vazia, cria a conta de teste
        if (count === 0) {
          const hashedDemoPass = await hashPw(DEMO.password);
          await executeSql(
            "INSERT INTO Usuarios (nome_admin, email, senha_hash, transportadora, cnpj) VALUES (?, ?, ?, ?, ?)", 
            ["Operador Expresso Sul", DEMO.email, hashedDemoPass, "Expresso Sul", "00.000.000/0001-00"]
          );
          console.log("✅ Usuário DEMO injetado com sucesso no SQLite!");
        }
      } catch (err) {
        console.error("Erro ao configurar tabela de Usuários:", err);
      }
    };

    seedDemoUser();
  }, [isReady, executeSql]); // 🔄 Agora o React espera o banco avisar que está pronto

  // Lock countdown
  useEffect(() => {
    if (locked && lockTimer > 0) {
      const t = setTimeout(() => setLockTimer(s => s-1), 1000);
      return () => clearTimeout(t);
    }
    if (locked && lockTimer === 0) setLocked(false);
  }, [locked, lockTimer]);

  // Redireciona para o App.jsx após a animação de sucesso (2.5 seg)
  useEffect(() => {
    if (status === "success" && loggedUser && onLoginSuccess) {
      const timer = setTimeout(() => {
        onLoginSuccess({ nome: loggedUser.nome_admin || "Operador", email: loggedUser.email });
      }, 2600); // Dá tempo da barra de carregamento encher
      return () => clearTimeout(timer);
    }
  }, [status, loggedUser, onLoginSuccess]);

  const validate = (field, val) => {
    if (field === "email") {
      if (!val.trim())           return "E-mail é obrigatório.";
      if (!validateEmail(val))   return "Informe um e-mail válido.";
    }
    if (field === "password") {
      if (!val)                  return "Senha é obrigatória.";
      if (val.length < 6)       return "A senha deve ter ao menos 6 caracteres.";
    }
    return "";
  };

  const handleBlur = (field, val) => {
    setTouched(p => ({...p,[field]:true}));
    setErrors(p => ({...p,[field]:validate(field,val)}));
  };

  const emailOk = touched.email && !errors.email && email;
  const passOk  = touched.password && !errors.password && password;

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (locked || !isReady) return; // ✅ Impede o login se o banco não estiver pronto  

    // Validação Visual
    const emailErr = validate("email",    email);
    const passErr  = validate("password", password);
    setTouched({ email:true, password:true });
    setErrors({ email:emailErr, password:passErr });
    if (emailErr || passErr) return;

    setLoading(true);
    setAuthError("");
    setStatus("loading");

    try {
      // ✅ Criptografa a senha digitada para comparar com o banco
      const hashedInput = await hashPw(password);
      let users = [];

      // ✅ Busca o usuário no banco de dados SQLite real
      if (executeSql) {
        users = await executeSql("SELECT * FROM Usuarios WHERE email = ? AND senha_hash = ?", [email, hashedInput]);
      } else if (dbRef?.current) {
        users = dbRef.current.selectObjects("SELECT * FROM Usuarios WHERE email = ? AND senha_hash = ?", [email, hashedInput]);
      }

      // Tempo mínimo para a animação do loader rodar (UX)
      await new Promise(r => setTimeout(r, 1200));

      if (users && users.length > 0) {
        setLoggedUser(users[0]); // Armazena quem logou
        setStatus("success");    // Dispara a tela verde e a barra de carregamento
      } else {
        throw new Error("Credenciais inválidas");
      }
    } catch (err) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setLoading(false);
      setStatus("idle");

      if (newAttempts >= 3) {
        setLocked(true);
        setLockTimer(30);
        setAuthError(`Conta temporariamente bloqueada por segurança. Aguarde ${30}s antes de tentar novamente.`);
      } else {
        setAuthError(`Credenciais inválidas. ${3-newAttempts} tentativa${3-newAttempts>1?"s":""} restante${3-newAttempts>1?"s":""} antes do bloqueio temporário.`);
      }
      setShakeKey(k => k+1);
    }
  };

  const fillDemo = () => {
    setEmail(DEMO.email);
    setPassword(DEMO.password);
    setShowDemo(false);
    setTouched({ email:true, password:true });
    setErrors({ email:"", password:"" });
  };

  // ── Success Screen ──────────────────────────────────────────────────────────
  if (status === "success") {
    return (
      <>
        <Styles />
        <div className="root">
          <LeftPanel />
          <div className="panel-right" style={{justifyContent:"center"}}>
            <div className="success-screen" style={{maxWidth:400}}>
              <div className="success-icon">
                <i className="ti ti-shield-check" style={{fontSize:34, color:"white"}} />
              </div>
              <div style={{fontFamily:"Outfit", fontSize:24, fontWeight:800, color:"#0C1F35", marginBottom:8}}>Acesso Autorizado</div>
              <p style={{fontSize:14, color:"#64748B", lineHeight:1.6, marginBottom:6}}>
                Bem-vindo(a) de volta, <strong>{loggedUser?.nome_admin?.split(' ')[0] || "Operador"}</strong>.<br/>
                Redirecionando para o painel operacional...
              </p>
              <div style={{marginTop:20, fontSize:12, color:"#94A3B8", marginBottom:8, textAlign:"left"}}>Carregando módulos do sistema</div>
              <div className="access-bar-bg">
                <div className="access-bar" />
              </div>
              <div style={{marginTop:24, display:"flex", justifyContent:"center", gap:20}}>
                {["Painel","Entregas","Frota","Relatórios"].map((m,i) => (
                  <div key={m} style={{fontSize:11, color:"#94A3B8", display:"flex", alignItems:"center", gap:4, animation:`fade-up .3s ease-out ${i*100}ms both`}}>
                    <i className="ti ti-check" style={{fontSize:11, color:"#15803D"}} />{m}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Login Screen ────────────────────────────────────────────────────────────
  return (
    <>
      <Styles />
      <div className="root">
        <LeftPanel />

        <div className="panel-right">

          {/* Top bar */}
          <div className="anim-fade-in" style={{width:"100%", maxWidth:420, display:"flex", justifyContent:"space-between", alignItems:"center"}}>
            <div style={{display:"flex", alignItems:"center", gap:8}}>
              <div style={{width:6, height:6, borderRadius:"50%", background:"#22C55E", animation:"blink-dot 2s infinite"}} />
              <span style={{fontSize:11, fontFamily:"DM Mono", color:"#64748B"}}>Conexão segura ativa</span>
            </div>
            <div style={{fontSize:11, color:"#94A3B8"}}>v2.1.0</div>
          </div>

          {/* Form card */}
          <div ref={formRef} className={`form-card${shakeKey>0?" shake":""}`} key={shakeKey}>

            {/* Header */}
            <div className="anim-fade-up" style={{marginBottom:28}}>
              <div style={{display:"inline-flex", alignItems:"center", gap:6, background:"#EBF4FF", border:"1px solid #BFDBFE", borderRadius:20, padding:"4px 12px", marginBottom:14}}>
                <i className="ti ti-lock" style={{fontSize:12, color:"#1A5FAB"}} />
                <span style={{fontSize:11, fontWeight:600, color:"#1A5FAB", fontFamily:"Outfit"}}>ÁREA RESTRITA</span>
              </div>
              <h2 style={{fontFamily:"Outfit", fontSize:26, fontWeight:800, color:"#0C1F35", letterSpacing:-.4, marginBottom:6}}>Entre na sua conta</h2>
              <p style={{fontSize:14, color:"#64748B"}}>Acesso exclusivo para operadores autorizados do Expresso Sul.</p>
            </div>

            {/* Auth error */}
            {authError && (
              <div className="err-alert" style={{marginBottom:20}}>
                <i className="ti ti-shield-x" style={{fontSize:18, color:"#B91C1C", flexShrink:0, marginTop:1}} />
                <div>
                  <div style={{fontWeight:600, marginBottom:2}}>Acesso negado</div>
                  <div style={{fontSize:12, opacity:.85}}>{authError}</div>
                  {locked && (
                    <div style={{marginTop:6, display:"flex", alignItems:"center", gap:5, fontSize:12, fontFamily:"DM Mono", color:"#B91C1C"}}>
                      <i className="ti ti-clock" style={{fontSize:12}} />
                      Desbloqueio em {lockTimer}s
                    </div>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate style={{display:"flex", flexDirection:"column", gap:16}}>

              {/* Email */}
              <div>
                <label style={{display:"block", fontSize:12, fontWeight:600, color:"#334155", marginBottom:6}}>
                  E-mail institucional <span style={{color:"#B91C1C"}}>*</span>
                </label>
                <div className="inp-wrap" style={{animationDelay:"80ms"}}>
                  <i className="ti ti-mail inp-ico" />
                  <input
                    type="email" autoComplete="email"
                    className={`inp-field${touched.email&&errors.email?" err":emailOk?" ok":""}`}
                    placeholder="seu@expressosul.com.br"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setAuthError(""); if(touched.email) setErrors(p=>({...p,email:validate("email",e.target.value)})); }}
                    onBlur={() => handleBlur("email", email)}
                    disabled={locked || loading}
                  />
                  {emailOk && <i className="ti ti-check" style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",color:"#15803D",fontSize:16}} />}
                </div>
                {touched.email && errors.email && (
                  <div style={{fontSize:11, color:"#B91C1C", marginTop:4, display:"flex", alignItems:"center", gap:3}}>
                    <i className="ti ti-alert-circle" style={{fontSize:11}} />{errors.email}
                  </div>
                )}
              </div>

              {/* Password */}
              <div>
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6}}>
                  <label style={{fontSize:12, fontWeight:600, color:"#334155"}}>
                    Senha <span style={{color:"#B91C1C"}}>*</span>
                  </label>
                  <button type="button" style={{fontSize:12, color:"#1A5FAB", background:"none", border:"none", cursor:"pointer", fontFamily:"DM Sans"}}>
                    Esqueci minha senha
                  </button>
                </div>
                <div className="inp-wrap" style={{animationDelay:"120ms"}}>
                  <i className="ti ti-lock inp-ico" />
                  <input
                    type={showPass?"text":"password"} autoComplete="current-password"
                    className={`inp-field${touched.password&&errors.password?" err":passOk?" ok":""}`}
                    placeholder="••••••••••"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setAuthError(""); if(touched.password) setErrors(p=>({...p,password:validate("password",e.target.value)})); }}
                    onBlur={() => handleBlur("password", password)}
                    disabled={locked || loading}
                    style={{paddingRight:44}}
                  />
                  <button type="button" onClick={() => setShowPass(s=>!s)}
                    style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"#94A3B8",padding:4,transition:"color .15s"}}
                    onMouseOver={e=>e.currentTarget.style.color="#1A5FAB"}
                    onMouseOut={e=>e.currentTarget.style.color="#94A3B8"}
                    tabIndex={-1}
                    aria-label={showPass?"Ocultar senha":"Mostrar senha"}
                  >
                    <i className={`ti ti-eye${showPass?"-off":""}`} style={{fontSize:17}} />
                  </button>
                </div>
                {touched.password && errors.password && (
                  <div style={{fontSize:11, color:"#B91C1C", marginTop:4, display:"flex", alignItems:"center", gap:3}}>
                    <i className="ti ti-alert-circle" style={{fontSize:11}} />{errors.password}
                  </div>
                )}
              </div>

              {/* Remember me */}
              <div className="anim-fade-up" style={{animationDelay:"160ms", display:"flex", alignItems:"center", justifyContent:"space-between"}}>
                <label className="cb-label" onClick={() => setRemember(s=>!s)}>
                  <div className={`cb-box${remember?" checked":""}`}>
                    {remember && <i className="ti ti-check" style={{fontSize:10, color:"white"}} />}
                  </div>
                  Manter-me conectado
                </label>
                {attempts > 0 && !locked && (
                  <div style={{fontSize:11, color:"#B45309", fontWeight:500}}>
                    <i className="ti ti-alert-triangle" style={{fontSize:11, marginRight:3}} />
                    {attempts}/3 tentativas
                  </div>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                className={`btn-login${status==="success"?" btn-login-success":""}`}
                disabled={locked || status==="loading"}
                style={{marginTop:4}}
              >
                {status === "loading" ? (
                  <>
                    <i className="ti ti-loader-2" style={{fontSize:17, animation:"spin .7s linear infinite"}} />
                    Verificando credenciais...
                  </>
                ) : locked ? (
                  <>
                    <i className="ti ti-lock" style={{fontSize:17}} />
                    Bloqueado por {lockTimer}s
                  </>
                ) : (
                  <>
                    <i className="ti ti-shield-check" style={{fontSize:17}} />
                    Acessar Sistema
                  </>
                )}
              </button>
            </form>

            {/* Demo access */}
            <div style={{marginTop:18}}>
              <div style={{textAlign:"center"}}>
                <button type="button"
                  onClick={() => setShowDemo(s=>!s)}
                  style={{fontSize:12, color:"#64748B", background:"none", border:"none", cursor:"pointer", fontFamily:"DM Sans", display:"inline-flex", alignItems:"center", gap:4, padding:"4px 8px", borderRadius:6, transition:"color .15s"}}
                  onMouseOver={e=>e.currentTarget.style.color="#1A5FAB"}
                  onMouseOut={e=>e.currentTarget.style.color="#64748B"}
                >
                  <i className={`ti ti-key`} style={{fontSize:13}} />
                  {showDemo ? "Ocultar credenciais de demonstração" : "Usar credenciais de demonstração"}
                </button>
              </div>
              {showDemo && (
                <div className="demo-panel" style={{marginTop:10}}>
                  <div style={{fontFamily:"Outfit", fontSize:11, fontWeight:700, color:"#1A5FAB", textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:8, display:"flex", alignItems:"center", gap:5}}>
                    <i className="ti ti-info-circle" style={{fontSize:13}} />Conta de Demonstração
                  </div>
                  <div style={{display:"grid", gridTemplateColumns:"60px 1fr", gap:"4px 8px", fontFamily:"DM Mono", fontSize:12}}>
                    <span style={{color:"#64748B"}}>E-mail</span>
                    <span style={{color:"#0C1F35"}}>{DEMO.email}</span>
                    <span style={{color:"#64748B"}}>Senha</span>
                    <span style={{color:"#0C1F35"}}>{DEMO.password}</span>
                  </div>
                  <button type="button" onClick={fillDemo}
                    style={{marginTop:10, width:"100%", padding:"7px 0", background:"#1A5FAB", color:"white", border:"none", borderRadius:7, cursor:"pointer", fontFamily:"Outfit", fontSize:12, fontWeight:600, display:"flex", alignItems:"center", justifyContent:"center", gap:5, transition:"background .15s"}}
                    onMouseOver={e=>e.currentTarget.style.background="#154d8f"}
                    onMouseOut={e=>e.currentTarget.style.background="#1A5FAB"}
                  >
                    <i className="ti ti-bolt" style={{fontSize:12}} />Preencher automaticamente
                  </button>
                </div>
              )}
            </div>

            {/* Security trust row */}
            <div className="anim-fade-up" style={{animationDelay:"280ms", marginTop:24, paddingTop:20, borderTop:"1px solid #F1F5F9", display:"flex", justifyContent:"center", gap:24, flexWrap:"wrap"}}>
              {[
                {icon:"shield-lock",  label:"Acesso Criptografado"},
                {icon:"eye-off",      label:"Dados Mascarados"},
                {icon:"device-laptop",label:"Sessão Auditada"},
              ].map(b => (
                <div key={b.label} className="sec-badge">
                  <i className={`ti ti-${b.icon}`} style={{color:"#22C55E"}} />{b.label}
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div style={{width:"100%", maxWidth:480}}>
            <div style={{height:"1px", background:"#E2E8F0", marginBottom:16}} />
            <p className="footer-text">
              Ao acessar o sistema, você concorda com a{" "}
              <span className="footer-link">Política de Privacidade</span> e os{" "}
              <span className="footer-link">Termos de Uso</span> do Expresso Sul.
              <br />
              Esta plataforma opera em conformidade com a{" "}
              <strong style={{color:"#64748B"}}>LGPD — Lei 13.709/2018</strong>.
              <br /><br />
              <span style={{color:"#B0BCC8"}}>
                © 2025 Expresso Sul Logística · Todos os acessos são registrados.
              </span>
            </p>
          </div>

        </div>
      </div>
    </>
  );
}