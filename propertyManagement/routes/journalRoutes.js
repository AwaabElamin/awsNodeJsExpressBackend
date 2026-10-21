const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const JournalEntry = require("../models/JournalEntry");

router.get("/", auth, async (req, res) => {
  try {
    const result = await JournalEntry.find({})
      .populate({
        path: "voucher_id",
        select: "serial_number date",
      })
      .populate("account_id", "name code")
      .sort({ created_at: -1 });

    const formatted = result.map((j) => ({
      id: j._id,
      voucherId: j.voucher_id?._id,
      voucherSerial: j.voucher_id?.serial_number,
      date: j.voucher_id?.date
        ? j.voucher_id.date.toISOString().split("T")[0]
        : null,
      accountName: j.account_id?.name,
      accountCode: j.account_id?.code,
      debit: j.debit,
      credit: j.credit,
      description: j.description,
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
