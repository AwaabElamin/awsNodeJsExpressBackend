const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Voucher = require("../models/Voucher");

router.get("/summary", auth, async (req, res) => {
  try {
    const summary = await Voucher.aggregate([
      { $match: { type: "receipt", is_reversed: false } },
      {
        $group: {
          _id: { $month: "$date" },
          month: { $first: { $dateToString: { format: "%b", date: "$date" } } },
          revenue: { $sum: "$amount" },
          expenses: { $sum: { $multiply: ["$amount", 0.15] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
