const express = require("express");
const { rateLimit } = require("express-rate-limit");
const router = express.Router();
const Property = require("../models/Property");
const Inquiry = require("../models/Inquiry");
const inquiryLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many inquiries. Please try again later." },
});

router.get("/properties", async (req, res) => {
  try {
    const { city, minPrice, maxPrice, type } = req.query;
    let query = { status: { $in: ["شاغر", "Vacant"] } };

    if (type) query.type = type;
    if (city) query.address = { $regex: city, $options: "i" };
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    const properties = await Property.find(query).sort({ created_at: -1 });
    const formatted = properties.map((p) => ({
      id: p._id,
      name: p.name,
      address: p.address,
      type: p.type,
      subType: p.sub_type,
      status: p.status,
      price: p.price,
      area: p.area,
      units: p.units,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      imageUrl: p.image_url,
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/properties/:id", async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property || !["شاغر", "Vacant"].includes(property.status)) {
      return res.status(404).json({ error: "Not found" });
    }
    res.json({
      id: property._id,
      name: property.name,
      address: property.address,
      type: property.type,
      subType: property.sub_type,
      status: property.status,
      price: property.price,
      area: property.area,
      units: property.units,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      imageUrl: property.image_url,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/inquiries", inquiryLimit, async (req, res) => {
  const { propertyId, name, email, phone, message } = req.body;
  if (
    typeof name !== "string" || !name.trim() || name.length > 150 ||
    typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 ||
    typeof message !== "string" || !message.trim() || message.length > 5000 ||
    (phone !== undefined && (typeof phone !== "string" || phone.length > 40))
  ) {
    return res.status(400).json({ error: "Please provide valid contact details and a message" });
  }
  try {
    if (propertyId) {
      const property = await Property.findById(propertyId);
      if (!property || !["شاغر", "Vacant"].includes(property.status)) {
        return res.status(404).json({ error: "Available property not found" });
      }
    }

    await Inquiry.create({
      property_id: propertyId || null,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim(),
      message: message.trim(),
    });
    res.status(201).json({ message: "Success" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
