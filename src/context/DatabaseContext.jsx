import React, { createContext, useContext, useEffect, useState, useRef } from 'react';

const DatabaseContext = createContext();

export const DatabaseProvider = ({ children }) => {
  const [isReady, setIsReady] = useState(false);
  const workerRef = useRef(null);
  const resolvesRef = useRef({});

  useEffect(() => {
    // ⚠️ ATENÇÃO: Ajuste o caminho '../databaseWorker.js' se o seu worker estiver em outra pasta!
    const worker = new Worker(new URL('../databaseWorker.js', import.meta.url), { type: 'module' });
    workerRef.current = worker;

    worker.onmessage = (e) => {
      const { type, id, result, error } = e.data;

      if (type === 'ready') {
        setIsReady(true);
        return;
      }

      if (resolvesRef.current[id]) {
        if (error) {
          resolvesRef.current[id].reject(new Error(error));
        } else {
          resolvesRef.current[id].resolve(result);
        }
        delete resolvesRef.current[id];
      }
    };

    return () => {
      worker.terminate();
    };
  }, []);

  // Essa é a famosa função que o React não estava achando!
  const executeSql = (sql, params = []) => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        return reject(new Error("Worker não está inicializado."));
      }

      const id = Date.now() + Math.random().toString();
      resolvesRef.current[id] = { resolve, reject };

      workerRef.current.postMessage({ id, type: 'QUERY', sql, params });
    });
  };

  return (
    <DatabaseContext.Provider value={{ isReady, executeSql }}>
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabase = () => useContext(DatabaseContext);