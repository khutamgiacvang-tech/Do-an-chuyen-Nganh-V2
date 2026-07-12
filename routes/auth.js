const express = require("express");
const passport = require("passport");

const router = express.Router();

const authController = require("../controllers/authController");

// =====================
// Local
// =====================

router.post("/login", authController.login);

router.post("/register", authController.register);

router.get("/logout", authController.logout);

// =====================
// Google
// =====================

router.get(
    "/auth/google",
    passport.authenticate("google", {
        scope: ["profile", "email"]
    })
);

router.get(
    "/auth/google/callback",
    passport.authenticate("google", {
        failureRedirect: "/",
        failureFlash: true
    }),
    (req, res) => {

        req.flash("success", "Đăng nhập Google thành công.");

        res.redirect("/");

    }
);

// =====================
// Discord
// =====================

router.get(
    "/auth/discord",
    passport.authenticate("discord")
);

router.get(
    "/auth/discord/callback",
    passport.authenticate("discord", {
        failureRedirect: "/"
    }),
    (req, res) => {

        req.flash("success", "Đăng nhập Discord thành công.");

        res.redirect("/");

    }
);

module.exports = router;