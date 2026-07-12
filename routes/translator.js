const express = require("express");

const router = express.Router();

const multer = require("multer");

const path = require("path");

const translatorController = require("../controllers/translatorController");

const storage = multer.diskStorage({

    destination(req, file, cb) {

        cb(

            null,

            "public/uploads/applications"

        );

    },

    filename(req, file, cb) {

        cb(

            null,

            Date.now() +

            path.extname(file.originalname)

        );

    }

});

const upload = multer({

    storage

});

router.get(

    "/translator/apply",

    translatorController.showApply

);

router.post(

    "/translator/apply",

    upload.array("sampleImages", 5),

    translatorController.submitApplication

);

router.get(
    "/translator/application",
    translatorController.myApplication
);

router.get(
    "/translator/:username",
    translatorController.showProfile
);
module.exports = router;