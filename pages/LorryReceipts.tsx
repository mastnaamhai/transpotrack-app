import React, { useState, ReactNode, ChangeEvent, useMemo, useRef, useEffect } from 'react';
import { useTransport } from '../context/TransportContext';
import { Modal } from '../components/Modal';
import { Client, MaterialDetail, LorryReceipt, Address, GoodsInvoice, EWayBill, OtherCharge, InvoiceStatus, Attachment, LorryReceiptPayment } from '../types';
import { PlusIcon, TrashIcon, SearchIcon, DownloadIcon, PrinterIcon, EyeIcon, ShareIcon, SortAscIcon, SortDescIcon, FilterIcon, ArrowLeftIcon, ChevronDownIcon, DocumentDuplicateIcon, XCircleIcon, BookOpenIcon } from '../components/icons';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useSettings } from '../hooks/useSettings';
import { defaultCompanyInfo } from '../companyInfo';
import jsPDF from 'jspdf';
import { useNavigate } from 'react-router-dom';


// --- Reusable UI Components for Form ---

const Card = ({ title, children, className = '' }: { title?: string, children: ReactNode, className?: string }) => (
    <div className={`bg-white p-4 rounded-lg shadow-sm ${className}`}>
        {title && <h3 className="text-base font-bold text-gray-500 mb-4 uppercase tracking-wider">{title}</h3>}
        <div className="space-y-4">
            {children}
        </div>
    </div>
);

const SegmentedControl = ({ options, selected, onSelect }: { options: string[], selected: string, onSelect: (option: string) => void }) => (
    <div className="flex border border-gray-200 rounded-md overflow-hidden bg-gray-50">
        {options.map(option => (
            <button
                key={option}
                type="button"
                onClick={() => onSelect(option)}
                className={`flex-1 px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none ${selected === option ? 'bg-brand-primary text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}
            >
                {option}
            </button>
        ))}
    </div>
);

const FormInput = ({ label, name, value, onChange, onBlur, onFocus, placeholder = '', type = 'text', required = false, children = null, step, autoComplete = 'on' }: { label: string, name: string, value: string | number, onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void, onBlur?: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void, onFocus?: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void, placeholder?: string, type?: string, required?: boolean, children?: ReactNode, step?: string, autoComplete?: string }) => (
    <div>
        <label htmlFor={name} className="block text-base font-medium text-gray-700 mb-1">{label}</label>
        <div className="flex items-center">
            {type === 'textarea' ? (
                <textarea
                    id={name}
                    name={name}
                    value={value}
                    onChange={onChange}
                    onBlur={onBlur}
                    onFocus={onFocus}
                    placeholder={placeholder}
                    required={required}
                    rows={3}
                    autoComplete={autoComplete}
                    className="flex-grow w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-brand-secondary focus:border-brand-secondary"
                />
            ) : (
                <input
                    type={type}
                    id={name}
                    name={name}
                    value={value}
                    onChange={onChange}
                    onBlur={onBlur}
                    onFocus={onFocus}
                    placeholder={placeholder}
                    required={required}
                    step={step}
                    autoComplete={autoComplete}
                    className="flex-grow w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-brand-secondary focus:border-brand-secondary"
                />
            )}
            {children}
        </div>
    </div>
);

const DetailLink = ({ children, onClick }: { children: ReactNode, onClick: () => void }) => (
    <button type="button" onClick={onClick} className="text-sm font-medium text-brand-primary hover:underline">
        {children}
    </button>
);


// --- Create LR Form Component ---

const initialMaterial: MaterialDetail = {
    name: '', packagingType: '', articleCount: 1, actualWeight: 0, actualWeightUnit: 'KGS',
    chargedWeight: 0, chargedWeightUnit: 'KGS', rate: 0, rateUnit: 'Per KGS', hsnCode: ''
};
const initialAddress: Address = { name: '', gstin: '', contact: '', address: '', city: '', state: '', country: 'India', pinCode: '', email: '' };
const initialGoodsInvoice: GoodsInvoice = { invoiceNumber: '', date: new Date().toISOString().split('T')[0], amount: 0 };
const initialEWayBill: EWayBill = { ewbNumber: '', expiryDate: new Date().toISOString().split('T')[0] };
const initialOtherCharge: OtherCharge = { name: '', amount: 0 };


const getInitialFormData = (settings: ReturnType<typeof useSettings>[0]): Omit<LorryReceipt, 'id' | 'totalAmount' | 'amountPaid'> => ({
    lrNumber: `LR${Date.now().toString().slice(-6)}`,
    date: new Date().toISOString().split('T')[0],
    consignor: { ...initialAddress },
    consignee: { ...initialAddress },
    loadingAddresses: [{ ...initialAddress }],
    deliveryAddresses: [{ ...initialAddress }],
    loadingAddressSameAsConsignor: true,
    deliveryAddressSameAsConsignee: true,
    deliveryType: 'Door',
    truckNumber: '', from: '', to: '', vehicleType: '',
    weightGuarantee: 0, weightGuaranteeUnit: 'KGS',
    driver: { name: '', licenseNumber: '', contact: '' },
    loadType: 'Full Load',
    materials: [initialMaterial],
    goodsInvoiceType: 'As per Invoice',
    goodsInvoices: [initialGoodsInvoice],
    eWayBills: [initialEWayBill],
    showInvoiceInColumn: 'Consignor',
    freightType: 'Paid',
    basicFreight: 0,
    otherCharges: [],
    gstDetails: { cgst: 0, sgst: 0, igst: 0 },
    advanceDetails: { amount: 0, mode: 'Bank Transfer' },
    tdsDetails: { percentage: 0 },
    freightPayBy: 'Consignor',
    hideFreight: false,
    insurance: 'Not Insured',
    insuranceDetails: {
        company: '',
        policyNumber: '',
        date: new Date().toISOString().split('T')[0],
        amount: 0,
        notes: ''
    },
    riskType: settings.defaultRiskType,
    modeOfTransport: 'By Road',
    demurrage: { charge: 0, chargeUnit: 'Per Hour', applicableAfter: 1, applicableAfterUnit: 'hour', loadingDate: '', reportingDate: '' },
    remarks: settings.defaultRemarks,
    status: 'Scheduled',
    termsAndConditions: settings.defaultTerms,
});

const SpinnerIcon = ({ className = 'text-brand-primary' }: { className?: string }) => (
    <svg className={`animate-spin h-5 w-5 ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const AddressFields = ({ address, onAddressChange, onPincodeBlur, isPincodeLoading, partyNameLabel, onNameChange, onNameFocus, onNameBlur }: {
    address: Address;
    onAddressChange: (field: string, value: string) => void;
    onPincodeBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
    isPincodeLoading: boolean;
    partyNameLabel: string;
    onNameChange?: (e: ChangeEvent<HTMLInputElement>) => void;
    onNameFocus?: () => void;
    onNameBlur?: () => void;
}) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormInput 
            label={partyNameLabel} 
            name="name" 
            value={address.name} 
            onChange={onNameChange || (e => onAddressChange('name', e.target.value))}
            onFocus={onNameFocus as any}
            onBlur={onNameBlur as any}
            autoComplete="off"
        />
        <FormInput label="GST number" name="gstin" value={address.gstin} onChange={e => onAddressChange('gstin', e.target.value)} />
        <FormInput label="Contact Number" name="contact" value={address.contact} onChange={e => onAddressChange('contact', e.target.value)} />
        <FormInput label="Address" name="address" value={address.address} onChange={e => onAddressChange('address', e.target.value)} />
        <FormInput label="City" name="city" value={address.city} onChange={e => onAddressChange('city', e.target.value)} />
        <FormInput label="State" name="state" value={address.state} onChange={e => onAddressChange('state', e.target.value)} />
        <FormInput label="Country" name="country" value={address.country} onChange={e => onAddressChange('country', e.target.value)} />
        <FormInput label="Pin Code" name="pinCode" value={address.pinCode} onChange={e => onAddressChange('pinCode', e.target.value)} onBlur={onPincodeBlur}>
            {isPincodeLoading && <div className="ml-2"><SpinnerIcon /></div>}
        </FormInput>
    </div>
);

type LorryFormData = Omit<LorryReceipt, 'id' | 'totalAmount' | 'amountPaid'>;

interface CreateLorryReceiptProps {
    onSuccess: (newLr: LorryReceipt) => void;
    onBack: () => void;
    lrToDuplicate?: LorryReceipt | null;
}

const hsnData = [
    { code: '5201', name: 'Raw Cotton' },
    { code: '1006', name: 'Rice' },
    { code: '0804', name: 'Mangoes, Guavas, Mangoosteens' },
    { code: '8471', name: 'Laptops/Computers' },
    { code: '8703', name: 'Cars' },
    { code: '6109', name: 'T-shirts, singlets and other vests, knitted or crocheted' },
    { code: '7214', name: 'Iron or Non-alloy Steel Bars' },
    { code: '3004', name: 'Medicaments' },
    { code: '9403', name: 'Wooden Furniture' },
    { code: '4820', name: 'Registers, account books, note books' },
    { code: '2202', name: 'Waters, including mineral waters and aerated waters' },
];

const CreateLorryReceipt = ({ onSuccess, onBack, lrToDuplicate }: CreateLorryReceiptProps) => {
    const { clients, addLorryReceipt, lorryReceipts } = useTransport();
    const [settings] = useSettings();
    const [selectingFor, setSelectingFor] = useState<'consignor' | 'consignee' | null>(null);
    const [isPincodeLoading, setIsPincodeLoading] = useState({ consignor: false, consignee: false, loadingAddresses: [false], deliveryAddresses: [false] });
    const [formData, setFormData] = useState<LorryFormData>(() => getInitialFormData(settings));
    const [activeMaterialIndex, setActiveMaterialIndex] = useState<number | null>(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const initialDataRef = useRef<LorryFormData>(formData);
    const [activeSuggestionBox, setActiveSuggestionBox] = useState<'consignor' | 'consignee' | null>(null);


    useEffect(() => {
        let initialData;
        if (lrToDuplicate) {
            const newFormData = { ...lrToDuplicate };
            // @ts-ignore
            delete newFormData.id;
            // @ts-ignore
            delete newFormData.totalAmount;
            
            initialData = {
                ...(newFormData as LorryFormData),
                lrNumber: `LR${Date.now().toString().slice(-6)}`,
                date: new Date().toISOString().split('T')[0],
                status: 'Scheduled',
                invoiceId: null,
            };
        } else {
            initialData = getInitialFormData(settings);
        }
        setFormData(initialData);
        initialDataRef.current = initialData;
    }, [lrToDuplicate, settings]);

    const isFormDirty = useMemo(() => {
        return JSON.stringify(formData) !== JSON.stringify(initialDataRef.current);
    }, [formData]);

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isFormDirty) {
                e.preventDefault();
                e.returnValue = ''; // Required for modern browsers
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [isFormDirty]);


    // UI Toggles
    const [toggles, setToggles] = useState({
        consignorEmail: false, consigneeEmail: false, goodsInvoice: false, ewayBill: false,
        driverDetails: false, otherCharges: false, gstDetails: false, advanceDetails: false, tdsDetails: false
    });
    const handleToggle = (key: keyof typeof toggles) => setToggles(p => ({...p, [key]: !p[key]}));


    const handleInputChange = <T extends keyof LorryFormData>(section: T, field: keyof LorryFormData[T], value: any) => {
        setFormData(prev => ({ ...prev, [section]: { ...(prev[section] as any), [field]: value } }));
    };
    
    const handleRootChange = (field: keyof LorryFormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleGenericArrayChange = (arrName: 'materials' | 'loadingAddresses' | 'deliveryAddresses' | 'goodsInvoices' | 'eWayBills' | 'otherCharges', index: number, field: string, value: any) => {
        const newArr = [...(formData[arrName] as any[])];
        newArr[index] = { ...newArr[index], [field]: value };
        handleRootChange(arrName, newArr);
    };

    const addGenericItem = (arrName: 'materials' | 'loadingAddresses' | 'deliveryAddresses' | 'goodsInvoices' | 'eWayBills' | 'otherCharges', initialItem: any) => {
        handleRootChange(arrName, [...(formData[arrName] as any[]), initialItem]);
         if (arrName === 'loadingAddresses') setIsPincodeLoading(prev => ({...prev, loadingAddresses: [...prev.loadingAddresses, false]}));
         if (arrName === 'deliveryAddresses') setIsPincodeLoading(prev => ({...prev, deliveryAddresses: [...prev.deliveryAddresses, false]}));
    };
    
    const removeGenericItem = (arrName: 'materials' | 'loadingAddresses' | 'deliveryAddresses' | 'goodsInvoices' | 'eWayBills' | 'otherCharges', index: number) => {
        const currentArr = formData[arrName] as any[];
        if (currentArr.length <= 1 && (arrName === 'materials' || arrName === 'loadingAddresses' || arrName === 'deliveryAddresses')) return;
        handleRootChange(arrName, currentArr.filter((_, i) => i !== index));
        if (arrName === 'loadingAddresses') setIsPincodeLoading(prev => ({...prev, loadingAddresses: prev.loadingAddresses.filter((_, i) => i !== index)}));
        if (arrName === 'deliveryAddresses') setIsPincodeLoading(prev => ({...prev, deliveryAddresses: prev.deliveryAddresses.filter((_, i) => i !== index)}));
    };


    const openClientModal = (type: 'consignor' | 'consignee') => setSelectingFor(type);

    const onClientSelect = (client: Client) => {
        if (!selectingFor) return;
        const [address, ...rest] = client.address.split(',');
        const fullAddress = { ...initialAddress, name: client.name, gstin: client.gstin, address: address.trim(), city: rest.join(',').trim() };
        handleRootChange(selectingFor, fullAddress);
        setSelectingFor(null);
    };

    const suggestions = useMemo(() => {
        if (!activeSuggestionBox) return [];
        const query = formData[activeSuggestionBox].name.toLowerCase();
        if (query.length < 2) return [];
        return clients.filter(c => c.name.toLowerCase().includes(query));
    }, [activeSuggestionBox, formData.consignor.name, formData.consignee.name, clients]);

    const handleSuggestionSelect = (party: 'consignor' | 'consignee', client: Client) => {
        const parts = client.address.split(',').map(p => p.trim());
        const address: Address = {
            name: client.name,
            gstin: client.gstin,
            contact: client.contactNumber || '',
            address: parts[0] || '',
            city: parts[1] || '',
            state: parts[2] || '',
            pinCode: parts[3] || '',
            country: 'India',
            email: ''
        };
        handleRootChange(party, address);
        setActiveSuggestionBox(null);
    };


    const fetchLocationFromPincode = async (pincode: string, section: 'consignor' | 'consignee' | 'loadingAddress' | 'deliveryAddress', index: number = 0) => {
        if (!/^\d{6}$/.test(pincode)) return;

        const setLoading = (isLoading: boolean) => {
             const key = section.replace('Address', 'Addresses') as 'loadingAddresses' | 'deliveryAddresses';
             if (section.includes('Address')) {
                setIsPincodeLoading(prev => { const newLoading = [...prev[key]]; newLoading[index] = isLoading; return { ...prev, [key]: newLoading }; });
            } else {
                setIsPincodeLoading(prev => ({ ...prev, [section]: isLoading }));
            }
        };

        const updateAddress = (city: string, state: string) => {
            if (section === 'loadingAddress') {
                handleGenericArrayChange('loadingAddresses', index, 'city', city);
                handleGenericArrayChange('loadingAddresses', index, 'state', state);
            } else if (section === 'deliveryAddress') {
                handleGenericArrayChange('deliveryAddresses', index, 'city', city);
                handleGenericArrayChange('deliveryAddresses', index, 'state', state);
            } else {
                handleInputChange(section, 'city', city);
                handleInputChange(section, 'state', state);
            }
        }
        
        setLoading(true);
        try {
            const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
            const data = await response.json();
            if (data && data[0]?.Status === 'Success' && data[0]?.PostOffice?.length > 0) {
                const { District, State } = data[0].PostOffice[0];
                updateAddress(District, State);
            }
        } catch (error) {
            console.error('Failed to fetch pincode data:', error);
        } finally {
            setLoading(false);
        }
    };
    
    const handleAddressPincodeBlur = (e: React.FocusEvent<HTMLInputElement>, section: 'consignor' | 'consignee') => fetchLocationFromPincode(e.target.value, section);
    const handleMultiAddressPincodeBlur = (e: React.FocusEvent<HTMLInputElement>, section: 'loadingAddress' | 'deliveryAddress', index: number) => fetchLocationFromPincode(e.target.value, section, index);

    useEffect(() => {
        if (formData.loadingAddressSameAsConsignor) {
            handleRootChange('loadingAddresses', [{...formData.consignor}]);
        }
    }, [formData.consignor, formData.loadingAddressSameAsConsignor]);

    useEffect(() => {
        if (formData.deliveryAddressSameAsConsignee) {
            handleRootChange('deliveryAddresses', [{...formData.consignee}]);
        }
    }, [formData.consignee, formData.deliveryAddressSameAsConsignee]);
    
    const calculateTotalAmount = () => {
        const freight = formData.basicFreight || 0;
        const other = formData.otherCharges.reduce((sum, charge) => sum + (charge.amount || 0), 0);
        const gst = formData.gstDetails ? (formData.gstDetails.cgst || 0) + (formData.gstDetails.sgst || 0) + (formData.gstDetails.igst || 0) : 0;
        return freight + other + gst;
    };


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const totalAmount = calculateTotalAmount();
        const newLR = addLorryReceipt({ ...formData, totalAmount });
        initialDataRef.current = formData; // Reset dirty state on successful submit
        onSuccess(newLR);
    };

    return (
        <div className="p-4 sm:p-6">
            <button onClick={() => isFormDirty ? setIsConfirmModalOpen(true) : onBack()} className="flex items-center text-sm font-medium text-brand-primary hover:underline mb-4">
                <ArrowLeftIcon className="w-4 h-4 mr-1"/> Back to Lorry Receipts
            </button>
            <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Header Section */}
                <div className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <FormInput label="LR Number" name="lrNumber" value={formData.lrNumber} onChange={e => handleRootChange('lrNumber', e.target.value)} required />
                        <FormInput label="Date" name="date" type="date" value={String(formData.date).split('T')[0]} onChange={e => handleRootChange('date', e.target.value)} required />
                        <FormInput label="From" name="from" value={formData.from} onChange={e => handleRootChange('from', e.target.value)} required />
                        <FormInput label="To" name="to" value={formData.to} onChange={e => handleRootChange('to', e.target.value)} required />
                        <FormInput label="Truck Number" name="truckNumber" value={formData.truckNumber} onChange={e => handleRootChange('truckNumber', e.target.value)} required />
                        <FormInput label="Vehicle Type" name="vehicleType" value={formData.vehicleType} onChange={e => handleRootChange('vehicleType', e.target.value)} />
                        <FormInput label="Weight Guarantee (Kgs)" name="weightGuarantee" type="number" value={formData.weightGuarantee} onChange={e => handleRootChange('weightGuarantee', Number(e.target.value))} />
                         <div>
                            <label className="block text-base font-medium text-gray-700 mb-1">Load Type</label>
                            <SegmentedControl options={['Full Load', 'Part Load']} selected={formData.loadType} onSelect={val => handleRootChange('loadType', val as any)} />
                        </div>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-6">
                        <Card title="Parties">
                             <div className="border p-3 rounded-md">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-semibold text-gray-800">Consignor</h4>
                                    <button type="button" onClick={() => openClientModal('consignor')} className="text-sm text-brand-primary hover:underline">Select from Clients</button>
                                </div>
                                 <div className="relative">
                                    <AddressFields 
                                        address={formData.consignor} 
                                        onAddressChange={(f, v) => handleInputChange('consignor', f as any, v)} 
                                        onPincodeBlur={e => handleAddressPincodeBlur(e, 'consignor')} 
                                        isPincodeLoading={isPincodeLoading.consignor} 
                                        partyNameLabel="Party Name"
                                        onNameChange={(e) => handleInputChange('consignor', 'name', e.target.value)}
                                        onNameFocus={() => setActiveSuggestionBox('consignor')}
                                        onNameBlur={() => setTimeout(() => setActiveSuggestionBox(null), 200)}
                                    />
                                    {activeSuggestionBox === 'consignor' && suggestions.length > 0 && (
                                        <ul className="absolute z-20 w-full md:w-1/2 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto mt-1">
                                            {suggestions.map(client => (
                                                <li
                                                    key={client.id}
                                                    onMouseDown={() => handleSuggestionSelect('consignor', client)}
                                                    className="px-3 py-2 cursor-pointer hover:bg-gray-100"
                                                >
                                                    <p className="font-semibold">{client.name}</p>
                                                    <p className="text-xs text-gray-500">{client.address}</p>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                                <div className="mt-2"><DetailLink onClick={() => handleToggle('consignorEmail')}>+ Add Email</DetailLink></div>
                                {toggles.consignorEmail && <div className="mt-2"><FormInput label="Email" name="email" value={formData.consignor.email || ''} onChange={e => handleInputChange('consignor', 'email', e.target.value)} /></div>}
                            </div>
                            <div className="border p-3 rounded-md">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-semibold text-gray-800">Consignee</h4>
                                    <button type="button" onClick={() => openClientModal('consignee')} className="text-sm text-brand-primary hover:underline">Select from Clients</button>
                                </div>
                                <div className="relative">
                                    <AddressFields
                                        address={formData.consignee}
                                        onAddressChange={(f, v) => handleInputChange('consignee', f as any, v)}
                                        onPincodeBlur={e => handleAddressPincodeBlur(e, 'consignee')}
                                        isPincodeLoading={isPincodeLoading.consignee}
                                        partyNameLabel="Party Name"
                                        onNameChange={(e) => handleInputChange('consignee', 'name', e.target.value)}
                                        onNameFocus={() => setActiveSuggestionBox('consignee')}
                                        onNameBlur={() => setTimeout(() => setActiveSuggestionBox(null), 200)}
                                    />
                                    {activeSuggestionBox === 'consignee' && suggestions.length > 0 && (
                                        <ul className="absolute z-20 w-full md:w-1/2 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto mt-1">
                                            {suggestions.map(client => (
                                                <li
                                                    key={client.id}
                                                    onMouseDown={() => handleSuggestionSelect('consignee', client)}
                                                    className="px-3 py-2 cursor-pointer hover:bg-gray-100"
                                                >
                                                    <p className="font-semibold">{client.name}</p>
                                                    <p className="text-xs text-gray-500">{client.address}</p>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                                <div className="mt-2"><DetailLink onClick={() => handleToggle('consigneeEmail')}>+ Add Email</DetailLink></div>
                                {toggles.consigneeEmail && <div className="mt-2"><FormInput label="Email" name="email" value={formData.consignee.email || ''} onChange={e => handleInputChange('consignee', 'email', e.target.value)} /></div>}
                            </div>
                        </Card>
                        
                        <Card title="Material Details">
                             {formData.materials.map((material, index) => (
                                <div key={index} className="border p-3 rounded-md space-y-4 relative">
                                    {formData.materials.length > 1 && <button type="button" onClick={() => removeGenericItem('materials', index)} className="absolute top-2 right-2 text-red-500 hover:text-red-700"><TrashIcon className="w-5 h-5"/></button>}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormInput label="Material Name" name="name" value={material.name} onChange={e => handleGenericArrayChange('materials', index, 'name', e.target.value)} />
                                        <div className="relative">
                                            <FormInput 
                                                label="HSN Code" 
                                                name="hsnCode" 
                                                value={material.hsnCode || ''} 
                                                onChange={e => handleGenericArrayChange('materials', index, 'hsnCode', e.target.value)}
                                                onFocus={() => setActiveMaterialIndex(index)}
                                                onBlur={() => setTimeout(() => setActiveMaterialIndex(null), 150)}
                                                autoComplete="off"
                                            />
                                            {activeMaterialIndex === index && (
                                                <ul className="absolute z-10 w-full bg-white border rounded-md shadow-lg max-h-40 overflow-y-auto mt-1">
                                                    {hsnData
                                                        .filter(hsn => hsn.name.toLowerCase().includes((material.hsnCode || '').toLowerCase()) || hsn.code.includes(material.hsnCode || ''))
                                                        .map(hsn => (
                                                            <li 
                                                                key={hsn.code} 
                                                                onMouseDown={() => {
                                                                    handleGenericArrayChange('materials', index, 'hsnCode', hsn.code);
                                                                    handleGenericArrayChange('materials', index, 'name', hsn.name);
                                                                }}
                                                                className="px-3 py-2 cursor-pointer hover:bg-gray-100"
                                                            >
                                                                {hsn.code} - {hsn.name}
                                                            </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    </div>
                                    <FormInput label="Packaging Type" name="packagingType" value={material.packagingType} onChange={e => handleGenericArrayChange('materials', index, 'packagingType', e.target.value)} />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormInput label="Article Count" name="articleCount" type="number" value={material.articleCount} onChange={e => handleGenericArrayChange('materials', index, 'articleCount', Number(e.target.value))} />
                                        <FormInput label="Actual Weight" name="actualWeight" type="number" value={material.actualWeight} onChange={e => handleGenericArrayChange('materials', index, 'actualWeight', Number(e.target.value))} step="0.01"/>
                                        <FormInput label="Charged Weight" name="chargedWeight" type="number" value={material.chargedWeight} onChange={e => handleGenericArrayChange('materials', index, 'chargedWeight', Number(e.target.value))} step="0.01"/>
                                        <FormInput label="Rate" name="rate" type="number" value={material.rate} onChange={e => handleGenericArrayChange('materials', index, 'rate', Number(e.target.value))} step="0.01"/>
                                    </div>
                                </div>
                            ))}
                            <button type="button" onClick={() => addGenericItem('materials', initialMaterial)} className="flex items-center text-sm font-medium text-brand-primary hover:underline"><PlusIcon className="w-4 h-4 mr-1"/> Add Material</button>
                        </Card>
                        
                        <Card title="Addresses">
                            <div className="border p-3 rounded-md">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-semibold text-gray-800">Loading Address</h4>
                                    <div className="flex items-center">
                                        <input type="checkbox" id="sameAsConsignor" checked={formData.loadingAddressSameAsConsignor} onChange={e => handleRootChange('loadingAddressSameAsConsignor', e.target.checked)} className="h-4 w-4 mr-2"/>
                                        <label htmlFor="sameAsConsignor" className="text-sm">Same as Consignor</label>
                                    </div>
                                </div>
                                {!formData.loadingAddressSameAsConsignor && formData.loadingAddresses?.map((address, index) => (
                                     <div key={index} className="space-y-4 relative pt-2">
                                        {formData.loadingAddresses && formData.loadingAddresses.length > 1 && <button type="button" onClick={() => removeGenericItem('loadingAddresses', index)} className="absolute top-2 right-2 text-red-500 hover:text-red-700"><TrashIcon className="w-5 h-5"/></button>}
                                        <AddressFields address={address} onAddressChange={(f, v) => handleGenericArrayChange('loadingAddresses', index, f, v)} onPincodeBlur={e => handleMultiAddressPincodeBlur(e, 'loadingAddress', index)} isPincodeLoading={isPincodeLoading.loadingAddresses[index]} partyNameLabel="Location Name" />
                                    </div>
                                ))}
                                {!formData.loadingAddressSameAsConsignor && <button type="button" onClick={() => addGenericItem('loadingAddresses', initialAddress)} className="mt-3 flex items-center text-sm font-medium text-brand-primary hover:underline"><PlusIcon className="w-4 h-4 mr-1"/> Add Loading Address</button>}
                            </div>
                            <div className="border p-3 rounded-md">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-semibold text-gray-800">Delivery Address</h4>
                                    <div className="flex items-center">
                                        <input type="checkbox" id="sameAsConsignee" checked={formData.deliveryAddressSameAsConsignee} onChange={e => handleRootChange('deliveryAddressSameAsConsignee', e.target.checked)} className="h-4 w-4 mr-2"/>
                                        <label htmlFor="sameAsConsignee" className="text-sm">Same as Consignee</label>
                                    </div>
                                </div>
                                 {!formData.deliveryAddressSameAsConsignee && formData.deliveryAddresses?.map((address, index) => (
                                     <div key={index} className="space-y-4 relative pt-2">
                                        {formData.deliveryAddresses && formData.deliveryAddresses.length > 1 && <button type="button" onClick={() => removeGenericItem('deliveryAddresses', index)} className="absolute top-2 right-2 text-red-500 hover:text-red-700"><TrashIcon className="w-5 h-5"/></button>}
                                        <AddressFields address={address} onAddressChange={(f, v) => handleGenericArrayChange('deliveryAddresses', index, f, v)} onPincodeBlur={e => handleMultiAddressPincodeBlur(e, 'deliveryAddress', index)} isPincodeLoading={isPincodeLoading.deliveryAddresses[index]} partyNameLabel="Location Name" />
                                    </div>
                                ))}
                                {!formData.deliveryAddressSameAsConsignee && <button type="button" onClick={() => addGenericItem('deliveryAddresses', initialAddress)} className="mt-3 flex items-center text-sm font-medium text-brand-primary hover:underline"><PlusIcon className="w-4 h-4 mr-1"/> Add Delivery Address</button>}
                            </div>
                        </Card>
                        
                        <Card>
                            <DetailLink onClick={() => handleToggle('goodsInvoice')}>+ Add Goods Invoice Details</DetailLink>
                            {toggles.goodsInvoice && <div className="pt-2 space-y-3">
                                {formData.goodsInvoices.map((inv, i) => (
                                    <div key={i} className="flex flex-col sm:flex-row gap-2 items-end">
                                        <FormInput label="Invoice No." name="invNo" value={inv.invoiceNumber} onChange={e => handleGenericArrayChange('goodsInvoices', i, 'invoiceNumber', e.target.value)}/>
                                        <FormInput label="Date" name="invDate" type="date" value={String(inv.date).split('T')[0]} onChange={e => handleGenericArrayChange('goodsInvoices', i, 'date', e.target.value)}/>
                                        <FormInput label="Amount" name="invAmt" type="number" value={inv.amount} onChange={e => handleGenericArrayChange('goodsInvoices', i, 'amount', Number(e.target.value))}/>
                                        <button type="button" onClick={() => removeGenericItem('goodsInvoices', i)} className="p-2.5 text-red-500 hover:text-red-700"><TrashIcon className="w-5 h-5"/></button>
                                    </div>
                                ))}
                                 <button type="button" onClick={() => addGenericItem('goodsInvoices', initialGoodsInvoice)} className="flex items-center text-sm font-medium text-brand-primary hover:underline"><PlusIcon className="w-4 h-4 mr-1"/> Add Invoice</button>
                            </div>}
                        </Card>

                        <Card>
                            <DetailLink onClick={() => handleToggle('ewayBill')}>+ Add E-Way Bill Details</DetailLink>
                            {toggles.ewayBill && <div className="pt-2 space-y-3">
                                {formData.eWayBills.map((ewb, i) => (
                                    <div key={i} className="flex flex-col sm:flex-row gap-2 items-end">
                                        <FormInput label="EWB No." name="ewbNo" value={ewb.ewbNumber} onChange={e => handleGenericArrayChange('eWayBills', i, 'ewbNumber', e.target.value)}/>
                                        <FormInput label="Expiry Date" name="ewbDate" type="date" value={String(ewb.expiryDate).split('T')[0]} onChange={e => handleGenericArrayChange('eWayBills', i, 'expiryDate', e.target.value)}/>
                                        <button type="button" onClick={() => removeGenericItem('eWayBills', i)} className="p-2.5 text-red-500 hover:text-red-700"><TrashIcon className="w-5 h-5"/></button>
                                    </div>
                                ))}
                                 <button type="button" onClick={() => addGenericItem('eWayBills', initialEWayBill)} className="flex items-center text-sm font-medium text-brand-primary hover:underline"><PlusIcon className="w-4 h-4 mr-1"/> Add E-Way Bill</button>
                            </div>}
                        </Card>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                         <Card title="Freight Details">
                            <div>
                                <label className="block text-base font-medium text-gray-700 mb-1">Freight Type</label>
                                <SegmentedControl options={['Paid', 'To Pay', 'To be billed']} selected={formData.freightType} onSelect={val => handleRootChange('freightType', val as any)} />
                            </div>
                            <FormInput label="Basic Freight" name="basicFreight" type="number" value={formData.basicFreight} onChange={e => handleRootChange('basicFreight', Number(e.target.value))} />
                             <div className="flex items-center">
                                <input type="checkbox" id="hideFreight" checked={formData.hideFreight} onChange={e => handleRootChange('hideFreight', e.target.checked)} className="h-4 w-4 mr-2"/>
                                <label htmlFor="hideFreight" className="text-sm">Hide Freight Amount on LR Copy</label>
                            </div>
                            
                            <DetailLink onClick={() => handleToggle('otherCharges')}>+ Add Other Charges</DetailLink>
                            {toggles.otherCharges && <div className="pt-2 space-y-3">
                                {formData.otherCharges.map((charge, i) => (
                                    <div key={i} className="flex gap-2 items-end">
                                        <FormInput label="Charge Name" name="chargeName" value={charge.name} onChange={e => handleGenericArrayChange('otherCharges', i, 'name', e.target.value)} />
                                        <FormInput label="Amount" name="chargeAmt" type="number" value={charge.amount} onChange={e => handleGenericArrayChange('otherCharges', i, 'amount', Number(e.target.value))} />
                                        <button type="button" onClick={() => removeGenericItem('otherCharges', i)} className="p-2.5 text-red-500 hover:text-red-700"><TrashIcon className="w-5 h-5"/></button>
                                    </div>
                                ))}
                                <button type="button" onClick={() => addGenericItem('otherCharges', initialOtherCharge)} className="flex items-center text-sm font-medium text-brand-primary hover:underline"><PlusIcon className="w-4 h-4 mr-1"/> Add Charge</button>
                            </div>}

                             <DetailLink onClick={() => handleToggle('gstDetails')}>+ Add GST Details</DetailLink>
                            {toggles.gstDetails && formData.gstDetails && <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                                <FormInput label="CGST" name="cgst" type="number" value={formData.gstDetails.cgst} onChange={e => handleInputChange('gstDetails', 'cgst', Number(e.target.value))} />
                                <FormInput label="SGST" name="sgst" type="number" value={formData.gstDetails.sgst} onChange={e => handleInputChange('gstDetails', 'sgst', Number(e.target.value))} />
                                <FormInput label="IGST" name="igst" type="number" value={formData.gstDetails.igst} onChange={e => handleInputChange('gstDetails', 'igst', Number(e.target.value))} />
                            </div>}
                            
                            <DetailLink onClick={() => handleToggle('advanceDetails')}>+ Add Advance Payment</DetailLink>
                            {toggles.advanceDetails && formData.advanceDetails && <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                <FormInput label="Advance Amount" name="advanceAmount" type="number" value={formData.advanceDetails.amount} onChange={e => handleInputChange('advanceDetails', 'amount', Number(e.target.value))} />
                                 <div>
                                    <label className="block text-base font-medium text-gray-700 mb-1">Mode</label>
                                    <select value={formData.advanceDetails.mode} onChange={e => handleInputChange('advanceDetails', 'mode', e.target.value)} className="w-full p-2 border border-gray-300 rounded-md">
                                        <option>Bank Transfer</option><option>Cheque</option><option>Cash</option>
                                    </select>
                                </div>
                            </div>}

                             <DetailLink onClick={() => handleToggle('tdsDetails')}>+ Add TDS Details</DetailLink>
                             {toggles.tdsDetails && formData.tdsDetails && <div className="pt-2">
                                <FormInput label="TDS Percentage (%)" name="tdsPercentage" type="number" value={formData.tdsDetails.percentage} onChange={e => handleInputChange('tdsDetails', 'percentage', Number(e.target.value))} />
                            </div>}
                        </Card>
                        
                        <Card title="Other Details">
                            <DetailLink onClick={() => handleToggle('driverDetails')}>+ Add Driver Details</DetailLink>
                            {toggles.driverDetails && formData.driver && <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                <FormInput label="Driver Name" name="driverName" value={formData.driver.name} onChange={e => handleInputChange('driver', 'name', e.target.value)} />
                                <FormInput label="License Number" name="licenseNumber" value={formData.driver.licenseNumber} onChange={e => handleInputChange('driver', 'licenseNumber', e.target.value)} />
                                <FormInput label="Contact Number" name="driverContact" value={formData.driver.contact} onChange={e => handleInputChange('driver', 'contact', e.target.value)} />
                            </div>}
                            
                            <div>
                                <label className="block text-base font-medium text-gray-700 mb-1">Insurance</label>
                                <SegmentedControl options={['Not Insured', 'Insured']} selected={formData.insurance} onSelect={val => handleRootChange('insurance', val as any)} />
                            </div>
                            {formData.insurance === 'Insured' && formData.insuranceDetails && (
                                <div className="space-y-4 border-t pt-4">
                                     <FormInput label="Insurance Company" name="insCompany" value={formData.insuranceDetails.company} onChange={e => handleInputChange('insuranceDetails', 'company', e.target.value)} />
                                     <FormInput label="Policy Number" name="insPolicy" value={formData.insuranceDetails.policyNumber} onChange={e => handleInputChange('insuranceDetails', 'policyNumber', e.target.value)} />
                                     <FormInput label="Policy Date" name="insDate" type="date" value={String(formData.insuranceDetails.date).split('T')[0]} onChange={e => handleInputChange('insuranceDetails', 'date', e.target.value)} />
                                     <FormInput label="Amount" name="insAmount" type="number" value={formData.insuranceDetails.amount} onChange={e => handleInputChange('insuranceDetails', 'amount', Number(e.target.value))} />
                                     <FormInput label="Notes" name="insNotes" type="textarea" value={formData.insuranceDetails.notes} onChange={e => handleInputChange('insuranceDetails', 'notes', e.target.value)} />
                                </div>
                            )}

                             <div>
                                <label className="block text-base font-medium text-gray-700 mb-1">Risk Type</label>
                                <SegmentedControl options={["AT OWNER'S RISK", "AT CARRIER'S RISK"]} selected={formData.riskType} onSelect={val => handleRootChange('riskType', val as any)} />
                            </div>
                             <FormInput label="Remarks" name="remarks" type="textarea" value={formData.remarks} onChange={e => handleRootChange('remarks', e.target.value)} />
                        </Card>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button type="submit" className="px-8 py-3 bg-brand-accent text-brand-primary font-bold rounded-lg shadow-lg hover:bg-yellow-500 transition-transform transform hover:scale-105">
                        Create Lorry Receipt
                    </button>
                </div>
            </form>
            
            <Modal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} title="Confirm Navigation">
                <p>Are you sure you want to go back? Any unsaved changes will be lost.</p>
                <div className="flex justify-end gap-3 pt-4 mt-4 border-t">
                    <button onClick={() => setIsConfirmModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300">Stay</button>
                    <button onClick={onBack} className="px-4 py-2 bg-brand-primary text-white rounded hover:bg-brand-secondary">Go Back</button>
                </div>
            </Modal>
            
            <Modal isOpen={!!selectingFor} onClose={() => setSelectingFor(null)} title="Select a Client">
                <ul className="space-y-2">
                    {clients.map(client => (
                        <li key={client.id} onClick={() => onClientSelect(client)} className="p-3 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors">
                            <p className="font-semibold text-gray-800">{client.name}</p>
                            <p className="text-sm text-gray-500">{client.address}</p>
                        </li>
                    ))}
                </ul>
            </Modal>
        </div>
    );
};

const LorryReceiptPreview = ({ lr, copyType }: { lr: LorryReceipt, copyType: string }) => {
    const [settings] = useSettings();
    const [companyInfo] = useLocalStorage('companyInfo', defaultCompanyInfo);

    return (
        <div className="bg-white p-2 text-base font-sans text-gray-800 border-2 border-black" style={{ fontFamily: 'monospace' }}>
            <div className="text-right font-bold">{copyType}</div>
            <div className="pb-1 border-b-2 border-black">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                        <tr>
                            <td style={{ width: '20%', verticalAlign: 'middle', paddingRight: '8px' }}>
                                {settings.logoUrl && <img src={settings.logoUrl} alt="Company Logo" style={{ height: '56px', width: 'auto', objectFit: 'contain' }} />}
                            </td>
                            <td style={{ width: '80%', textAlign: 'center', verticalAlign: 'middle' }}>
                                <h1 style={{ fontSize: '24px', fontWeight: 'bold', fontFamily: 'serif', color: '#A63A3A', margin: 0 }}>
                                    {companyInfo.name}
                                </h1>
                                <p style={{ fontSize: '12px', fontWeight: 600, margin: '2px 0' }}>
                                    {companyInfo.address}
                                </p>
                                <table style={{ width: '100%', fontSize: '12px', marginTop: '4px' }}>
                                    <tbody>
                                        <tr>
                                            <td style={{ textAlign: 'left', padding: '1px' }}><strong>E-Mail :-</strong> {companyInfo.email}</td>
                                            <td style={{ textAlign: 'right', padding: '1px' }}><strong>Web :-</strong> {companyInfo.website}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ textAlign: 'left', padding: '1px' }}><strong>PH :</strong> {companyInfo.phoneNumbers}</td>
                                            <td style={{ textAlign: 'right', padding: '1px' }}><strong>GSTIN:</strong> {companyInfo.gstin}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div className="flex justify-between border-b border-black">
                <div className="w-1/2 p-1 border-r border-black">
                    <p><strong>LR No:</strong> {lr.lrNumber}</p>
                </div>
                <div className="w-1/2 p-1">
                    <p><strong>Date:</strong> {new Date(lr.date).toLocaleDateString('en-GB')}</p>
                </div>
            </div>
            <div className="flex border-b border-black">
                <div className="w-1/2 p-1 border-r border-black">
                    <p className="font-bold">Consignor:</p>
                    <p>{lr.consignor.name}</p>
                    <p>{lr.consignor.address}, {lr.consignor.city}, {lr.consignor.state}</p>
                    <p>GSTIN: {lr.consignor.gstin}</p>
                </div>
                <div className="w-1/2 p-1">
                    <p className="font-bold">Consignee:</p>
                    <p>{lr.consignee.name}</p>
                    <p>{lr.consignee.address}, {lr.consignee.city}, {lr.consignee.state}</p>
                    <p>GSTIN: {lr.consignee.gstin}</p>
                </div>
            </div>
             <div className="flex border-b border-black">
                <div className="w-1/2 p-1 border-r border-black">
                    <p><strong>From:</strong> {lr.from}</p>
                </div>
                <div className="w-1/2 p-1">
                    <p><strong>To:</strong> {lr.to}</p>
                </div>
            </div>
            <table className="w-full border-collapse border-y border-black text-base">
                <thead className="text-sm">
                    <tr className="border-b border-black">
                        <th className="p-1 text-left border-r border-black">No. of Articles</th>
                        <th className="p-1 text-left border-r border-black">Description of Goods</th>
                        <th className="p-1 text-right border-r border-black">Actual Wt.</th>
                        <th className="p-1 text-right">Charged Wt.</th>
                    </tr>
                </thead>
                <tbody>
                    {lr.materials.map((m, i) => (
                        <tr key={i}>
                            <td className="p-1 border-r border-black">{m.articleCount} {m.packagingType}</td>
                            <td className="p-1 border-r border-black">{m.name}</td>
                            <td className="p-1 text-right border-r border-black">{m.actualWeight} {m.actualWeightUnit}</td>
                            <td className="p-1 text-right">{m.chargedWeight} {m.chargedWeightUnit}</td>
                        </tr>
    
                    ))}
                     <tr><td colSpan={4} className="p-1">&nbsp;</td></tr>
                     <tr><td colSpan={4} className="p-1">&nbsp;</td></tr>
                </tbody>
            </table>
            <div className="flex">
                <div className="w-1/2 p-1 border-r border-black">
                     <p><strong>Truck No:</strong> {lr.truckNumber}</p>
                     <p><strong>Risk Type:</strong> {lr.riskType}</p>
                     <p><strong>Freight Type:</strong> {lr.freightType}</p>
                     {!lr.hideFreight && <p><strong>Freight Amount:</strong> {(lr.totalAmount - (lr.gstDetails?.cgst || 0) - (lr.gstDetails?.sgst || 0) - (lr.gstDetails?.igst || 0)).toLocaleString('en-IN', {style: 'currency', currency: 'INR'})}</p>}
                </div>
                 <div className="w-1/2 p-1 text-sm whitespace-pre-line">
                    <p className="font-bold"><u>Terms & Conditions</u></p>
                    <p>{lr.termsAndConditions}</p>
                </div>
            </div>
            <div className="flex justify-between items-end mt-2 pt-2 border-t-2 border-black">
                <div className="text-left">
                    <p>Received the above goods in good condition.</p>
                    <br/>
                    <p>_________________________</p>
                    <p>Receiver's Signature</p>
                </div>
                <div className="text-right">
                    <p className="font-bold">For {companyInfo.name}</p>
                    <br/>
                    <p>_________________________</p>
                    <p>Authorised Signatory</p>
                </div>
            </div>
        </div>
    );
};

const SuccessScreen = ({ newLr, onDone, onNew, onDuplicate }: { newLr: LorryReceipt; onDone: () => void; onNew: () => void; onDuplicate: (lr: LorryReceipt) => void; }) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [settings] = useSettings();
    const [companyInfo] = useLocalStorage('companyInfo', defaultCompanyInfo);
    
    const handleAction = async (action: 'download' | 'print', copyType: string) => {
        setIsGenerating(true);
        try {
            const doc = generateLRPDF(newLr, `${copyType}'s Copy`, companyInfo, settings);
            if (action === 'download') {
                doc.save(`${newLr.lrNumber}_${copyType}.pdf`);
            } else { // print
                doc.autoPrint();
                window.open(doc.output('bloburl'), '_blank');
            }
        } catch (error) {
            console.error(`Error during ${action}:`, error);
            alert(`Could not ${action} the document.`);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="text-center p-6">
            <h2 className="text-2xl font-bold text-green-600 mb-2">Lorry Receipt Created Successfully!</h2>
            <p className="text-gray-600 mb-6">LR Number: <span className="font-semibold text-brand-primary">{newLr.lrNumber}</span></p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 text-left">
                {['Consignor', 'Consignee', 'Driver', 'Transporter'].map(copy => (
                    <div key={copy} className="border p-3 rounded-lg bg-gray-50">
                        <h3 className="font-semibold text-lg mb-3">{copy}'s Copy</h3>
                        <div className="flex flex-col space-y-2">
                           <button onClick={() => handleAction('print', copy)} disabled={isGenerating} className="flex items-center justify-center p-2 bg-white border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50">
                                <PrinterIcon className="w-4 h-4 mr-2"/> View / Print
                            </button>
                             <button onClick={() => handleAction('download', copy)} disabled={isGenerating} className="flex items-center justify-center p-2 bg-white border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50">
                                <DownloadIcon className="w-4 h-4 mr-2"/> Download PDF
                            </button>
                             <button disabled className="flex items-center justify-center p-2 bg-white border border-gray-300 rounded-md disabled:opacity-50 cursor-not-allowed">
                                <ShareIcon className="w-4 h-4 mr-2"/> Share
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex justify-center gap-4">
                <button onClick={onDone} className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">Done</button>
                <button onClick={() => onDuplicate(newLr)} className="px-6 py-2 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200">Duplicate LR</button>
                <button onClick={onNew} className="px-6 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-secondary">Create New LR</button>
            </div>
        </div>
    );
};

const AddLrPaymentModal = ({ lr, onClose }: { lr: LorryReceipt; onClose: () => void; }) => {
    const { addLorryReceiptPayment } = useTransport();
    const balanceDue = lr.totalAmount - (lr.amountPaid || 0);

    const [amount, setAmount] = useState(balanceDue > 0 ? Number(balanceDue.toFixed(2)) : 0);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [method, setMethod] = useState<'Cash' | 'Bank Transfer' | 'Cheque'>('Bank Transfer');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (amount <= 0) {
            alert('Amount must be positive.');
            return;
        }
        if (amount > balanceDue + 0.001) {
            alert('Payment amount cannot be greater than the balance due.');
            return;
        }

        addLorryReceiptPayment({
            lrId: lr.id,
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
        <Modal isOpen={true} onClose={onClose} title={`Add Payment for ${lr.lrNumber}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="bg-gray-50 p-3 rounded-md">
                    <p className="text-sm text-gray-500">Total Amount: <span className="font-semibold">{lr.totalAmount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span></p>
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

const LrPaymentHistoryModal = ({ lr, onClose }: { lr: LorryReceipt; onClose: () => void; }) => {
    const { lorryReceiptPayments } = useTransport();
    const paymentsForLr = lorryReceiptPayments
        .filter(p => p.lrId === lr.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <Modal isOpen={true} onClose={onClose} title={`Payment History for ${lr.lrNumber}`}>
            {paymentsForLr.length > 0 ? (
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
                            {paymentsForLr.map(p => (
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
                <p className="py-4 text-center text-gray-500">No payments recorded for this LR yet.</p>
            )}
             <div className="flex justify-end pt-4 mt-4 border-t">
                <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md">Close</button>
            </div>
        </Modal>
    );
};

const getLrPaymentStatusBadge = (lr: LorryReceipt) => {
    const amountPaid = lr.amountPaid || 0;
    
    if (lr.freightType === 'To be billed') {
      return <span className="px-2 py-1 text-xs font-medium text-blue-800 bg-blue-100 rounded-full">To be Billed</span>;
    }
    if (amountPaid >= lr.totalAmount) {
      return <span className="px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full">Paid</span>;
    }
    if (amountPaid > 0) {
      return <span className="px-2 py-1 text-xs font-medium text-yellow-800 bg-yellow-100 rounded-full">Partially Paid</span>;
    }
    return <span className="px-2 py-1 text-xs font-medium text-red-800 bg-red-100 rounded-full">Unpaid</span>;
};

const getStatusBadge = (status: LorryReceipt['status']) => {
    switch (status) {
        case 'Scheduled': return <span className="px-2 py-1 text-xs font-medium text-blue-800 bg-blue-100 rounded-full">{status}</span>;
        case 'In Transit': return <span className="px-2 py-1 text-xs font-medium text-yellow-800 bg-yellow-100 rounded-full">{status}</span>;
        case 'Delivered': return <span className="px-2 py-1 text-xs font-medium text-purple-800 bg-purple-100 rounded-full">{status}</span>;
        case 'Completed': return <span className="px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full">{status}</span>;
        case 'Cancelled': return <span className="px-2 py-1 text-xs font-medium text-gray-800 bg-gray-200 rounded-full">{status}</span>;
        default: return null;
    }
};


const LRList = ({ onNew, onDuplicate }: { onNew: () => void; onDuplicate: (lr: LorryReceipt) => void; }) => {
    const { lorryReceipts, getClientById, updateLorryReceipt } = useTransport();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [sortConfig, setSortConfig] = useState<{ key: keyof LorryReceipt | 'balance', direction: 'asc' | 'desc' } | null>({ key: 'date', direction: 'desc' });
    const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
    const actionMenuRef = useRef<HTMLDivElement>(null);
    const [selectedLrForCopies, setSelectedLrForCopies] = useState<LorryReceipt | null>(null);
    const [financialYearFilter, setFinancialYearFilter] = useState('All');
    const [previewLr, setPreviewLr] = useState<LorryReceipt | null>(null);
    const [isGeneratingCopy, setIsGeneratingCopy] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [paymentModalLr, setPaymentModalLr] = useState<LorryReceipt | null>(null);
    const [historyModalLr, setHistoryModalLr] = useState<LorryReceipt | null>(null);
    const [settings] = useSettings();
    const [companyInfo] = useLocalStorage('companyInfo', defaultCompanyInfo);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
                setOpenActionMenuId(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handlePreviewAction = async (action: 'download' | 'print') => {
        if (!previewLr || isGeneratingCopy) return;
        setIsGeneratingCopy(true);

        try {
            const doc = generateLRPDF(previewLr, 'Office Copy', companyInfo, settings);
            if (action === 'download') {
                doc.save(`${previewLr.lrNumber}_Office_Copy.pdf`);
            } else { // print
                doc.autoPrint();
                window.open(doc.output('bloburl'), '_blank');
            }
        } catch (error) {
            console.error(`Error during ${action}:`, error);
            alert(`Could not ${action} the document.`);
        } finally {
            setIsGeneratingCopy(false);
        }
    };

    const getFinancialYear = (dateStr: string) => {
        const date = new Date(dateStr);
        const year = date.getFullYear();
        const month = date.getMonth(); // 0-11
        // Financial year starts from April (month 3)
        return month >= 3 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
    };

    const financialYears = useMemo(() => {
        const years = new Set(lorryReceipts.map(lr => getFinancialYear(lr.date)));
        return ['All', ...Array.from(years).sort((a,b) => b.localeCompare(a))];
    }, [lorryReceipts]);

    const filteredLRs = useMemo(() => {
        let sortableItems = lorryReceipts.map(lr => ({
            ...lr,
            balance: lr.totalAmount - (lr.amountPaid || 0)
        }));

        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const aVal = a[sortConfig.key as keyof typeof a];
                const bVal = b[sortConfig.key as keyof typeof b];

                if (sortConfig.key === 'date') {
                    return sortConfig.direction === 'asc'
                        ? new Date(aVal as string).getTime() - new Date(bVal as string).getTime()
                        : new Date(bVal as string).getTime() - new Date(aVal as string).getTime();
                }

                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return sortableItems
            .filter(lr => {
                if (financialYearFilter !== 'All' && getFinancialYear(lr.date) !== financialYearFilter) {
                    return false;
                }
                if (statusFilter !== 'All' && lr.status !== statusFilter) {
                    return false;
                }
                const lrDate = lr.date.split('T')[0];
                if (startDate && lrDate < startDate) {
                    return false;
                }
                if (endDate && lrDate > endDate) {
                    return false;
                }
                const lowerSearchTerm = searchTerm.toLowerCase();
                return (
                    searchTerm === '' ||
                    lr.lrNumber.toLowerCase().includes(lowerSearchTerm) ||
                    lr.truckNumber.toLowerCase().includes(lowerSearchTerm) ||
                    lr.from.toLowerCase().includes(lowerSearchTerm) ||
                    lr.to.toLowerCase().includes(lowerSearchTerm) ||
                    lr.consignor.name.toLowerCase().includes(lowerSearchTerm) ||
                    lr.consignee.name.toLowerCase().includes(lowerSearchTerm)
                );
            });
    }, [lorryReceipts, searchTerm, statusFilter, sortConfig, financialYearFilter, startDate, endDate]);

    const requestSort = (key: keyof LorryReceipt | 'balance') => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };
    
    const handleCreateInvoice = (lr: LorryReceipt) => {
        if (!lr.consignorId && !lr.consigneeId) {
            alert("This LR is missing client information and cannot be invoiced.");
            return;
        }
        // Determine billing party, default to consignor
        const clientId = lr.consignorId || lr.consigneeId;
        if (!clientId) return;
        
        navigate('/invoices', { state: { createFromLrId: lr.id, clientId } });
    };


    const SortableHeader = ({ label, sortKey }: { label: string, sortKey: keyof LorryReceipt | 'balance' }) => (
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
                <h1 className="text-3xl font-bold text-gray-800">Lorry Receipts</h1>
                <button onClick={onNew} className="flex items-center justify-center sm:justify-start px-4 py-2 bg-brand-primary text-white rounded-lg shadow hover:bg-brand-secondary transition-colors">
                    <PlusIcon className="w-5 h-5 mr-2" /> Create LR
                </button>
            </div>

            <div className="mb-6 p-4 bg-white rounded-lg shadow-sm flex flex-wrap items-end gap-4">
                <div className="relative flex-grow min-w-[200px]">
                    <label htmlFor="lrSearch" className="block text-sm font-medium text-gray-500 mb-1">Search</label>
                    <input
                        id="lrSearch"
                        type="text"
                        placeholder="By LR No, Truck, Party, City..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-secondary"
                    />
                    <SearchIcon className="absolute left-3 bottom-2.5 w-5 h-5 text-gray-400" />
                </div>
                 <div>
                    <label htmlFor="lrFinancialYear" className="block text-sm font-medium text-gray-500 mb-1">Financial Year</label>
                    <select
                        id="lrFinancialYear"
                        value={financialYearFilter}
                        onChange={(e) => setFinancialYearFilter(e.target.value)}
                        className="w-full py-2 pl-3 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-secondary"
                    >
                        {financialYears.map(year => (
                            <option key={year} value={year}>{year === 'All' ? 'All Years' : year}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label htmlFor="lrStatus" className="block text-sm font-medium text-gray-500 mb-1">Status</label>
                    <div className="flex items-center">
                         <FilterIcon className="w-5 h-5 text-gray-500 mr-2" />
                        <select
                            id="lrStatus"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="p-2 border border-gray-300 rounded-md shadow-sm"
                        >
                            <option value="All">All Statuses</option>
                            <option value="Scheduled">Scheduled</option>
                            <option value="In Transit">In Transit</option>
                            <option value="Delivered">Delivered</option>
                            <option value="Completed">Completed</option>
                            <option value="Cancelled">Cancelled</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label htmlFor="lrStartDate" className="block text-sm font-medium text-gray-500 mb-1">Start Date</label>
                    <input
                        id="lrStartDate"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="p-2 border border-gray-300 rounded-md shadow-sm"
                    />
                </div>
                 <div>
                    <label htmlFor="lrEndDate" className="block text-sm font-medium text-gray-500 mb-1">End Date</label>
                    <input
                        id="lrEndDate"
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
                            <SortableHeader label="LR Number" sortKey="lrNumber" />
                            <SortableHeader label="Date" sortKey="date" />
                            <th className="px-6 py-3">Consignor</th>
                            <th className="px-6 py-3">Truck #</th>
                            <SortableHeader label="Total Amt" sortKey="totalAmount" />
                            <SortableHeader label="Balance" sortKey="balance" />
                            <th className="px-6 py-3 text-center">Payment Status</th>
                            <th className="px-6 py-3 text-center">Transport Status</th>
                            <th className="px-6 py-3 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredLRs.length > 0 ? (
                            filteredLRs.map(lr => (
                                <tr key={lr.id} onClick={() => setPreviewLr(lr)} className="bg-white border-b hover:bg-gray-50 cursor-pointer">
                                    <td className="px-6 py-4 font-medium text-brand-primary">{lr.lrNumber}</td>
                                    <td className="px-6 py-4">{new Date(lr.date).toLocaleDateString()}</td>
                                    <td className="px-6 py-4">{lr.consignor.name}</td>
                                    <td className="px-6 py-4">{lr.truckNumber}</td>
                                    <td className="px-6 py-4 text-right font-mono">{lr.totalAmount.toLocaleString('en-IN')}</td>
                                    <td className="px-6 py-4 text-right font-mono font-semibold">{lr.balance.toLocaleString('en-IN')}</td>
                                    <td className="px-6 py-4 text-center">{getLrPaymentStatusBadge(lr)}</td>
                                    <td className="px-6 py-4 text-center">{getStatusBadge(lr.status)}</td>
                                    <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                                        <div className="relative inline-block text-left">
                                            <button
                                                onClick={() => setOpenActionMenuId(openActionMenuId === lr.id ? null : lr.id)}
                                                className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
                                            >
                                                Actions <ChevronDownIcon className="-mr-1 ml-2 h-5 w-5" />
                                            </button>
                                            {openActionMenuId === lr.id && (
                                                <div ref={actionMenuRef} className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                                                    <div className="py-1" role="menu" aria-orientation="vertical">
                                                        <button
                                                            onClick={() => { setSelectedLrForCopies(lr); setOpenActionMenuId(null); }}
                                                            className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                                        >
                                                            <DownloadIcon className="w-5 h-5 mr-3" /> Download/View Copies
                                                        </button>
                                                        {lr.freightType !== 'To be billed' && lr.balance > 0 && (
                                                            <button onClick={() => { setPaymentModalLr(lr); setOpenActionMenuId(null); }} className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                                                <PlusIcon className="w-5 h-5 mr-3" /> Add Payment
                                                            </button>
                                                        )}
                                                        {(lr.amountPaid || 0) > 0 && (
                                                            <button onClick={() => { setHistoryModalLr(lr); setOpenActionMenuId(null); }} className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                                                <BookOpenIcon className="w-5 h-5 mr-3" /> View Payments
                                                            </button>
                                                        )}
                                                        <button onClick={() => onDuplicate(lr)} className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                                            <DocumentDuplicateIcon className="w-5 h-5 mr-3" /> Duplicate LR
                                                        </button>
                                                         {!lr.invoiceId && lr.status !== 'Cancelled' && lr.freightType === 'To be billed' && (
                                                            <button
                                                                onClick={() => handleCreateInvoice(lr)}
                                                                className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                                            >
                                                                <PlusIcon className="w-5 h-5 mr-3" /> Create Invoice
                                                            </button>
                                                        )}
                                                        {lr.status !== 'Cancelled' && (
                                                            <button
                                                                onClick={() => {
                                                                    const newStatus = lr.status === 'Completed' ? 'Scheduled' : 'Completed';
                                                                    updateLorryReceipt({ ...lr, status: newStatus });
                                                                    setOpenActionMenuId(null);
                                                                }}
                                                                className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                                            >
                                                                Mark as {lr.status === 'Completed' ? 'Scheduled' : 'Completed'}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={10} className="text-center py-10 text-gray-500">
                                    No Lorry Receipts found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            {selectedLrForCopies && (
                <Modal isOpen={true} onClose={() => setSelectedLrForCopies(null)} title={`Copies for ${selectedLrForCopies.lrNumber}`} size="xl">
                    <SuccessScreen newLr={selectedLrForCopies} onDone={() => setSelectedLrForCopies(null)} onNew={() => { setSelectedLrForCopies(null); onNew(); }} onDuplicate={(lr) => { setSelectedLrForCopies(null); onDuplicate(lr); }} />
                </Modal>
            )}
            <Modal isOpen={!!previewLr} onClose={() => setPreviewLr(null)} title={`Lorry Receipt Preview: ${previewLr?.lrNumber}`} size="xl">
                {previewLr && (
                    <>
                        <div className="p-2 overflow-x-auto">
                            <LorryReceiptPreview lr={previewLr} copyType="Office Copy" />
                        </div>
                        <div className="mt-4 flex justify-end gap-2 pt-4 border-t">
                            <button 
                                onClick={() => handlePreviewAction('print')} 
                                disabled={isGeneratingCopy} 
                                className="flex items-center justify-center px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 disabled:opacity-50"
                            >
                                <PrinterIcon className="w-5 h-5 mr-2" /> Print
                            </button>
                            <button 
                                onClick={() => handlePreviewAction('download')} 
                                disabled={isGeneratingCopy} 
                                className="flex items-center justify-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary disabled:opacity-50 min-w-[150px]"
                            >
                                {isGeneratingCopy ? <SpinnerIcon className="text-white" /> : <DownloadIcon className="w-5 h-5 mr-2" />}
                                {isGeneratingCopy ? 'Generating...' : 'Download PDF'}
                            </button>
                        </div>
                    </>
                )}
            </Modal>
            {paymentModalLr && <AddLrPaymentModal lr={paymentModalLr} onClose={() => setPaymentModalLr(null)} />}
            {historyModalLr && <LrPaymentHistoryModal lr={historyModalLr} onClose={() => setHistoryModalLr(null)} />}
        </div>
    );
};

// --- Native PDF Generation for LR ---
const generateLRPDF = (lr: LorryReceipt, copyType: string, companyInfo: any, settings: any) => {
    const doc = new jsPDF('p', 'mm', 'a5'); // A5 page size
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 7;
    const maxW = pageW - margin * 2;
    let y = margin;

    // --- Header ---
    doc.setFontSize(8).setFont('helvetica', 'bold').text(copyType, pageW - margin, y, { align: 'right' });
    y += 5;
    
    if (settings.logoUrl) {
       doc.addImage(settings.logoUrl, 'PNG', margin, y, 28, 12);
    }
    
    doc.setFontSize(14).setFont('serif', 'bold').setTextColor('#A63A3A').text(companyInfo.name, pageW / 2, y + 2, { align: 'center' });
    doc.setFontSize(6).setFont('helvetica', 'normal').setTextColor(0, 0, 0);
    doc.text(companyInfo.address, pageW / 2, y + 6, { align: 'center', maxWidth: 90 });
    doc.text(`E-Mail: ${companyInfo.email} | Web: ${companyInfo.website}`, pageW / 2, y + 10, { align: 'center' });
    doc.text(`PH: ${companyInfo.phoneNumbers} | GSTIN: ${companyInfo.gstin}`, pageW / 2, y + 13, { align: 'center' });
    
    y += 16;
    doc.setDrawColor(0).setLineWidth(0.5).line(margin, y, pageW - margin, y);
    y += 1;
    
    // --- LR Details ---
    doc.setDrawColor(0).setLineWidth(0.1);
    doc.rect(margin, y, maxW, 8);
    doc.setFontSize(8).setFont('helvetica', 'bold');
    doc.text(`LR No: ${lr.lrNumber}`, margin + 2, y + 5);
    doc.line(pageW / 2, y, pageW / 2, y + 8);
    doc.text(`Date: ${new Date(lr.date).toLocaleDateString('en-GB')}`, pageW / 2 + 2, y + 5);
    y += 8;

    // --- Consignor/Consignee ---
    const partyBoxHeight = 25;
    doc.rect(margin, y, maxW, partyBoxHeight);
    doc.line(pageW / 2, y, pageW / 2, y + partyBoxHeight);
    
    doc.setFontSize(8).setFont('helvetica', 'bold').text('Consignor:', margin + 2, y + 4);
    doc.setFontSize(7).setFont('helvetica', 'normal');
    let consignorLines = doc.splitTextToSize(`${lr.consignor.name}\n${lr.consignor.address}, ${lr.consignor.city}, ${lr.consignor.state}\nGSTIN: ${lr.consignor.gstin}`, maxW / 2 - 4);
    doc.text(consignorLines, margin + 2, y + 8);

    doc.setFontSize(8).setFont('helvetica', 'bold').text('Consignee:', pageW/2 + 2, y + 4);
    doc.setFontSize(7).setFont('helvetica', 'normal');
    let consigneeLines = doc.splitTextToSize(`${lr.consignee.name}\n${lr.consignee.address}, ${lr.consignee.city}, ${lr.consignee.state}\nGSTIN: ${lr.consignee.gstin}`, maxW / 2 - 4);
    doc.text(consigneeLines, pageW / 2 + 2, y + 8);
    y += partyBoxHeight;
    
    // --- From/To ---
    doc.rect(margin, y, maxW, 8);
    doc.line(pageW / 2, y, pageW / 2, y + 8);
    doc.setFontSize(8).setFont('helvetica', 'bold');
    doc.text(`From: ${lr.from}`, margin + 2, y + 5);
    doc.text(`To: ${lr.to}`, pageW / 2 + 2, y + 5);
    y += 8;
    
    // --- Material Details Table ---
    const tableTop = y;
    doc.setFontSize(7).setFont('helvetica', 'bold');
    doc.rect(margin, y, maxW, 6);
    doc.text('No. of Articles', margin + 2, y + 4);
    doc.text('Description of Goods', margin + 35, y + 4);
    doc.text('Actual Wt.', margin + 95, y + 4);
    doc.text('Charged Wt.', margin + 118, y + 4);
    y += 6;
    
    doc.setFontSize(7).setFont('helvetica', 'normal');
    lr.materials.forEach(m => {
        doc.text(`${m.articleCount} ${m.packagingType}`, margin + 2, y + 4);
        doc.text(doc.splitTextToSize(m.name, 58), margin + 35, y + 4);
        doc.text(`${m.actualWeight} ${m.actualWeightUnit}`, margin + 95, y + 4);
        doc.text(`${m.chargedWeight} ${m.chargedWeightUnit}`, margin + 118, y + 4);
        y += 8; // Adjust row height as needed
    });
    
    const tableBottom = y > (tableTop + 20) ? y : tableTop + 20;
    doc.rect(margin, tableTop, maxW, tableBottom - tableTop);
    doc.line(margin + 33, tableTop, margin + 33, tableBottom);
    doc.line(margin + 93, tableTop, margin + 93, tableBottom);
    doc.line(margin + 115, tableTop, margin + 115, tableBottom);
    y = tableBottom;
    
    // --- Footer Details ---
    const footerTop = y;
    const footerBoxHeight = 35;
    doc.rect(margin, y, maxW, footerBoxHeight);
    doc.line(pageW / 2, y, pageW / 2, y + footerBoxHeight);

    doc.setFontSize(7).setFont('helvetica', 'normal');
    let leftY = y + 4;
    doc.text(`Truck No: ${lr.truckNumber}`, margin + 2, leftY); leftY += 4;
    doc.text(`Risk Type: ${lr.riskType}`, margin + 2, leftY); leftY += 4;
    doc.text(`Freight Type: ${lr.freightType}`, margin + 2, leftY); leftY += 4;
    if (!lr.hideFreight) {
         doc.text(`Freight Amount: ${(lr.totalAmount).toLocaleString('en-IN', {style: 'currency', currency: 'INR'})}`, margin + 2, leftY); leftY += 4;
    }

    doc.setFontSize(7).setFont('helvetica', 'bold').text('Terms & Conditions', pageW / 2 + 2, y + 4);
    doc.setFontSize(6).setFont('helvetica', 'normal');
    const termsLines = doc.splitTextToSize(lr.termsAndConditions || '', maxW/2 - 4);
    doc.text(termsLines, pageW/2 + 2, y + 7);
    y += footerBoxHeight;
    
    // --- Signature ---
    doc.setFontSize(8);
    y += 10;
    doc.text('Received the above goods in good condition.', margin, y);
    doc.text(`For ${companyInfo.name}`, pageW - margin, y, {align: 'right'});
    y += 15;
    doc.setLineWidth(0.2).line(margin, y, margin + 40, y);
    doc.setLineWidth(0.2).line(pageW - margin - 40, y, pageW - margin, y);
    y += 4;
    doc.text("Receiver's Signature", margin, y);
    doc.text('Authorised Signatory', pageW - margin, y, {align: 'right'});

    return doc;
};

const LorryReceipts = () => {
    const [view, setView] = useState<'list' | 'create' | 'success'>('list');
    const [activeLr, setActiveLr] = useState<LorryReceipt | null>(null);
    const [lrToDuplicate, setLrToDuplicate] = useState<LorryReceipt | null>(null);

    const handleNew = () => {
        setLrToDuplicate(null);
        setView('create');
    };
    
    const handleDuplicate = (lr: LorryReceipt) => {
        setLrToDuplicate(lr);
        setView('create');
    };

    const handleSuccess = (newLr: LorryReceipt) => {
        setActiveLr(newLr);
        setView('success');
    };
    
    const handleDone = () => {
        setActiveLr(null);
        setView('list');
    }

    const renderView = () => {
        switch (view) {
            case 'create':
                return <CreateLorryReceipt onSuccess={handleSuccess} onBack={() => setView('list')} lrToDuplicate={lrToDuplicate} />;
            case 'success':
                if (!activeLr) return null;
                return <SuccessScreen newLr={activeLr} onDone={handleDone} onNew={() => setView('create')} onDuplicate={handleDuplicate} />;
            case 'list':
            default:
                return <LRList onNew={handleNew} onDuplicate={handleDuplicate}/>;
        }
    };
    
    return renderView();
};

export default LorryReceipts;