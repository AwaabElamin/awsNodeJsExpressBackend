const Voucher = require("../models/Voucher");
const Account = require("../models/Account");
const JournalEntry = require("../models/JournalEntry");

const AccountingService = {
  generateUniqueSerial: async (prefix) => {
    const year = new Date().getFullYear();
    let isUnique = false;
    let serial = "";
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      attempts++;
      const ts = Date.now().toString().slice(-6);
      const random = Math.floor(1000 + Math.random() * 9000);
      serial = `${prefix}-${year}${ts}-${random}`;

      const check = await Voucher.findOne({ serial_number: serial });
      if (!check) isUnique = true;
    }

    if (!isUnique) throw new Error("Serial generation failed");
    return serial;
  },

  createVoucher: async (client, data, userId, session) => {
    const {
      type,
      category,
      date,
      description,
      amount,
      method,
      bankName,
      referenceNumber,
      propertyId,
      tenantId,
      ownerId,
      isVatApplicable,
      deductCommission,
      attachmentUrl,
      contractId,
      monthsCovered,
    } = data;

    const serialPrefix = type === "receipt" ? "REC" : "PAY";
    const serial = await AccountingService.generateUniqueSerial(serialPrefix);
    const amountNum = parseFloat(amount);

    const voucherArr = await Voucher.create(
      [
        {
          serial_number: serial,
          type,
          category,
          date: date || new Date(),
          description,
          amount: amountNum,
          method,
          bank_name: bankName,
          reference_number: referenceNumber,
          property_id: propertyId || null,
          tenant_id: tenantId || null,
          owner_id: ownerId || null,
          created_by: userId,
          attachment_url: attachmentUrl || null,
          is_vat_applicable: isVatApplicable || false,
          deduct_commission: deductCommission || false,
          contract_id: contractId || null,
          months_covered: monthsCovered || 0,
          base_amount: amountNum,
        },
      ],
      { session }
    );

    const voucher = voucherArr[0];

    const accounts = await Account.find({}).session(session);
    const getAcc = (code) => accounts.find((a) => a.code === code);

    const ACC_CASH = getAcc("1010");
    const ACC_BANK = getAcc("1020");
    const ACC_OWNER_PAYABLE = getAcc("2010");
    const ACC_VAT_PAYABLE = getAcc("2030");
    const ACC_COMMISSION_REV = getAcc("4010");
    const ACC_BROKERAGE_REV = getAcc("4020");
    const ACC_MAINTENANCE_EXP = getAcc("5010");

    const assetAcc = method === "cash" ? ACC_CASH : ACC_BANK;

    if (type === "receipt") {
      if (assetAcc)
        await AccountingService.addEntry(
          voucher._id,
          assetAcc,
          amountNum,
          0,
          "Receipt to Asset",
          session
        );

      let netToOwner = amountNum;
      if (category === "rent") {
        if (deductCommission && ACC_COMMISSION_REV) {
          const commissionAmt = amountNum * 0.05;
          await AccountingService.addEntry(
            voucher._id,
            ACC_COMMISSION_REV,
            0,
            commissionAmt,
            "Management Commission",
            session
          );
          netToOwner -= commissionAmt;
          voucher.commission_amount = commissionAmt;
        }
        if (isVatApplicable && ACC_VAT_PAYABLE) {
          const vatAmt = amountNum - amountNum / 1.15;
          await AccountingService.addEntry(
            voucher._id,
            ACC_VAT_PAYABLE,
            0,
            vatAmt,
            "VAT Collected",
            session
          );
          netToOwner -= vatAmt;
          voucher.vat_amount = vatAmt;
        }
        if (ACC_OWNER_PAYABLE)
          await AccountingService.addEntry(
            voucher._id,
            ACC_OWNER_PAYABLE,
            0,
            netToOwner,
            "Net Rent to Owner",
            session
          );
        await voucher.save({ session });
      } else if (category === "brokerage" && ACC_BROKERAGE_REV) {
        await AccountingService.addEntry(
          voucher._id,
          ACC_BROKERAGE_REV,
          0,
          amountNum,
          "Brokerage Revenue",
          session
        );
      } else if (ACC_OWNER_PAYABLE) {
        await AccountingService.addEntry(
          voucher._id,
          ACC_OWNER_PAYABLE,
          0,
          amountNum,
          "General Receipt",
          session
        );
      }
    } else {
      if (assetAcc)
        await AccountingService.addEntry(
          voucher._id,
          assetAcc,
          0,
          amountNum,
          "Payment from Asset",
          session
        );
      if (category === "owner_payout" && ACC_OWNER_PAYABLE) {
        await AccountingService.addEntry(
          voucher._id,
          ACC_OWNER_PAYABLE,
          amountNum,
          0,
          "Owner Withdrawal",
          session
        );
      } else if (
        (category === "maintenance" || category === "utility") &&
        ACC_OWNER_PAYABLE
      ) {
        await AccountingService.addEntry(
          voucher._id,
          ACC_OWNER_PAYABLE,
          amountNum,
          0,
          `Expense: ${category}`,
          session
        );
      } else if (ACC_MAINTENANCE_EXP) {
        await AccountingService.addEntry(
          voucher._id,
          ACC_MAINTENANCE_EXP,
          amountNum,
          0,
          "Internal Expense",
          session
        );
      }
    }

    return voucher._id;
  },

  addEntry: async (voucherId, account, debit, credit, description, session) => {
    if (!account) return;

    await JournalEntry.create(
      [
        {
          voucher_id: voucherId,
          account_id: account._id,
          debit,
          credit,
          description,
        },
      ],
      { session }
    );

    let balanceChange = 0;
    if (account.type === "asset" || account.type === "expense") {
      balanceChange = debit - credit;
    } else {
      balanceChange = credit - debit;
    }

    await Account.findByIdAndUpdate(account._id, {
      $inc: { balance: balanceChange },
    }).session(session);
  },
};

module.exports = AccountingService;
