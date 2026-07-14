const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Tạo thư mục nếu chưa tồn tại
const uploadPath = path.join(__dirname, "../public/uploads/avatar");

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

// Cấu hình nơi lưu file
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadPath);
  },

  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);

    const filename =
      "avatar-" + Date.now() + "-" + Math.round(Math.random() * 1e9) + ext;

    cb(null, filename);
  },
});

// Chỉ cho upload ảnh
const fileFilter = (req, file, cb) => {
  const allow = /jpg|jpeg|png|webp|gif|jfif/;

  const ext = allow.test(path.extname(file.originalname).toLowerCase());

  const mime = allow.test(file.mimetype);

  if (ext && mime) {
    return cb(null, true);
  }

  cb(new Error("Chỉ được upload file ảnh."));
};

const upload = multer({
  storage,

  fileFilter,

  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

module.exports = upload;
