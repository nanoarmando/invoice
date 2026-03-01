import type { Invoice } from './types'

const DB_NAME = 'invoi-db'
const STORE_NAME = 'data'
const INVOICE_KEY = 'current-invoice'
const SAVED_KEY = 'saved-invoice'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function getKey(key: string): Promise<Invoice | null> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const req = tx.objectStore(STORE_NAME).get(key)
      req.onsuccess = () => resolve(req.result ?? null)
      req.onerror = () => reject(req.error)
    })
  } catch {
    return null
  }
}

async function putKey(key: string, invoice: Invoice): Promise<void> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).put(invoice, key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // silently fail — not critical
  }
}

async function deleteKey(key: string): Promise<void> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).delete(key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // silently fail
  }
}

export const loadInvoice = () => getKey(INVOICE_KEY)
export const saveInvoice = (invoice: Invoice) => putKey(INVOICE_KEY, invoice)
export const loadSavedInvoice = () => getKey(SAVED_KEY)
export const persistSavedInvoice = (invoice: Invoice) => putKey(SAVED_KEY, invoice)
export const clearSavedInvoice = () => deleteKey(SAVED_KEY)
