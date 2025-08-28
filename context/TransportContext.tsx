// context/TransportContext.tsx

import React, { createContext, useContext, ReactNode, useCallback, useMemo, useState, useEffect } from 'react';
import { Client, LorryReceipt, Invoice, Payment, InvoiceStatus, Supplier, TripNote, SupplierPayment, LorryReceiptPayment } from '../types';

const API_BASE_URL = 'http://localhost:5001/api';

interface TransportContextType {
  clients: Client[];
  lorryReceipts: LorryReceipt[];
  invoices: Invoice[];
  payments: Payment[];
  suppliers: Supplier[];
  tripNotes: TripNote[];
  supplierPayments: SupplierPayment[];
  lorryReceiptPayments: LorryReceiptPayment[];
  addClient: (client: Omit<Client, 'id'>) => Promise<void>;
  updateClient: (client: Client) => Promise<void>;
  deleteClient: (clientId: string) => Promise<void>;
  addLorryReceipt: (lr: Omit<LorryReceipt, 'id'>) => Promise<LorryReceipt>;
  updateLorryReceipt: (lr: LorryReceipt) => Promise<void>;
  addInvoice: (invoiceData: Omit<Invoice, 'id' | 'status' | 'amountPaid'>) => Promise<void>;
  updateInvoice: (invoice: Invoice) => Promise<void>;
  addPayment: (payment: Omit<Payment, 'id'>) => Promise<void>;
  addLorryReceiptPayment: (payment: Omit<LorryReceiptPayment, 'id'>) => Promise<void>;
  getClientById: (id: string) => Client | undefined;
  addSupplier: (supplier: Omit<Supplier, 'id'>) => Promise<void>;
  updateSupplier: (supplier: Supplier) => Promise<void>;
  addTripNote: (tripNote: Omit<TripNote, 'id'>) => Promise<TripNote>;
  updateTripNote: (tripNote: TripNote) => Promise<void>;
  addSupplierPayment: (payment: Omit<SupplierPayment, 'id'>) => Promise<void>;
  // These are not implemented in the backend yet but are kept for type consistency
  updateSupplierPayment: (payment: SupplierPayment) => void;
  deleteSupplierPayment: (paymentId: string) => void;
  getSupplierById: (id: string) => Supplier | undefined;
}

const TransportContext = createContext<TransportContextType | undefined>(undefined);

export const TransportProvider = ({ children }: { children: ReactNode }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [lorryReceipts, setLorryReceipts] = useState<LorryReceipt[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [lorryReceiptPayments, setLorryReceiptPayments] = useState<LorryReceiptPayment[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [tripNotes, setTripNotes] = useState<TripNote[]>([]);
  const [supplierPayments, setSupplierPayments] = useState<SupplierPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [clientsRes, lrsRes, invoicesRes, paymentsRes, lrPaymentsRes, suppliersRes, tripNotesRes, supplierPaymentsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/clients`), fetch(`${API_BASE_URL}/lorryReceipts`),
        fetch(`${API_BASE_URL}/invoices`), fetch(`${API_BASE_URL}/payments`),
        fetch(`${API_BASE_URL}/lorryReceiptPayments`), fetch(`${API_BASE_URL}/suppliers`),
        fetch(`${API_BASE_URL}/tripNotes`), fetch(`${API_BASE_URL}/supplierPayments`),
      ]);
      setClients(await clientsRes.json());
      setLorryReceipts(await lrsRes.json());
      setInvoices(await invoicesRes.json());
      setPayments(await paymentsRes.json());
      setLorryReceiptPayments(await lrPaymentsRes.json());
      setSuppliers(await suppliersRes.json());
      setTripNotes(await tripNotesRes.json());
      setSupplierPayments(await supplierPaymentsRes.json());
    } catch (error) {
      console.error("Failed to fetch initial data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const makeApiCall = async (endpoint: string, method: string, body?: any) => {
    const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) throw new Error(`API call failed: ${method} ${endpoint}`);
    return response.json();
  };

  const addClient = useCallback(async (client: Omit<Client, 'id'>) => {
    const newClient = { ...client, id: `cli-${Date.now()}` };
    const savedClient = await makeApiCall('clients', 'POST', newClient);
    setClients(prev => [...prev, savedClient]);
  }, []);

  const updateClient = useCallback(async (updatedClient: Client) => {
    await makeApiCall(`clients/${updatedClient.id}`, 'PUT', updatedClient);
    setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
  }, []);

  const deleteClient = useCallback(async (clientId: string) => {
    await makeApiCall(`clients/${clientId}`, 'DELETE');
    setClients(prev => prev.filter(c => c.id !== clientId));
  }, []);

  const addLorryReceipt = useCallback(async (lr: Omit<LorryReceipt, 'id'>): Promise<LorryReceipt> => {
    const newLr = { ...lr, id: `lr-${Date.now()}`, amountPaid: 0 };
    const savedLr = await makeApiCall('lorryReceipts', 'POST', newLr);
    setLorryReceipts(prev => [...prev, savedLr]);
    return savedLr;
  }, []);
  
  const updateLorryReceipt = useCallback(async (updatedLr: LorryReceipt) => {
    await makeApiCall(`lorryReceipts/${updatedLr.id}`, 'PUT', updatedLr);
    setLorryReceipts(prev => prev.map(lr => lr.id === updatedLr.id ? updatedLr : lr));
  }, []);

  const addInvoice = useCallback(async (invoiceData: Omit<Invoice, 'id' | 'status' | 'amountPaid'>) => {
    const newInvoice: Invoice = {
      ...invoiceData, id: `inv-${Date.now()}`,
      status: InvoiceStatus.Unpaid, amountPaid: 0,
    };
    const savedInvoice = await makeApiCall('invoices', 'POST', newInvoice);
    setInvoices(prev => [...prev, savedInvoice]);
    // Also update the LRs
    for (const lrId of newInvoice.lrIds) {
      const lrToUpdate = lorryReceipts.find(lr => lr.id === lrId);
      if (lrToUpdate) {
        await updateLorryReceipt({ ...lrToUpdate, invoiceId: newInvoice.id });
      }
    }
  }, [lorryReceipts, updateLorryReceipt]);

  const updateInvoice = useCallback(async (updatedInvoice: Invoice) => {
    await makeApiCall(`invoices/${updatedInvoice.id}`, 'PUT', updatedInvoice);
    setInvoices(prev => prev.map(inv => inv.id === updatedInvoice.id ? updatedInvoice : inv));
    if (updatedInvoice.status === InvoiceStatus.Cancelled) {
      for (const lrId of updatedInvoice.lrIds) {
        const lrToUpdate = lorryReceipts.find(lr => lr.id === lrId);
        if (lrToUpdate) {
          await updateLorryReceipt({ ...lrToUpdate, invoiceId: null });
        }
      }
    }
  }, [lorryReceipts, updateLorryReceipt]);
  
  const addPayment = useCallback(async (payment: Omit<Payment, 'id'>) => {
    const newPayment = { ...payment, id: `pay-${Date.now()}` };
    const savedPayment = await makeApiCall('payments', 'POST', newPayment);
    setPayments(prev => [...prev, savedPayment]);
    const invoiceToUpdate = invoices.find(inv => inv.id === payment.invoiceId);
    if (invoiceToUpdate) {
      const newAmountPaid = invoiceToUpdate.amountPaid + payment.amount;
      const newStatus = newAmountPaid >= invoiceToUpdate.totalAmount ? InvoiceStatus.Paid : InvoiceStatus.PartiallyPaid;
      await updateInvoice({ ...invoiceToUpdate, amountPaid: newAmountPaid, status: newStatus });
    }
  }, [invoices, updateInvoice]);

  const addLorryReceiptPayment = useCallback(async (payment: Omit<LorryReceiptPayment, 'id'>) => {
    const newPayment = { ...payment, id: `lrpay-${Date.now()}` };
    const savedPayment = await makeApiCall('lorryReceiptPayments', 'POST', newPayment);
    setLorryReceiptPayments(prev => [...prev, savedPayment]);
    const lrToUpdate = lorryReceipts.find(lr => lr.id === payment.lrId);
    if (lrToUpdate) {
        const newAmountPaid = (lrToUpdate.amountPaid || 0) + payment.amount;
        await updateLorryReceipt({ ...lrToUpdate, amountPaid: newAmountPaid });
    }
  }, [lorryReceipts, updateLorryReceipt]);

  const addSupplier = useCallback(async (supplier: Omit<Supplier, 'id'>) => {
    const newSupplier = { ...supplier, id: `sup-${Date.now()}` };
    const savedSupplier = await makeApiCall('suppliers', 'POST', newSupplier);
    setSuppliers(prev => [...prev, savedSupplier]);
  }, []);

  const updateSupplier = useCallback(async (updatedSupplier: Supplier) => {
    await makeApiCall(`suppliers/${updatedSupplier.id}`, 'PUT', updatedSupplier);
    setSuppliers(prev => prev.map(s => s.id === updatedSupplier.id ? updatedSupplier : s));
  }, []);

  const addTripNote = useCallback(async (tripNote: Omit<TripNote, 'id'>): Promise<TripNote> => {
    const newTripNote = { ...tripNote, id: `tn-${Date.now()}` };
    const savedTripNote = await makeApiCall('tripNotes', 'POST', newTripNote);
    setTripNotes(prev => [...prev, savedTripNote]);
    return savedTripNote;
  }, []);

  const updateTripNote = useCallback(async (updatedTripNote: TripNote) => {
    await makeApiCall(`tripNotes/${updatedTripNote.id}`, 'PUT', updatedTripNote);
    setTripNotes(prev => prev.map(tn => tn.id === updatedTripNote.id ? updatedTripNote : tn));
  }, []);
  
  const addSupplierPayment = useCallback(async (payment: Omit<SupplierPayment, 'id'>) => {
    const newPayment = { ...payment, id: `spay-${Date.now()}` };
    const savedPayment = await makeApiCall('supplierPayments', 'POST', newPayment);
    setSupplierPayments(prev => [...prev, savedPayment]);
  }, []);

  // Placeholder functions, not implemented in this refactor for brevity
  const updateSupplierPayment = (payment: SupplierPayment) => console.warn('updateSupplierPayment not implemented');
  const deleteSupplierPayment = (paymentId: string) => console.warn('deleteSupplierPayment not implemented');

  const getClientById = useCallback((id: string) => clients.find(c => c.id === id), [clients]);
  const getSupplierById = useCallback((id: string) => suppliers.find(s => s.id === id), [suppliers]);
  
  const value = useMemo(() => ({
    clients, lorryReceipts, invoices, payments, suppliers, tripNotes, supplierPayments, lorryReceiptPayments,
    addClient, updateClient, deleteClient, addLorryReceipt, addInvoice, addPayment, getClientById, updateLorryReceipt, updateInvoice, addLorryReceiptPayment,
    addSupplier, updateSupplier, addTripNote, updateTripNote, addSupplierPayment, updateSupplierPayment, deleteSupplierPayment, getSupplierById
  }), [
    clients, lorryReceipts, invoices, payments, suppliers, tripNotes, supplierPayments, lorryReceiptPayments,
    addClient, updateClient, deleteClient, addLorryReceipt, addInvoice, addPayment, getClientById, updateLorryReceipt, updateInvoice, addLorryReceiptPayment,
    addSupplier, updateSupplier, addTripNote, updateTripNote, addSupplierPayment, deleteSupplierPayment, getSupplierById
  ]);

  if (isLoading) {
      return <div>Loading your transport data...</div>;
  }

  return (
    <TransportContext.Provider value={value}>
      {children}
    </TransportContext.Provider>
  );
};

export const useTransport = () => {
  const context = useContext(TransportContext);
  if (context === undefined) {
    throw new Error('useTransport must be used within a TransportProvider');
  }
  return context;
};