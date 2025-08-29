// backend/models.js

const mongoose = require('mongoose');

// Schemas based on types.ts
const AddressSchema = new mongoose.Schema({
  name: String, gstin: String, contact: String, address: String, city: String,
  state: String, country: String, pinCode: String, email: String
}, { _id: false });

const MaterialDetailSchema = new mongoose.Schema({
  name: String, packagingType: String, articleCount: Number, actualWeight: Number,
  actualWeightUnit: String, chargedWeight: Number, chargedWeightUnit: String,
  rate: Number, rateUnit: String, hsnCode: String
}, { _id: false });

const GoodsInvoiceSchema = new mongoose.Schema({
  invoiceNumber: String, date: String, amount: Number
}, { _id: false });

const EWayBillSchema = new mongoose.Schema({
  ewbNumber: String, expiryDate: String
}, { _id: false });

const OtherChargeSchema = new mongoose.Schema({
  name: String, amount: Number
}, { _id: false });

const AttachmentSchema = new mongoose.Schema({
  name: String,
  type: String,
  dataUrl: String,
}, { _id: false });

const InsuranceDetailsSchema = new mongoose.Schema({
    company: String,
    policyNumber: String,
    date: String,
    amount: Number,
    notes: String,
}, { _id: false });

const DemurrageSchema = new mongoose.Schema({
    charge: Number,
    chargeUnit: String,
    applicableAfter: Number,
    applicableAfterUnit: String,
    loadingDate: String,
    reportingDate: String,
}, { _id: false });

const LorryReceiptSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  lrNumber: String,
  date: String,
  consignorId: String,
  consignor: AddressSchema,
  consigneeId: String,
  consignee: AddressSchema,
  loadingAddressSameAsConsignor: Boolean,
  loadingAddresses: [AddressSchema],
  deliveryAddressSameAsConsignee: Boolean,
  deliveryAddresses: [AddressSchema],
  deliveryType: String,
  truckNumber: String,
  vehicleType: String,
  from: String,
  to: String,
  weightGuarantee: Number,
  weightGuaranteeUnit: String,
  driver: {
    name: String,
    licenseNumber: String,
    contact: String,
  },
  loadType: String,
  materials: [MaterialDetailSchema],
  goodsInvoiceType: String,
  goodsInvoices: [GoodsInvoiceSchema],
  eWayBills: [EWayBillSchema],
  showInvoiceInColumn: String,
  freightType: String,
  basicFreight: Number,
  otherCharges: [OtherChargeSchema],
  gstDetails: {
      cgst: Number,
      sgst: Number,
      igst: Number,
  },
  advanceDetails: {
      amount: Number,
      mode: String,
  },
  tdsDetails: {
      percentage: Number,
  },
  totalAmount: Number,
  freightPayBy: String,
  hideFreight: Boolean,
  insurance: String,
  insuranceDetails: InsuranceDetailsSchema,
  riskType: String,
  modeOfTransport: String,
  demurrage: DemurrageSchema,
  remarks: String,
  status: String,
  invoiceId: { type: String, default: null },
  amountPaid: { type: Number, default: 0 },
  ePod: AttachmentSchema,
  attachments: [AttachmentSchema],
  termsAndConditions: String,
});

const ClientSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  name: String,
  address: String,
  gstin: String,
  contactPerson: String,
  contactNumber: String,
});

const InvoiceLineItemSchema = new mongoose.Schema({
    id: String,
    description: String,
    quantity: Number,
    rate: Number,
    amount: Number,
}, { _id: false });

const ManualInvoiceEntrySchema = new mongoose.Schema({
    id: String,
    lrNumber: String,
    date: String,
    truckNumber: String,
    from: String,
    to: String,
    materialDetails: String,
    articleCount: Number,
    totalWeight: Number,
    haltingCharge: Number,
    extraCharge: Number,
    freightAmount: Number,
    advanceCash: Number,
}, { _id: false });

const BankDetailsSchema = new mongoose.Schema({
    accountHolderName: String,
    bankName: String,
    accountNumber: String,
    ifscCode: String,
}, { _id: false });

const InvoiceSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  invoiceNumber: String,
  date: String,
  lrIds: [String],
  lineItems: [InvoiceLineItemSchema],
  manualEntries: [ManualInvoiceEntrySchema],
  clientId: String,
  billingAddress: AddressSchema,
  totalAmount: Number,
  amountPaid: Number,
  dueDate: String,
  status: String,
  type: String,
  hsnCode: String,
  remarks: String,
  bankDetails: BankDetailsSchema,
  totalTripAmount: Number,
  discount: Number,
  gstDetails: {
    rate: Number,
    isReverseCharge: Boolean,
  },
  tdsDetails: {
    type: String,
    rate: Number,
  },
  roundOff: Number,
  advanceReceived: Number,
  gstFiledBy: String,
  lastReminderSent: String,
});

const PaymentSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  invoiceId: String,
  date: String,
  amount: Number,
  method: String,
});

const LorryReceiptPaymentSchema = new mongoose.Schema({
    id: { type: String, unique: true, required: true },
    lrId: String,
    date: String,
    amount: Number,
    method: String,
});

const SupplierSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  name: String,
  contactPerson: String,
  contactNumber: String,
  address: String,
});

const TripNoteSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  noteId: String,
  date: String,
  supplierId: String,
  vehicleNumber: String,
  vehicleType: String,
  from: String,
  to: String,
  driverName: String,
  driverContact: String,
  totalFreight: Number,
  paymentDetails: String,
  loadingContactPerson: String,
  loadingContactNumber: String,
  unloadingContactPerson: String,
  unloadingContactNumber: String,
  remarks: String,
  status: String,
  linkedLrIds: [String],
  pod: {
      name: String,
      type: String,
      dataUrl: String,
  },
});

const SupplierPaymentSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  tripNoteId: String,
  date: String,
  amount: Number,
  type: String,
  method: String,
});

// Export Models
module.exports = {
  Client: mongoose.model('Client', ClientSchema),
  LorryReceipt: mongoose.model('LorryReceipt', LorryReceiptSchema),
  Invoice: mongoose.model('Invoice', InvoiceSchema),
  Payment: mongoose.model('Payment', PaymentSchema),
  LorryReceiptPayment: mongoose.model('LorryReceiptPayment', LorryReceiptPaymentSchema),
  Supplier: mongoose.model('Supplier', SupplierSchema),
  TripNote: mongoose.model('TripNote', TripNoteSchema),
  SupplierPayment: mongoose.model('SupplierPayment', SupplierPaymentSchema),
};