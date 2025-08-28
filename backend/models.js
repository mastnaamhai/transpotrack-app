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

const LorryReceiptSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  lrNumber: String,
  date: String,
  consignorId: String,
  consignor: AddressSchema,
  consigneeId: String,
  consignee: AddressSchema,
  truckNumber: String,
  from: String,
  to: String,
  totalAmount: Number,
  amountPaid: { type: Number, default: 0 },
  freightType: String,
  status: String,
  invoiceId: { type: String, default: null },
  // Add other fields from LorryReceipt type as needed for full functionality
  materials: [MaterialDetailSchema],
  goodsInvoices: [GoodsInvoiceSchema],
  eWayBills: [EWayBillSchema],
  otherCharges: [OtherChargeSchema],
});

const ClientSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  name: String,
  address: String,
  gstin: String,
  contactPerson: String,
  contactNumber: String,
});

const InvoiceSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  invoiceNumber: String,
  date: String,
  lrIds: [String],
  clientId: String,
  billingAddress: AddressSchema,
  totalAmount: Number,
  amountPaid: Number,
  dueDate: String,
  status: String,
  type: String,
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
  from: String,
  to: String,
  totalFreight: Number,
  status: String,
  linkedLrIds: [String],
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