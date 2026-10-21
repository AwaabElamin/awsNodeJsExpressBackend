const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Tenant = require("../models/Tenant");
const Property = require("../models/Property");

router.get("/", auth, async (req, res) => {
  try {
    const tenants = await Tenant.find({}).sort({ created_at: -1 });
    const formatted = tenants.map((t) => ({
      id: t._id,
      name: t.name,
      email: t.email,
      phone: t.phone,
      nationalId: t.national_id,
      propertyId: t.property_id,
      leaseEnd: t.lease_end ? t.lease_end.toISOString().split("T")[0] : null,
      status: t.status,
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", auth, async (req, res) => {
  const { name, email, phone, nationalId, propertyId, leaseEnd, status } =
    req.body;
  try {
    const tenant = await Tenant.create({
      name,
      email,
      phone,
      national_id: nationalId,
      property_id: propertyId,
      lease_end: leaseEnd,
      status,
    });
    if (status === "active" && propertyId) {
      await Property.findByIdAndUpdate(propertyId, { status: "مؤجر" });
    }
    res.status(201).json({ message: "Created" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, nationalId, propertyId, leaseEnd, status } =
      req.body;

    const update = {};
    if (name) update.name = name;
    if (email) update.email = email;
    if (phone) update.phone = phone;
    if (nationalId) update.national_id = nationalId;
    if (propertyId) update.property_id = propertyId;
    if (leaseEnd) update.lease_end = leaseEnd;
    if (status) update.status = status;

    if (status === "active" && propertyId) {
      await Property.findByIdAndUpdate(propertyId, { status: "مؤجر" });
    }

    await Tenant.findByIdAndUpdate(id, { $set: update });
    res.json({ message: "Updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id);
    if (tenant && tenant.property_id) {
      await Property.findByIdAndUpdate(tenant.property_id, { status: "شاغر" });
    }
    await Tenant.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
