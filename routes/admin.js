const express = require("express");

const router = express.Router();

const adminController = require("../controllers/adminController");

// Dashboard
router.get(
    "/admin",
    adminController.dashboard
);

// ==========================
// Translator
// ==========================

router.get(
    "/admin/application/:id",
    adminController.getApplication
);

router.post(
    "/admin/application/:id/approve",
    adminController.approveApplication
);

router.post(
    "/admin/application/:id/reject",
    adminController.rejectApplication
);

// ==========================
// Manga
// ==========================

router.get(
    "/admin/manga/:id",
    adminController.getManga
);

router.post(
    "/admin/manga/:id/approve",
    adminController.approveManga
);

router.post(
    "/admin/manga/:id/reject",
    adminController.rejectManga
);

module.exports = router;