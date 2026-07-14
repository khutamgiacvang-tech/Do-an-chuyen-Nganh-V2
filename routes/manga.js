const express = require("express");
const router = express.Router();

const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Manga = require("../models/Manga");
const mangaController = require("../controllers/mangaController");

// =======================
// Tạo thư mục temp
// =======================

if (!fs.existsSync("temp")) {

    fs.mkdirSync("temp");

}

// =======================
// Upload cover + banner
// =======================

const storage = multer.diskStorage({

    destination(req, file, cb) {

        if (file.fieldname === "cover") {

            cb(null, "public/uploads/covers");

        } else {

            cb(null, "public/uploads/banners");

        }

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

// =======================
// Upload ZIP chapter
// =======================

const chapterUpload = multer({

    storage: multer.diskStorage({

        destination(req, file, cb) {

            cb(null, "temp");

        },

        filename(req, file, cb) {

            cb(

                null,

                Date.now() +

                path.extname(file.originalname)

            );

        }

    })

});

// =======================
// Tạo truyện
// =======================

router.get(

    "/upload",

    mangaController.showCreate

);

router.post(

    "/upload",

    upload.fields([

        {

            name: "cover",

            maxCount: 1

        },

        {

            name: "banner",

            maxCount: 1

        }

    ]),

    mangaController.create

);

// =======================
// Upload Chapter
// =======================

router.get(

    "/upload/:slug/chapter",

    mangaController.showUploadChapter

);

router.post(

    "/upload/:slug/chapter",

    chapterUpload.single("zip"),

    mangaController.uploadChapter

);

// =========================
// Truyện của tôi
// =========================

router.get(

    "/my-manga",

    mangaController.myManga

);

router.get(

    "/my-manga/:slug",

    mangaController.manageManga

);

// =========================
// Sửa thông tin truyện
// =========================

router.get(

    "/my-manga/:slug/edit",

    mangaController.showEdit

);

router.post(

    "/my-manga/:slug/edit",

    mangaController.updateManga

);

// =========================
// Đổi Cover
// =========================

router.get(

    "/my-manga/:slug/cover",

    mangaController.showChangeCover

);

router.post(

    "/my-manga/:slug/cover",

    upload.single("cover"),

    mangaController.changeCover

);

// =========================
// Đổi Banner
// =========================

router.get(

    "/my-manga/:slug/banner",

    mangaController.showChangeBanner

);

router.post(

    "/my-manga/:slug/banner",

    upload.single("banner"),

    mangaController.changeBanner

);

// =========================
// Xóa truyện
// =========================

router.get(

    "/my-manga/:slug/delete",

    mangaController.deleteManga

);

// =========================
// Xóa Chapter
// =========================

router.get(

    "/my-manga/:slug/chapter/:id/delete",

    mangaController.deleteChapter

);

// =========================
// Sửa Chapter
// =========================

router.get(

    "/my-manga/:slug/chapter/:id/edit",

    mangaController.showEditChapter

);

router.post(

    "/my-manga/:slug/chapter/:id/edit",

    chapterUpload.single("zip"),

    mangaController.updateChapter

);

router.get(
    "/manga/:slug",
    mangaController.showManga
);

// =========================
// Theo dõi / Bỏ theo dõi truyện
// =========================

router.post(
    "/manga/:slug/follow",
    mangaController.toggleFollow
);

router.get(
    "/manga/:slug/chapter/:number",
    mangaController.readChapter
);

router.get("/manga", async (req, res) => {

    const page = parseInt(req.query.page) || 1;
    const limit = 25;

    const totalMangas = await Manga.countDocuments();

    const totalPages = Math.ceil(totalMangas / limit);

    const mangas = await Manga.find()
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

    res.render("manga/list", {
        title: "Danh sách truyện",
        mangas,
        currentPage: page,
        totalPages
    });

    

});

router.get(
    "/api/search",
    mangaController.searchAjax
);

router.post(
    "/history/save",
    mangaController.saveHistory
);

router.get(
    "/history",
    mangaController.history
);

module.exports = router;