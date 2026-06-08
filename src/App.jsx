import React, { useState } from 'react';
import LoginExpressoSul from './screens/LoginExpressoSul'; 
import CadastroClientes from './screens/CadastroClientes'; 
import CadastroPedidos from './screens/CadastroPedidos';   
// ✅ O seu import que acabamos de arrumar
import AcompanhamentoEntregas from './screens/AcompanhamentoEntregas';

const COLORS = {
  navy: "#0C1F35",
  blue700: "#1A5FAB",
  slate100: "#F1F5F9",
  white: "#FFFFFF",
  slate500: "#64748B"
};

export default function App() {
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [telaAtiva, setTelaAtiva] = useState('clientes'); // 'clientes' | 'pedidos' | 'acompanhamento'

  const handleLogout = () => {
    setUsuarioLogado(null);
    setTelaAtiva('clientes'); 
  };

  // 🔒 BARREIRA DE SEGURANÇA
  if (!usuarioLogado) {
    return (
      <LoginExpressoSul
        onLoginSuccess={(usuario) => setUsuarioLogado(usuario)} 
      />
    );
  }

  // 🔓 PAINEL AUTENTICADO
  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'DM Sans', sans-serif" }}>
      
      {/* ── Menu Lateral (Sidebar) ── */}
      <div style={{ width: '240px', background: COLORS.navy, color: 'white', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ padding: '0 12px 20px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '10px' }}>
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '18px', fontWeight: '800' }}>🚚 Expresso Sul</h2>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>Painel Administrativo</span>
        </div>

        <div style={{ padding: '4px 12px 14px', fontSize: '12px', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80' }} />
          <span>Olá, <strong>{usuarioLogado.nome || 'Admin'}</strong></span>
        </div>

        {/* Botão Clientes */}
        <button 
          onClick={() => setTelaAtiva('clientes')}
          style={{
            width: '100%', textAlign: 'left', padding: '12px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '10px',
            background: telaAtiva === 'clientes' ? COLORS.blue700 : 'transparent',
            color: telaAtiva === 'clientes' ? 'white' : 'rgba(255,255,255,0.7)',
            transition: 'all 0.2s'
          }}
        >
          <i className="ti ti-users" style={{ fontSize: '16px' }} />
          Clientes
        </button>

        {/* Botão Pedidos */}
        <button 
          onClick={() => setTelaAtiva('pedidos')}
          style={{
            width: '100%', textAlign: 'left', padding: '12px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '10px',
            background: telaAtiva === 'pedidos' ? COLORS.blue700 : 'transparent',
            color: telaAtiva === 'pedidos' ? 'white' : 'rgba(255,255,255,0.7)',
            transition: 'all 0.2s'
          }}
        >
          <i className="ti ti-file-invoice" style={{ fontSize: '16px' }} />
          Pedidos / Fretes
        </button>

        {/* ✅ NOVO BOTÃO: Entregas Ao Vivo */}
        <button 
          onClick={() => setTelaAtiva('acompanhamento')}
          style={{
            width: '100%', textAlign: 'left', padding: '12px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '10px',
            background: telaAtiva === 'acompanhamento' ? COLORS.blue700 : 'transparent',
            color: telaAtiva === 'acompanhamento' ? 'white' : 'rgba(255,255,255,0.7)',
            transition: 'all 0.2s'
          }}
        >
          <i className="ti ti-route" style={{ fontSize: '16px' }} />
          Entregas Ao Vivo
        </button>

        {/* 🚪 Botão Sair */}
        <button 
          onClick={handleLogout}
          style={{
            width: '100%', textAlign: 'left', padding: '12px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '10px',
            background: 'transparent', color: '#FDA4AF', marginTop: 'auto', transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(225, 29, 72, 0.15)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <i className="ti ti-logout" style={{ fontSize: '16px' }} />
          Desconectar Sistema
        </button>
      </div>

      {/* ── Conteúdo Dinâmico da Tela ── */}
      <div style={{ flex: 1, background: '#F8FAFC', overflowY: 'auto' }}>
        {telaAtiva === 'clientes' && <CadastroClientes />}
        {telaAtiva === 'pedidos' && <CadastroPedidos />}
        {/* ✅ NOVA REGRA: Exibindo o Acompanhamento */}
        {telaAtiva === 'acompanhamento' && <AcompanhamentoEntregas />}
      </div>

    </div>
  );
}