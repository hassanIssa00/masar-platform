'use client';

import { db } from './firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';

export interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  studentId: string;
  studentName: string;
  parentName: string;
  amount: number;
  currency: string;
  status: 'paid' | 'unpaid' | 'overdue';
  description: string;
  dueDate: string;
  createdAt: string;
}

const LOCAL_KEY = 'masar.invoices.v1';

export function getLocalInvoices(): InvoiceRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveLocalInvoices(items: InvoiceRecord[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCAL_KEY, JSON.stringify(items));
}

export async function createInvoice(inv: Omit<InvoiceRecord, 'id' | 'invoiceNumber' | 'createdAt'>) {
  const item: InvoiceRecord = {
    id: `inv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    invoiceNumber: `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    ...inv,
    createdAt: new Date().toISOString(),
  };

  const current = getLocalInvoices();
  const updated = [item, ...current];
  saveLocalInvoices(updated);

  try {
    await addDoc(collection(db, 'invoices'), item);
  } catch (e) {
    console.warn('Firestore invoice save error:', e);
  }
  return item;
}

export async function updateInvoiceStatus(id: string, status: InvoiceRecord['status']) {
  const current = getLocalInvoices();
  const updated = current.map((i) => (i.id === id ? { ...i, status } : i));
  saveLocalInvoices(updated);
}
