const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const MaintenanceRequest = require("../models/MaintenanceRequest");
const Property = require("../models/Property");
const Tenant = require("../models/Tenant");
const User = require("../models/User");
const mongoose = require("mongoose");
const AccountingService = require("../services/accountingService");

router.get("/", auth, async (req, res) => {
  try {
    const { userId, role } = req.userData;
    let query = {};

    if (role === "tenant") {
      const user = await User.findById(userId);
      const tenant = await Tenant.findOne({ email: user.email });
      if (!tenant) return res.json([]);
      query.tenant_id = tenant._id;
    }

    const requests = await MaintenanceRequest.find(query)
      .populate("property_id", "name")
      .populate("tenant_id", "name")
      .populate("contractor_id", "name")
      .sort({ date_submitted: -1 });

    const formatted = requests.map((m) => ({
      id: m._id,
      title: m.title,
      description: m.description,
      propertyId: m.property_id?._id,
      propertyName: m.property_id?.name,
      tenantId: m.tenant_id?._id,
      tenantName: m.tenant_id?.name,
      priority: m.priority,
      status: m.status,
      dateSubmitted: m.date_submitted.toISOString().split("T")[0],
      contractorId: m.contractor_id?._id,
      contractorName: m.contractor_id?.name,
      cost: m.cost,
      invoiceStatus: m.invoice_status,
      contractorNotes: m.contractor_notes,
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", auth, async (req, res) => {
  const { title, description, propertyId, priority } = req.body;
  try {
    const { userId, role } = req.userData;
    let finalTenantId = null;
    let finalPropertyId = propertyId;

    if (role === "tenant") {
      const user = await User.findById(userId);
      const tenant = await Tenant.findOne({ email: user.email });
      if (!tenant)
        return res.status(403).json({ error: "Tenant profile not found" });
      finalTenantId = tenant._id;
      finalPropertyId = tenant.property_id;
    } else if (propertyId) {
      const t = await Tenant.findOne({
        property_id: propertyId,
        status: "active",
      });
      if (t) finalTenantId = t._id;
    }

    await MaintenanceRequest.create({
      title,
      description,
      property_id: finalPropertyId,
      tenant_id: finalTenantId,
      priority: priority || "medium",
      status: "pending",
    });
    res.status(201).json({ message: "Created" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:id", auth, async (req, res) => {
  try {
    if (req.userData.role === "tenant")
      return res.status(403).json({ error: "Denied" });
    const { status, contractorNotes, cost, contractorId, invoiceStatus } =
      req.body;

    const update = {};
    if (status) update.status = status;
    if (contractorNotes) update.contractor_notes = contractorNotes;
    if (cost) update.cost = cost;
    if (contractorId) update.contractor_id = contractorId;
    if (invoiceStatus) update.invoice_status = invoiceStatus;

    await MaintenanceRequest.findByIdAndUpdate(req.params.id, { $set: update });
    res.json({ message: "Updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
