const express = require("express");

const router = express.Router();

router.use("/auth", require("./auth"));
router.use("/users", require("./users"));
router.use("/properties", require("./properties"));
router.use("/tenants", require("./tenants"));
router.use("/contracts", require("./contracts"));
router.use("/maintenance", require("./maintenance"));
router.use("/payments", require("./payments"));
router.use("/financials", require("./financials"));
router.use("/messages", require("./messages"));
router.use("/inquiries", require("./inquiries"));
router.use("/whatsapp", require("./whatsapp"));
router.use("/public", require("./public"));
router.use("/accounting", require("./accountingRoutes"));
router.use("/vouchers", require("./voucherRoutes"));
router.use("/journals", require("./journalRoutes"));
router.use("/feature-settings", require("./featureSettings"));

module.exports = router;
