import React, { useState, useMemo, ChangeEvent } from 'react';
import { useTransport } from '../context/TransportContext';
import { Client } from '../types';
import { Modal } from '../components/Modal';
import { PlusIcon, SearchIcon, PencilIcon, TrashIcon } from '../components/icons';

const SpinnerIcon = () => (
    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

// Mocks a GST API call to fetch client details.
const fetchGstDetails = async (gstin: string): Promise<{ name: string; address: string }> => {
    if (!/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}Z[A-Z\d]{1}$/.test(gstin.toUpperCase())) {
        throw new Error("Invalid GSTIN format.");
    }
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Mocked responses for demonstration
    const mockDatabase: { [key: string]: { lgnm: string, pradr: { adr: string } } } = {
        '27AAFCA2222A1Z5': { lgnm: 'Awesome Gadgets Pvt Ltd', pradr: { adr: '101 Tech Park, Silicon Valley, Mumbai, Maharashtra, 400001' } },
        '29AAAAA0000A1Z5': { lgnm: 'Karnataka Steels', pradr: { adr: 'Plot 42, Industrial Area, Bangalore, Karnataka, 560058' } },
        '24ABCDE1234F1Z5': { lgnm: 'ABC Textiles (Fetched)', pradr: { adr: '123 Textile Market, Surat, Gujarat, 395002' } },
        '07PQRST5678U1Z9': { lgnm: 'PQR Logistics (Fetched)', pradr: { adr: '456 Transport Nagar, Delhi, 110033' } }
    };

    const data = mockDatabase[gstin.toUpperCase()];

    if (data) {
        return {
            name: data.lgnm,
            address: data.pradr.adr,
        };
    } else {
        throw new Error("GSTIN not found. Please enter details manually.");
    }
};


const ClientModal = ({ isOpen, onClose, clientToEdit }: { isOpen: boolean; onClose: () => void; clientToEdit: Client | null; }) => {
    const { addClient, updateClient } = useTransport();
    const [formData, setFormData] = useState<Omit<Client, 'id'>>({ name: '', address: '', gstin: '', contactPerson: '', contactNumber: '' });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    React.useEffect(() => {
        if (clientToEdit) {
            setFormData({ name: clientToEdit.name, address: clientToEdit.address, gstin: clientToEdit.gstin, contactPerson: clientToEdit.contactPerson || '', contactNumber: clientToEdit.contactNumber || '' });
        } else {
            setFormData({ name: '', address: '', gstin: '', contactPerson: '', contactNumber: '' });
        }
        setError('');
        setIsLoading(false);
    }, [clientToEdit, isOpen]);

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'gstin' ? value.toUpperCase() : value }));
    };

    const handleFetchGst = async () => {
        if (!formData.gstin) {
            setError('Please enter a GSTIN.');
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            const details = await fetchGstDetails(formData.gstin);
            setFormData(prev => ({ ...prev, name: details.name, address: details.address }));
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (clientToEdit) {
            updateClient({ ...clientToEdit, ...formData });
        } else {
            addClient(formData);
        }
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={clientToEdit ? 'Edit Client' : 'Add New Client'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="gstin" className="block text-sm font-medium text-gray-700">GSTIN</label>
                    <div className="mt-1 flex gap-2">
                        <input
                            type="text"
                            name="gstin"
                            id="gstin"
                            value={formData.gstin}
                            onChange={handleChange}
                            className="flex-grow p-2 border border-gray-300 rounded-md shadow-sm"
                            maxLength={15}
                        />
                        <button
                            type="button"
                            onClick={handleFetchGst}
                            disabled={isLoading}
                            className="px-4 py-2 bg-brand-secondary text-white rounded-md flex items-center justify-center disabled:bg-gray-400 w-32"
                        >
                            {isLoading ? <SpinnerIcon /> : 'Fetch Details'}
                        </button>
                    </div>
                    {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
                </div>
                 <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">Client Name</label>
                    <input
                        type="text"
                        name="name"
                        id="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="mt-1 w-full p-2 border border-gray-300 rounded-md shadow-sm"
                    />
                </div>
                 <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700">Address</label>
                    <textarea
                        name="address"
                        id="address"
                        value={formData.address}
                        onChange={handleChange}
                        required
                        rows={3}
                        className="mt-1 w-full p-2 border border-gray-300 rounded-md shadow-sm"
                    />
                </div>
                 <div>
                    <label htmlFor="contactPerson" className="block text-sm font-medium text-gray-700">Contact Person</label>
                    <input
                        type="text"
                        name="contactPerson"
                        id="contactPerson"
                        value={formData.contactPerson || ''}
                        onChange={handleChange}
                        className="mt-1 w-full p-2 border border-gray-300 rounded-md shadow-sm"
                    />
                </div>
                <div>
                    <label htmlFor="contactNumber" className="block text-sm font-medium text-gray-700">Contact Number</label>
                    <input
                        type="text"
                        name="contactNumber"
                        id="contactNumber"
                        value={formData.contactNumber || ''}
                        onChange={handleChange}
                        className="mt-1 w-full p-2 border border-gray-300 rounded-md shadow-sm"
                    />
                </div>
                <div className="flex justify-end pt-4 mt-4 border-t">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md mr-2">Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-brand-primary text-white rounded-md">
                        {clientToEdit ? 'Save Changes' : 'Add Client'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export const Clients = () => {
    const { clients, deleteClient } = useTransport();
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [clientToEdit, setClientToEdit] = useState<Client | null>(null);

    const filteredClients = useMemo(() => {
        return clients.filter(client =>
            client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            client.gstin.toLowerCase().includes(searchTerm.toLowerCase()) ||
            client.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (client.contactPerson && client.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (client.contactNumber && client.contactNumber.toLowerCase().includes(searchTerm.toLowerCase()))
        ).sort((a,b) => a.name.localeCompare(b.name));
    }, [clients, searchTerm]);
    
    const handleAddClick = () => {
        setClientToEdit(null);
        setIsModalOpen(true);
    };

    const handleEditClick = (client: Client) => {
        setClientToEdit(client);
        setIsModalOpen(true);
    };
    
    const handleDeleteClick = (clientId: string) => {
        if(window.confirm('Are you sure you want to delete this client? This action cannot be undone.')){
            deleteClient(clientId);
        }
    };


    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Clients</h1>
                <button
                    onClick={handleAddClick}
                    className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-lg shadow hover:bg-brand-secondary transition-colors"
                >
                    <PlusIcon className="w-5 h-5 mr-2" /> Add Client
                </button>
            </div>

            <div className="mb-6 p-4 bg-white rounded-lg shadow-sm">
                 <div className="relative">
                    <input
                        type="text"
                        placeholder="Search by name, GSTIN, address, or contact..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-secondary"
                    />
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-x-auto">
                 <table className="w-full text-sm text-left text-gray-600">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                        <tr>
                            <th className="px-6 py-3">Client Name</th>
                            <th className="px-6 py-3">Contact Person</th>
                            <th className="px-6 py-3">Contact Number</th>
                            <th className="px-6 py-3">Address</th>
                            <th className="px-6 py-3">GSTIN</th>
                            <th className="px-6 py-3 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredClients.map(client => (
                            <tr key={client.id} className="bg-white border-b hover:bg-gray-50">
                                <td className="px-6 py-4 font-medium text-gray-900">{client.name}</td>
                                <td className="px-6 py-4">{client.contactPerson || 'N/A'}</td>
                                <td className="px-6 py-4">{client.contactNumber || 'N/A'}</td>
                                <td className="px-6 py-4">{client.address}</td>
                                <td className="px-6 py-4 font-mono">{client.gstin}</td>
                                <td className="px-6 py-4 text-center">
                                    <button onClick={() => handleEditClick(client)} className="p-2 text-gray-500 hover:text-brand-secondary" title="Edit Client">
                                        <PencilIcon className="w-5 h-5"/>
                                    </button>
                                     <button onClick={() => handleDeleteClick(client.id)} className="p-2 text-gray-500 hover:text-red-600" title="Delete Client">
                                        <TrashIcon className="w-5 h-5"/>
                                    </button>
                                </td>
                            </tr>
                        ))}
                         {filteredClients.length === 0 && (
                            <tr>
                                <td colSpan={6} className="text-center py-10 text-gray-500">
                                    No clients found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            
            <ClientModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                clientToEdit={clientToEdit}
            />
        </div>
    );
};

export default Clients;