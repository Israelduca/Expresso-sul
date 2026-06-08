import { useState, useEffect, useRef, useCallback } from "react";
import { useDatabase } from "../context/DatabaseContext"; // IMPORTANTE: Ajuste o caminho se necessário!

// ─── Design Tokens ────────────────────────────────────────────────────────────
const T = {
  navy:        "#0C1F35",
  blue700:     "#1A5FAB",
  blue600:     "#2167B8",
  blue500:     "#2E7DD1",
  blueAccent:  "#4A9EFF",
  blueSubtle:  "#EBF4FF",
  blueBorder:  "#BFDBFE",
  slate800:    "#1E293B",
  slate700:    "#334155",
  slate600:    "#475569",
  slate500:    "#64748B",
  slate400:    "#94A3B8",
  slate300:    "#CBD5E1",
  slate200:    "#E2E8F0",
  slate100:    "#F1F5F9",
  slate50:     "#F8FAFC",
  white:       "#FFFFFF",
  success:     "#15803D",
  successBg:   "#F0FDF4",
  successBd:   "#86EFAC",
  warning:     "#B45309",
  warningBg:   "#FFFBEB",
  danger:      "#B91C1C",
  dangerBg:    "#FEF2F2",
  dangerBd:    "#FCA5A5",
};

// ─── Font Loader ──────────────────────────────────────────────────────────────
const FontLoader = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=DM+Sans:ital,wght@0,400;0,500;1,400&display=swap');
    
    /* ✨ REAL RESET: Força o navegador a zerar tudo quando esta tela abrir */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    
    .es-root * { box-sizing: border-box; }
    .es-root { font-family: 'DM Sans', sans-serif; }
    .es-head { font-family: 'Outfit', sans-serif; }
    .es-input-field {
      font-family: 'DM Sans', sans-serif; font-size: 14px; color: ${T.navy};
      background: ${T.white}; border: 1.5px solid ${T.slate300};
      border-radius: 8px; padding: 9px 12px; outline: none; width: 100%;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .es-input-field::placeholder { color: ${T.slate400}; }
    .es-input-field:hover:not(:disabled) { border-color: ${T.slate500}; }
    .es-input-field:focus { border-color: ${T.blue700}; box-shadow: 0 0 0 3px rgba(26,95,171,0.12); }
    .es-input-field.has-error { border-color: ${T.danger}; }
    .es-input-field.has-error:focus { box-shadow: 0 0 0 3px rgba(185,28,28,0.1); }
    .es-input-field:disabled { background: ${T.slate100}; color: ${T.slate500}; cursor: not-allowed; }
    .es-input-with-icon { padding-left: 38px; }
    .es-btn-primary {
      font-family: 'DM Sans', sans-serif; font-weight: 500; font-size: 14px;
      background: ${T.blue700}; color: white; border: none;
      border-radius: 8px; padding: 9px 18px; cursor: pointer;
      display: inline-flex; align-items: center; gap: 6px;
      transition: background 0.15s, transform 0.1s; white-space: nowrap;
    }
    .es-btn-primary:hover { background: #154d8f; }
    .es-btn-primary:active { transform: scale(0.98); }
    .es-btn-primary:disabled { background: ${T.slate300}; cursor: not-allowed; }
    .es-btn-secondary {
      font-family: 'DM Sans', sans-serif; font-weight: 500; font-size: 14px;
      background: ${T.blueSubtle}; color: ${T.blue700};
      border: 1px solid ${T.blueBorder}; border-radius: 8px;
      padding: 9px 18px; cursor: pointer;
      display: inline-flex; align-items: center; gap: 6px;
      transition: background 0.15s, transform 0.1s; white-space: nowrap;
    }
    .es-btn-secondary:hover { background: #DBEAFE; }
    .es-btn-secondary:active { transform: scale(0.98); }
    .es-btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }
    .es-btn-ghost {
      font-family: 'DM Sans', sans-serif; font-weight: 500; font-size: 13px;
      background: transparent; color: ${T.slate600};
      border: 1px solid ${T.slate300}; border-radius: 7px;
      padding: 6px 12px; cursor: pointer;
      display: inline-flex; align-items: center; gap: 5px;
      transition: background 0.15s, color 0.15s; white-space: nowrap;
    }
    .es-btn-ghost:hover { background: ${T.slate100}; color: ${T.navy}; }
    .es-btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }
    .es-btn-danger-ghost {
      font-family: 'DM Sans', sans-serif; font-weight: 500; font-size: 13px;
      background: transparent; color: ${T.danger};
      border: 1px solid ${T.dangerBd}; border-radius: 7px;
      padding: 6px 12px; cursor: pointer;
      display: inline-flex; align-items: center; gap: 5px;
      transition: background 0.15s; white-space: nowrap;
    }
    .es-btn-danger-ghost:hover { background: ${T.dangerBg}; }
    .es-btn-danger-ghost:disabled { opacity: 0.5; cursor: not-allowed; }
    .es-table-row { transition: background 0.1s; }
    .es-table-row:hover td { background: ${T.slate50}; }
    .es-table-row.editing-row td { background: #EBF4FF !important; }
    @keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes fadeIn    { from { opacity: 0; } to { opacity: 1; } }
    @keyframes es-spin   { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .toast-enter  { animation: slideDown 0.25s ease-out; }
    .modal-enter  { animation: fadeIn 0.2s ease-out; }
    .section-card { background: ${T.white}; border: 1px solid ${T.slate300}; border-radius: 12px; overflow: hidden; }
    .form-row   { display: grid; gap: 16px; }
    .form-row-2 { grid-template-columns: 1fr 1fr; }
    .form-row-3 { grid-template-columns: 1fr 1fr 1fr; }
    @media (max-width: 680px) { .form-row-2, .form-row-3 { grid-template-columns: 1fr; } }
    .required-star { color: ${T.danger}; margin-left: 3px; }
    .es-badge {
      display: inline-flex; align-items: center; gap: 4px;
      font-family: 'Outfit', sans-serif; font-size: 11px; font-weight: 600;
      padding: 3px 10px; border-radius: 20px; letter-spacing: 0.3px; white-space: nowrap;
    }
    .es-badge::before { content: ''; width: 5px; height: 5px; border-radius: 50%; background: currentColor; opacity: 0.7; }
    .badge-active { background: ${T.successBg}; color: ${T.success}; }
    .badge-cnpj   { background: ${T.blueSubtle}; color: ${T.blue700}; }
    .badge-cpf    { background: #F5F3FF; color: #6D28D9; }
    .empty-state  { text-align: center; padding: 48px 24px; }
    ::-webkit-scrollbar       { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: ${T.slate100}; }
    ::-webkit-scrollbar-thumb { background: ${T.slate300}; border-radius: 3px; }
  `}</style>
);

// ─── Helpers ────────────────────────────────────────────────────
const isCNPJ = (v) => v.replace(/\D/g, "").length > 11;

function formatDoc(raw) {
  const d = raw.replace(/\D/g, "").slice(0, 14);
  if (d.length <= 11) {
    return d
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return d
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

function formatPhone(raw) {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10)
    return d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "");
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "");
}

const EMPTY_FORM = { nome: "", doc: "", endereco: "", telefone: "", email: "" };

function validate(f) {
  const e = {};
  if (!f.nome.trim())            e.nome     = "Nome é obrigatório.";
  if (!f.doc.replace(/\D/g,""))  e.doc      = "CNPJ/CPF é obrigatório.";
  else {
    const len = f.doc.replace(/\D/g,"").length;
    if (len !== 11 && len !== 14) e.doc = "Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.";
  }
  if (!f.endereco.trim())            e.endereco = "Endereço é obrigatório.";
  if (!f.telefone.replace(/\D/g,"")) e.telefone = "Telefone é obrigatório.";
  if (!f.email.trim())               e.email    = "E-mail é obrigatório.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = "Informe um e-mail válido.";
  return e;
}

// ─── Sub-components ─────────────────────────────────────────────
function InputField({ label, id, required, icon, error, hint, ...props }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label htmlFor={id} style={{ fontSize: 12, fontWeight: 500, color: T.slate700, fontFamily: "'DM Sans'" }}>
        {label}{required && <span className="required-star">*</span>}
      </label>
      <div style={{ position: "relative" }}>
        {icon && (
          <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: error ? T.danger : T.slate400, fontSize: 16, lineHeight: 1 }}>
            <i className={`ti ti-${icon}`} aria-hidden="true" />
          </span>
        )}
        <input
          id={id}
          className={`es-input-field${icon ? " es-input-with-icon" : ""}${error ? " has-error" : ""}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
          {...props}
        />
        {!error && props.value && (
          <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: T.success, fontSize: 14 }}>
            <i className="ti ti-check" aria-hidden="true" />
          </span>
        )}
      </div>
      {error && (
        <span id={`${id}-err`} style={{ fontSize: 11, color: T.danger, display: "flex", alignItems: "center", gap: 4 }}>
          <i className="ti ti-alert-circle" style={{ fontSize: 12 }} aria-hidden="true" />{error}
        </span>
      )}
      {hint && !error && (
        <span id={`${id}-hint`} style={{ fontSize: 11, color: T.slate500 }}>{hint}</span>
      )}
    </div>
  );
}

function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  const colors = {
    success: { bg: T.successBg, border: T.successBd, text: T.success, icon: "circle-check" },
    error:   { bg: T.dangerBg,  border: T.dangerBd,  text: T.danger,  icon: "alert-octagon" },
    info:    { bg: T.blueSubtle,border: T.blueBorder, text: T.blue700, icon: "info-circle" },
  }[type] || {};
  return (
    <div className="toast-enter" style={{ position: "fixed", top: 20, right: 20, zIndex: 1000, background: colors.bg, border: `1px solid ${colors.border}`, borderLeft: `3px solid ${colors.text}`, borderRadius: 8, padding: "10px 16px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.1)", minWidth: 280, maxWidth: 380 }}>
      <i className={`ti ti-${colors.icon}`} style={{ fontSize: 18, color: colors.text, flexShrink: 0 }} aria-hidden="true" />
      <span style={{ fontSize: 13, color: colors.text, fontWeight: 500, flex: 1 }}>{message}</span>
      <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: colors.text, padding: 2, opacity: 0.7 }}>
        <i className="ti ti-x" style={{ fontSize: 14 }} aria-hidden="true" />
      </button>
    </div>
  );
}

function DeleteModal({ client, onConfirm, onCancel }) {
  return (
    <div className="modal-enter" style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(12,31,53,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: T.white, borderRadius: 12, padding: "28px 28px 24px", width: "100%", maxWidth: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", gap: 14, marginBottom: 20 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0, background: T.dangerBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="ti ti-trash" style={{ fontSize: 20, color: T.danger }} aria-hidden="true" />
          </div>
          <div>
            <p className="es-head" style={{ fontSize: 16, fontWeight: 700, color: T.navy, marginBottom: 4 }}>Excluir cliente</p>
            <p style={{ fontSize: 13, color: T.slate600, lineHeight: 1.5 }}>
              Tem certeza que deseja excluir <strong>{client.nome}</strong>? Esta ação não pode ser desfeita.
            </p>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button className="es-btn-ghost" onClick={onCancel}>Cancelar</button>
          <button
            style={{ fontFamily: "'DM Sans'", fontWeight: 500, fontSize: 14, background: T.danger, color: "white", border: "none", borderRadius: 8, padding: "9px 18px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, transition: "background 0.15s" }}
            onClick={onConfirm}
            onMouseOver={e => e.currentTarget.style.background = "#991B1B"}
            onMouseOut={e => e.currentTarget.style.background = T.danger}
          >
            <i className="ti ti-trash" style={{ fontSize: 15 }} aria-hidden="true" />Sim, excluir
          </button>
        </div>
      </div>
    </div>
  );
}

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
      title="Banco SQLite via Web Worker ativo e sincronizado no disco">
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ade80", flexShrink: 0 }} />
      Worker: ativo
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CadastroClientes() {
  const { isReady, executeSql } = useDatabase(); // ✅ IMPORTANDO O NOSSO MOTOR NOVO
  
  // ── Estado da UI ──────────────────────────────────────────────────────────
  const [clients,      setClients]      = useState([]);
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [errors,       setErrors]       = useState({});
  const [editingId,    setEditingId]    = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast,        setToast]        = useState(null);
  const [search,       setSearch]       = useState("");
  const [touched,      setTouched]      = useState({});
  const formRef = useRef(null);

  // ── Carregar Dados do Banco ───────────────────────────────────────────────
  const carregarClientes = useCallback(async () => {
    try {
      const data = await executeSql("SELECT id, nome, doc, endereco, telefone, email, criado_em FROM Clientes ORDER BY id DESC");
      setClients(data || []);
    } catch (err) {
      console.error("Erro ao carregar clientes do disco:", err);
    }
  }, [executeSql]);

  // ── Inicialização da Tabela ───────────────────────────────────────────────
  useEffect(() => {
    if (!isReady) return;

    const iniciarTela = async () => {
      try {
        // Garante que a tabela Clientes existe no arquivo físico
        await executeSql(`
          CREATE TABLE IF NOT EXISTS Clientes (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            nome      TEXT    NOT NULL,
            doc       TEXT    NOT NULL UNIQUE,
            endereco  TEXT    NOT NULL,
            telefone  TEXT    NOT NULL,
            email     TEXT    NOT NULL,
            criado_em DATETIME DEFAULT (datetime('now','localtime'))
          );
        `);
        await executeSql(`CREATE INDEX IF NOT EXISTS idx_clientes_doc ON Clientes(doc);`);
        
        // Carrega a lista real
        await carregarClientes();
      } catch (err) {
        console.error("Erro ao preparar tabela de Clientes", err);
      }
    };

    iniciarTela();
  }, [isReady, carregarClientes, executeSql]);

  // ── Utilitários ───────────────────────────────────────────────────────────
  const showToast = (message, type = "success") => setToast({ message, type });

  // ── Handlers de formulário ────────────────────────────────────────────────
  const handleChange = (field, rawValue) => {
    let value = rawValue;
    if (field === "doc")      value = formatDoc(rawValue);
    if (field === "telefone") value = formatPhone(rawValue);
    const updated = { ...form, [field]: value };
    setForm(updated);
    if (touched[field]) {
      const errs = validate(updated);
      setErrors(prev => ({ ...prev, [field]: errs[field] }));
    }
  };

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const errs = validate(form);
    setErrors(prev => ({ ...prev, [field]: errs[field] }));
  };

  // ── handleSubmit — CONECTADO AO WORKER ─────────────────────────────────────
  const handleSubmit = async () => {
    const allTouched = { nome: true, doc: true, endereco: true, telefone: true, email: true };
    setTouched(allTouched);
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      showToast("Corrija os campos destacados antes de salvar.", "error");
      return;
    }

    try {
      if (editingId !== null) {
        // UPDATE NO DISCO
        await executeSql(
          "UPDATE Clientes SET nome=?, doc=?, endereco=?, telefone=?, email=? WHERE id=?",
          [form.nome.trim(), form.doc, form.endereco.trim(), form.telefone, form.email.trim(), editingId]
        );
        showToast(`Cliente "${form.nome}" atualizado com sucesso.`);
        setEditingId(null);
      } else {
        // INSERT NO DISCO
        await executeSql(
          "INSERT INTO Clientes (nome, doc, endereco, telefone, email) VALUES (?, ?, ?, ?, ?)",
          [form.nome.trim(), form.doc, form.endereco.trim(), form.telefone, form.email.trim()]
        );
        showToast(`Cliente "${form.nome}" cadastrado com sucesso.`);
      }
      
      await carregarClientes(); // Busca os dados atualizados do disco
      setForm(EMPTY_FORM);
      setErrors({});
      setTouched({});
    } catch (err) {
      console.error("[DB] handleSubmit:", err);
      if (err.message?.toLowerCase().includes("unique constraint")) {
        setErrors(prev => ({ ...prev, doc: "Documento já cadastrado para outro cliente." }));
        showToast(`Já existe um cliente com o documento "${form.doc}".`, "error");
      } else {
        showToast(`Erro ao salvar: ${err.message}`, "error");
      }
    }
  };

  const handleEdit = (client) => {
    setForm({ nome: client.nome, doc: client.doc, endereco: client.endereco, telefone: client.telefone, email: client.email });
    setEditingId(client.id);
    setErrors({});
    setTouched({});
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    showToast(`Editando: ${client.nome}`, "info");
  };

  const handleCancelEdit = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setErrors({});
    setTouched({});
  };

  // ── handleDeleteConfirm — CONECTADO AO WORKER ──────────────────────────────
  const handleDeleteConfirm = async () => {
    const name = deleteTarget.nome;
    try {
      await executeSql("DELETE FROM Clientes WHERE id=?", [deleteTarget.id]); // DELETE NO DISCO
      
      if (editingId === deleteTarget.id) { setEditingId(null); setForm(EMPTY_FORM); }
      setDeleteTarget(null);
      await carregarClientes(); // Atualiza a lista na tela
      showToast(`Cliente "${name}" excluído.`, "info");
    } catch (err) {
      console.error("[DB] handleDeleteConfirm:", err);
      showToast(`Erro ao excluir "${name}": ${err.message}`, "error");
      setDeleteTarget(null);
    }
  };

  const filtered = clients.filter(c =>
    c.nome.toLowerCase().includes(search.toLowerCase()) ||
    c.doc.includes(search) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  const isEditing = editingId !== null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <FontLoader />
      <div className="es-root" style={{ background: T.slate50, minHeight: "100%", display: "flex", flexDirection: "column", padding: "0 0 48px", overflow: "hidden" }}>

        {/* ── Top Bar ── */}
        <div style={{ background: T.navy, padding: "0 28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 0", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ width: 36, height: 36, background: T.blue500, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <i className="ti ti-truck-delivery" style={{ fontSize: 18, color: "white" }} aria-hidden="true" />
            </div>
            <div>
              <span className="es-head" style={{ fontSize: 16, fontWeight: 700, color: "white", letterSpacing: -0.3 }}>Expresso Sul</span>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginLeft: 10 }}>Plataforma Logística</span>
            </div>

            {/* Badge de status do banco usando nosso hook */}
            <DbStatusBadge isReady={isReady} />

            <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
              <div style={{ width: 32, height: 32, background: "rgba(255,255,255,0.08)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className="ti ti-bell" style={{ fontSize: 15, color: "rgba(255,255,255,0.6)" }} aria-hidden="true" />
              </div>
              <div style={{ width: 32, height: 32, background: T.blue500, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "white" }}>AU</span>
              </div>
            </div>
          </div>

          {/* Breadcrumb */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 0", fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
            <i className="ti ti-home" style={{ fontSize: 13 }} aria-hidden="true" />
            <i className="ti ti-chevron-right" style={{ fontSize: 12 }} aria-hidden="true" />
            <span style={{ color: "rgba(255,255,255,0.5)" }}>Cadastros</span>
            <i className="ti ti-chevron-right" style={{ fontSize: 12 }} aria-hidden="true" />
            <span style={{ color: T.blueAccent, fontWeight: 500 }}>Clientes</span>
          </div>
        </div>

        <div style={{ padding: "28px 28px 0", maxWidth: 960, margin: "0 auto" }}>
          {/* ── Page Header ── */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 className="es-head" style={{ fontSize: 24, fontWeight: 700, color: T.navy, letterSpacing: -0.4, marginBottom: 4 }}>Cadastro de Clientes</h1>
              <p style={{ fontSize: 13, color: T.slate500 }}>
                Gerencie os clientes cadastrados na plataforma.
                <span style={{ marginLeft: 10, background: T.blueSubtle, color: T.blue700, fontSize: 11, fontWeight: 600, padding: "2px 10px", borderRadius: 20, fontFamily: "'Outfit'" }}>
                  {clients.length} {clients.length === 1 ? "cliente" : "clientes"}
                </span>
              </p>
            </div>
          </div>

          {/* ── Form Card ── */}
          <div ref={formRef} className="section-card" style={{ marginBottom: 24, border: isEditing ? `1.5px solid ${T.blueBorder}` : `1px solid ${T.slate300}` }}>
            {/* Form Header */}
            <div style={{ padding: "14px 22px", borderBottom: `1px solid ${isEditing ? T.blueBorder : T.slate200}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: isEditing ? T.blueSubtle : T.white }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: isEditing ? T.blue700 : T.navy, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <i className={`ti ti-${isEditing ? "pencil" : "user-plus"}`} style={{ fontSize: 15, color: "white" }} aria-hidden="true" />
                </div>
                <div>
                  <p className="es-head" style={{ fontSize: 14, fontWeight: 700, color: T.navy, lineHeight: 1 }}>
                    {isEditing ? "Editando Cliente" : "Novo Cliente"}
                  </p>
                  <p style={{ fontSize: 11, color: isEditing ? T.blue700 : T.slate500, marginTop: 2 }}>
                    {isEditing ? `Alterando: ${form.nome || "—"}` : "Preencha os dados para cadastrar"}
                  </p>
                </div>
              </div>
              {isEditing && (
                <button className="es-btn-ghost" onClick={handleCancelEdit} style={{ fontSize: 12 }}>
                  <i className="ti ti-x" style={{ fontSize: 13 }} aria-hidden="true" />Cancelar edição
                </button>
              )}
            </div>

            {/* Form Body */}
            <div style={{ padding: "22px 22px 20px" }}>
              <div className="form-row form-row-2" style={{ marginBottom: 16 }}>
                <InputField label="Nome da Empresa / Cliente" id="nome" required icon="building-store" placeholder="Ex.: Comércio Catarinense Ltda." value={form.nome} onChange={e => handleChange("nome", e.target.value)} onBlur={() => handleBlur("nome")} error={errors.nome} disabled={!isReady} />
                <InputField label="CNPJ / CPF" id="doc" required icon="id-badge" placeholder="00.000.000/0001-00 ou 000.000.000-00" value={form.doc} onChange={e => handleChange("doc", e.target.value)} onBlur={() => handleBlur("doc")} error={errors.doc} hint="Informe CPF (pessoa física) ou CNPJ (pessoa jurídica)" disabled={!isReady} />
              </div>
              <div className="form-row" style={{ marginBottom: 16 }}>
                <InputField label="Endereço Completo" id="endereco" required icon="map-pin" placeholder="Rua, número, complemento — Cidade, UF — CEP" value={form.endereco} onChange={e => handleChange("endereco", e.target.value)} onBlur={() => handleBlur("endereco")} error={errors.endereco} disabled={!isReady} />
              </div>
              <div className="form-row form-row-2">
                <InputField label="Telefone de Contato" id="telefone" required icon="phone" placeholder="(00) 00000-0000" value={form.telefone} onChange={e => handleChange("telefone", e.target.value)} onBlur={() => handleBlur("telefone")} error={errors.telefone} disabled={!isReady} />
                <InputField label="E-mail" id="email" required icon="mail" placeholder="contato@empresa.com.br" type="email" value={form.email} onChange={e => handleChange("email", e.target.value)} onBlur={() => handleBlur("email")} error={errors.email} disabled={!isReady} />
              </div>
            </div>

            {/* Form Footer */}
            <div style={{ padding: "14px 22px", borderTop: `1px solid ${T.slate100}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: T.slate50 }}>
              <p style={{ fontSize: 11, color: T.slate500 }}><span className="required-star">*</span> Campos obrigatórios</p>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="es-btn-secondary" onClick={() => { setForm(EMPTY_FORM); setErrors({}); setTouched({}); }} disabled={!isReady}>
                  <i className="ti ti-eraser" style={{ fontSize: 15 }} aria-hidden="true" />Limpar
                </button>
                <button className="es-btn-primary" onClick={handleSubmit} disabled={!isReady}>
                  <i className={`ti ti-${isEditing ? "device-floppy" : "user-check"}`} style={{ fontSize: 15 }} aria-hidden="true" />
                  {!isReady ? "Aguardando banco..." : isEditing ? "Salvar alterações" : "Cadastrar cliente"}
                </button>
              </div>
            </div>
          </div>

          {/* ── Table Card ── */}
          <div className="section-card" style={{ marginBottom: 0 }}>
            {/* Table Header */}
            <div style={{ padding: "14px 20px", borderBottom: `1px solid ${T.slate200}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <i className="ti ti-users" style={{ fontSize: 18, color: T.blue700 }} aria-hidden="true" />
                <span className="es-head" style={{ fontSize: 15, fontWeight: 700, color: T.navy }}>Clientes cadastrados</span>
              </div>
              <div style={{ position: "relative" }}>
                <i className="ti ti-search" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: T.slate400, fontSize: 14 }} aria-hidden="true" />
                <input className="es-input-field" style={{ paddingLeft: 32, width: 240, fontSize: 13, padding: "7px 12px 7px 32px" }} placeholder="Buscar cliente, CNPJ, e-mail..." value={search} onChange={e => setSearch(e.target.value)} aria-label="Buscar clientes" />
              </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 680 }}>
                <thead>
                  <tr>
                    {["Cliente", "CNPJ / CPF", "Endereço", "Contato", "Ações"].map((h, i) => (
                      <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontFamily: "'Outfit'", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.8px", color: T.slate500, background: T.slate50, borderBottom: `1px solid ${T.slate300}`, whiteSpace: "nowrap", ...(i === 4 ? { textAlign: "right" } : {}) }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>

                  {/* Estado: WASM compilando */}
                  {!isReady && (
                    <tr><td colSpan={5}>
                      <div className="empty-state">
                        <span style={{ display: "inline-block", width: 28, height: 28, border: `3px solid ${T.slate200}`, borderTopColor: T.blue700, borderRadius: "50%", animation: "es-spin 0.8s linear infinite", marginBottom: 14 }} />
                        <p className="es-head" style={{ fontSize: 14, fontWeight: 600, color: T.slate500 }}>Sincronizando banco de dados...</p>
                        <p style={{ fontSize: 12, color: T.slate400, marginTop: 4 }}>Conectando com o Web Worker Background.</p>
                      </div>
                    </td></tr>
                  )}

                  {/* Estado: banco pronto, sem resultados */}
                  {isReady && filtered.length === 0 && (
                    <tr><td colSpan={5}>
                      <div className="empty-state">
                        <i className="ti ti-users-group" style={{ fontSize: 40, color: T.slate300, display: "block", marginBottom: 12 }} aria-hidden="true" />
                        <p className="es-head" style={{ fontSize: 15, fontWeight: 600, color: T.slate500, marginBottom: 4 }}>
                          {search ? "Nenhum resultado encontrado" : "Nenhum cliente cadastrado"}
                        </p>
                        <p style={{ fontSize: 13, color: T.slate400 }}>
                          {search ? `Nenhum cliente corresponde a "${search}".` : "Use o formulário acima para adicionar o primeiro cliente."}
                        </p>
                      </div>
                    </td></tr>
                  )}

                  {/* Linhas da tabela */}
                  {filtered.map(client => (
                    <tr key={client.id} className={`es-table-row${editingId === client.id ? " editing-row" : ""}`}>
                      <td style={{ padding: "12px 16px", borderBottom: `1px solid ${T.slate100}` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: editingId === client.id ? T.blue700 : T.navy, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: "white" }}>{client.nome.charAt(0).toUpperCase()}</span>
                          </div>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 500, color: T.navy, lineHeight: 1.3 }}>{client.nome}</p>
                            <span className="es-badge badge-active" style={{ marginTop: 3 }}>Ativo</span>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px", borderBottom: `1px solid ${T.slate100}` }}>
                        <span className={`es-badge ${isCNPJ(client.doc) ? "badge-cnpj" : "badge-cpf"}`}>{isCNPJ(client.doc) ? "CNPJ" : "CPF"}</span>
                        <p style={{ fontSize: 12, color: T.slate700, marginTop: 4, fontFamily: "monospace" }}>{client.doc}</p>
                      </td>
                      <td style={{ padding: "12px 16px", borderBottom: `1px solid ${T.slate100}`, maxWidth: 220 }}>
                        <p style={{ fontSize: 12, color: T.slate600, lineHeight: 1.5, wordBreak: "break-word" }}>{client.endereco}</p>
                      </td>
                      <td style={{ padding: "12px 16px", borderBottom: `1px solid ${T.slate100}` }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                          <span style={{ fontSize: 12, color: T.slate700, display: "flex", alignItems: "center", gap: 5 }}>
                            <i className="ti ti-phone" style={{ fontSize: 12, color: T.slate400 }} aria-hidden="true" />{client.telefone}
                          </span>
                          <span style={{ fontSize: 12, color: T.blue700, display: "flex", alignItems: "center", gap: 5 }}>
                            <i className="ti ti-mail" style={{ fontSize: 12, color: T.slate400 }} aria-hidden="true" />{client.email}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px", borderBottom: `1px solid ${T.slate100}`, textAlign: "right" }}>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                          <button className="es-btn-ghost" onClick={() => handleEdit(client)} disabled={!isReady} title="Editar cliente" style={editingId === client.id ? { background: T.blueSubtle, color: T.blue700, borderColor: T.blueBorder } : {}}>
                            <i className="ti ti-pencil" style={{ fontSize: 13 }} aria-hidden="true" />{editingId === client.id ? "Editando" : "Editar"}
                          </button>
                          <button className="es-btn-danger-ghost" onClick={() => setDeleteTarget(client)} disabled={!isReady} title="Excluir cliente">
                            <i className="ti ti-trash" style={{ fontSize: 13 }} aria-hidden="true" />Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            {filtered.length > 0 && (
              <div style={{ padding: "11px 20px", borderTop: `1px solid ${T.slate100}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: T.slate50 }}>
                <span style={{ fontSize: 12, color: T.slate500 }}>
                  {search ? `${filtered.length} resultado${filtered.length !== 1 ? "s" : ""} para "${search}"` : `${clients.length} cliente${clients.length !== 1 ? "s" : ""} cadastrado${clients.length !== 1 ? "s" : ""}`}
                </span>
                <button className="es-btn-ghost" style={{ fontSize: 12 }}>
                  <i className="ti ti-download" style={{ fontSize: 13 }} aria-hidden="true" />Exportar lista
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modais e Toasts ── */}
      {deleteTarget && <DeleteModal client={deleteTarget} onConfirm={handleDeleteConfirm} onCancel={() => setDeleteTarget(null)} />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}