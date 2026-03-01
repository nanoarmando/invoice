'use client'

import { useState, useEffect, useCallback } from 'react'
import { type Invoice, type LineItem, newLineItem, defaultInvoice } from './types'
import { loadInvoice, saveInvoice, loadSavedInvoice, persistSavedInvoice, clearSavedInvoice } from './store'

// Increments the trailing numeric part of an invoice number.
// e.g. "INV-0001" → "INV-0002", "INV-00100" → "INV-00101", "2025-001" → "2025-002"
function incrementInvoiceNumber(num: string): string {
  const match = num.match(/^(.*?)(\d+)$/)
  if (!match) return num
  const [, prefix, digits] = match
  const next = (parseInt(digits, 10) + 1).toString().padStart(digits.length, '0')
  return prefix + next
}

// Fields carried over from a saved invoice into a new one
const CARRY_OVER_FIELDS: (keyof Invoice)[] = [
  'fromName',
  'fromEmail',
  'fromAddress',
  'fromPhone',
  'toName',
  'toEmail',
  'toAddress',
]

export function useInvoice() {
  const [invoice, setInvoice] = useState<Invoice>(defaultInvoice)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    loadInvoice().then((saved) => {
      if (saved) setInvoice(saved)
      setLoaded(true)
    })
  }, [])

  useEffect(() => {
    if (!loaded) return
    const params = new URLSearchParams(window.location.search)
    if (!params.size) return
    const overrides: Partial<Invoice> = {}
    for (const [key, value] of params.entries()) {
      if (key in defaultInvoice) {
        const field = key as keyof Invoice
        if (field === 'vatRate') {
          overrides.vatRate = parseFloat(value) || 0
        } else if (field !== 'lineItems') {
          (overrides as Record<string, string>)[field] = value
        }
      }
    }
    if (Object.keys(overrides).length > 0) {
      setInvoice((prev) => ({ ...prev, ...overrides }))
    }
  }, [loaded])

  // Auto-save current invoice on every change (debounced)
  useEffect(() => {
    if (!loaded) return
    const timer = setTimeout(() => saveInvoice(invoice), 400)
    return () => clearTimeout(timer)
  }, [invoice, loaded])

  // Sync URL params
  useEffect(() => {
    if (!loaded) return
    const params = new URLSearchParams(window.location.search)
    for (const key of Object.keys(defaultInvoice) as (keyof Invoice)[]) {
      if (key === 'lineItems') continue
      const value = invoice[key]
      const def = defaultInvoice[key]
      if (value !== def && value !== '' && value !== 0) {
        params.set(key, String(value))
      } else {
        params.delete(key)
      }
    }
    const qs = params.size ? `?${params.toString()}` : window.location.pathname
    history.replaceState(null, '', qs)
  }, [invoice, loaded])

  const update = useCallback(<K extends keyof Invoice>(field: K, value: Invoice[K]) => {
    setInvoice((prev) => ({ ...prev, [field]: value }))
  }, [])

  const updateItem = useCallback(
    (id: string, field: keyof LineItem, value: string | number) => {
      setInvoice((prev) => ({
        ...prev,
        lineItems: prev.lineItems.map((item) =>
          item.id === id ? { ...item, [field]: value } : item,
        ),
      }))
    },
    [],
  )

  const addItem = useCallback(() => {
    setInvoice((prev) => ({ ...prev, lineItems: [...prev.lineItems, newLineItem()] }))
  }, [])

  const removeItem = useCallback((id: string) => {
    setInvoice((prev) => ({
      ...prev,
      lineItems: prev.lineItems.filter((item) => item.id !== id),
    }))
  }, [])

  // Save the current invoice as a template and start a fresh one with carry-over fields
  const saveAndNew = useCallback(async () => {
    await persistSavedInvoice(invoice)
    const carried = CARRY_OVER_FIELDS.reduce((acc, field) => {
      (acc as Record<string, unknown>)[field] = invoice[field]
      return acc
    }, {} as Partial<Invoice>)
    const next: Invoice = {
      ...defaultInvoice,
      ...carried,
      invoiceNumber: incrementInvoiceNumber(invoice.invoiceNumber),
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: '',
      lineItems: [newLineItem()],
    }
    setInvoice(next)
  }, [invoice])

  // Load carried-over fields from last saved invoice on mount (if no reset was done)
  // This is handled transparently: on first load with no current-invoice, we fall back to saved
  useEffect(() => {
    if (loaded) return
    loadSavedInvoice().then((saved) => {
      // Only pre-fill if there's no current invoice draft already
      loadInvoice().then((current) => {
        if (!current && saved) {
          const carried = CARRY_OVER_FIELDS.reduce((acc, field) => {
            (acc as Record<string, unknown>)[field] = saved[field]
            return acc
          }, {} as Partial<Invoice>)
          setInvoice({
            ...defaultInvoice,
            ...carried,
            invoiceNumber: incrementInvoiceNumber(saved.invoiceNumber),
            issueDate: new Date().toISOString().split('T')[0],
          })
        }
      })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Reset all fields to default and clear saved template
  const resetInvoice = useCallback(async () => {
    await clearSavedInvoice()
    await saveInvoice(defaultInvoice)
    setInvoice(defaultInvoice)
  }, [])

  return { invoice, loaded, update, updateItem, addItem, removeItem, saveAndNew, resetInvoice }
}
