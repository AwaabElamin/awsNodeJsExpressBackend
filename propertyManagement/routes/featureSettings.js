const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const FeatureSetting = require("../models/FeatureSetting");

router.get("", auth, async (req, res) => {
  try {
    const settings = await FeatureSetting.find({}).sort({ feature: 1 });

    res.json({
      data: settings.map((item) => ({
        id: item._id,
        feature: item.feature,
        isActive: item.is_active,
        updatedBy: item.updated_by,
        updatedAt: item.updated_at,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/update", auth, async (req, res) => {
  const { feature, isActive } = req.body;

  if (!req.userData || req.userData.role !== "admin") {
    return res
      .status(403)
      .json({ error: "Only admin can update feature settings" });
  }

  if (!feature || typeof feature !== "string") {
    return res.status(400).json({ error: "feature is required" });
  }

  if (typeof isActive !== "boolean") {
    return res
      .status(400)
      .json({ error: "isActive must be a boolean (true/false)" });
  }

  try {
    const updated = await FeatureSetting.findOneAndUpdate(
      { feature: feature.trim() },
      {
        $set: {
          is_active: isActive,
          updated_by: req.userData.userId,
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    res.json({
      message: `Feature ${updated.feature} ${updated.is_active ? "activated" : "deactivated"}`,
      data: {
        id: updated._id,
        feature: updated.feature,
        isActive: updated.is_active,
        updatedBy: updated.updated_by,
        updatedAt: updated.updated_at,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
