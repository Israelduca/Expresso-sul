import initSqlJs from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';

let db;
const DB_NAME = 'ExpressoSulDB';
const STORE_NAME = 'banco_store';
const KEY_NAME = 'sqlite_file';

// 1. Abre o IndexedDB nativo do navegador (funciona 100% dentro do Worker)
const openIndexedDB = () => {
  return new Promise((resolve, reject) => {
    const request = self.indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const database = e.target.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
};

// 2. Carrega o arquivo binário do IndexedDB nativo
const loadFromIndexedDB = async () => {
  try {
    const idb = await openIndexedDB();
    const tx = idb.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(KEY_NAME);
    
    return new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.error("❌ Erro ao ler o armazenamento nativo:", request.error);
        resolve(null);
      };
    });
  } catch (err) {
    console.error("❌ Erro ao acessar IndexedDB no carregamento:", err);
    return null;
  }
};

// 3. Salva o banco atual inteiro no IndexedDB nativo
const saveDb = async () => {
  if (!db) return;
  try {
    const data = db.export(); // Transforma o SQLite em um Uint8Array
    console.log(`💾 [IndexedDB] Exportando banco... Tamanho: ${data.length} bytes`);
    
    const idb = await openIndexedDB();
    const tx = idb.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(data, KEY_NAME);

    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    
    console.log("✅ [IndexedDB] Banco gravado e sincronizado no navegador com sucesso!");
  } catch (err) {
    console.error("❌ [IndexedDB] Erro crítico ao salvar dados:", err);
  }
};

const startDb = async () => {
  try {
    console.log("🛠️ Iniciando motor sql.js + IndexedDB Nativo...");

    const init = initSqlJs.default || initSqlJs;
    const SQL = await init({
      locateFile: () => wasmUrl 
    });

    // Tenta buscar o backup nativo
    const savedDb = await loadFromIndexedDB();

    if (savedDb) {
      db = new SQL.Database(new Uint8Array(savedDb));
      console.log(`📂 [IndexedDB] BANCO RECUPERADO! Restaurados ${savedDb.byteLength || savedDb.length} bytes.`);
    } else {
      db = new SQL.Database();
      console.log("🆕 [IndexedDB] Nenhum backup encontrado. Criando banco do zero na memória...");
    }

    self.postMessage({ type: 'ready' });
  } catch (err) {
    console.error("❌ Erro fatal ao iniciar o banco:", err);
  }
};

self.onmessage = async (e) => {
  const { id, type, sql, params } = e.data;
  
  try {
    if (!db) throw new Error("O banco ainda está inicializando.");

    let result;
    const upperSql = sql.trim().toUpperCase();
    
    // Descobre se o comando altera dados (Não começa com SELECT)
    const isModification = !upperSql.startsWith('SELECT') && !upperSql.startsWith('PRAGMA');

    if (!isModification) {
      // Apenas Leitura (SELECT)
      const stmt = db.prepare(sql);
      stmt.bind(params || []);
      const rows = [];
      while(stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      stmt.free();
      result = rows;
    } else {
      // Alteração (CREATE TABLE, INSERT, UPDATE, DELETE...)
      db.run(sql, params || []);
      result = { success: true };
      
      // Salva imediatamente usando a API nativa
      await saveDb();
    }
    
    self.postMessage({ id, result });
  } catch (err) {
    console.error(`❌ Erro no SQL: ${sql}`, err);
    self.postMessage({ id, error: err.message });
  }
};

startDb();