const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Account = require("../models/Account");
const JournalEntry = require("../models/JournalEntry");
const Voucher = require("../models/Voucher");
const PayoutRequest = require("../models/PayoutRequest");
const mongoose = require("mongoose");
const AccountingService = require("../services/accountingService");

router.get("/accounts", auth, async (req, res) => {
  try {
    const accounts = await Account.find({}).sort({ code: 1 });
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/report/owner/:id", auth, async (req, res) => {
  try {
    const ownerId = new mongoose.Types.ObjectId(req.params.id);

    // Calculate Balance from Journal Entries for Account 2010 linked to this owner
    const ownerAccount = await Account.findOne({ code: "2010" });
    if (!ownerAccount) throw new Error("Owner Payable account missing");

    const ledgerAggregation = await JournalEntry.aggregate([
      {
        $lookup: {
          from: "vouchers",
          localField: "voucher_id",
          foreignField: "_id",
          as: "voucher",
        },
      },
      { $unwind: "$voucher" },
      {
        $match: {
          account_id: ownerAccount._id,
          "voucher.owner_id": ownerId,
        },
      },
      {
        $group: {
          _id: null,
          totalCredit: { $sum: "$credit" },
          totalDebit: { $sum: "$debit" },
        },
      },
    ]);

    const totals = ledgerAggregation[0] || { totalCredit: 0, totalDebit: 0 };

    // Approximate breakdowns from Vouchers
    const incomeRes = await Voucher.aggregate([
      { $match: { owner_id: ownerId, type: "receipt", is_reversed: false } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const expenseRes = await Voucher.aggregate([
      {
        $match: {
          owner_id: ownerId,
          type: "payment",
          category: { $ne: "owner_payout" },
          is_reversed: false,
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const payoutRes = await Voucher.aggregate([
      {
        $match: {
          owner_id: ownerId,
          category: "owner_payout",
          is_reversed: false,
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const pendingRes = await PayoutRequest.aggregate([
      { $match: { owner_id: ownerId, status: "pending" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    res.json({
      income: incomeRes[0]?.total || 0,
      expense: expenseRes[0]?.total || 0,
      payout: payoutRes[0]?.total || 0,
      balance: totals.totalCredit - totals.totalDebit,
      pendingPayouts: pendingRes[0]?.total || 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/payouts", auth, async (req, res) => {
  try {
    const { role, userId } = req.userData;
    let query = {};
    if (role === "owner") query.owner_id = userId;
    const result = await PayoutRequest.find(query)
      .populate("owner_id", "name")
      .sort({ request_date: -1 });
    const formatted = result.map((pr) => ({
      id: pr._id,
      ownerId: pr.owner_id?._id,
      ownerName: pr.owner_id?.name,
      amount: pr.amount,
      status: pr.status,
      notes: pr.notes,
      requestDate: pr.request_date
        .toISOString()
        .replace("T", " ")
        .substring(0, 16),
      processedDate: pr.processed_date
        ? pr.processed_date.toISOString().replace("T", " ").substring(0, 16)
        : null,
      bankDetailsSnapshot: pr.bank_details_snapshot,
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/payouts/request", auth, async (req, res) => {
  const { amount, notes } = req.body;
  try {
    await PayoutRequest.create({
      owner_id: req.userData.userId,
      amount,
      notes,
    });
    res.status(201).json({ message: "Requested" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/payouts/:id/process", auth, async (req, res) => {
  const { status } = req.body;
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const payout = await PayoutRequest.findById(req.params.id).session(session);
    if (!payout || payout.status !== "pending")
      throw new Error("Invalid request");

    if (status === "paid") {
      payout.status = "paid";
      payout.processed_date = new Date();
      await payout.save({ session });

      await AccountingService.createVoucher(
        null,
        {
          type: "payment",
          category: "owner_payout",
          date: new Date(),
          description: `Payout Request ${payout._id}`,
          amount: payout.amount,
          method: "transfer",
          ownerId: payout.owner_id,
          deductCommission: false,
        },
        req.userData.userId,
        session
      );
    } else {
      payout.status = "rejected";
      payout.processed_date = new Date();
      await payout.save({ session });
    }

    await session.commitTransaction();
    res.json({ message: `Payout ${status}` });
  } catch (err) {
    await session.abortTransaction();
    res.status(500).json({ error: err.message });
  } finally {
    session.endSession();
  }
});

module.exports = router;
