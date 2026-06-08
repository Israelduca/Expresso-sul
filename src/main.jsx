import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { DatabaseProvider } from './context/DatabaseContext'; // 1. Importa o Provider que criamos

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <DatabaseProvider> {/* 2. Abraça o <App /> com ele */}
      <App />
    </DatabaseProvider> {/* 3. Fecha a tag */}
  </React.StrictMode>,
);