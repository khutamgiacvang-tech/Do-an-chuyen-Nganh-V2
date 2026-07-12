const multer = require("multer");
const path = require("path");
const fs = require("fs");

const coverPath = "public/uploads/covers";
const chapterPath = "public/uploads/chapters";

if (!fs.existsSync(coverPath)) {
  fs.mkdirSync(coverPath, { recursive: true });
}

if (!fs.existsSync(chapterPath)) {
  fs.mkdirSync(chapterPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === "cover") {
      cb(null, coverPath);
    } else {
      cb(null, chapterPath);
    }
  },

  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);

    cb(
      null,

      unique + path.extname(file.originalname),
    );
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(
      new Error("Chỉ được upload ảnh."),

      false,
    );
  }
};

module.exports = multer({
  storage,

  fileFilter,

  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});
