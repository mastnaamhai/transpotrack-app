import React, { useState, useMemo, useRef } from 'react';
import { useTransport } from '../context/TransportContext';
import { Invoice, TripNote, Client, Supplier } from '../types';
import { DownloadIcon, PrinterIcon, SearchIcon, RefreshIcon, ArrowLeftIcon, SortAscIcon, SortDescIcon } from '../components/icons';
import { Modal } from '../components/Modal';
import jsPDF from 'jspdf';
import { useSettings } from '../hooks/useSettings';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { defaultCompanyInfo } from '../companyInfo';
import { useParams, useNavigate } from 'react-router-dom';

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


const getFinancialYear = (dateStr: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-11
    return month >= 3 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
};

const SortableHeader = ({ label, sortKey, sortConfig, requestSort }: { label: string, sortKey: string, sortConfig: { key: string, direction: string } | null, requestSort: (key: string) => void }) => (
    <th className="px-6 py-3 cursor-pointer" onClick={() => requestSort(sortKey)}>
        <div className="flex items-center">
            {label}
            {sortConfig?.key === sortKey && (
                sortConfig.direction === 'asc' ? <SortAscIcon className="w-4 h-4 ml-2" /> : <SortDescIcon className="w-4 h-4 ml-2" />
            )}
        </div>
    </th>
);

const SpinnerIcon = () => (
    <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const generateLedgerPDF = (
    title: string,
    data: any[],
    type: 'summary' | 'detail',
    party: Client | Supplier | undefined,
    companyInfo: any,
    settings: any
) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 12;
    const maxW = pageW - margin * 2;
    let y = margin;
    const isClient = type === 'detail' ? !!(party as Client)?.gstin : data[0]?.totalDebits !== undefined;

    const drawPageHeader = (pageNumber: number) => {
        y = margin;
        if (settings.logoUrl) {
           doc.addImage(settings.logoUrl, 'PNG', margin, y, 35, 15);
        }
        
        doc.setFontSize(18).setFont('serif', 'bold').setTextColor(40, 58, 90).text(companyInfo.name, pageW / 2, y + 4, { align: 'center' });
        doc.setFontSize(8).setFont('helvetica', 'normal').setTextColor(0, 0, 0);
        doc.text(companyInfo.address, pageW / 2, y + 9, { align: 'center', maxWidth: 90 });
        doc.text(`Email: ${companyInfo.email} | Phone: ${companyInfo.phoneNumbers}`, pageW / 2, y + 13, { align: 'center' });
        y += 20;

        doc.setDrawColor(200).setLineWidth(0.2).line(margin, y, pageW - margin, y);
        y += 8;

        doc.setFontSize(14).setFont('helvetica', 'bold').text(title, margin, y);
        
        if (party) {
            y += 6;
            doc.setFontSize(10).setFont('helvetica', 'normal');
            doc.text(`To: ${party.name}`, margin, y);
            if (party.address) {
                y += 5;
                doc.text(doc.splitTextToSize(party.address, maxW / 2), margin, y);
            }
        }
        y += 10;
    };
    
    const drawPageFooter = (pageNumber: number) => {
        doc.setFontSize(8).setTextColor(150);
        doc.text(`Page ${pageNumber}`, pageW / 2, pageH - 8, { align: 'center' });
    };

    let pageNumber = 1;
    drawPageHeader(pageNumber);

    const detailColumns = [
        { title: 'Date', width: 25 },
        { title: 'Particulars', width: 75 },
        { title: 'Debit (₹)', width: 25 },
        { title: 'Credit (₹)', width: 25 },
        { title: 'Balance (₹)', width: 36 },
    ];
    const summaryColumns = [
        { title: isClient ? 'Client Name' : 'Supplier Name', width: 70 },
        { title: isClient ? 'Total Debit (₹)' : 'Total Paid (₹)', width: 40 },
        { title: isClient ? 'Total Credit (₹)' : 'Total Freight (₹)', width: 40 },
        { title: 'Balance (₹)', width: 36 },
    ];
    const columns = type === 'detail' ? detailColumns : summaryColumns;

    const drawTableHeader = () => {
        let x = margin;
        doc.setFillColor(settings.themeColor);
        doc.rect(margin, y, maxW, 8, 'F');
        doc.setTextColor(255, 255, 255).setFontSize(9).setFont('helvetica', 'bold');
        columns.forEach(col => {
            const align = col.title.includes('(₹)') || col.title === 'Balance (₹)' ? 'right' : 'left';
            const textX = align === 'right' ? x + col.width - 2 : x + 2;
            doc.text(col.title, textX, y + 5.5, { align });
            x += col.width;
        });
        y += 8;
    };
    
    drawTableHeader();

    data.forEach(item => {
        const particulars = type === 'detail' ? item.particulars : item.name;
        const particularsLines = doc.splitTextToSize(particulars, (type === 'detail' ? columns[1].width : columns[0].width) - 4);
        const rowHeight = Math.max(8, particularsLines.length * 4 + 4);

        if (y + rowHeight > pageH - 20) {
            drawPageFooter(pageNumber);
            doc.addPage();
            pageNumber++;
            drawPageHeader(pageNumber);
            drawTableHeader();
        }

        let x = margin;
        doc.setTextColor(0, 0, 0).setFontSize(8).setFont('helvetica', 'normal');

        if (type === 'detail') {
            doc.text(new Date(item.date).toLocaleDateString('en-GB'), x + 2, y + 5); x += columns[0].width;
            doc.text(particularsLines, x + 2, y + 5); x += columns[1].width;
            doc.text(item.debit > 0 ? item.debit.toLocaleString('en-IN') : '-', x + columns[2].width - 2, y + 5, { align: 'right' }); x += columns[2].width;
            doc.text(item.credit > 0 ? item.credit.toLocaleString('en-IN') : '-', x + columns[3].width - 2, y + 5, { align: 'right' }); x += columns[3].width;
            const balanceText = `${Math.abs(item.balance).toLocaleString('en-IN')} ${item.balance >= 0 ? (isClient ? 'Dr' : 'Cr') : (isClient ? 'Cr' : 'Dr')}`;
            doc.text(balanceText, x + columns[4].width - 2, y + 5, { align: 'right' });
        } else {
            doc.text(item.name, x + 2, y + 5); x += columns[0].width;
            const debit = isClient ? item.totalDebits : item.totalPaid || 0;
            const credit = isClient ? item.totalCredits : item.totalFreight || 0;
            doc.text(debit.toLocaleString('en-IN'), x + columns[1].width - 2, y + 5, { align: 'right' }); x += columns[1].width;
            doc.text(credit.toLocaleString('en-IN'), x + columns[2].width - 2, y + 5, { align: 'right' }); x += columns[2].width;
            const balanceText = `${Math.abs(item.balance).toLocaleString('en-IN')} ${item.balance >= 0 ? (isClient ? 'Dr' : 'Cr') : (isClient ? 'Cr' : 'Dr')}`;
            doc.text(balanceText, x + columns[3].width - 2, y + 5, { align: 'right' });
        }

        y += rowHeight;
        doc.setDrawColor(230).setLineWidth(0.1).line(margin, y, pageW - margin, y);
    });

    // Final Summary
    const totalDebits = data.reduce((sum, item) => sum + (item.debit || item.totalDebits || item.totalPaid || 0), 0);
    const totalCredits = data.reduce((sum, item) => sum + (item.credit || item.totalCredits || item.totalFreight || 0), 0);
    const closingBalance = data.length > 0 ? data[data.length - 1].balance : 0;
    
    y += 5;
    const summaryX = pageW - margin - 80;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal').text(isClient ? 'Total Debits:' : 'Total Payments (Debit):', summaryX, y);
    doc.text(totalDebits.toLocaleString('en-IN', { style: 'currency', currency: 'INR' }), pageW - margin, y, { align: 'right' });
    y += 6;
    doc.setFont('helvetica', 'normal').text(isClient ? 'Total Credits:' : 'Total Freight (Credit):', summaryX, y);
    doc.text(totalCredits.toLocaleString('en-IN', { style: 'currency', currency: 'INR' }), pageW - margin, y, { align: 'right' });
    y += 2;
    doc.setDrawColor(0).setLineWidth(0.2).line(summaryX, y, pageW - margin, y);
    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.text('Closing Balance:', summaryX, y);
    doc.text(`${Math.abs(closingBalance).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })} ${closingBalance >= 0 ? (isClient ? 'Dr' : 'Cr') : (isClient ? 'Cr' : 'Dr')}`, pageW - margin, y, { align: 'right' });
    
    drawPageFooter(pageNumber);
    return doc;
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
        <div className="bg-white p-4 text-xs font-sans text-gray-800 border">
            <div className="mb-2 pb-2 border-b-2 border-black">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                        <tr>
                            <td style={{ width: '20%', verticalAlign: 'middle', paddingRight: '8px' }}>
                                {settings.logoUrl && <img src={settings.logoUrl} alt="Company Logo" style={{ height: '64px', width: 'auto', objectFit: 'contain' }} />}
                            </td>
                            <td style={{ width: '80%', textAlign: 'center', verticalAlign: 'middle' }}>
                                <h1 style={{ fontSize: '20px', fontWeight: 'bold', fontFamily: 'serif', color: '#A63A3A', textTransform: 'uppercase', margin: 0 }}>
                                    {companyInfo.name}
                                </h1>
                                <p style={{ fontSize: '12px', fontWeight: 600, margin: '2px 0' }}>
                                    {companyInfo.address}
                                </p>
                                <table style={{ width: '100%', fontSize: '12px', marginTop: '4px' }}>
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
            <div className="text-center font-bold text-sm mb-2 pb-1 border-b-2 border-black" style={{borderColor: settings.themeColor}}>INVOICE</div>
            <div className="flex justify-between mb-2">
                <div className="w-2/3">
                    <p><strong>Invoice No:</strong> {invoice.invoiceNumber}</p>
                    <p><strong>Date:</strong> {new Date(invoice.date).toLocaleDateString('en-GB')}</p>
                    <p><strong>Due Date:</strong> {new Date(invoice.dueDate).toLocaleDateString('en-GB')}</p>
                </div>
                <div className="w-1/3 text-right">
                    <p><strong>GSTIN:</strong> {companyInfo.gstin}</p>
                </div>
            </div>
            <div className="border p-2 mb-2">
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
            <table className="w-full border-collapse border border-black mb-2">
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
            
            <div className="mb-2">
                <p><strong>Amount in Words:</strong> {totalAmountInWords}</p>
            </div>
            
            <div className="flex justify-between items-start">
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

const TripNotePreview = ({ note }: { note: TripNote }) => {
    const { getSupplierById } = useTransport();
    const supplier = getSupplierById(note.supplierId);
    return (
        <div className="p-4 space-y-4">
            <h3 className="text-lg font-bold">Trip Note: {note.noteId}</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
                <p><strong>Date:</strong> {new Date(note.date).toLocaleDateString()}</p>
                <p><strong>Supplier:</strong> {supplier?.name}</p>
                <p><strong>Vehicle:</strong> {note.vehicleNumber}</p>
                <p><strong>Route:</strong> {note.from} to {note.to}</p>
                <p className="col-span-2"><strong>Total Freight:</strong> {note.totalFreight.toLocaleString('en-IN', {style: 'currency', currency: 'INR'})}</p>
            </div>
        </div>
    );
}

const LedgerTable = ({ entries, onParticularsClick, type }: { entries: any[], onParticularsClick: (id: string | null, type: 'invoice' | 'trip_note') => void, type: 'client' | 'supplier' }) => {
    const today = new Date();
    today.setHours(0,0,0,0);

    return (
        <div className="bg-white rounded-lg shadow-md overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-600">
                <thead className="text-xs text-gray-700 uppercase bg-gray-100 sticky top-0">
                    <tr>
                        <th scope="col" className="px-6 py-3">Date</th>
                        <th scope="col" className="px-6 py-3">Particulars</th>
                        <th scope="col" className="px-6 py-3 text-right">Debit (₹)</th>
                        <th scope="col" className="px-6 py-3 text-right">Credit (₹)</th>
                        <th scope="col" className="px-6 py-3 text-right">Balance (₹)</th>
                    </tr>
                </thead>
                <tbody>
                    {entries.length > 0 ? entries.map((entry, index) => {
                        const isInvoice = entry.debit > 0;
                        const isOverdue = type === 'client' && isInvoice && entry.status !== 'Paid' && new Date(entry.dueDate) < today;

                        return (
                            <tr key={index} className={`border-b ${isOverdue ? 'bg-red-50 hover:bg-red-100' : 'bg-white hover:bg-gray-50'}`}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {new Date(entry.date).toLocaleDateString('en-GB')}
                                </td>
                                <td className="px-6 py-4">
                                    <button 
                                        onClick={() => onParticularsClick(entry.id, entry.type)} 
                                        className="text-blue-600 hover:underline text-left"
                                        disabled={!entry.id}
                                    >
                                        {entry.particulars}
                                    </button>
                                </td>
                                <td className="px-6 py-4 text-right font-mono">{entry.debit > 0 ? entry.debit.toLocaleString('en-IN') : '-'}</td>
                                <td className="px-6 py-4 text-right font-mono">{entry.credit > 0 ? entry.credit.toLocaleString('en-IN') : '-'}</td>
                                <td className="px-6 py-4 text-right font-mono">
                                    {Math.abs(entry.balance).toLocaleString('en-IN')} {entry.balance >= 0 ? (type === 'client' ? 'Dr' : 'Cr') : (type === 'client' ? 'Cr' : 'Dr')}
                                </td>
                            </tr>
                        )
                    }) : (
                        <tr><td colSpan={5} className="text-center py-10 text-gray-500">No transactions found for the selected period.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

const LedgerDetailView = ({ party, type, entries, onBack }: { party: Client | Supplier; type: 'client' | 'supplier'; entries: any[]; onBack: () => void; }) => {
    const [previewItem, setPreviewItem] = useState<{ id: string | null; type: 'invoice' | 'trip_note' } | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const { invoices, tripNotes } = useTransport();
    const [settings] = useSettings();
    const [companyInfo] = useLocalStorage('companyInfo', defaultCompanyInfo);

    const handleAction = async (action: 'download' | 'print') => {
        setIsGenerating(true);
        try {
            const title = `${type === 'client' ? 'Client' : 'Supplier'} Ledger Statement for ${party.name}`;
            const doc = generateLedgerPDF(title, entries, 'detail', party, companyInfo, settings);
            if (action === 'download') {
                doc.save(`${party.name}_Ledger.pdf`);
            } else {
                doc.autoPrint();
                window.open(doc.output('bloburl'), '_blank');
            }
        } catch (error) {
            console.error(`Error generating PDF:`, error);
            alert(`Could not generate the document.`);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleExportCSV = () => {
        const formattedEntries = entries.map(entry => ({
            'Date': new Date(entry.date).toLocaleDateString('en-GB'),
            'Particulars': entry.particulars,
            'Debit (₹)': entry.debit > 0 ? entry.debit : '',
            'Credit (₹)': entry.credit > 0 ? entry.credit : '',
            'Balance (₹)': `${Math.abs(entry.balance).toLocaleString('en-IN')} ${entry.balance >= 0 ? (type === 'client' ? 'Dr' : 'Cr') : (type === 'client' ? 'Cr' : 'Dr')}`
        }));
        const title = `${party.name}_Ledger_Statement.csv`;
        exportToCSV(formattedEntries, title);
    };

    const handleParticularsClick = (id: string | null, type: 'invoice' | 'trip_note') => {
        if (id) {
            setPreviewItem({ id, type });
        }
    };
    
    const previewInvoice = useMemo(() => {
        if (previewItem?.type === 'invoice' && previewItem.id) {
            return invoices.find(inv => inv.id === previewItem.id);
        }
        return undefined;
    }, [previewItem, invoices]);
    
     const previewTripNote = useMemo(() => {
        if (previewItem?.type === 'trip_note' && previewItem.id) {
            return tripNotes.find(note => note.id === previewItem.id);
        }
        return undefined;
    }, [previewItem, tripNotes]);

    return (
        <div className="p-4 sm:p-6">
            <button onClick={onBack} className="flex items-center text-sm font-medium text-brand-primary hover:underline mb-4">
                <ArrowLeftIcon className="w-4 h-4 mr-1"/> Back to Ledger Summary
            </button>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">{party.name}</h1>
                    <p className="text-gray-500">{type === 'client' ? 'Client' : 'Supplier'} Ledger</p>
                </div>
                 <div className="flex gap-2">
                    <button onClick={() => handleAction('print')} disabled={isGenerating} className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg shadow hover:bg-gray-700 disabled:bg-gray-400">
                        {isGenerating ? <SpinnerIcon/> : <PrinterIcon className="w-5 h-5 mr-2" />} Print
                    </button>
                    <button onClick={() => handleAction('download')} disabled={isGenerating} className="flex items-center px-4 py-2 bg-brand-secondary text-white rounded-lg shadow hover:bg-blue-700 disabled:bg-blue-400">
                        {isGenerating ? <SpinnerIcon/> : <DownloadIcon className="w-5 h-5 mr-2" />} Download PDF
                    </button>
                    <button onClick={handleExportCSV} className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700">
                        <DownloadIcon className="w-5 h-5 mr-2" /> Export CSV
                    </button>
                </div>
            </div>
            <LedgerTable entries={entries} onParticularsClick={handleParticularsClick} type={type} />
            <Modal isOpen={!!previewInvoice} onClose={() => setPreviewItem(null)} title={`Invoice Preview: ${previewInvoice?.invoiceNumber}`} size="xl">
                {previewInvoice && <div className="overflow-x-auto"><InvoicePreview invoice={previewInvoice} /></div>}
            </Modal>
            <Modal isOpen={!!previewTripNote} onClose={() => setPreviewItem(null)} title={`Trip Note Preview: ${previewTripNote?.noteId}`} size="lg">
                {previewTripNote && <TripNotePreview note={previewTripNote} />}
            </Modal>
        </div>
    );
};

const Ledger = () => {
    const { clients, suppliers, invoices, payments, tripNotes, supplierPayments } = useTransport();
    const navigate = useNavigate();
    const { clientId, supplierId } = useParams();

    const [activeTab, setActiveTab] = useState(clientId ? 'clients' : (supplierId ? 'suppliers' : 'clients'));
    const [searchTerm, setSearchTerm] = useState('');
    const [financialYear, setFinancialYear] = useState('All');
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: string }>({ key: 'name', direction: 'asc' });

    const clientLedger = useMemo(() => {
        const clientData: { [key: string]: { name: string, totalDebits: number, totalCredits: number, balance: number } } = {};
        clients.forEach(c => {
            clientData[c.id] = { name: c.name, totalDebits: 0, totalCredits: 0, balance: 0 };
        });

        invoices.forEach(inv => {
            const fy = getFinancialYear(inv.date);
            if (financialYear !== 'All' && fy !== financialYear) return;
            if (clientData[inv.clientId]) {
                clientData[inv.clientId].totalDebits += inv.totalAmount;
            }
        });
        payments.forEach(p => {
            const inv = invoices.find(i => i.id === p.invoiceId);
            if (inv && clientData[inv.clientId]) {
                const fy = getFinancialYear(p.date);
                if (financialYear !== 'All' && fy !== financialYear) return;
                clientData[inv.clientId].totalCredits += p.amount;
            }
        });

        return Object.entries(clientData).map(([id, data]) => ({
            id,
            name: data.name,
            totalDebits: data.totalDebits,
            totalCredits: data.totalCredits,
            balance: data.totalDebits - data.totalCredits,
        })).filter(c => c.totalDebits > 0 || c.totalCredits > 0);
    }, [clients, invoices, payments, financialYear]);

    const supplierLedger = useMemo(() => {
        const supplierData: { [key: string]: { name: string, totalFreight: number, totalPaid: number, balance: number } } = {};
        suppliers.forEach(s => {
            supplierData[s.id] = { name: s.name, totalFreight: 0, totalPaid: 0, balance: 0 };
        });

        tripNotes.forEach(tn => {
            const fy = getFinancialYear(tn.date);
            if (financialYear !== 'All' && fy !== financialYear) return;
            if (supplierData[tn.supplierId]) {
                supplierData[tn.supplierId].totalFreight += tn.totalFreight;
            }
        });

        supplierPayments.forEach(sp => {
            const tn = tripNotes.find(t => t.id === sp.tripNoteId);
            if (tn && supplierData[tn.supplierId]) {
                const fy = getFinancialYear(sp.date);
                if (financialYear !== 'All' && fy !== financialYear) return;
                supplierData[tn.supplierId].totalPaid += sp.amount;
            }
        });
        
        return Object.entries(supplierData).map(([id, data]) => ({
            id,
            name: data.name,
            totalFreight: data.totalFreight,
            totalPaid: data.totalPaid,
            balance: data.totalPaid - data.totalFreight,
        })).filter(s => s.totalFreight > 0 || s.totalPaid > 0);
    }, [suppliers, tripNotes, supplierPayments, financialYear]);
    
    const requestSort = (key: string) => {
        let direction = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const filteredClientLedger = useMemo(() => {
        let sorted = [...clientLedger];
        if (sortConfig) {
            sorted.sort((a,b) => {
                const aVal = a[sortConfig.key as keyof typeof a];
                const bVal = b[sortConfig.key as keyof typeof b];
                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sorted.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [clientLedger, searchTerm, sortConfig]);
    
    const filteredSupplierLedger = useMemo(() => {
        let sorted = [...supplierLedger];
        if (sortConfig) {
             sorted.sort((a,b) => {
                const aVal = a[sortConfig.key as keyof typeof a];
                const bVal = b[sortConfig.key as keyof typeof b];
                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sorted.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [supplierLedger, searchTerm, sortConfig]);
    
    const allFinancialYears = useMemo(() => {
        const years = new Set<string>();
        invoices.forEach(i => { const fy = getFinancialYear(i.date); if (fy) years.add(fy); });
        tripNotes.forEach(tn => { const fy = getFinancialYear(tn.date); if (fy) years.add(fy); });
        return ['All', ...Array.from(years).sort((a, b) => b.localeCompare(a))];
    }, [invoices, tripNotes]);
    
    const getClientEntries = (clientId: string) => {
        let balance = 0;
        const entries = [];
        
        invoices.filter(i => i.clientId === clientId).forEach(inv => {
            const fy = getFinancialYear(inv.date);
            if (financialYear !== 'All' && fy !== financialYear) return;
            entries.push({ 
                date: inv.date, 
                particulars: `Invoice No: ${inv.invoiceNumber}`,
                debit: inv.totalAmount, 
                credit: 0, 
                id: inv.id,
                type: 'invoice',
                dueDate: inv.dueDate,
                status: inv.status
            });
        });
        
        payments.filter(p => {
            const inv = invoices.find(i => i.id === p.invoiceId);
            return inv && inv.clientId === clientId;
        }).forEach(p => {
            const fy = getFinancialYear(p.date);
            if (financialYear !== 'All' && fy !== financialYear) return;
            const inv = invoices.find(i => i.id === p.invoiceId);
            entries.push({ 
                date: p.date, 
                particulars: `Payment Received (Inv: ${inv?.invoiceNumber})`,
                debit: 0, 
                credit: p.amount,
                id: inv ? inv.id : null,
                type: 'invoice',
            });
        });

        return entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      .map(e => { balance += e.debit - e.credit; return {...e, balance}; });
    };

    const getSupplierEntries = (supplierId: string) => {
        let balance = 0;
        const entries = [];

        tripNotes.filter(tn => tn.supplierId === supplierId).forEach(tn => {
             const fy = getFinancialYear(tn.date);
            if (financialYear !== 'All' && fy !== financialYear) return;
            entries.push({ 
                date: tn.date, 
                particulars: `Trip Freight: ${tn.noteId} (${tn.from} to ${tn.to})`,
                debit: 0, 
                credit: tn.totalFreight,
                id: tn.id,
                type: 'trip_note'
            });
        });

        supplierPayments.filter(sp => {
            const tn = tripNotes.find(t => t.id === sp.tripNoteId);
            return tn && tn.supplierId === supplierId;
        }).forEach(sp => {
             const fy = getFinancialYear(sp.date);
            if (financialYear !== 'All' && fy !== financialYear) return;
             const tn = tripNotes.find(t => t.id === sp.tripNoteId);
            entries.push({ 
                date: sp.date, 
                particulars: `Payment Paid (${sp.type}) (TN: ${tn?.noteId})`,
                debit: sp.amount, 
                credit: 0,
                id: tn ? tn.id : null,
                type: 'trip_note'
            });
        });

        return entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      .map(e => { balance += e.debit - e.credit; return {...e, balance}; });
    };

    const handleExportSummaryCSV = () => {
        if (activeTab === 'clients') {
            const formattedData = filteredClientLedger.map(item => ({
                'Client Name': item.name,
                'Total Debits (₹)': item.totalDebits,
                'Total Credits (₹)': item.totalCredits,
                'Balance (₹)': `${Math.abs(item.balance).toLocaleString('en-IN')} ${item.balance >= 0 ? 'Dr' : 'Cr'}`
            }));
            exportToCSV(formattedData, 'Client_Ledger_Summary.csv');
        } else { // suppliers
            const formattedData = filteredSupplierLedger.map(item => ({
                'Supplier Name': item.name,
                'Total Freight (₹)': item.totalFreight,
                'Total Paid (₹)': item.totalPaid,
                'Balance (₹)': `${Math.abs(item.balance).toLocaleString('en-IN')} ${item.balance >= 0 ? 'Cr' : 'Dr'}`
            }));
            exportToCSV(formattedData, 'Supplier_Ledger_Summary.csv');
        }
    };

    if (clientId) {
        const client = clients.find(c => c.id === clientId);
        if (!client) return <div>Client not found.</div>;
        const entries = getClientEntries(clientId);
        return <LedgerDetailView party={client} type="client" entries={entries} onBack={() => navigate('/ledger')} />;
    }

    if (supplierId) {
        const supplier = suppliers.find(s => s.id === supplierId);
        if (!supplier) return <div>Supplier not found.</div>;
        const entries = getSupplierEntries(supplierId);
        return <LedgerDetailView party={supplier} type="supplier" entries={entries} onBack={() => navigate('/ledger')} />;
    }

    // Main Summary View
    return (
        <div className="p-4 sm:p-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Ledger</h1>
            
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button onClick={() => setActiveTab('clients')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'clients' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        Clients Ledger
                    </button>
                    <button onClick={() => setActiveTab('suppliers')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'suppliers' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        Suppliers Ledger
                    </button>
                </nav>
            </div>
            
             <div className="mt-6 mb-6 p-4 bg-white rounded-lg shadow-sm flex flex-wrap items-end gap-4">
                <div className="relative flex-grow">
                     <label htmlFor="ledgerSearch" className="block text-sm font-medium text-gray-500 mb-1">Search by Name</label>
                    <input id="ledgerSearch" type="text" placeholder={`Search ${activeTab === 'clients' ? 'clients' : 'suppliers'}...`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-secondary"/>
                    <SearchIcon className="absolute left-3 bottom-2.5 w-5 h-5 text-gray-400" />
                </div>
                 <div>
                    <label htmlFor="ledgerFy" className="block text-sm font-medium text-gray-500 mb-1">Financial Year</label>
                    <select id="ledgerFy" value={financialYear} onChange={e => setFinancialYear(e.target.value)} className="p-2 border border-gray-300 rounded-md shadow-sm">
                       {allFinancialYears.map(fy => <option key={fy} value={fy}>{fy}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">&nbsp;</label>
                    <button onClick={handleExportSummaryCSV} className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md shadow hover:bg-green-700 w-full">
                        <DownloadIcon className="w-5 h-5 mr-2" /> Export CSV
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-600">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                        {activeTab === 'clients' ? (
                            <tr>
                                <SortableHeader label="Client Name" sortKey="name" sortConfig={sortConfig} requestSort={requestSort} />
                                <SortableHeader label="Total Debits (₹)" sortKey="totalDebits" sortConfig={sortConfig} requestSort={requestSort} />
                                <SortableHeader label="Total Credits (₹)" sortKey="totalCredits" sortConfig={sortConfig} requestSort={requestSort} />
                                <SortableHeader label="Balance (₹)" sortKey="balance" sortConfig={sortConfig} requestSort={requestSort} />
                            </tr>
                        ) : (
                             <tr>
                                <SortableHeader label="Supplier Name" sortKey="name" sortConfig={sortConfig} requestSort={requestSort} />
                                <SortableHeader label="Total Freight (₹)" sortKey="totalFreight" sortConfig={sortConfig} requestSort={requestSort} />
                                <SortableHeader label="Total Paid (₹)" sortKey="totalPaid" sortConfig={sortConfig} requestSort={requestSort} />
                                <SortableHeader label="Balance (₹)" sortKey="balance" sortConfig={sortConfig} requestSort={requestSort} />
                            </tr>
                        )}
                    </thead>
                    <tbody>
                        {(activeTab === 'clients' ? filteredClientLedger : filteredSupplierLedger).map(item => (
                            <tr key={item.id} onClick={() => navigate(`/ledger/${activeTab === 'clients' ? 'client' : 'supplier'}/${item.id}`)} className="bg-white border-b hover:bg-gray-50 cursor-pointer">
                                <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                                <td className="px-6 py-4 text-right">{(activeTab === 'clients' ? item.totalDebits : item.totalFreight).toLocaleString('en-IN')}</td>
                                <td className="px-6 py-4 text-right">{(activeTab === 'clients' ? item.totalCredits : item.totalPaid).toLocaleString('en-IN')}</td>
                                <td className={`px-6 py-4 text-right font-semibold ${item.balance >= 0 ? (activeTab === 'clients' ? 'text-red-600' : 'text-green-600') : (activeTab === 'clients' ? 'text-green-600' : 'text-red-600')}`}>
                                    {Math.abs(item.balance).toLocaleString('en-IN')} {item.balance >= 0 ? (activeTab === 'clients' ? 'Dr' : 'Cr') : (activeTab === 'clients' ? 'Cr' : 'Dr')}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Ledger;