

export interface Client {
  id: string;
  name: string;
  address: string;
  gstin: string;
  contactPerson?: string;
  contactNumber?: string;
}

export interface MaterialDetail {
  name: string;
  packagingType: string;
  articleCount: number;
  actualWeight: number;
  actualWeightUnit: 'MTS' | 'KGS';
  chargedWeight: number;
  chargedWeightUnit: 'MTS' | 'KGS';
  rate: number;
  rateUnit: 'Per MTS' | 'Per KGS';
  hsnCode?: string;
}

export interface Address {
    name: string;
    gstin: string;
    contact: string;
    address: string;
    city: string;
    state: string;
    country: string;
    pinCode: string;
    email?: string;
}

export interface GoodsInvoice {
  invoiceNumber: string;
  date: string;
  amount: number;
}

export interface EWayBill {
  ewbNumber: string;
  expiryDate: string;
}

export interface OtherCharge {
  name: string;
  amount: number;
}

export interface InsuranceDetails {
  company: string;
  policyNumber: string;
  date: string;
  amount: number;
  notes: string;
}

export interface Attachment {
  name: string;
  type: string;
  dataUrl: string;
}

export interface LorryReceipt {
  id: string;
  lrNumber: string;
  date: string; // ISO string
  
  consignorId?: string;
  consignor: Address;

  consigneeId?: string;
  consignee: Address;

  loadingAddressSameAsConsignor: boolean;
  loadingAddresses?: Address[];
  deliveryAddressSameAsConsignee: boolean;
  deliveryAddresses?: Address[];
  deliveryType: 'Door' | 'Warehouse';

  truckNumber: string;
  vehicleType: string;
  from: string;
  to: string;
  weightGuarantee: number;
  weightGuaranteeUnit: 'KGS' | 'MTS';
  driver?: {
    name: string;
    licenseNumber: string;
    contact: string;
  };
  loadType: 'Full Load' | 'Part Load';
  
  materials: MaterialDetail[];

  goodsInvoiceType: 'As per Invoice' | 'Amount';
  goodsInvoices: GoodsInvoice[];
  eWayBills: EWayBill[];
  showInvoiceInColumn: 'Consignor' | 'Consignee';
  
  freightType: 'Paid' | 'To Pay' | 'To be billed';
  basicFreight: number;
  otherCharges: OtherCharge[];
  gstDetails?: {
      cgst: number;
      sgst: number;

      igst: number;
  };
  advanceDetails?: {
      amount: number;
      mode: 'Cash' | 'Bank Transfer' | 'Cheque';
  };
  tdsDetails?: {
      percentage: number;
  };
  totalAmount: number;
  freightPayBy: 'Consignor' | 'Consignee';
  hideFreight: boolean;

  insurance: 'Not Insured' | 'Insured';
  insuranceDetails?: InsuranceDetails;
  riskType: "AT OWNER'S RISK" | "AT CARRIER'S RISK";
  
  modeOfTransport: string;
  demurrage?: {
      charge: number;
      chargeUnit: 'Per Hour' | 'Per Day';
      applicableAfter: number;
      applicableAfterUnit: 'hour' | 'day';
      loadingDate: string;
      reportingDate: string;
  };
  remarks: string;
  status: 'Scheduled' | 'In Transit' | 'Delivered' | 'Completed' | 'Cancelled';

  invoiceId?: string | null;
  amountPaid?: number;
  
  ePod?: Attachment;
  attachments?: Attachment[];
  termsAndConditions?: string;
}


export enum InvoiceStatus {
  Unpaid = 'Unpaid',
  Paid = 'Paid',
  PartiallyPaid = 'Partially Paid',
  Cancelled = 'Cancelled',
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface ManualInvoiceEntry {
  id: string;
  lrNumber: string;
  date: string;
  truckNumber: string;
  from: string;
  to: string;
  materialDetails: string;
  articleCount: number;
  totalWeight: number;
  haltingCharge: number;
  extraCharge: number;
  freightAmount: number;
  advanceCash: number;
}

export interface BankDetails {
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string; // ISO string
  lrIds: string[];
  lineItems?: InvoiceLineItem[];
  manualEntries?: ManualInvoiceEntry[];
  clientId: string;
  billingAddress?: Address;
  totalAmount: number; // Final invoice amount after all calculations
  amountPaid: number;
  dueDate: string; // ISO string
  status: InvoiceStatus;
  type: 'LR-based' | 'Manual';

  // New detailed fields for LR-based invoices
  hsnCode?: string;
  remarks?: string;
  bankDetails?: BankDetails;
  totalTripAmount?: number; // Sum of LR amounts before adjustments
  discount?: number;
  gstDetails?: {
    rate: number; // e.g., 5, 12, 18 or 0 for reverse charge
    isReverseCharge: boolean;
  };
  tdsDetails?: {
    type: 'Deduction' | 'Addition';
    rate: number; // percentage
  };
  roundOff?: number; // can be positive or negative
  advanceReceived?: number;
  gstFiledBy?: 'Consignee' | 'Consignor' | 'Transporter';
  lastReminderSent?: string; // ISO string
}

export interface Payment {
  id:string;
  invoiceId: string;
  date: string; // ISO string
  amount: number;
  method: 'Cash' | 'Bank Transfer' | 'Cheque';
}

export interface LorryReceiptPayment {
  id: string;
  lrId: string;
  date: string; // ISO string
  amount: number;
  method: 'Cash' | 'Bank Transfer' | 'Cheque';
}


// --- Trip Management Module Types ---

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  contactNumber: string;
  address?: string;
}

export enum TripNoteStatus {
  Draft = 'Draft',
  Confirmed = 'Confirmed',
  InTransit = 'In Transit',
  PODAwaited = 'POD Awaited',
  Completed = 'Completed',
  Closed = 'Closed',
}

export interface TripNote {
  id: string;
  noteId: string; // e.g. TN001
  date: string; // ISO string
  supplierId: string;
  vehicleNumber: string;
  vehicleType: string;
  from: string;
  to: string;
  driverName?: string;
  driverContact?: string;
  totalFreight: number;
  paymentDetails: string;
  loadingContactPerson?: string;
  loadingContactNumber?: string;
  unloadingContactPerson?: string;
  unloadingContactNumber?: string;
  remarks?: string;
  status: TripNoteStatus;
  linkedLrIds: string[];
  pod?: Attachment;
}

export interface SupplierPayment {
  id: string;
  tripNoteId: string;
  date: string; // ISO string
  amount: number;
  type: 'Advance' | 'Balance';
  method: 'Cash' | 'Bank Transfer' | 'Cheque';
}