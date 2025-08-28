import React, { useState, useMemo, useEffect, ChangeEvent, useRef } from 'react';
import { useTransport } from '../context/TransportContext';
import { Modal } from '../components/Modal';
import { Invoice, InvoiceStatus, LorryReceipt, Payment, InvoiceLineItem, Client, Address, ManualInvoiceEntry } from '../types';
import { PlusIcon, SearchIcon, TrashIcon, RefreshIcon, FunnelIcon, XIcon, ArrowLeftIcon, FilterIcon, DownloadIcon, PrinterIcon, ChevronDownIcon, BellIcon, PencilIcon, XCircleIcon, DocumentDuplicateIcon, EyeIcon, BookOpenIcon, SortAscIcon, SortDescIcon } from '../components/icons';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useSettings } from '../hooks/useSettings';
import { defaultCompanyInfo } from '../companyInfo';
import jsPDF from 'jspdf';
import { useLocation, useNavigate } from 'react-router-dom';

const SpinnerIcon = ({ className = 'text-white' }: { className?: string }) => (
    <svg className={`animate-spin h-5 w-5 ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const AddPaymentModal = ({ invoice, onClose }: { invoice: Invoice; onClose: () => void; }) => {
    const { addPayment } = useTransport();
    const balanceDue = invoice.totalAmount - invoice.amountPaid;

    const [amount, setAmount] = useState(balanceDue > 0 ? Number(balanceDue.toFixed(2)) : 0);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [method, setMethod] = useState<'Cash' | 'Bank Transfer' | 'Cheque'>('Bank Transfer');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (amount <= 0) {
            alert('Amount must be positive.');
            return;
        }
        if (amount > balanceDue + 0.001) { // Add tolerance for float issues
            alert('Payment amount cannot be greater than the balance due.');
            return;
        }

        addPayment({
            invoiceId: invoice.id,
            date,
            amount,
            method,
        });
        onClose();
    };
    
    const FormField = ({ label, children }: { label: string, children: React.ReactNode }) => (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            {children}
        </div>
    );

    return (
        <Modal isOpen={true} onClose={onClose} title={`Add Payment for ${invoice.invoiceNumber}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="bg-gray-50 p-3 rounded-md">
                    <p className="text-sm text-gray-500">Total Amount: <span className="font-semibold">{invoice.totalAmount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span></p>
                    <p className="text-sm text-gray-500">Balance Due: <span className="font-semibold text-red-600">{balanceDue.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span></p>
                </div>
                <FormField label="Amount">
                    <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} required step="0.01" className="w-full p-2 border border-gray-300 rounded-md shadow-sm" />
                </FormField>
                <FormField label="Date">
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="w-full p-2 border border-gray-300 rounded-md shadow-sm" />
                </FormField>
                <FormField label="Method">
                    <select value={method} onChange={(e) => setMethod(e.target.value as any)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm">
                        <option>Bank Transfer</option><option>Cheque</option><option>Cash</option>
                    </select>
                </FormField>
                <div className="flex justify-end pt-4 mt-4 border-t">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md mr-2">Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-brand-primary text-white rounded-md">Save Payment</button>
                </div>
            </form>
        </Modal>
    );
};

const PaymentHistoryModal = ({ invoice, onClose }: { invoice: Invoice; onClose: () => void; }) => {
    const { payments } = useTransport();
    const paymentsForInvoice = payments
        .filter(p => p.invoiceId === invoice.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <Modal isOpen={true} onClose={onClose} title={`Payment History for ${invoice.invoiceNumber}`}>
            {paymentsForInvoice.length > 0 ? (
                <div className="max-h-80 overflow-y-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-100 sticky top-0">
                            <tr>
                                <th className="p-2 font-medium">Date</th>
                                <th className="p-2 font-medium">Method</th>
                                <th className="p-2 font-medium text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paymentsForInvoice.map(p => (
                                <tr key={p.id} className="border-b">
                                    <td className="p-2">{new Date(p.date).toLocaleDateString('en-GB')}</td>
                                    <td className="p-2">{p.method}</td>
                                    <td className="p-2 text-right font-mono">{p.amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="py-4 text-center text-gray-500">No payments recorded for this invoice yet.</p>
            )}
             <div className="flex justify-end pt-4 mt-4 border-t">
                <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md">Close</button>
            </div>
        </Modal>
    );
};


const getStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
        case InvoiceStatus.Paid:
            return <span className="px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full">{status}</span>;
        case InvoiceStatus.PartiallyPaid:
            return <span className="px-2 py-1 text-xs font-medium text-yellow-800 bg-yellow-100 rounded-full">{status}</span>;
        case InvoiceStatus.Unpaid:
            return <span className="px-2 py-1 text-xs font-medium text-red-800 bg-red-100 rounded-full">{status}</span>;
        case InvoiceStatus.Cancelled:
            return <span className="px-2 py-1 text-xs font-medium text-gray-800 bg-gray-200 rounded-full">{status}</span>;
        default:
            return null;
    }
};

const InvoicePreview = ({ invoice }: { invoice: Invoice }) => {
    const { getClientById, lorryReceipts } = useTransport();
    const [settings] = useSettings();
    const [companyInfo] = useLocalStorage('companyInfo', defaultCompanyInfo);
    const client = invoice.clientId ? getClientById(invoice.clientId) : null;
    
    const associatedLrs = useMemo(() => {
        if (invoice.type === 'LR-based') {
            return lorryReceipts.filter(lr => invoice.lrIds.includes(lr.id));
        }
        return [];
    }, [invoice, lorryReceipts]);
    
    const numberToWords = (num: number): string => {
        const a = ['', 'one ', 'two ', 'three ', 'four ', 'five ', 'six ', 'seven ', 'eight ', 'nine ', 'ten ', 'eleven ', 'twelve ', 'thirteen ', 'fourteen ', 'fifteen ', 'sixteen ', 'seventeen ', 'eighteen ', 'nineteen '];
        const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

        const inWords = (n: number) => {
            let str = '';
            if (n > 99) {
                str += a[Math.floor(n / 100)] + 'hundred ';
                n %= 100;
            }
            if (n > 19) {
                str += b[Math.floor(n / 10)] + ' ' + a[n % 10];
            } else {
                str += a[n];
            }
            return str;
        };
        
        const numStr = num.toString();
        const [integerPart, decimalPart] = numStr.split('.');
        let words = '';
        
        let n = parseInt(integerPart, 10);
        if (isNaN(n) || n === 0) return 'Zero';

        words += n > 9999999 ? inWords(Math.floor(n / 10000000)) + 'crore ' : '';
        n %= 10000000;
        words += n > 99999 ? inWords(Math.floor(n / 100000)) + 'lakh ' : '';
        n %= 100000;
        words += n > 999 ? inWords(Math.floor(n / 1000)) + 'thousand ' : '';
        n %= 1000;
        words += inWords(n);
        
        if (decimalPart) {
            words += ' and ' + parseInt(decimalPart, 10) + '/100';
        }

        return words.replace(/\s+/g, ' ').trim().toUpperCase() + ' ONLY';
    };

    const totalAmountInWords = numberToWords(invoice.totalAmount);


    return (
        <div className="bg-white p-4 text-base font-sans text-gray-800 border">
            {/* Header */}
            <div className="mb-2 pb-2 border-b-2 border-black">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                        <tr>
                            <td style={{ width: '20%', verticalAlign: 'middle', paddingRight: '8px' }}>
                                {settings.logoUrl && <img src={settings.logoUrl} alt="Company Logo" style={{ height: '64px', width: 'auto', objectFit: 'contain' }} />}
                            </td>
                            <td style={{ width: '80%', textAlign: 'center', verticalAlign: 'middle' }}>
                                <h1 style={{ fontSize: '24px', fontWeight: 'bold', fontFamily: 'serif', color: '#A63A3A', textTransform: 'uppercase', margin: 0 }}>
                                    {companyInfo.name}
                                </h1>
                                <p style={{ fontSize: '14px', fontWeight: 600, margin: '2px 0' }}>
                                    {companyInfo.address}
                                </p>
                                <table style={{ width: '100%', fontSize: '14px', marginTop: '4px' }}>
                                    <tbody>
                                        <tr>
                                            <td style={{ textAlign: 'left', padding: '1px 16px' }}><strong>E-Mail :-</strong> {companyInfo.email}</td>
                                            <td style={{ textAlign: 'right', padding: '1px 16px' }}><strong>Web :-</strong> {companyInfo.website}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ textAlign: 'left', padding: '1px 16px' }}><strong>PH :</strong> {companyInfo.phoneNumbers}</td>
                                            <td style={{ textAlign: 'right', padding: '1px 16px' }}><strong>GSTIN:</strong> {companyInfo.gstin}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div className="text-center font-bold text-lg mb-2 pb-1 border-b-2 border-black" style={{borderColor: settings.themeColor}}>INVOICE</div>

            {/* Invoice Details */}
            <div className="flex justify-between mb-2 text-sm">
                <div className="w-2/3">
                    <p><strong>Invoice No:</strong> {invoice.invoiceNumber}</p>
                    <p><strong>Date:</strong> {new Date(invoice.date).toLocaleDateString('en-GB')}</p>
                    <p><strong>Due Date:</strong> {new Date(invoice.dueDate).toLocaleDateString('en-GB')}</p>
                </div>
                <div className="w-1/3 text-right">
                    <p><strong>GSTIN:</strong> {companyInfo.gstin}</p>
                </div>
            </div>

            {/* Billing Address */}
            <div className="border p-2 mb-2 text-sm">
                <p className="font-bold">Bill To:</p>
                {invoice.billingAddress ? (
                    <>
                        <p className="font-bold">{invoice.billingAddress.name}</p>
                        <p>{invoice.billingAddress.address}, {invoice.billingAddress.city}, {invoice.billingAddress.state} - {invoice.billingAddress.pinCode}</p>
                        <p><strong>GSTIN:</strong> {invoice.billingAddress.gstin}</p>
                        <p><strong>Contact:</strong> {invoice.billingAddress.contact}</p>
                    </>
                ) : client ? (
                    <>
                        <p className="font-bold">{client.name}</p>
                        <p>{client.address}</p>
                        <p><strong>GSTIN:</strong> {client.gstin}</p>
                    </>
                ) : <p>Client details not found.</p>}
            </div>

            {/* Line Items Table */}
            <table className="w-full border-collapse border border-black mb-2 text-sm">
                <thead style={{ backgroundColor: settings.themeColor, color: '#fff' }}>
                    <tr>
                        <th className="border border-black p-1 text-center">S.No.</th>
                        <th className="border border-black p-1 text-left">Description</th>
                        <th className="border border-black p-1 text-right">Amount (INR)</th>
                    </tr>
                </thead>
                <tbody>
                    {invoice.type === 'LR-based' && associatedLrs.map((lr, index) => (
                        <tr key={lr.id}>
                            <td className="border border-black p-1 text-center">{index + 1}</td>
                            <td className="border border-black p-1">
                                LR No: {lr.lrNumber} ({new Date(lr.date).toLocaleDateString('en-GB')}), From: {lr.from}, To: {lr.to}, Truck: {lr.truckNumber}
                            </td>
                            <td className="border border-black p-1 text-right">{lr.totalAmount.toFixed(2)}</td>
                        </tr>
                    ))}
                    {(invoice.type === 'Manual' && invoice.manualEntries) && invoice.manualEntries.map((entry, index) => (
                         <tr key={entry.id}>
                            <td className="border border-black p-1 text-center">{index + 1}</td>
                            <td className="border border-black p-1">
                                LR No: {entry.lrNumber}, Date: {new Date(entry.date).toLocaleDateString('en-GB')}, Truck: {entry.truckNumber}, {entry.from} to {entry.to}, Desc: {entry.materialDetails}
                            </td>
                            <td className="border border-black p-1 text-right">{entry.freightAmount.toFixed(2)}</td>
                        </tr>
                    ))}
                     {(invoice.type === 'Manual' && invoice.lineItems) && invoice.lineItems.map((item, index) => (
                         <tr key={item.id}>
                            <td className="border border-black p-1 text-center">{index + 1 + (invoice.manualEntries?.length || 0)}</td>
                            <td className="border border-black p-1">{item.description}</td>
                            <td className="border border-black p-1 text-right">{item.amount.toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    {invoice.totalTripAmount && <tr><td colSpan={2} className="text-right p-1 font-bold">Sub Total:</td><td className="text-right p-1 font-bold">{invoice.totalTripAmount.toFixed(2)}</td></tr>}
                    {invoice.discount && <tr><td colSpan={2} className="text-right p-1">Discount:</td><td className="text-right p-1">{invoice.discount.toFixed(2)}</td></tr>}
                    {invoice.gstDetails && !invoice.gstDetails.isReverseCharge && <tr><td colSpan={2} className="text-right p-1">GST ({invoice.gstDetails.rate}%):</td><td className="text-right p-1">{((invoice.totalTripAmount || invoice.totalAmount) * invoice.gstDetails.rate / 100).toFixed(2)}</td></tr>}
                    {invoice.tdsDetails && <tr><td colSpan={2} className="text-right p-1">TDS ({invoice.tdsDetails.rate}% - {invoice.tdsDetails.type}):</td><td className="text-right p-1">{(invoice.tdsDetails.type === 'Deduction' ? '-' : '')}{((invoice.totalTripAmount || invoice.totalAmount) * invoice.tdsDetails.rate / 100).toFixed(2)}</td></tr>}
                    {invoice.roundOff && <tr><td colSpan={2} className="text-right p-1">Round Off:</td><td className="text-right p-1">{invoice.roundOff.toFixed(2)}</td></tr>}
                    <tr className="font-bold text-sm" style={{ backgroundColor: settings.themeColor, color: '#fff' }}>
                        <td colSpan={2} className="text-right p-1 border-t-2 border-black">Total Amount:</td>
                        <td className="text-right p-1 border-t-2 border-black">{invoice.totalAmount.toFixed(2)}</td>
                    </tr>
                </tfoot>
            </table>
            
            <div className="mb-2 text-sm">
                <p><strong>Amount in Words:</strong> {totalAmountInWords}</p>
            </div>
            
            <div className="flex justify-between items-start text-sm">
                <div className="w-1/2">
                    {invoice.bankDetails && (
                        <div className="border p-2">
                            <p className="font-bold">Bank Details:</p>
                            <p>A/c Name: {invoice.bankDetails.accountHolderName}</p>
                            <p>Bank: {invoice.bankDetails.bankName}</p>
                            <p>A/c No: {invoice.bankDetails.accountNumber}</p>
                            <p>IFSC: {invoice.bankDetails.ifscCode}</p>
                        </div>
                    )}
                    {invoice.remarks && <p className="mt-2"><strong>Remarks:</strong> {invoice.remarks}</p>}
                    {invoice.gstDetails?.isReverseCharge && <p className="font-bold text-red-600 mt-1">GST is payable by the recipient under reverse charge mechanism.</p>}
                </div>
                <div className="w-1/2 text-center pt-8">
                    <p className="border-t border-black pt-1">Authorised Signatory</p>
                    <p>For {companyInfo.name}</p>
                </div>
            </div>
        </div>
    );
};

const CreateInvoiceFromLrPage = ({ onProceed, onBack }: { onProceed: (data: { clientId: string; selectedLrIds: string[] }) => void; onBack: () => void; }) => {
    const { clients, lorryReceipts } = useTransport();
    const [selectedParty, setSelectedParty] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedLrIds, setSelectedLrIds] = useState<string[]>([]);

    const unbilledLRs = useMemo(() => {
        if (!selectedParty) return [];
        return lorryReceipts.filter(lr => (lr.consignor.name === clients.find(c => c.id === selectedParty)?.name || lr.consignee.name === clients.find(c => c.id === selectedParty)?.name) && !lr.invoiceId);
    }, [selectedParty, lorryReceipts, clients]);

    const filteredLRs = useMemo(() => {
        if (!searchTerm) return unbilledLRs;
        const lowerSearch = searchTerm.toLowerCase();
        return unbilledLRs.filter(lr => lr.lrNumber.toLowerCase().includes(lowerSearch) || lr.consignor.name.toLowerCase().includes(lowerSearch) || lr.consignee.name.toLowerCase().includes(lowerSearch));
    }, [unbilledLRs, searchTerm]);

    const handleSelectAll = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedLrIds(filteredLRs.map(lr => lr.id));
        } else {
            setSelectedLrIds([]);
        }
    };
    
    const handleProceed = () => {
        if(selectedLrIds.length > 0) {
            onProceed({ clientId: selectedParty, selectedLrIds });
        } else {
            alert("Please select at least one Lorry Receipt.");
        }
    };

    const uniqueParties = useMemo(() => {
        const partyMap = new Map<string, Client>();
        lorryReceipts.forEach(lr => {
            const consignorClient = clients.find(c => c.name === lr.consignor.name);
            const consigneeClient = clients.find(c => c.name === lr.consignee.name);
            if (consignorClient && !lr.invoiceId) partyMap.set(consignorClient.id, consignorClient);
            if (consigneeClient && !lr.invoiceId) partyMap.set(consigneeClient.id, consigneeClient);
        });
        return Array.from(partyMap.values());
    }, [lorryReceipts, clients]);


    return (
        <div className="p-4 sm:p-6 min-h-full">
            <div className="bg-white p-4 rounded-t-lg shadow-sm flex flex-col sm:flex-row justify-between items-center border-b gap-4">
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                     <button onClick={onBack} className="p-2 text-gray-600 rounded-full hover:bg-gray-100" aria-label="Back to Invoices">
                        <ArrowLeftIcon className="w-6 h-6" />
                    </button>
                    <select value={selectedParty} onChange={e => {setSelectedParty(e.target.value); setSelectedLrIds([]);}} className="w-full sm:w-64 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-brand-secondary focus:border-brand-secondary">
                        <option value="">Search by Party</option>
                        {uniqueParties.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <div className="relative w-full sm:w-auto flex-grow">
                         <input type="text" placeholder="Search or sort LR by Party name or GST no" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full p-2 pl-8 border border-gray-300 rounded-md"/>
                         <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"/>
                    </div>
                </div>
                 <div className="flex items-center gap-2">
                    <button className="text-gray-500 hover:text-gray-800"><XIcon className="w-6 h-6"/></button>
                    <button className="text-gray-500 hover:text-gray-800"><FunnelIcon className="w-6 h-6"/></button>
                </div>
            </div>
            <div className="bg-white p-4 rounded-b-lg shadow-sm">
                 <div className="flex flex-col sm:flex-row justify-between items-center bg-gray-50 p-3 rounded-md border gap-4">
                    <div className="flex items-center">
                        <input type="checkbox" onChange={handleSelectAll} checked={selectedLrIds.length > 0 && selectedLrIds.length === filteredLRs.length} className="h-5 w-5 text-brand-primary border-gray-300 rounded focus:ring-brand-secondary"/>
                        <label className="ml-3 text-sm font-medium text-gray-700">Total Selected LR / Bilty : {selectedLrIds.length}</label>
                    </div>
                     <div className="flex flex-col sm:flex-row items-center gap-4">
                        <span className="text-sm font-medium text-green-600">Un-Billed LR: {unbilledLRs.length}</span>
                        <button onClick={handleProceed} disabled={selectedLrIds.length === 0} className="px-4 py-2 bg-gray-700 text-white font-semibold rounded-md shadow-sm hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed">
                            PROCEED TO GENERATE INVOICE
                        </button>
                    </div>
                </div>
            </div>
            <div className="space-y-4 mt-4">
                {filteredLRs.length > 0 ? filteredLRs.map(lr => (
                    <div key={lr.id} className="bg-white p-4 rounded-lg shadow-sm flex items-start gap-4 border">
                        <input type="checkbox" checked={selectedLrIds.includes(lr.id)} onChange={() => setSelectedLrIds(p => p.includes(lr.id) ? p.filter(id => id !== lr.id) : [...p, lr.id])} className="mt-1 h-5 w-5 text-brand-primary border-gray-300 rounded focus:ring-brand-secondary"/>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 flex-grow text-sm">
                            <div>
                                <p className="text-gray-500">LR Number</p>
                                <p className="font-bold text-gray-800">{lr.lrNumber}</p>
                                <p className="text-gray-500 mt-2">Truck Number</p>
                                <p className="font-bold text-gray-800">{lr.truckNumber || '--'}</p>
                                <p className="text-gray-500 mt-2">Consignor's Name</p>
                                <p className="font-bold text-gray-800">{lr.consignor.name}</p>
                            </div>
                             <div>
                                <p className="text-gray-500">Date</p>
                                <p className="font-bold text-gray-800">{new Date(lr.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')}</p>
                                 <p className="text-gray-500 mt-2">From</p>
                                <p className="font-bold text-gray-800">{lr.from}</p>
                                <p className="text-gray-500 mt-2">Consignee's Name</p>
                                <p className="font-bold text-gray-800">{lr.consignee.name || '--'}</p>
                            </div>
                             <div className='col-span-1 sm:col-span-2 md:col-span-1'>
                                <p className="text-gray-500">Freight Type</p>
                                <p className={`font-bold ${lr.freightType === 'Paid' ? 'text-green-600' : 'text-red-600'}`}>{lr.freightType}</p>
                                <p className="text-gray-500 mt-2">To</p>
                                <p className="font-bold text-gray-800">{lr.to}</p>
                            </div>
                             <div>
                                {/* Placeholder for more details if needed */}
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="text-center py-10 bg-white rounded-lg shadow-sm">
                       <p className="text-gray-500">{selectedParty ? 'No un-billed Lorry Receipts for this party.' : 'Please select a party to see their un-billed Lorry Receipts.'}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- UNIFIED INVOICE GENERATION PAGE ---
interface GenerateInvoicePageProps {
  type: 'LR-based' | 'Manual';
  onBack: () => void;
  onSuccess: () => void;
  initialClientId?: string;
  selectedLrIds?: string[];
  invoiceToEdit?: Invoice | null;
  invoiceToDuplicate?: Invoice | null;
}

const GenerateInvoicePage = ({ type, onBack, onSuccess, initialClientId, selectedLrIds = [], invoiceToEdit, invoiceToDuplicate }: GenerateInvoicePageProps) => {
    const { clients, getClientById, addInvoice, lorryReceipts, invoices, updateInvoice, updateLorryReceipt } = useTransport();
    const [settings] = useSettings();

    // Common State
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
    const [billingAddress, setBillingAddress] = useState<Address | null>(null);
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);
    const [hsnCode, setHsnCode] = useState('');
    const [remarks, setRemarks] = useState('');
    const [bankDetails, setBankDetails] = useState(settings.defaultBankDetails);
    
    // LR-based State
    const [editableLrs, setEditableLrs] = useState<Array<LorryReceipt & { haltingCharge: number; extraCharge: number; weightCharge: number; freightAmount: number; advanceCash: number; }>>([]);
    
    // Manual-based State
    const [manualEntries, setManualEntries] = useState<ManualInvoiceEntry[]>([]);
    const [currentManualEntry, setCurrentManualEntry] = useState<Omit<ManualInvoiceEntry, 'id'>>({
        lrNumber: '', date: new Date().toISOString().split('T')[0], truckNumber: '', from: '', to: '', materialDetails: '',
        articleCount: 0, totalWeight: 0, haltingCharge: 0, extraCharge: 0, freightAmount: 0, advanceCash: 0
    });

    // Financial Calculation State
    const [showDiscount, setShowDiscount] = useState(false);
    const [discountAmount, setDiscountAmount] = useState(0);
    const [showGst, setShowGst] = useState(false);
    const [gstRate, setGstRate] = useState(5);
    const [isReverseCharge, setIsReverseCharge] = useState(true);
    const [showTds, setShowTds] = useState(false);
    const [tdsType, setTdsType] = useState<'Deduction' | 'Addition'>('Deduction');
    const [tdsRate, setTdsRate] = useState(0);
    const [isRounded, setIsRounded] = useState(false);
    const [advanceReceived, setAdvanceReceived] = useState(0);
    const [showAdvanceVia, setShowAdvanceVia] = useState(false);
    const [gstFiledBy, setGstFiledBy] = useState<'Consignee' | 'Consignor' | 'Transporter'>('Consignee');
    
    // Page metadata
    const isEditing = !!invoiceToEdit;
    const isDuplicating = !!invoiceToDuplicate;

    const generateNewInvoiceNumber = () => `${type === 'Manual' ? 'MAN-' : ''}INV${Date.now().toString().slice(-6)}`;

    // Initialization Effect
    useEffect(() => {
        const sourceInvoice = invoiceToEdit || invoiceToDuplicate;
        if (sourceInvoice) {
            setInvoiceNumber(isDuplicating ? generateNewInvoiceNumber() : sourceInvoice.invoiceNumber);
            setInvoiceDate(isDuplicating ? new Date().toISOString().split('T')[0] : sourceInvoice.date.split('T')[0]);
            setBillingAddress(sourceInvoice.billingAddress || null);
            setHsnCode(sourceInvoice.hsnCode || '');
            setRemarks(sourceInvoice.remarks || '');
            setBankDetails(sourceInvoice.bankDetails || settings.defaultBankDetails);
            setDiscountAmount(sourceInvoice.discount || 0);
            setShowDiscount(!!sourceInvoice.discount);
            if(sourceInvoice.gstDetails) {
                setGstRate(sourceInvoice.gstDetails.rate);
                setIsReverseCharge(sourceInvoice.gstDetails.isReverseCharge);
                setShowGst(true);
            }
            if(sourceInvoice.tdsDetails) {
                setTdsType(sourceInvoice.tdsDetails.type);
                setTdsRate(sourceInvoice.tdsDetails.rate);
                setShowTds(true);
            }
            setIsRounded(!!sourceInvoice.roundOff);
            setAdvanceReceived(isDuplicating ? 0 : sourceInvoice.advanceReceived || 0);
            setGstFiledBy(sourceInvoice.gstFiledBy || 'Consignee');
            setManualEntries(sourceInvoice.manualEntries || []);
        } else {
            setInvoiceNumber(generateNewInvoiceNumber());
            setBankDetails(settings.defaultBankDetails);
            if (type === 'LR-based' && initialClientId) {
                const client = getClientById(initialClientId);
                if (client) {
                    const firstLrForClient = lorryReceipts.find(lr => selectedLrIds.includes(lr.id) && (lr.consignor.name === client.name || lr.consignee.name === client.name));
                    if (firstLrForClient) {
                         setBillingAddress(firstLrForClient.consignor.name === client.name ? firstLrForClient.consignor : firstLrForClient.consignee);
                    } else {
                         setBillingAddress({ name: client.name, gstin: client.gstin, address: client.address, city: '', state: '', pinCode: '', country: 'India', contact: client.contactNumber || '' });
                    }
                }
            }
        }
        
        if (type === 'LR-based') {
            const lrsToEdit = lorryReceipts
                .filter(lr => (sourceInvoice?.lrIds || selectedLrIds).includes(lr.id))
                .map(lr => ({
                    ...lr,
                    haltingCharge: 0, extraCharge: 0, weightCharge: 0,
                    freightAmount: lr.totalAmount, advanceCash: 0,
                }));
            setEditableLrs(lrsToEdit);
        }
    }, [invoiceToEdit, invoiceToDuplicate, type, initialClientId, selectedLrIds]);

    // LR-based handlers
    const handleLrChargeChange = (lrId: string, field: keyof typeof editableLrs[0], value: string) => {
        const numValue = Number(value) || 0;
        setEditableLrs(prev => prev.map(lr => lr.id === lrId ? { ...lr, [field]: numValue } : lr));
    };
    
    // Manual-based handlers
    const handleAddManualEntry = () => {
        if (currentManualEntry.freightAmount > 0) {
            setManualEntries(prev => [...prev, { ...currentManualEntry, id: `me-${Date.now()}` }]);
            setCurrentManualEntry({
                lrNumber: '', date: new Date().toISOString().split('T')[0], truckNumber: '', from: '', to: '', materialDetails: '',
                articleCount: 0, totalWeight: 0, haltingCharge: 0, extraCharge: 0, freightAmount: 0, advanceCash: 0
            });
        }
    };
    const handleRemoveManualEntry = (id: string) => {
        setManualEntries(prev => prev.filter(entry => entry.id !== id));
    };

    // Calculations
    const totalTripAmount = useMemo(() => {
        if (type === 'LR-based') {
             return editableLrs.reduce((sum, lr) => {
                const freight = lr.freightAmount || lr.totalAmount;
                const weight = lr.weightCharge || 0;
                const halting = lr.haltingCharge || 0;
                const extra = lr.extraCharge || 0;
                return sum + freight + weight + halting + extra;
             }, 0);
        }
        return manualEntries.reduce((sum, entry) => sum + entry.freightAmount, 0);
    }, [editableLrs, manualEntries, type]);
    
    const calculatedTotal = useMemo(() => {
        let total = totalTripAmount - discountAmount;
        if (showGst && gstRate > 0 && !isReverseCharge) {
            total += total * (gstRate / 100);
        }
        if (showTds) {
            const tdsAmount = (totalTripAmount - discountAmount) * (tdsRate / 100);
            total = tdsType === 'Deduction' ? total - tdsAmount : total + tdsAmount;
        }
        return total;
    }, [totalTripAmount, discountAmount, gstRate, isReverseCharge, tdsRate, tdsType, showGst, showTds]);
    
    const roundOff = isRounded ? Math.round(calculatedTotal) - calculatedTotal : 0;
    const totalAmount = calculatedTotal + roundOff;
    const payableAmount = totalAmount - advanceReceived;

    const handleGenerateInvoice = () => {
        if (!billingAddress?.name) {
            alert("Please select or enter a client for billing.");
            return;
        }

        const existingClient = clients.find(c => c.name.toLowerCase() === billingAddress.name.toLowerCase());
        const finalClientId = existingClient ? existingClient.id : `manual-${Date.now()}`;

        const invoiceData: Omit<Invoice, 'id' | 'status' | 'amountPaid'> = {
            invoiceNumber,
            date: new Date(invoiceDate).toISOString(),
            dueDate: new Date(new Date(invoiceDate).getTime() + 15 * 24 * 60 * 60 * 1000).toISOString(),
            clientId: finalClientId,
            billingAddress,
            totalAmount,
            type,
            hsnCode, remarks, bankDetails, totalTripAmount,
            discount: showDiscount ? discountAmount : undefined,
            gstDetails: showGst ? { rate: gstRate, isReverseCharge } : undefined,
            tdsDetails: showTds ? { type: tdsType, rate: tdsRate } : undefined,
            roundOff: isRounded ? roundOff : undefined,
            advanceReceived: advanceReceived > 0 ? advanceReceived : undefined,
            gstFiledBy,
            lrIds: type === 'LR-based' ? editableLrs.map(lr => lr.id) : [],
            manualEntries: type === 'Manual' ? manualEntries : [],
        };

        if (isEditing && invoiceToEdit) {
            updateInvoice({ ...invoiceToEdit, ...invoiceData });
        } else {
            addInvoice(invoiceData);
        }
        onSuccess();
    };
    
    const handleClientSelect = (client: Client) => {
        setBillingAddress({
            name: client.name,
            gstin: client.gstin,
            contact: client.contactNumber || '',
            address: client.address.split(',')[0],
            city: client.address.split(',')[1]?.trim() || '',
            state: client.address.split(',')[2]?.trim() || '',
            pinCode: client.address.split(',')[3]?.trim() || '',
            country: 'India',
        });
        setIsClientModalOpen(false);
    };

    return (
        <div className="p-4 sm:p-6 bg-slate-50 min-h-full">
            <button onClick={onBack} className="flex items-center text-sm font-medium text-brand-primary hover:underline mb-4">
                <ArrowLeftIcon className="w-4 h-4 mr-1"/> Back to Invoices
            </button>
            <form onSubmit={(e) => { e.preventDefault(); handleGenerateInvoice(); }} className="space-y-6">
                {/* Header */}
                 <div className="bg-white p-4 rounded-lg shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                        <label className="font-semibold">Invoice Number</label>
                        <input type="text" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} className="p-2 border rounded-md" />
                    </div>
                     <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setInvoiceNumber(generateNewInvoiceNumber())} className="p-2 text-gray-600 hover:text-black"><RefreshIcon className="w-5 h-5"/></button>
                        <label className="font-semibold">Date</label>
                        <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className="p-2 border rounded-md" />
                    </div>
                </div>

                {/* Bill To */}
                 <div className="bg-white p-4 rounded-lg shadow-sm grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                         <h3 className="font-semibold mb-2">Bill To</h3>
                         <button type="button" onClick={() => setIsClientModalOpen(true)} className="w-full text-left p-3 border-2 border-dashed border-gray-300 rounded-md hover:bg-gray-50 text-brand-primary">
                            {billingAddress?.name || 'Select Company'}
                        </button>
                        <p className="text-center my-2 text-gray-500 text-sm">OR</p>
                        <div className="space-y-2 text-sm">
                            {Object.entries({name: "Billing party name", contact: "Contact Number", city: "City", country: "Country", email: "Email"}).map(([key, label]) => (
                                <div key={key} className="grid grid-cols-1 sm:grid-cols-3 items-center">
                                    <label className="text-gray-600">{label}</label>
                                    <input type="text" value={(billingAddress as any)?.[key] || ''} onChange={e => setBillingAddress(p => ({...(p as Address), [key]: e.target.value}))} className="col-span-2 p-1.5 bg-slate-100 border rounded-md" />
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-2 text-sm pt-0 lg:pt-8">
                         {Object.entries({gstin: "GST number", address: "Address", state: "State", pinCode: "Pin Code"}).map(([key, label]) => (
                            <div key={key} className="grid grid-cols-1 sm:grid-cols-3 items-center">
                                <label className="text-gray-600">{label}</label>
                                <input type={key === 'pinCode' ? 'number' : 'text'} value={(billingAddress as any)?.[key] || ''} onChange={e => setBillingAddress(p => ({...(p as Address), [key]: e.target.value}))} className="col-span-2 p-1.5 bg-slate-100 border rounded-md" />
                            </div>
                        ))}
                    </div>
                </div>
                
                {/* Line Items Section (Conditional) */}
                {type === 'LR-based' ? (
                     <div className="bg-white p-4 rounded-lg shadow-sm">
                        <h3 className="font-semibold mb-2 text-gray-700">LR Details ({editableLrs.length})</h3>
                        <div className="space-y-2 overflow-x-auto">
                            {/* Header */}
                            <div className="grid grid-cols-12 gap-2 items-center text-xs font-bold p-2 bg-gray-100 rounded min-w-[900px]">
                                <div className="col-span-3">LR Info</div>
                                <div className="col-span-2">Route</div>
                                <div className="col-span-1 text-right">Weight (Kg)</div>
                                <div className="col-span-1 text-right">Wt. Charge</div>
                                <div className="col-span-1 text-right">Extra Charge</div>
                                <div className="col-span-1 text-right">Halting</div>
                                <div className="col-span-1 text-right">Freight Amt.</div>
                                <div className="col-span-1 text-right">Advance</div>
                            </div>
                            {/* Rows */}
                            {editableLrs.map(lr => (
                                <div key={lr.id} className="grid grid-cols-12 gap-2 items-center text-sm p-2 bg-slate-50 rounded min-w-[900px]">
                                    <div className="col-span-3">
                                        <p className="font-semibold">{lr.lrNumber}</p>
                                        <p className="text-xs text-gray-500">{new Date(lr.date).toLocaleDateString('en-GB')} | {lr.truckNumber}</p>
                                    </div>
                                    <div className="col-span-2">{lr.from} &rarr; {lr.to}</div>
                                    <div className="col-span-1 text-right">{lr.materials.reduce((s, m) => s + m.actualWeight, 0)}</div>
                                    <div className="col-span-1"><input type="number" value={lr.weightCharge} onChange={e => handleLrChargeChange(lr.id, 'weightCharge', e.target.value)} className="w-full p-1 border rounded text-right"/></div>
                                    <div className="col-span-1"><input type="number" value={lr.extraCharge} onChange={e => handleLrChargeChange(lr.id, 'extraCharge', e.target.value)} className="w-full p-1 border rounded text-right"/></div>
                                    <div className="col-span-1"><input type="number" value={lr.haltingCharge} onChange={e => handleLrChargeChange(lr.id, 'haltingCharge', e.target.value)} className="w-full p-1 border rounded text-right"/></div>
                                    <div className="col-span-1"><input type="number" value={lr.freightAmount} onChange={e => handleLrChargeChange(lr.id, 'freightAmount', e.target.value)} className="w-full p-1 border rounded text-right"/></div>
                                    <div className="col-span-1"><input type="number" value={lr.advanceCash} onChange={e => handleLrChargeChange(lr.id, 'advanceCash', e.target.value)} className="w-full p-1 border rounded text-right"/></div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div>
                        <div className="bg-white p-4 rounded-lg shadow-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-12 gap-x-4 gap-y-2 items-end">
                            {/* Inputs for manual entry */}
                            <div className="lg:col-span-2"><input placeholder='LR Number' className="w-full p-2 text-sm bg-slate-100 border rounded" value={currentManualEntry.lrNumber} onChange={e => setCurrentManualEntry(p=>({...p, lrNumber: e.target.value}))}/></div>
                            <div className="lg:col-span-2"><input type="date" className="w-full p-2 text-sm bg-slate-100 border rounded" value={currentManualEntry.date.split('T')[0]} onChange={e => setCurrentManualEntry(p=>({...p, date: e.target.value}))}/></div>
                            <div className="lg:col-span-2"><input placeholder='Truck #' className="w-full p-2 text-sm bg-slate-100 border rounded" value={currentManualEntry.truckNumber} onChange={e => setCurrentManualEntry(p=>({...p, truckNumber: e.target.value}))}/></div>
                            <div className="lg:col-span-2"><input placeholder='From' className="w-full p-2 text-sm bg-slate-100 border rounded" value={currentManualEntry.from} onChange={e => setCurrentManualEntry(p=>({...p, from: e.target.value}))}/></div>
                            <div className="lg:col-span-2"><input placeholder='To' className="w-full p-2 text-sm bg-slate-100 border rounded" value={currentManualEntry.to} onChange={e => setCurrentManualEntry(p=>({...p, to: e.target.value}))}/></div>
                            <div className="lg:col-span-2"><input placeholder='Freight Amount' type="number" className="w-full p-2 text-sm bg-slate-100 border rounded" value={currentManualEntry.freightAmount} onChange={e => setCurrentManualEntry(p=>({...p, freightAmount: Number(e.target.value)}))}/></div>
                            <div className="lg:col-span-1"><button type="button" onClick={handleAddManualEntry} className="w-full h-10 bg-yellow-400 text-black font-bold rounded-md text-sm">ADD</button></div>
                        </div>
                        {manualEntries.length > 0 && (
                            <div className="mt-4 bg-white p-4 rounded-lg shadow-sm space-y-2">
                                {manualEntries.map(entry => (
                                    <div key={entry.id} className="text-xs p-2 bg-slate-50 rounded flex items-center justify-between">
                                        <span>LR {entry.lrNumber}, {entry.from}-{entry.to}, Amt: {entry.freightAmount.toLocaleString()}</span>
                                        <button type="button" onClick={() => handleRemoveManualEntry(entry.id)} className="text-red-500"><XCircleIcon className="w-4 h-4"/></button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
                
                {/* Bottom section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Additional Details */}
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                        <h3 className="font-semibold mb-2">Additional Details</h3>
                        <div className="space-y-2 text-sm">
                            <div className="grid grid-cols-1 sm:grid-cols-3 items-center"><label className="text-gray-600">HSN Code</label><input type="text" value={hsnCode} onChange={e => setHsnCode(e.target.value)} className="col-span-2 p-1.5 bg-slate-100 border rounded-md" /></div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 items-center"><label className="text-gray-600">Remarks</label><input type="text" value={remarks} onChange={e => setRemarks(e.target.value)} className="col-span-2 p-1.5 bg-slate-100 border rounded-md" /></div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 items-center"><label className="text-gray-600">Account Holder Name</label><input type="text" value={bankDetails.accountHolderName} onChange={e => setBankDetails(p=>({...p, accountHolderName: e.target.value}))} className="col-span-2 p-1.5 bg-slate-100 border rounded-md" /></div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 items-center"><label className="text-gray-600">Bank Name</label><input type="text" value={bankDetails.bankName} onChange={e => setBankDetails(p=>({...p, bankName: e.target.value}))} className="col-span-2 p-1.5 bg-slate-100 border rounded-md" /></div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 items-center"><label className="text-gray-600">Account Number</label><input type="text" value={bankDetails.accountNumber} onChange={e => setBankDetails(p=>({...p, accountNumber: e.target.value}))} className="col-span-2 p-1.5 bg-slate-100 border rounded-md" /></div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 items-center"><label className="text-gray-600">Bank IFSC code</label><input type="text" value={bankDetails.ifscCode} onChange={e => setBankDetails(p=>({...p, ifscCode: e.target.value}))} className="col-span-2 p-1.5 bg-slate-100 border rounded-md" /></div>
                        </div>
                    </div>
                    {/* Financial Summary */}
                    <div className="bg-white p-4 rounded-lg shadow-sm space-y-3 text-sm">
                        <div className="flex justify-between font-bold text-base"><p>Total Trip Amount</p><p>₹ {totalTripAmount.toLocaleString('en-IN')}</p></div>
                        <div className="space-y-2 border-t border-b py-2">
                             <div className="flex justify-between items-center"><button type="button" onClick={() => setShowDiscount(!showDiscount)} className="text-blue-600 font-semibold flex items-center"><PlusIcon className="w-3 h-3 mr-1"/>Add Discount <ChevronDownIcon className={`w-3 h-3 ml-1 transition-transform ${showDiscount ? 'rotate-180': ''}`}/></button>{showDiscount && <input type="number" placeholder="0.00" value={discountAmount} onChange={e => setDiscountAmount(Number(e.target.value))} className="w-1/3 p-1.5 bg-slate-100 border rounded-md text-right"/>}</div>
                            <div className="flex justify-between items-center"><button type="button" onClick={() => setShowGst(!showGst)} className="text-blue-600 font-semibold flex items-center"><PlusIcon className="w-3 h-3 mr-1"/>Add GST Details <ChevronDownIcon className={`w-3 h-3 ml-1 transition-transform ${showGst ? 'rotate-180': ''}`}/></button>{showGst && <input type="number" placeholder="Rate %" value={gstRate} onChange={e => setGstRate(Number(e.target.value))} className="w-1/3 p-1.5 bg-slate-100 border rounded-md text-right"/>}</div>
                            <div className="flex justify-between items-center"><button type="button" onClick={() => setShowTds(!showTds)} className="text-blue-600 font-semibold flex items-center"><PlusIcon className="w-3 h-3 mr-1"/>Add TDS Details <ChevronDownIcon className={`w-3 h-3 ml-1 transition-transform ${showTds ? 'rotate-180': ''}`}/></button>{showTds && <input type="number" placeholder="Rate %" value={tdsRate} onChange={e => setTdsRate(Number(e.target.value))} className="w-1/3 p-1.5 bg-slate-100 border rounded-md text-right"/>}</div>
                        </div>
                        <div className="flex justify-end"><button type="button" onClick={()=> setIsRounded(!isRounded)} className="text-blue-600 font-semibold flex items-center"><PlusIcon className="w-3 h-3 mr-1"/>Round Off</button></div>
                        <div className="flex justify-between font-semibold"><p>Invoice Amount</p><p>₹ {totalAmount.toLocaleString('en-IN')}</p></div>
                        <div className="flex justify-between items-center"><p>Advance Received</p><input type="number" value={advanceReceived} onChange={e => setAdvanceReceived(Number(e.target.value))} className="w-1/3 p-1.5 bg-slate-100 border rounded-md text-right"/></div>
                        <div className="flex justify-between font-bold text-lg text-green-700 border-t pt-2"><p>Payable Amount</p><p>₹ {payableAmount.toLocaleString('en-IN')}</p></div>
                        <div className="grid grid-cols-2 gap-4 items-center pt-2 border-t">
                            <label className="font-semibold">GST filed by</label>
                            <select value={gstFiledBy} onChange={e => setGstFiledBy(e.target.value as any)} className="p-1.5 bg-slate-100 border rounded-md"><option>Consignee</option><option>Consignor</option><option>Transporter</option></select>
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex justify-end">
                    <button type="submit" className="px-10 py-3 bg-yellow-400 text-black font-bold rounded-md shadow-lg hover:bg-yellow-500">
                        {isEditing ? 'UPDATE INVOICE' : 'GENERATE INVOICE'}
                    </button>
                </div>
            </form>

            <Modal isOpen={isClientModalOpen} onClose={() => setIsClientModalOpen(false)} title="Select a Client">
                <ul className="space-y-2">
                    {clients.map(client => (
                        <li key={client.id} onClick={() => handleClientSelect(client)} className="p-3 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors">
                            <p className="font-semibold text-gray-800">{client.name}</p>
                            <p className="text-sm text-gray-500">{client.address}</p>
                        </li>
                    ))}
                </ul>
            </Modal>
        </div>
    );
};

const InvoiceList = ({ onNew, onNewManual, onEdit, onDuplicate }: { onNew: () => void; onNewManual: () => void; onEdit: (invoice: Invoice) => void; onDuplicate: (invoice: Invoice) => void; }) => {
    const { invoices, getClientById, updateInvoice, lorryReceipts } = useTransport();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [sortConfig, setSortConfig] = useState<{ key: keyof Invoice | 'balance', direction: 'asc' | 'desc' } | null>({ key: 'date', direction: 'desc' });
    const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
    const [paymentModalInvoice, setPaymentModalInvoice] = useState<Invoice | null>(null);
    const [historyModalInvoice, setHistoryModalInvoice] = useState<Invoice | null>(null);
    const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
    const actionMenuRef = useRef<HTMLDivElement>(null);
    const [settings] = useSettings();
    const [companyInfo] = useLocalStorage('companyInfo', defaultCompanyInfo);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
                setOpenActionMenuId(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const generatePdf = (invoice: Invoice, action: 'download' | 'print') => {
        setIsGenerating(true);
        const client = getClientById(invoice.clientId);
        const associatedLrs = lorryReceipts.filter(lr => invoice.lrIds.includes(lr.id));

        const doc = generateInvoicePDF(invoice, client, associatedLrs, companyInfo, settings);

        if (action === 'download') {
            doc.save(`Invoice_${invoice.invoiceNumber}.pdf`);
        } else {
            doc.autoPrint();
            window.open(doc.output('bloburl'), '_blank');
        }
        setIsGenerating(false);
    };

    const filteredInvoices = useMemo(() => {
        let sortedInvoices = invoices.map(inv => ({...inv, balance: inv.totalAmount - inv.amountPaid}));
        
        if (sortConfig?.key) {
            sortedInvoices.sort((a, b) => {
                const aVal = a[sortConfig.key as keyof typeof a];
                const bVal = b[sortConfig.key as keyof typeof b];
                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        
        return sortedInvoices.filter(inv => {
            if (statusFilter !== 'All' && inv.status !== statusFilter) return false;
            if (!searchTerm) return true;
            const lowerSearch = searchTerm.toLowerCase();
            const client = getClientById(inv.clientId);
            return (
                inv.invoiceNumber.toLowerCase().includes(lowerSearch) ||
                (client && client.name.toLowerCase().includes(lowerSearch))
            );
        });
    }, [invoices, searchTerm, statusFilter, sortConfig, getClientById]);

    const requestSort = (key: keyof Invoice | 'balance') => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const handleCancelInvoice = (invoice: Invoice) => {
        if (window.confirm("Are you sure you want to cancel this invoice? This will unlink it from any associated Lorry Receipts.")) {
            updateInvoice({ ...invoice, status: InvoiceStatus.Cancelled });
        }
    };
    
    const SortableHeader = ({ label, sortKey }: { label: string, sortKey: keyof Invoice | 'balance' }) => (
        <th className="px-6 py-3 cursor-pointer" onClick={() => requestSort(sortKey)}>
            <div className="flex items-center">
                {label}
                {sortConfig?.key === sortKey && (
                    sortConfig.direction === 'asc' ? <SortAscIcon className="w-4 h-4 ml-2" /> : <SortDescIcon className="w-4 h-4 ml-2" />
                )}
            </div>
        </th>
    );

    return (
        <div className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Invoices</h1>
                <div className="flex gap-4 w-full sm:w-auto">
                    <button onClick={onNew} className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 bg-brand-primary text-white rounded-lg shadow hover:bg-brand-secondary transition-colors">
                        <PlusIcon className="w-5 h-5 mr-2" /> Create from LR
                    </button>
                    <button onClick={onNewManual} className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 bg-blue-100 text-blue-800 rounded-lg shadow hover:bg-blue-200 transition-colors">
                        <PencilIcon className="w-5 h-5 mr-2" /> Create Manual
                    </button>
                </div>
            </div>
            
            <div className="mb-6 p-4 bg-white rounded-lg shadow-sm flex flex-wrap items-end gap-4">
                <div className="relative flex-grow min-w-[200px]">
                     <label htmlFor="invSearch" className="block text-sm font-medium text-gray-500 mb-1">Search</label>
                    <input id="invSearch" type="text" placeholder="By Invoice #, Client Name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-secondary" />
                    <SearchIcon className="absolute left-3 bottom-2.5 w-5 h-5 text-gray-400" />
                </div>
                 <div>
                    <label htmlFor="invStatus" className="block text-sm font-medium text-gray-500 mb-1">Status</label>
                    <select id="invStatus" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="p-2 border border-gray-300 rounded-md shadow-sm">
                        <option value="All">All Statuses</option>
                        {Object.values(InvoiceStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-600">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                        <tr>
                            <SortableHeader label="Invoice #" sortKey="invoiceNumber" />
                            <SortableHeader label="Date" sortKey="date" />
                            <th className="px-6 py-3">Client</th>
                            <SortableHeader label="Amount" sortKey="totalAmount" />
                            <SortableHeader label="Balance" sortKey="balance" />
                            <SortableHeader label="Due Date" sortKey="dueDate" />
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                         {filteredInvoices.length > 0 ? (
                            filteredInvoices.map(inv => {
                                const client = getClientById(inv.clientId);
                                const isOverdue = inv.status !== InvoiceStatus.Paid && new Date(inv.dueDate) < new Date();
                                return (
                                    <tr key={inv.id} className="bg-white border-b hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-brand-primary">{inv.invoiceNumber}</td>
                                        <td className="px-6 py-4">{new Date(inv.date).toLocaleDateString()}</td>
                                        <td className="px-6 py-4">{client?.name || 'N/A'}</td>
                                        <td className="px-6 py-4 text-right">{inv.totalAmount.toLocaleString('en-IN')}</td>
                                        <td className={`px-6 py-4 text-right font-semibold ${inv.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>{inv.balance.toLocaleString('en-IN')}</td>
                                        <td className={`px-6 py-4 ${isOverdue ? 'text-red-500 font-semibold' : ''}`}>{new Date(inv.dueDate).toLocaleDateString()}</td>
                                        <td className="px-6 py-4">{getStatusBadge(inv.status)}</td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="relative inline-block text-left">
                                                <button onClick={() => setOpenActionMenuId(openActionMenuId === inv.id ? null : inv.id)} className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none">
                                                    Actions <ChevronDownIcon className="-mr-1 ml-2 h-5 w-5" />
                                                </button>
                                                {openActionMenuId === inv.id && (
                                                    <div ref={actionMenuRef} className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20">
                                                        <div className="py-1" role="menu" aria-orientation="vertical">
                                                            <button onClick={() => { setPreviewInvoice(inv); setOpenActionMenuId(null); }} className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                                                <EyeIcon className="w-5 h-5 mr-3"/> View
                                                            </button>
                                                            <button onClick={() => { generatePdf(inv, 'download'); setOpenActionMenuId(null); }} className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                                                <DownloadIcon className="w-5 h-5 mr-3"/> Download PDF
                                                            </button>
                                                            {inv.status !== InvoiceStatus.Paid && inv.status !== InvoiceStatus.Cancelled && (
                                                                <button onClick={() => { setPaymentModalInvoice(inv); setOpenActionMenuId(null); }} className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                                                    <PlusIcon className="w-5 h-5 mr-3"/> Add Payment
                                                                </button>
                                                            )}
                                                            {inv.amountPaid > 0 && (
                                                                <button onClick={() => { setHistoryModalInvoice(inv); setOpenActionMenuId(null); }} className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                                                    <BookOpenIcon className="w-5 h-5 mr-3"/> View Payments
                                                                </button>
                                                            )}
                                                            {inv.status !== InvoiceStatus.Cancelled && (
                                                                <button onClick={() => { onEdit(inv); setOpenActionMenuId(null); }} className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                                                    <PencilIcon className="w-5 h-5 mr-3"/> Edit Invoice
                                                                </button>
                                                            )}
                                                            <button onClick={() => { onDuplicate(inv); setOpenActionMenuId(null); }} className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                                                <DocumentDuplicateIcon className="w-5 h-5 mr-3"/> Duplicate
                                                            </button>
                                                            {inv.status !== InvoiceStatus.Cancelled && (
                                                                <button onClick={() => { handleCancelInvoice(inv); setOpenActionMenuId(null); }} className="flex items-center w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                                                                    <XCircleIcon className="w-5 h-5 mr-3"/> Cancel Invoice
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })
                        ) : (
                            <tr><td colSpan={8} className="text-center py-10 text-gray-500">No invoices found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={!!previewInvoice} onClose={() => setPreviewInvoice(null)} title={`Invoice Preview: ${previewInvoice?.invoiceNumber}`} size="xl"><div className="overflow-x-auto"><InvoicePreview invoice={previewInvoice} /></div></Modal>
            {paymentModalInvoice && <AddPaymentModal invoice={paymentModalInvoice} onClose={() => setPaymentModalInvoice(null)} />}
            {historyModalInvoice && <PaymentHistoryModal invoice={historyModalInvoice} onClose={() => setHistoryModalInvoice(null)} />}
        </div>
    );
};

const numberToWords = (num: number): string => {
    const a = ['', 'one ', 'two ', 'three ', 'four ', 'five ', 'six ', 'seven ', 'eight ', 'nine ', 'ten ', 'eleven ', 'twelve ', 'thirteen ', 'fourteen ', 'fifteen ', 'sixteen ', 'seventeen ', 'eighteen ', 'nineteen '];
    const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

    const inWords = (n: number) => {
        let str = '';
        if (n > 99) {
            str += a[Math.floor(n / 100)] + 'hundred ';
            n %= 100;
        }
        if (n > 19) {
            str += b[Math.floor(n / 10)] + ' ' + a[n % 10];
        } else {
            str += a[n];
        }
        return str;
    };
    
    const numStr = num.toFixed(2).toString();
    const [integerPart, decimalPart] = numStr.split('.');
    let words = '';
    
    let n = parseInt(integerPart, 10);
    if (isNaN(n) || n === 0) return 'Zero';

    words += n > 9999999 ? inWords(Math.floor(n / 10000000)) + 'crore ' : '';
    n %= 10000000;
    words += n > 99999 ? inWords(Math.floor(n / 100000)) + 'lakh ' : '';
    n %= 100000;
    words += n > 999 ? inWords(Math.floor(n / 1000)) + 'thousand ' : '';
    n %= 1000;
    words += inWords(n);
    
    if (decimalPart && parseInt(decimalPart, 10) > 0) {
        words += ' and paise ' + inWords(parseInt(decimalPart, 10));
    }

    return words.replace(/\s+/g, ' ').trim().toUpperCase() + ' ONLY';
};


// --- Native PDF Generation for Invoice ---
const generateInvoicePDF = (invoice: Invoice, client: Client | null, associatedLrs: LorryReceipt[], companyInfo: any, settings: any) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 10;
    const maxW = pageW - margin * 2;
    let y = margin;
    
    const drawHeader = () => {
        y = margin;
        if (settings.logoUrl) {
           doc.addImage(settings.logoUrl, 'PNG', margin, y, 35, 15);
        }
        
        doc.setFontSize(18).setFont('serif', 'bold').setTextColor('#A63A3A').text(companyInfo.name, pageW / 2, y + 4, { align: 'center' });
        doc.setFontSize(8).setFont('helvetica', 'normal').setTextColor(0, 0, 0);
        doc.text(companyInfo.address, pageW / 2, y + 9, { align: 'center', maxWidth: 90 });
        doc.text(`Email: ${companyInfo.email} | Web: ${companyInfo.website}`, pageW / 2, y + 13, { align: 'center' });
        doc.text(`PH: ${companyInfo.phoneNumbers} | GSTIN: ${companyInfo.gstin}`, pageW / 2, y + 16, { align: 'center' });
        y += 22;
        doc.setDrawColor(0).setLineWidth(0.5).line(margin, y, pageW - margin, y);
        y += 5;
        doc.setFontSize(12).setFont('helvetica', 'bold').text('INVOICE', pageW / 2, y, { align: 'center' });
        y += 2;
        doc.setDrawColor(settings.themeColor).setLineWidth(0.3).line(margin, y, pageW - margin, y);
        y += 5;
    };

    drawHeader();
    
    // Invoice Info & Bill To
    doc.setFontSize(9).setFont('helvetica', 'normal');
    const billToAddress = invoice.billingAddress || client?.address;
    const billToLines = doc.splitTextToSize(`${(invoice.billingAddress?.name || client?.name)}\n${billToAddress}\nGSTIN: ${(invoice.billingAddress?.gstin || client?.gstin)}\nContact: ${invoice.billingAddress?.contact || ''}`, (maxW / 2) - 5);

    doc.setFont('helvetica', 'bold').text('Bill To:', margin, y);
    doc.setFont('helvetica', 'normal').text(billToLines, margin, y + 4);
    
    doc.setFont('helvetica', 'bold').text(`Invoice No:`, pageW / 2 + 10, y);
    doc.setFont('helvetica', 'normal').text(`${invoice.invoiceNumber}`, pageW / 2 + 35, y);
    doc.setFont('helvetica', 'bold').text(`Date:`, pageW / 2 + 10, y + 5);
    doc.setFont('helvetica', 'normal').text(`${new Date(invoice.date).toLocaleDateString('en-GB')}`, pageW / 2 + 35, y + 5);
    doc.setFont('helvetica', 'bold').text(`Due Date:`, pageW / 2 + 10, y + 10);
    doc.setFont('helvetica', 'normal').text(`${new Date(invoice.dueDate).toLocaleDateString('en-GB')}`, pageW / 2 + 35, y + 10);
    
    y += billToLines.length * 3.5 + 5;
    
    // Table Header
    const tableTop = y;
    doc.setFillColor(settings.themeColor);
    doc.rect(margin, y, maxW, 8, 'F');
    doc.setTextColor(255, 255, 255).setFontSize(9).setFont('helvetica', 'bold');
    doc.text('S.No.', margin + 2, y + 5.5);
    doc.text('Description', margin + 15, y + 5.5);
    doc.text('Amount (INR)', pageW - margin - 2, y + 5.5, { align: 'right' });
    y += 8;

    // Table Rows
    let lineItems: {description: string, amount: number}[] = [];
    if (invoice.type === 'LR-based') {
        lineItems = associatedLrs.map(lr => ({
            description: `LR No: ${lr.lrNumber} (${new Date(lr.date).toLocaleDateString('en-GB')}), From: ${lr.from}, To: ${lr.to}, Truck: ${lr.truckNumber}`,
            amount: lr.totalAmount
        }));
    } else {
        if(invoice.manualEntries) lineItems.push(...invoice.manualEntries.map(e => ({
            description: `LR No: ${e.lrNumber}, Date: ${new Date(e.date).toLocaleDateString('en-GB')}, Truck: ${e.truckNumber}, ${e.from} to ${e.to}, Desc: ${e.materialDetails}`,
            amount: e.freightAmount
        })));
        if(invoice.lineItems) lineItems.push(...invoice.lineItems.map(i => ({ description: i.description, amount: i.amount })));
    }
    
    doc.setTextColor(0, 0, 0).setFontSize(8).setFont('helvetica', 'normal');
    lineItems.forEach((item, index) => {
        if (y > pageH - 60) { // Check for page break
            doc.addPage();
            drawHeader();
            y += 25; // Adjust Y after header on new page
        }
        const descLines = doc.splitTextToSize(item.description, maxW - 40);
        const rowHeight = descLines.length * 4 + 4;
        doc.text(`${index + 1}`, margin + 4, y + 5);
        doc.text(descLines, margin + 15, y + 5);
        doc.text(item.amount.toFixed(2), pageW - margin - 2, y + 5, { align: 'right' });
        y += rowHeight;
    });

    // Summary Section
    if (y > pageH - 80) { // Check for page break before summary
        doc.addPage();
        drawHeader();
        y += 25;
    }
    const summaryX = pageW / 2 + 10;
    const summaryValueX = pageW - margin;
    doc.setDrawColor(0).setLineWidth(0.1).line(summaryX - 5, y, summaryValueX, y);
    y += 5;
    
    const addSummaryLine = (label: string, value: number) => {
        doc.setFont('helvetica', 'bold').text(label, summaryX, y);
        doc.setFont('helvetica', 'normal').text(value.toFixed(2), summaryValueX, y, { align: 'right' });
        y += 5;
    };

    if (invoice.totalTripAmount) addSummaryLine('Sub Total:', invoice.totalTripAmount);
    if (invoice.discount) addSummaryLine('Discount:', invoice.discount * -1);
    if (invoice.gstDetails && !invoice.gstDetails.isReverseCharge) {
        const gstAmount = (invoice.totalTripAmount! - (invoice.discount || 0)) * invoice.gstDetails.rate / 100;
        addSummaryLine(`GST (${invoice.gstDetails.rate}%):`, gstAmount);
    }
    if (invoice.tdsDetails) {
        const tdsAmount = (invoice.totalTripAmount! - (invoice.discount || 0)) * invoice.tdsDetails.rate / 100;
        addSummaryLine(`TDS (${invoice.tdsDetails.rate}% - ${invoice.tdsDetails.type}):`, invoice.tdsDetails.type === 'Deduction' ? tdsAmount * -1 : tdsAmount);
    }
    if (invoice.roundOff) addSummaryLine('Round Off:', invoice.roundOff);
    
    doc.setLineWidth(0.3).line(summaryX - 5, y, summaryValueX, y);
    y += 5;
    doc.setFont('helvetica', 'bold').setFontSize(10);
    doc.text('Total Amount:', summaryX, y);
    doc.text(invoice.totalAmount.toFixed(2), summaryValueX, y, { align: 'right' });
    y += 5;
    doc.setLineWidth(0.3).line(summaryX - 5, y, summaryValueX, y);
    y += 8;
    
    // Amount in words
    doc.setFontSize(8).setFont('helvetica', 'normal');
    const words = `Amount in Words: ${numberToWords(invoice.totalAmount)}`;
    doc.text(doc.splitTextToSize(words, maxW), margin, y);
    y += 10;
    
    // Bank Details & Footer
    const footerY = pageH - 35;
    if (invoice.bankDetails) {
        doc.setFontSize(8).setFont('helvetica', 'bold').text('Bank Details:', margin, footerY - 20);
        doc.setFontSize(7).setFont('helvetica', 'normal');
        doc.text(`A/c Name: ${invoice.bankDetails.accountHolderName}`, margin, footerY - 15);
        doc.text(`Bank: ${invoice.bankDetails.bankName}`, margin, footerY - 11);
        doc.text(`A/c No: ${invoice.bankDetails.accountNumber}`, margin, footerY - 7);
        doc.text(`IFSC: ${invoice.bankDetails.ifscCode}`, margin, footerY - 3);
    }
     if (invoice.gstDetails?.isReverseCharge) {
        doc.setFont('helvetica', 'bold').setTextColor(200, 0, 0).text('GST is payable by the recipient under reverse charge mechanism.', margin, footerY - 22);
    }
    doc.setTextColor(0,0,0);
    
    doc.setLineWidth(0.2).line(pageW - margin - 60, footerY, pageW - margin, footerY);
    doc.setFontSize(9).text('Authorised Signatory', pageW - margin, footerY + 5, { align: 'right' });
    doc.text(`For ${companyInfo.name}`, pageW - margin, footerY + 9, { align: 'right' });

    return doc;
};

// --- MAIN INVOICES PAGE ROUTER ---
export const Invoices = () => {
    const location = useLocation();
    const [view, setView] = useState<'list' | 'select-lr' | 'generate'>('list');
    
    // Context for the generation page
    const [context, setContext] = useState<Omit<GenerateInvoicePageProps, 'onBack' | 'onSuccess'>>({ type: 'LR-based' });

    // This handles the navigation from LorryReceipts page
    useEffect(() => {
        if (location.state?.createFromLrId && location.state?.clientId) {
            setContext({
                type: 'LR-based',
                selectedLrIds: [location.state.createFromLrId],
                initialClientId: location.state.clientId,
            });
            setView('generate');
        }
    }, [location.state]);

    const handleProceedFromLrSelection = (data: { clientId: string; selectedLrIds: string[] }) => {
        setContext({
            type: 'LR-based',
            initialClientId: data.clientId,
            selectedLrIds: data.selectedLrIds,
        });
        setView('generate');
    };

    const handleNewManual = () => {
        setContext({ type: 'Manual' });
        setView('generate');
    };
    
    const handleEditInvoice = (invoice: Invoice) => {
        setContext({
            type: invoice.type,
            invoiceToEdit: invoice,
        });
        setView('generate');
    };
    
    const handleDuplicateInvoice = (invoice: Invoice) => {
         setContext({
            type: invoice.type,
            invoiceToDuplicate: invoice,
        });
        setView('generate');
    };

    const handleSuccess = () => {
        setView('list');
        setContext({ type: 'LR-based' }); // Reset context
    };

    const renderView = () => {
        switch (view) {
            case 'select-lr':
                return <CreateInvoiceFromLrPage onProceed={handleProceedFromLrSelection} onBack={() => setView('list')} />;
            case 'generate':
                return <GenerateInvoicePage {...context} onBack={() => setView('list')} onSuccess={handleSuccess} />;
            case 'list':
            default:
                return <InvoiceList 
                            onNew={() => setView('select-lr')} 
                            onNewManual={handleNewManual} 
                            onEdit={handleEditInvoice}
                            onDuplicate={handleDuplicateInvoice}
                        />;
        }
    };

    return renderView();
};