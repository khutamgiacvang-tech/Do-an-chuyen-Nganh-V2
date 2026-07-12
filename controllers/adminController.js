const User = require("../models/User");
const TranslatorApplication = require("../models/TranslatorApplication");
const Notification = require("../models/Notification");
const Manga = require("../models/Manga");

// =============================
// Middleware check Admin
// =============================

function checkAdmin(req, res) {
  if (!req.isAuthenticated()) {
    return false;
  }

  return req.user.role === "admin";
}

// =============================
// Dashboard
// =============================

exports.dashboard = async (req, res) => {
  try {
    if (!checkAdmin(req, res)) {
      req.flash("error", "Bạn không có quyền.");
      return res.redirect("/");
    }

    // ==========================
    // Đơn Translator
    // ==========================

    const pendingApplications = await TranslatorApplication.find({
      status: "pending",
    })
      .populate("user")
      .sort({ createdAt: -1 });

    const approvedApplications = await TranslatorApplication.find({
      status: "approved",
    })
      .populate("user")
      .sort({ updatedAt: -1 });

    const rejectedApplications = await TranslatorApplication.find({
      status: "rejected",
    })
      .populate("user")
      .sort({ updatedAt: -1 });

    // ==========================
    // Manga
    // ==========================

    const pendingMangas = await Manga.find({
      status: "pending",
    })
      .populate("translator")
      .sort({ createdAt: -1 });

    const approvedMangas = await Manga.find({
      status: "approved",
    })
      .populate("translator")
      .sort({ updatedAt: -1 });

    const rejectedMangas = await Manga.find({
      status: "rejected",
    })
      .populate("translator")
      .sort({ updatedAt: -1 });

    // ==========================
    // Gộp dữ liệu
    // ==========================

    const pendingItems = [
      ...pendingApplications.map(item => ({
        type: "translator",
        data: item,
      })),
      ...pendingMangas.map(item => ({
        type: "manga",
        data: item,
      })),
    ].sort((a, b) => b.data.createdAt - a.data.createdAt);

    const approvedItems = [
      ...approvedApplications.map(item => ({
        type: "translator",
        data: item,
      })),
      ...approvedMangas.map(item => ({
        type: "manga",
        data: item,
      })),
    ].sort((a, b) => b.data.updatedAt - a.data.updatedAt);

    const rejectedItems = [
      ...rejectedApplications.map(item => ({
        type: "translator",
        data: item,
      })),
      ...rejectedMangas.map(item => ({
        type: "manga",
        data: item,
      })),
    ].sort((a, b) => b.data.updatedAt - a.data.updatedAt);

    res.render("admin/dashboard", {
      title: "Admin Dashboard",

      pendingApplications: pendingItems,
      approvedApplications: approvedItems,
      rejectedApplications: rejectedItems,

      pendingCount: pendingItems.length,
      approvedCount: approvedItems.length,
      rejectedCount: rejectedItems.length,
    });

  } catch (err) {
    console.log(err);

    req.flash("error", "Có lỗi xảy ra.");
    res.redirect("/");
  }
};



// =======================================
// Lấy chi tiết đơn (AJAX)
// =======================================

exports.getApplication = async (req, res) => {
  try {
    if (!checkAdmin(req, res)) {
      return res.status(403).json({
        success: false,
      });
    }

    const application = await TranslatorApplication.findById(
      req.params.id,
    ).populate("user");

    if (!application) {
      return res.status(404).json({
        success: false,
      });
    }

    res.json({
      success: true,

      application,
    });
  } catch (err) {
    console.log(err);

    res.status(500).json({
      success: false,
    });
  }
};

// =======================================
// Lấy chi tiết truyện (AJAX)
// =======================================

exports.getManga = async (req, res) => {
  try {
    if (!checkAdmin(req, res)) {
      return res.status(403).json({
        success: false,
      });
    }

    const manga = await Manga.findById(req.params.id)
      .populate("translator");

    if (!manga) {
      return res.status(404).json({
        success: false,
      });
    }

    res.json({
      success: true,
      manga,
    });

  } catch (err) {
    console.log(err);

    res.status(500).json({
      success: false,
    });
  }
};

// =======================================
// Approve
// =======================================

exports.approveApplication = async (req, res) => {
  try {
    if (!checkAdmin(req, res)) {
      return res.status(403).json({
        success: false,
      });
    }

    const application = await TranslatorApplication.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,

        message: "Không tìm thấy đơn.",
      });
    }

    if (application.status !== "pending") {
      return res.json({
        success: false,

        message: "Đơn đã xử lý.",
      });
    }

    application.status = "approved";

    await application.save();

    await User.findByIdAndUpdate(
      application.user,

      {
        role: "translator",
      },
    );

    await Notification.create({
      user: application.user,

      title: "🎉 Đơn Translator",

      message: "Đơn của bạn đã được chấp nhận.",

      link: "/profile",
    });

    res.json({
      success: true,
    });
  } catch (err) {
    console.log(err);

    res.status(500).json({
      success: false,
    });
  }
};

// =======================================
// Reject
// =======================================

exports.rejectApplication = async (req, res) => {
  try {
    if (!checkAdmin(req, res)) {
      return res.status(403).json({
        success: false,
      });
    }

    const application = await TranslatorApplication.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
      });
    }

    if (application.status !== "pending") {
      return res.json({
        success: false,
      });
    }

    application.status = "rejected";

    await application.save();

    await Notification.create({
      user: application.user,

      title: "❌ Đơn Translator",

      message: "Đơn của bạn đã bị từ chối.",

      link: "/translator/application",
    });

    res.json({
      success: true,
    });
  } catch (err) {
    console.log(err);

    res.status(500).json({
      success: false,
    });
  }
};

// =======================================
// Approve Manga
// =======================================

exports.approveManga = async (req, res) => {
  try {

    if (!checkAdmin(req, res)) {
      return res.status(403).json({
        success: false,
      });
    }

    const manga = await Manga.findById(req.params.id);

    if (!manga) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy truyện.",
      });
    }

    if (manga.status !== "pending") {
      return res.json({
        success: false,
        message: "Truyện đã được xử lý.",
      });
    }

    manga.status = "approved";

    await manga.save();

    if (manga.translator) {

      await Notification.create({

        user: manga.translator,

        title: "📖 Truyện được duyệt",

        message: `Truyện "${manga.title}" đã được Admin duyệt.`,

        link: `/manga/${manga.slug}`

      });

    }

    res.json({
      success: true,
    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      success: false,
    });

  }
};


// =======================================
// Reject Manga
// =======================================

exports.rejectManga = async (req, res) => {
  try {

    if (!checkAdmin(req, res)) {
      return res.status(403).json({
        success: false,
      });
    }

    const manga = await Manga.findById(req.params.id);

    if (!manga) {
      return res.status(404).json({
        success: false,
      });
    }

    if (manga.status !== "pending") {
      return res.json({
        success: false,
      });
    }

    manga.status = "rejected";

    await manga.save();

    if (manga.translator) {

      await Notification.create({

        user: manga.translator,

        title: "❌ Truyện bị từ chối",

        message: `Truyện "${manga.title}" đã bị Admin từ chối.`,

        link: "/translator/dashboard"

      });

    }

    res.json({
      success: true,
    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      success: false,
    });

  }
};