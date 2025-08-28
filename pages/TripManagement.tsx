import React, { useState, useMemo, ChangeEvent, useRef, useEffect } from 'react';
import { useTransport } from '../context/TransportContext';
import { TripNote, TripNoteStatus, Supplier, LorryReceipt, SupplierPayment } from '../types';
import { PlusIcon, SearchIcon, DownloadIcon, PrinterIcon, EyeIcon, ShareIcon, SortAscIcon, SortDescIcon, FilterIcon, ArrowLeftIcon, ChevronDownIcon, DocumentDuplicateIcon, XCircleIcon, PencilIcon } from '../components/icons';
import { Modal } from '../components/Modal';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useSettings } from '../hooks/useSettings';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { defaultCompanyInfo } from '../companyInfo';

const getStatusBadge = (status: TripNoteStatus) => {
    const colors = {
        [TripNoteStatus.Draft]: 'bg-gray-200 text-gray-800',
        [TripNoteStatus.Confirmed]: 'bg-blue-100 text-blue-800',
        [TripNoteStatus.InTransit]: 'bg-yellow-100 text-yellow-800',
        [TripNoteStatus.PODAwaited]: 'bg-purple-100 text-purple-800',
        [TripNoteStatus.Completed]: 'bg-green-100 text-green-800',
        [TripNoteStatus.Closed]: 'bg-indigo-100 text-indigo-800',
    };
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status]}`}>{status}</span>;
};

const TripNoteList = ({ onCreate, onView }: { onCreate: () => void; onView: (tn: TripNote) => void; }) => {
    const { tripNotes, getSupplierById, supplierPayments } = useTransport();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [sortConfig, setSortConfig] = useState<{ key: keyof TripNote | 'balance', direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const filteredAndSortedNotes = useMemo(() => {
        let notes = tripNotes
            .map(note => {
                const paidAmount = supplierPayments.filter(p => p.tripNoteId === note.id).reduce((sum, p) => sum + p.amount, 0);
                const balance = note.totalFreight - paidAmount;
                return { ...note, paidAmount, balance };
            })
            .filter(note => {
                if (statusFilter !== 'All' && note.status !== statusFilter) {
                    return false;
                }
                const noteDate = note.date.split('T')[0];
                if (startDate && noteDate < startDate) {
                    return false;
                }
                if (endDate && noteDate > endDate) {
                    return false;
                }
                return true;
            })
            .filter(note => {
                if (searchTerm === '') return true;
                const lowerSearch = searchTerm.toLowerCase();
                const supplier = getSupplierById(note.supplierId);
                return (
                    note.noteId.toLowerCase().includes(lowerSearch) ||
                    note.vehicleNumber.toLowerCase().includes(lowerSearch) ||
                    note.from.toLowerCase().includes(lowerSearch) ||
                    note.to.toLowerCase().includes(lowerSearch) ||
                    (supplier && supplier.name.toLowerCase().includes(lowerSearch))
                );
            });

        if (sortConfig.key) {
            notes.sort((a, b) => {
                const aVal = a[sortConfig.key as keyof typeof a];
                const bVal = b[sortConfig.key as keyof typeof b];

                if (aVal < bVal) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aVal > bVal) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }


        return notes;
    }, [tripNotes, searchTerm, statusFilter, sortConfig, getSupplierById, startDate, endDate, supplierPayments]);
    
    const requestSort = (key: keyof TripNote | 'balance') => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const SortableHeader = ({ label, sortKey }: { label: string, sortKey: keyof TripNote | 'balance' }) => (
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
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Supplier Trips</h1>
                <button onClick={onCreate} className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-lg shadow hover:bg-brand-secondary transition-colors">
                    <PlusIcon className="w-5 h-5 mr-2" /> Create Supplier Note
                </button>
            </div>

            <div className="mb-6 p-4 bg-white rounded-lg shadow-sm flex flex-wrap items-end gap-4">
                 <div className="relative flex-grow">
                    <label htmlFor="tripSearch" className="block text-sm font-medium text-gray-500 mb-1">Search</label>
                    <input
                        id="tripSearch"
                        type="text"
                        placeholder="By Note ID, Supplier, Vehicle..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-secondary"
                    />
                    <SearchIcon className="absolute left-3 bottom-2.5 w-5 h-5 text-gray-400" />
                </div>
                 <div>
                    <label htmlFor="tripStatus" className="block text-sm font-medium text-gray-500 mb-1">Status</label>
                    <div className="flex items-center">
                        <FilterIcon className="w-5 h-5 text-gray-500 mr-2" />
                        <select
                            id="tripStatus"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="p-2 border border-gray-300 rounded-md shadow-sm"
                        >
                            <option value="All">All Statuses</option>
                            {Object.values(TripNoteStatus).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>
                <div>
                    <label htmlFor="tripStartDate" className="block text-sm font-medium text-gray-500 mb-1">Start Date</label>
                    <input
                        id="tripStartDate"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="p-2 border border-gray-300 rounded-md shadow-sm"
                    />
                </div>
                 <div>
                    <label htmlFor="tripEndDate" className="block text-sm font-medium text-gray-500 mb-1">End Date</label>
                    <input
                        id="tripEndDate"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="p-2 border border-gray-300 rounded-md shadow-sm"
                    />
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-600">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                        <tr>
                            <SortableHeader label="Note ID" sortKey="noteId" />
                            <SortableHeader label="Date" sortKey="date" />
                            <th className="px-6 py-3">Supplier Name</th>
                            <th className="px-6 py-3">Vehicle No.</th>
                            <th className="px-6 py-3 text-right">Freight</th>
                            <th className="px-6 py-3 text-right">Paid</th>
                            <SortableHeader label="Balance" sortKey="balance" />
                            <th className="px-6 py-3 text-center">Status</th>
                            <th className="px-6 py-3 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredAndSortedNotes.map(note => (
                            <tr key={note.id} className="bg-white border-b hover:bg-gray-50 cursor-pointer" onClick={() => onView(note)}>
                                <td className="px-6 py-4 font-medium text-brand-primary">{note.noteId}</td>
                                <td className="px-6 py-4">{new Date(note.date).toLocaleDateString()}</td>
                                <td className="px-6 py-4">{getSupplierById(note.supplierId)?.name || 'N/A'}</td>
                                <td className="px-6 py-4">{note.vehicleNumber}</td>
                                <td className="px-6 py-4 text-right">{note.totalFreight.toLocaleString('en-IN')}</td>
                                <td className="px-6 py-4 text-right text-green-600">{note.paidAmount.toLocaleString('en-IN')}</td>
                                <td className="px-6 py-4 text-right font-semibold text-red-600">{note.balance.toLocaleString('en-IN')}</td>
                                <td className="px-6 py-4 text-center">{getStatusBadge(note.status)}</td>
                                <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                                    <button onClick={() => onView(note)} className="text-indigo-600 hover:text-indigo-900">
                                        View Details
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};


const FormInput = ({ label, name, value, onChange, placeholder = '', type = 'text', required = false, disabled = false }: { label: string; name: string; value: string | number; onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void; placeholder?: string; type?: string; required?: boolean; disabled?: boolean }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <input
            type={type}
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-brand-secondary focus:border-brand-secondary disabled:bg-gray-100"
        />
    </div>
);

const initialFormData: Omit<TripNote, 'id'> = {
    noteId: '',
    date: new Date().toISOString().split('T')[0],
    supplierId: '',
    vehicleNumber: '',
    vehicleType: '',
    from: '',
    to: '',
    driverName: '',
    driverContact: '',
    totalFreight: 0,
    paymentDetails: '',
    loadingContactPerson: '',
    loadingContactNumber: '',
    unloadingContactPerson: '',
    unloadingContactNumber: '',
    remarks: '',
    status: TripNoteStatus.Draft,
    linkedLrIds: [],
};

const CreateTripNote = ({ onBack, onSuccess, noteToEdit }: { onBack: () => void; onSuccess: (tn: TripNote) => void; noteToEdit?: TripNote | null }) => {
    const { suppliers, addTripNote, updateTripNote, tripNotes, lorryReceipts, addSupplierPayment } = useTransport();
    const [formData, setFormData] = useState<Omit<TripNote, 'id'>>(initialFormData);
    const [isLrModalOpen, setIsLrModalOpen] = useState(false);
    
    useEffect(() => {
        if (noteToEdit) {
            setFormData(noteToEdit);
        } else {
            const newNoteId = `TN${Date.now().toString().slice(-6)}`;
            setFormData({ ...initialFormData, noteId: newNoteId });
        }
    }, [noteToEdit, tripNotes.length]);

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'totalFreight' ? Number(value) : value }));
    };

    const handleLrSelectionChange = (lrId: string) => {
        setFormData(prev => {
            const newLinkedLrIds = prev.linkedLrIds.includes(lrId)
                ? prev.linkedLrIds.filter(id => id !== lrId)
                : [...prev.linkedLrIds, lrId];
            return { ...prev, linkedLrIds: newLinkedLrIds };
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (noteToEdit) {
            updateTripNote(formData as TripNote);
            onSuccess(formData as TripNote);
        } else {
            const newNote = addTripNote(formData);
            onSuccess(newNote);
        }
    };
    
    const unlinkedLrs = lorryReceipts.filter(lr => !tripNotes.some(tn => tn.linkedLrIds.includes(lr.id)) || (noteToEdit && noteToEdit.linkedLrIds.includes(lr.id)));

    return (
        <div className="p-6">
             <button onClick={onBack} className="flex items-center text-sm font-medium text-brand-primary hover:underline mb-4">
                <ArrowLeftIcon className="w-4 h-4 mr-1"/> Back to List
            </button>
            <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold text-gray-800">{noteToEdit ? `Edit Supplier Note ${noteToEdit.noteId}`: 'Create Supplier Note'}</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border-b pb-6">
                    <FormInput label="Note ID" name="noteId" value={formData.noteId} onChange={handleChange} disabled />
                    <FormInput label="Date" name="date" type="date" value={formData.date.split('T')[0]} onChange={handleChange} required />
                    <div>
                        <label htmlFor="supplierId" className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                        <select id="supplierId" name="supplierId" value={formData.supplierId} onChange={handleChange} required className="w-full p-2 border border-gray-300 rounded-md">
                            <option value="">Select Supplier</option>
                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                     <div>
                        <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select id="status" name="status" value={formData.status} onChange={handleChange} required className="w-full p-2 border border-gray-300 rounded-md bg-gray-100">
                             {Object.values(TripNoteStatus).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border-b pb-6">
                     <FormInput label="Vehicle Number" name="vehicleNumber" value={formData.vehicleNumber} onChange={handleChange} required />
                     <FormInput label="Vehicle Type" name="vehicleType" value={formData.vehicleType} onChange={handleChange} />
                     <FormInput label="From" name="from" value={formData.from} onChange={handleChange} required />
                     <FormInput label="To" name="to" value={formData.to} onChange={handleChange} required />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border-b pb-6 items-end">
                     <FormInput label="Total Freight" name="totalFreight" type="number" value={formData.totalFreight} onChange={handleChange} required />
                     <FormInput label="Payment Details" name="paymentDetails" value={formData.paymentDetails} onChange={handleChange} />
                </div>
                <div className="border-b pb-6">
                    <h3 className="text-md font-semibold mb-2">Link Lorry Receipts</h3>
                    <button type="button" onClick={() => setIsLrModalOpen(true)} className="px-4 py-2 border border-dashed border-gray-400 text-gray-600 rounded-md hover:bg-gray-50">Select LRs</button>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {formData.linkedLrIds.map(lrId => {
                            const lr = lorryReceipts.find(l => l.id === lrId);
                            return <span key={lrId} className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">{lr?.lrNumber || lrId}</span>;
                        })}
                    </div>
                </div>
                <div className="flex justify-end pt-4">
                    <button type="submit" className="px-6 py-2 bg-brand-accent text-brand-primary font-bold rounded-lg shadow-md hover:bg-yellow-500">
                        {noteToEdit ? 'Update Note' : 'Create Note'}
                    </button>
                </div>
            </form>
            <Modal isOpen={isLrModalOpen} onClose={() => setIsLrModalOpen(false)} title="Select Lorry Receipts to Link">
                <div className="max-h-96 overflow-y-auto">
                    {unlinkedLrs.map(lr => (
                        <div key={lr.id} className="flex items-center p-2 hover:bg-gray-100 rounded">
                            <input
                                type="checkbox"
                                id={`lr-${lr.id}`}
                                checked={formData.linkedLrIds.includes(lr.id)}
                                onChange={() => handleLrSelectionChange(lr.id)}
                                className="h-4 w-4 text-brand-primary border-gray-300 rounded"
                            />
                            <label htmlFor={`lr-${lr.id}`} className="ml-3 text-sm">
                                <span className="font-semibold">{lr.lrNumber}</span> - {lr.from} to {lr.to} ({new Date(lr.date).toLocaleDateString()})
                            </label>
                        </div>
                    ))}
                </div>
                 <div className="flex justify-end pt-4 mt-4 border-t">
                    <button onClick={() => setIsLrModalOpen(false)} className="px-4 py-2 bg-brand-primary text-white rounded">Done</button>
                </div>
            </Modal>
        </div>
    );
}

const AddPaymentModal = ({ note, onClose }: { note: TripNote; onClose: () => void }) => {
    const { addSupplierPayment, supplierPayments } = useTransport();
    const paidAmount = supplierPayments.filter(p => p.tripNoteId === note.id).reduce((sum, p) => sum + p.amount, 0);
    const balanceDue = note.totalFreight - paidAmount;

    const [amount, setAmount] = useState(balanceDue > 0 ? balanceDue : 0);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [method, setMethod] = useState<'Cash' | 'Bank Transfer' | 'Cheque'>('Bank Transfer');
    const [type, setType] = useState<'Advance' | 'Balance'>('Balance');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (amount <= 0) {
            alert('Amount must be positive.');
            return;
        }
        addSupplierPayment({
            tripNoteId: note.id,
            date,
            amount,
            method,
            type,
        });
        onClose();
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={`Add Payment for ${note.noteId}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <p className="text-sm text-gray-500">Total Freight: <span className="font-semibold">{note.totalFreight.toLocaleString('en-IN')}</span></p>
                    <p className="text-sm text-gray-500">Balance Due: <span className="font-semibold text-red-600">{balanceDue.toLocaleString('en-IN')}</span></p>
                </div>
                <FormInput label="Amount" name="amount" type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} required />
                <FormInput label="Date" name="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
                    <select value={method} onChange={(e) => setMethod(e.target.value as any)} className="w-full p-2 border border-gray-300 rounded-md">
                        <option>Bank Transfer</option><option>Cheque</option><option>Cash</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select value={type} onChange={(e) => setType(e.target.value as any)} className="w-full p-2 border border-gray-300 rounded-md">
                        <option>Balance</option><option>Advance</option>
                    </select>
                </div>
                <div className="flex justify-end pt-4 mt-4 border-t">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md mr-2">Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-brand-primary text-white rounded-md">Add Payment</button>
                </div>
            </form>
        </Modal>
    );
};

const TripNoteDetail = ({ note, onBack, onEdit }: { note: TripNote; onBack: () => void; onEdit: (tn: TripNote) => void; }) => {
    const { getSupplierById, supplierPayments, updateTripNote } = useTransport();
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const supplier = getSupplierById(note.supplierId);

    const paymentsForNote = supplierPayments
        .filter(p => p.tripNoteId === note.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    const paidAmount = paymentsForNote.reduce((sum, p) => sum + p.amount, 0);
    const balanceDue = note.totalFreight - paidAmount;

    const handleStatusChange = (newStatus: TripNoteStatus) => {
        const updatedNote = { ...note, status: newStatus };
        updateTripNote(updatedNote);
    };

    return (
        <div className="p-6">
            <button onClick={onBack} className="flex items-center text-sm font-medium text-brand-primary hover:underline mb-4">
                <ArrowLeftIcon className="w-4 h-4 mr-1"/> Back to List
            </button>
            <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Supplier Trip Details</h2>
                        <p className="text-gray-500 font-semibold text-lg">{note.noteId}</p>
                    </div>
                    <div className="flex items-center gap-4">
                        {getStatusBadge(note.status)}
                        <button onClick={() => onEdit(note)} className="p-2 rounded-full hover:bg-gray-100 text-gray-600">
                           <PencilIcon className="w-5 h-5"/>
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
                    <div><p className="text-sm text-gray-500">Supplier</p><p className="font-semibold">{supplier?.name}</p></div>
                    <div><p className="text-sm text-gray-500">Vehicle</p><p className="font-semibold">{note.vehicleNumber}</p></div>
                    <div><p className="text-sm text-gray-500">Route</p><p className="font-semibold">{note.from} to {note.to}</p></div>
                </div>

                <div className="grid grid-cols-3 gap-4 my-4">
                    <div className="p-4 bg-gray-50 rounded-lg text-center"><p className="text-sm text-gray-500">Total Freight</p><p className="text-xl font-bold text-gray-800">{note.totalFreight.toLocaleString('en-IN')}</p></div>
                    <div className="p-4 bg-green-50 rounded-lg text-center"><p className="text-sm text-green-700">Amount Paid</p><p className="text-xl font-bold text-green-800">{paidAmount.toLocaleString('en-IN')}</p></div>
                    <div className="p-4 bg-red-50 rounded-lg text-center"><p className="text-sm text-red-700">Balance Due</p><p className="text-xl font-bold text-red-800">{balanceDue.toLocaleString('en-IN')}</p></div>
                </div>
                 <div className="mt-6 border-t pt-4 flex justify-end items-center gap-4">
                     <div className="flex-grow">
                        <label htmlFor="status-update" className="text-sm font-medium text-gray-700 mr-2">Update Status:</label>
                        <select
                            id="status-update"
                            value={note.status}
                            onChange={(e) => handleStatusChange(e.target.value as TripNoteStatus)}
                            className="p-2 border border-gray-300 rounded-md"
                        >
                            {Object.values(TripNoteStatus).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>
                
                <div className="mt-6 border-t pt-4">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-700">Payment History</h3>
                        <button onClick={() => setIsPaymentModalOpen(true)} className="flex items-center px-4 py-2 bg-brand-primary text-white text-sm rounded-lg shadow hover:bg-brand-secondary">
                            <PlusIcon className="w-4 h-4 mr-2"/> Add Payment
                        </button>
                    </div>
                    
                    <div className="overflow-x-auto">
                         <table className="w-full text-sm text-left text-gray-600">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                                <tr>
                                    <th className="px-4 py-2">Date</th>
                                    <th className="px-4 py-2">Type</th>
                                    <th className="px-4 py-2">Method</th>
                                    <th className="px-4 py-2 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paymentsForNote.length > 0 ? paymentsForNote.map(p => (
                                    <tr key={p.id} className="border-b">
                                        <td className="px-4 py-2">{new Date(p.date).toLocaleDateString()}</td>
                                        <td className="px-4 py-2">{p.type}</td>
                                        <td className="px-4 py-2">{p.method}</td>
                                        <td className="px-4 py-2 text-right font-semibold">{p.amount.toLocaleString('en-IN')}</td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan={4} className="text-center py-4 text-gray-500">No payments recorded yet.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            {isPaymentModalOpen && <AddPaymentModal note={note} onClose={() => setIsPaymentModalOpen(false)} />}
        </div>
    );
};


const TripManagement = () => {
    const [view, setView] = useState<'list' | 'create' | 'detail'>('list'); 
    const [selectedNote, setSelectedNote] = useState<TripNote | null>(null);

    const handleCreate = () => {
        setSelectedNote(null);
        setView('create');
    };

    const handleEdit = (note: TripNote) => {
        setSelectedNote(note);
        setView('create');
    };

    const handleView = (note: TripNote) => {
        setSelectedNote(note);
        setView('detail');
    };
    
    const handleSuccess = (note: TripNote) => {
        setSelectedNote(note);
        setView('detail');
    };

    switch(view) {
        case 'create':
            return <CreateTripNote onBack={() => setView('list')} onSuccess={handleSuccess} noteToEdit={selectedNote}/>
        case 'detail':
             if (!selectedNote) {
                setView('list');
                return null;
            }
            return <TripNoteDetail note={selectedNote} onBack={() => setView('list')} onEdit={handleEdit} />
        case 'list':
        default:
            return <TripNoteList onCreate={handleCreate} onView={handleView} />;
    }
}

export default TripManagement;