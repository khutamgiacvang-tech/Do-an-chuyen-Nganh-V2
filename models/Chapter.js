const mongoose = require("mongoose");

const chapterSchema = new mongoose.Schema(
  {
    // =========================
    // Manga
    // =========================

    manga: {
      type: mongoose.Schema.Types.ObjectId,

      ref: "Manga",

      required: true,

      index: true,
    },

    // =========================
    // Số chapter
    // =========================

    chapterNumber: {
      type: Number,

      required: true,
    },

    // =========================
    // Tiêu đề
    // =========================

    title: {
      type: String,

      default: "Không có tiêu đề",
    },

    // =========================
    // Folder lưu ảnh
    // Ví dụ:
    // chapter-1
    // chapter-10
    // =========================

    folder: {
      type: String,

      required: true,
    },

    // =========================
    // Tổng số trang
    // =========================

    totalPages: {
      type: Number,

      default: 0,
    },

    // =========================
    // Lượt xem
    // =========================

    views: {
      type: Number,

      default: 0,
    },

    // =========================
    // Người upload
    // =========================

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,

      ref: "User",

      required: true,
    },
  },
  {
    timestamps: true,
  },
);

chapterSchema.index(
  {
    manga: 1,

    chapterNumber: 1,
  },
  {
    unique: true,
  },
);

module.exports = mongoose.model("Chapter", chapterSchema);
