const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const multer = require("multer");
const path = require("path");
const Property = require("../models/Property");
const Tenant = require("../models/Tenant");
const User = require("../models/User");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../../uploads"));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "prop-" + uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 5 },
  fileFilter: (req, file, cb) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
      return cb(new Error("Property images must be JPEG, PNG, or WebP"));
    }
    cb(null, true);
  },
});

router.get("/", auth, async (req, res) => {
  try {
    const { userId, role } = req.userData;
    let query = {};

    if (role === "owner") {
      query = { $or: [{ owner_id: userId }, { "ownerships.ownerId": userId }] };
    } else if (role === "tenant") {
      const tenant = await Tenant.findOne({
        email: (await User.findById(userId)).email,
      });
      if (tenant) query = { _id: tenant.property_id };
      else return res.json([]);
    }

    const properties = await Property.find(query)
      .populate("owner_id", "name")
      .sort({ created_at: -1 });

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
      ownerId: p.owner_id?._id,
      ownerName: p.owner_id?.name,
      ownerships: p.ownerships,
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", auth, upload.single("image"), async (req, res) => {
  const {
    name,
    address,
    type,
    subType,
    status,
    price,
    area,
    units,
    bedrooms,
    bathrooms,
    ownerships,
  } = req.body;
  let ownerId = req.body.ownerId;

  if (req.userData.role === "owner") ownerId = req.userData.userId;

  let imageUrl = req.body.imageUrl || "";
  if (req.file) imageUrl = `/uploads/${req.file.filename}`;

  try {
    await Property.create({
      name,
      address,
      type,
      sub_type: subType,
      status,
      price,
      area,
      units,
      bedrooms,
      bathrooms,
      image_url: imageUrl,
      owner_id: ownerId || null,
      ownerships: ownerships ? JSON.parse(ownerships) : [],
    });
    res.status(201).json({ message: "Created" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:id", auth, upload.single("image"), async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;
    if (req.file) body.image_url = `/uploads/${req.file.filename}`;
    if (body.ownerships) body.ownerships = JSON.parse(body.ownerships);

    // Map camelCase to snake_case for Mongoose
    if (body.subType) {
      body.sub_type = body.subType;
      delete body.subType;
    }
    if (body.ownerId) {
      body.owner_id = body.ownerId;
      delete body.ownerId;
    }
    if (body.imageUrl) {
      body.image_url = body.imageUrl;
      delete body.imageUrl;
    }

    await Property.findByIdAndUpdate(id, { $set: body });
    res.json({ message: "Updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    await Property.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
