import React, { useState, ChangeEvent, useRef, useMemo, useEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useSettings, CompanySettings } from '../hooks/useSettings';
import { defaultCompanyInfo } from '../companyInfo';
import { Modal } from '../components/Modal';
import { LorryReceipt, Client, Invoice, Supplier, TripNote, Payment } from '../types';
import { useTransport } from '../context/TransportContext';

type CompanyInfo = typeof defaultCompanyInfo;

const Toast = ({ message, show, onDismiss }: { message: string; show: boolean; onDismiss: () => void }) => {
    useEffect(() => {
        if (show) {
            const timer = setTimeout(() => onDismiss(), 3000);
            return () => clearTimeout(timer);
        }
    }, [show, onDismiss]);

    return (
        <div className={`fixed bottom-5 right-5 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg transition-transform transform ${show ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            {message}
        </div>
    );
};

const SettingsCard = ({ title, description, children, footer }: { title: string, description?: string, children: React.ReactNode, footer?: React.ReactNode }) => (
    <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg font-medium leading-6 text-gray-900">{title}</h3>
            {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
        </div>
        <div className="p-6 space-y-4">
            {children}
        </div>
        {footer && <div className="px-6 py-4 bg-gray-50 text-right">{footer}</div>}
    </div>
);

const FormRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        <label className="text-sm font-medium text-gray-600">{label}</label>
        <div className="md:col-span-2">{children}</div>
    </div>
);

const FormInput = ({ value, name, onChange }: { value: string; name: string; onChange: (e: ChangeEvent<HTMLInputElement>) => void }) => (
    <input type="text" name={name} value={value} onChange={onChange} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-brand-secondary focus:border-brand-secondary"/>
);

const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
        alert("No data to export.");
        return;
    }
    const headers = Object.keys(data[0]);
    const csvRows = [
        headers.join(','),
        ...data.map(row => 
            headers.map(fieldName => {
                let value = row[fieldName];
                if (value === null || value === undefined) {
                    return '';
                }
                let stringValue = String(value);
                // If the value contains a comma, double quotes, or a newline, enclose it in double quotes.
                if (/[",\n\r]/.test(stringValue)) {
                    // Escape any double quotes within the string by preceding them with another double quote.
                    stringValue = `"${stringValue.replace(/"/g, '""')}"`;
                }
                return stringValue;
            }).join(',')
        )
    ];
    const csvString = csvRows.join('\r\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// --- Tab Components ---

const CompanyProfileTab = () => {
    const [savedCompanyInfo, setSavedCompanyInfo] = useLocalStorage('companyInfo', defaultCompanyInfo);
    const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(savedCompanyInfo);
    const [showToast, setShowToast] = useState(false);
    const isDirty = useMemo(() => JSON.stringify(companyInfo) !== JSON.stringify(savedCompanyInfo), [companyInfo, savedCompanyInfo]);

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => setCompanyInfo(p => ({...p, [e.target.name]: e.target.value}));
    const handleSave = () => { setSavedCompanyInfo(companyInfo); setShowToast(true); };
    const handleReset = () => setCompanyInfo(savedCompanyInfo);

    return (
        <>
            <SettingsCard title="Company Profile" footer={
                isDirty && <div className="flex justify-end gap-4"><button onClick={handleReset} className="px-4 py-2 bg-gray-200 rounded-md">Reset</button><button onClick={handleSave} className="px-4 py-2 bg-brand-primary text-white rounded-md">Save Changes</button></div>
            }>
                <FormRow label="Company Name"><FormInput name="name" value={companyInfo.name} onChange={handleChange} /></FormRow>
                <FormRow label="Address"><FormInput name="address" value={companyInfo.address} onChange={handleChange} /></FormRow>
                <FormRow label="Phone Numbers"><FormInput name="phoneNumbers" value={companyInfo.phoneNumbers} onChange={handleChange} /></FormRow>
                <FormRow label="Email"><FormInput name="email" value={companyInfo.email} onChange={handleChange} /></FormRow>
                <FormRow label="Website"><FormInput name="website" value={companyInfo.website} onChange={handleChange} /></FormRow>
                <FormRow label="GSTIN"><FormInput name="gstin" value={companyInfo.gstin} onChange={handleChange} /></FormRow>
            </SettingsCard>
            <Toast message="Company Profile saved!" show={showToast} onDismiss={() => setShowToast(false)} />
        </>
    );
};

const DocumentsTab = () => {
    const [savedSettings, setSavedSettings] = useSettings();
    const [settings, setSettings] = useState(savedSettings);
    const [showToast, setShowToast] = useState(false);
    const logoInputRef = useRef<HTMLInputElement>(null);
    const isDirty = useMemo(() => JSON.stringify(settings) !== JSON.stringify(savedSettings), [settings, savedSettings]);

    const handleSave = () => { setSavedSettings(settings); setShowToast(true); };
    const handleReset = () => setSettings(savedSettings);
    const handleLogoUpload = (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => setSettings(p => ({ ...p, logoUrl: reader.result as string }));
        reader.readAsDataURL(file);
      }
    };

    return (
        <>
            <SettingsCard title="Document Customization" footer={
                 isDirty && <div className="flex justify-end gap-4"><button onClick={handleReset} className="px-4 py-2 bg-gray-200 rounded-md">Reset</button><button onClick={handleSave} className="px-4 py-2 bg-brand-primary text-white rounded-md">Save Changes</button></div>
            }>
                 <FormRow label="Company Logo">
                    <div className="flex items-center space-x-6">
                        <div className="shrink-0">
                            {settings.logoUrl ? 
                                <img className="h-16 w-auto object-contain" src={settings.logoUrl} alt="Company Logo"/> :
                                <div className="h-16 w-16 bg-gray-100 rounded-md flex items-center justify-center text-gray-400">No Logo</div>
                            }
                        </div>
                        <input type="file" ref={logoInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden"/>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => logoInputRef.current?.click()} className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">Change logo</button>
                            {settings.logoUrl && <button type="button" onClick={() => setSettings(p => ({...p, logoUrl: null}))} className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-red-600 shadow-sm ring-1 ring-inset ring-red-300 hover:bg-red-50">Remove</button>}
                        </div>
                    </div>
                </FormRow>
                <FormRow label="Theme Color">
                    <div className="relative flex items-center">
                        <input type="color" value={settings.themeColor} onChange={e => setSettings(p => ({...p, themeColor: e.target.value}))} className="p-1 h-10 w-10 block bg-white border border-gray-300 rounded-md cursor-pointer"/>
                        <span className="ml-3 px-3 py-2 rounded-md" style={{ backgroundColor: settings.themeColor, color: '#fff' }}>{settings.themeColor}</span>
                    </div>
                </FormRow>
                 <FormRow label="Default Terms & Conditions">
                    <textarea value={settings.defaultTerms} onChange={e => setSettings(p => ({...p, defaultTerms: e.target.value}))} rows={4} className="w-full p-2 border border-gray-300 rounded-md shadow-sm"/>
                </FormRow>
            </SettingsCard>
            <Toast message="Document settings saved!" show={showToast} onDismiss={() => setShowToast(false)} />
        </>
    )
};

const DefaultsTab = () => {
    const [savedSettings, setSavedSettings] = useSettings();
    const [settings, setSettings] = useState(savedSettings);
    const [showToast, setShowToast] = useState(false);
    const isDirty = useMemo(() => JSON.stringify(settings) !== JSON.stringify(savedSettings), [settings, savedSettings]);
    
    const handleSave = () => { setSavedSettings(settings); setShowToast(true); };
    const handleReset = () => setSettings(savedSettings);
    const handleBankChange = (e: ChangeEvent<HTMLInputElement>) => setSettings(p => ({...p, defaultBankDetails: {...p.defaultBankDetails, [e.target.name]: e.target.value}}));

    return (
        <>
            <div className="space-y-8">
                 <SettingsCard title="Default Bank Details" description="This bank account will be pre-filled on new invoices." footer={
                    isDirty && <div className="flex justify-end gap-4"><button onClick={handleReset} className="px-4 py-2 bg-gray-200 rounded-md">Reset</button><button onClick={handleSave} className="px-4 py-2 bg-brand-primary text-white rounded-md">Save Changes</button></div>
                }>
                    <FormRow label="Account Holder Name"><FormInput name="accountHolderName" value={settings.defaultBankDetails.accountHolderName} onChange={handleBankChange} /></FormRow>
                    <FormRow label="Bank Name"><FormInput name="bankName" value={settings.defaultBankDetails.bankName} onChange={handleBankChange} /></FormRow>
                    <FormRow label="Account Number"><FormInput name="accountNumber" value={settings.defaultBankDetails.accountNumber} onChange={handleBankChange} /></FormRow>
                    <FormRow label="IFSC Code"><FormInput name="ifscCode" value={settings.defaultBankDetails.ifscCode} onChange={handleBankChange} /></FormRow>
                </SettingsCard>

                <SettingsCard title="Lorry Receipt Defaults" description="Set default values for new Lorry Receipts to save time." footer={
                    isDirty && <div className="flex justify-end gap-4"><button onClick={handleReset} className="px-4 py-2 bg-gray-200 rounded-md">Reset</button><button onClick={handleSave} className="px-4 py-2 bg-brand-primary text-white rounded-md">Save Changes</button></div>
                }>
                     <FormRow label="Default Risk Type">
                        <select value={settings.defaultRiskType} onChange={e => setSettings(p => ({...p, defaultRiskType: e.target.value as LorryReceipt['riskType']}))} className="w-full p-2 border border-gray-300 rounded-md">
                            <option>AT OWNER'S RISK</option>
                            <option>AT CARRIER'S RISK</option>
                        </select>
                    </FormRow>
                    <FormRow label="Default Remarks">
                        <FormInput name="defaultRemarks" value={settings.defaultRemarks} onChange={e => setSettings(p => ({...p, defaultRemarks: e.target.value}))}/>
                    </FormRow>
                </SettingsCard>
            </div>
            <Toast message="Default settings saved!" show={showToast} onDismiss={() => setShowToast(false)} />
        </>
    );
};

const DataManagementTab = () => {
    const { clients, lorryReceipts, invoices, suppliers, tripNotes, payments, supplierPayments } = useTransport();
    const [isResetDataModalOpen, setIsResetDataModalOpen] = useState(false);
    const [isResetSettingsModalOpen, setIsResetSettingsModalOpen] = useState(false);

    const clientLedger = useMemo(() => {
        const clientData: { [key: string]: { name: string, totalDebits: number, totalCredits: number, balance: number } } = {};
        clients.forEach(c => {
            clientData[c.id] = { name: c.name, totalDebits: 0, totalCredits: 0, balance: 0 };
        });

        invoices.forEach(inv => {
            if (clientData[inv.clientId]) {
                clientData[inv.clientId].totalDebits += inv.totalAmount;
            }
        });
        payments.forEach(p => {
            const inv = invoices.find(i => i.id === p.invoiceId);
            if (inv && clientData[inv.clientId]) {
                clientData[inv.clientId].totalCredits += p.amount;
            }
        });

        return Object.values(clientData).map(data => ({
            name: data.name,
            totalDebits: data.totalDebits,
            totalCredits: data.totalCredits,
            balance: data.totalDebits - data.totalCredits,
        })).filter(c => c.totalDebits > 0 || c.totalCredits > 0);
    }, [clients, invoices, payments]);

    const supplierLedger = useMemo(() => {
        const supplierData: { [key: string]: { name: string, totalFreight: number, totalPaid: number, balance: number } } = {};
        suppliers.forEach(s => {
            supplierData[s.id] = { name: s.name, totalFreight: 0, totalPaid: 0, balance: 0 };
        });

        tripNotes.forEach(tn => {
            if (supplierData[tn.supplierId]) {
                supplierData[tn.supplierId].totalFreight += tn.totalFreight;
            }
        });

        supplierPayments.forEach(sp => {
            const tn = tripNotes.find(t => t.id === sp.tripNoteId);
            if (tn && supplierData[tn.supplierId]) {
                supplierData[tn.supplierId].totalPaid += sp.amount;
            }
        });
        
        return Object.values(supplierData).map(data => ({
            name: data.name,
            totalFreight: data.totalFreight,
            totalPaid: data.totalPaid,
            balance: data.totalPaid - data.totalFreight,
        })).filter(s => s.totalFreight > 0 || s.totalPaid > 0);
    }, [suppliers, tripNotes, supplierPayments]);

    const handleExportClientLedger = () => {
        const formattedData = clientLedger.map(item => ({
            'Client Name': item.name,
            'Total Debits (₹)': item.totalDebits,
            'Total Credits (₹)': item.totalCredits,
            'Balance (₹)': `${Math.abs(item.balance).toLocaleString('en-IN')} ${item.balance >= 0 ? 'Dr' : 'Cr'}`
        }));
        exportToCSV(formattedData, 'Client_Ledger_Summary_Full.csv');
    };

    const handleExportSupplierLedger = () => {
        const formattedData = supplierLedger.map(item => ({
            'Supplier Name': item.name,
            'Total Freight (₹)': item.totalFreight,
            'Total Paid (₹)': item.totalPaid,
            'Balance (₹)': `${Math.abs(item.balance).toLocaleString('en-IN')} ${item.balance >= 0 ? 'Cr' : 'Dr'}`
        }));
        exportToCSV(formattedData, 'Supplier_Ledger_Summary_Full.csv');
    };

    const handleResetAllData = () => {
        const keysToKeep = ['companySettings', 'companyInfo'];
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && !keysToKeep.includes(key)) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        alert('All transactional data has been cleared. The page will now reload.');
        window.location.reload();
    };

    const handleResetSettings = () => {
        localStorage.removeItem('companySettings');
        localStorage.removeItem('companyInfo');
        alert('All settings have been reset to default. The page will now reload.');
        window.location.reload();
    };


    return (
        <div className="space-y-8">
            <SettingsCard title="Export Data">
                <p className="text-sm text-gray-500 mb-4 px-6">Download your data in CSV format for backups or external use.</p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 px-6">
                    <button onClick={() => exportToCSV(clients, 'clients.csv')} className="p-3 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100">Export Clients</button>
                    <button onClick={() => exportToCSV(lorryReceipts, 'lorry_receipts.csv')} className="p-3 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100">Export LRs</button>
                    <button onClick={() => exportToCSV(invoices, 'invoices.csv')} className="p-3 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100">Export Invoices</button>
                    <button onClick={() => exportToCSV(suppliers, 'suppliers.csv')} className="p-3 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100">Export Suppliers</button>
                    <button onClick={() => exportToCSV(tripNotes, 'trip_notes.csv')} className="p-3 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100">Export Trip Notes</button>
                    <button onClick={handleExportClientLedger} className="p-3 bg-teal-50 text-teal-700 rounded-md hover:bg-teal-100">Export Client Ledger</button>
                    <button onClick={handleExportSupplierLedger} className="p-3 bg-teal-50 text-teal-700 rounded-md hover:bg-teal-100">Export Supplier Ledger</button>
                </div>
            </SettingsCard>
             <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-r-lg">
                <h3 className="text-lg font-medium text-red-800">Danger Zone</h3>
                <div className="mt-4 space-y-4">
                    <div>
                        <button onClick={() => setIsResetSettingsModalOpen(true)} className="px-4 py-2 bg-red-600 text-white text-sm rounded-md shadow hover:bg-red-700">Reset Settings</button>
                        <p className="text-sm text-red-600 mt-1">Resets company info, branding and defaults to their original state.</p>
                    </div>
                    <div>
                        <button onClick={() => setIsResetDataModalOpen(true)} className="px-4 py-2 bg-red-800 text-white text-sm rounded-md shadow hover:bg-red-900">Clear All Transactional Data</button>
                         <p className="text-sm text-red-600 mt-1">Deletes all clients, LRs, invoices, and trips. This cannot be undone.</p>
                    </div>
                </div>
            </div>
            <Modal isOpen={isResetDataModalOpen} onClose={() => setIsResetDataModalOpen(false)} title="Confirm Clear Data">
                <p className="text-sm text-gray-600">Are you absolutely sure? This will delete all your clients, LRs, invoices, and trips. <strong className="text-red-600">This action cannot be undone.</strong></p>
                 <div className="flex justify-end gap-3 pt-4 mt-4 border-t">
                    <button onClick={() => setIsResetDataModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
                    <button onClick={handleResetAllData} className="px-4 py-2 bg-red-600 text-white rounded">Yes, Delete All Data</button>
                </div>
            </Modal>
            <Modal isOpen={isResetSettingsModalOpen} onClose={() => setIsResetSettingsModalOpen(false)} title="Confirm Reset Settings">
                <p className="text-sm text-gray-600">Are you sure you want to reset all settings to their default values? Your company profile, branding, and defaults will be lost.</p>
                 <div className="flex justify-end gap-3 pt-4 mt-4 border-t">
                    <button onClick={() => setIsResetSettingsModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
                    <button onClick={handleResetSettings} className="px-4 py-2 bg-red-600 text-white rounded">Yes, Reset Settings</button>
                </div>
            </Modal>
        </div>
    );
};


export const Settings = () => {
    const [activeTab, setActiveTab] = useState('profile');

    const tabs = [
        { id: 'profile', label: 'Company Profile' },
        { id: 'documents', label: 'Documents' },
        { id: 'defaults', label: 'Defaults' },
        { id: 'data', label: 'Data Management' },
    ];
    
    const renderContent = () => {
        switch (activeTab) {
            case 'profile': return <CompanyProfileTab />;
            case 'documents': return <DocumentsTab />;
            case 'defaults': return <DefaultsTab />;
            case 'data': return <DataManagementTab />;
            default: return null;
        }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Settings</h1>

            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm focus:outline-none ${
                                activeTab === tab.id
                                ? 'border-brand-primary text-brand-primary'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>
            
            <div className="mt-8">
                {renderContent()}
            </div>
        </div>
    );
};