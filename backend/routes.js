// backend/routes.js

const express = require('express');
const router = express.Router();
const {
  Client, LorryReceipt, Invoice, Payment, LorryReceiptPayment,
  Supplier, TripNote, SupplierPayment
} = require('./models');

// Generic function to create CRUD endpoints for a model
const createCrudEndpoints = (model, modelName) => {
  // GET all
  router.get(`/${modelName}`, async (req, res) => {
    console.log(`[API] Attempting to GET all from ${modelName}`);
    try {
      const items = await model.find();
      console.log(`[API] Successfully found ${items.length} items from ${modelName}`);
      res.json(items);
    } catch (err) {
      console.error(`[API] Error GETTING all from ${modelName}:`, err);
      res.status(500).json({ message: err.message });
    }
  });

  // POST new
  router.post(`/${modelName}`, async (req, res) => {
    console.log(`[API] Attempting to POST to ${modelName}`);
    const item = new model(req.body);
    try {
      const newItem = await item.save();
      console.log(`[API] Successfully POSTED to ${modelName}`);
      res.status(201).json(newItem);
    } catch (err) {
      console.error(`[API] Error POSTING to ${modelName}:`, err);
      res.status(400).json({ message: err.message });
    }
  });

  // PUT update
  router.put(`/${modelName}/:id`, async (req, res) => {
    try {
      const updatedItem = await model.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
      if (!updatedItem) return res.status(404).json({ message: 'Item not found' });
      res.json(updatedItem);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  });

  // DELETE
  router.delete(`/${modelName}/:id`, async (req, res) => {
    try {
      const deletedItem = await model.findOneAndDelete({ id: req.params.id });
       if (!deletedItem) return res.status(404).json({ message: 'Item not found' });
      res.json({ message: 'Item deleted successfully' });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });
};

// Create endpoints for all models
createCrudEndpoints(Client, 'clients');
createCrudEndpoints(LorryReceipt, 'lorryReceipts');
createCrudEndpoints(Invoice, 'invoices');
createCrudEndpoints(Payment, 'payments');
createCrudEndpoints(LorryReceiptPayment, 'lorryReceiptPayments');
createCrudEndpoints(Supplier, 'suppliers');
createCrudEndpoints(TripNote, 'tripNotes');
createCrudEndpoints(SupplierPayment, 'supplierPayments');

module.exports = router;