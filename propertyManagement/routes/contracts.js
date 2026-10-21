const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const multer = require("multer");
const path = require("path");
const mongoose = require("mongoose");
const Contract = require("../models/Contract");
const Tenant = require("../models/Tenant");
const Property = require("../models/Property");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../../uploads"));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "contract-" + uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage, limits: { fileSize: 1024 * 1024 * 10 } });

router.get("/", auth, async (req, res) => {
  try {
    const result = await Contract.find({})
      .populate("tenant_id", "name")
      .populate("property_id", "name")
      .sort({ created_at: -1 });

    const formatted = result.map((c) => ({
      id: c._id,
      contractNumber: c.contract_number,
      tenantId: c.tenant_id?._id,
      tenantName: c.tenant_id?.name,
      propertyId: c.property_id?._id,
      propertyName: c.property_id?.name,
      startDate: c.start_date.toISOString().split("T")[0],
      endDate: c.end_date.toISOString().split("T")[0],
      amount: c.amount,
      status: c.status,
      fileUrl: c.file_url,
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", auth, upload.single("contractFile"), async (req, res) => {
  const {
    contractNumber,
    propertyId,
    startDate,
    endDate,
    amount,
    status,
    tenantName,
    tenantEmail,
    tenantPhone,
    tenantNationalId,
  } = req.body;

  let fileUrl = req.file ? `/uploads/${req.file.filename}` : null;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let tenant = await Tenant.findOne({
      $or: [{ national_id: tenantNationalId }, { email: tenantEmail }],
    }).session(session);

    if (tenant) {
      tenant.name = tenantName;
      tenant.phone = tenantPhone;
      tenant.property_id = propertyId;
      tenant.lease_end = endDate;
      tenant.status = "active";
      await tenant.save({ session });
    } else {
      tenant = await Tenant.create(
        [
          {
            name: tenantName,
            email: tenantEmail,
            phone: tenantPhone,
            national_id: tenantNationalId,
            property_id: propertyId,
            lease_end: endDate,
            status: "active",
          },
        ],
        { session }
      );
      tenant = tenant[0];
    }

    const contract = await Contract.create(
      [
        {
          contract_number: contractNumber,
          tenant_id: tenant._id,
          property_id: propertyId,
          start_date: startDate,
          end_date: endDate,
          amount,
          status,
          file_url: fileUrl,
        },
      ],
      { session }
    );

    await Property.findByIdAndUpdate(propertyId, { status: "مؤجر" }).session(
      session
    );

    await session.commitTransaction();
    res.status(201).json(contract[0]);
  } catch (err) {
    await session.abortTransaction();
    res.status(500).json({ error: err.message });
  } finally {
    session.endSession();
  }
});

router.patch("/:id", auth, async (req, res) => {
  const { id } = req.params;
  const { contractNumber, startDate, endDate, amount, status } = req.body;
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const update = {};
    if (contractNumber) update.contract_number = contractNumber;
    if (startDate) update.start_date = startDate;
    if (endDate) update.end_date = endDate;
    if (amount) update.amount = amount;
    if (status) update.status = status;

    const contract = await Contract.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true, session }
    );

    if (contract && endDate) {
      await Tenant.findByIdAndUpdate(contract.tenant_id, {
        lease_end: endDate,
      }).session(session);
    }

    await session.commitTransaction();
    res.json({ message: "Contract updated and tenant lease synchronized" });
  } catch (err) {
    await session.abortTransaction();
    res.status(500).json({ error: err.message });
  } finally {
    session.endSession();
  }
});

module.exports = router;
