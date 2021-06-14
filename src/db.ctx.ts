import { useEffect, useState } from 'react';
import { createContainer } from 'unstated-next';
import { applyEncryptionMiddleware, ENCRYPT_LIST } from 'dexie-encrypted';
import { MyDatabase } from './db';

const DbCtx = createContainer(() => {
  const [db, setDb] = useState<MyDatabase | null>(null)

  const handleOpenDb = async () => {
    const conn = new MyDatabase();

    // https://tweetnacl.js.org/#/secretbox
    const binary_string = atob(process.env.REACT_APP_DB_KEY!);
    const binLength = binary_string.length;
    const cryptoKey = new Uint8Array(binLength);
    for (let i = 0; i < binLength; i += 1) {
      cryptoKey[i] = binary_string.charCodeAt(i);
    }
  
    applyEncryptionMiddleware(conn, cryptoKey, {
      // companies: NON_INDEXED_FIELDS,
      // users: NON_INDEXED_FIELDS,
      companies: {
        type: ENCRYPT_LIST,
        fields: ['name'],
      },
      users: {
        type: ENCRYPT_LIST,
        fields: ['name', 'email'],
      }
    }, (async (key) => console.log(`DB_KEY has been changed with ${key}`)))

    await conn.open()
    setDb(conn)
  }

  useEffect(() => {
    handleOpenDb()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // avoid ts async
  return { db: db as MyDatabase };
})

export default DbCtx;
