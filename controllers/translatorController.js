const TranslatorApplication = require("../models/TranslatorApplication");
const User = require("../models/User");
const Notification = require("../models/Notification");
const Manga = require("../models/Manga");

// ===============================
// Hiển thị trang xin quyền
// ===============================

exports.showApply = async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      req.flash("error", "Vui lòng đăng nhập.");

      return res.redirect("/");
    }

    if (req.user.role === "translator") {
      return res.redirect("/upload");
    }

    // Luôn lấy đơn mới nhất
    const application = await TranslatorApplication.findOne({
      user: req.user._id,
    }).sort({
      createdAt: -1,
    });

   if (application) {
    if (application.status === "pending") {

        req.flash(
            "error",
            "Bạn đã có đơn xin Translator đang chờ xét duyệt."
        );

        return res.redirect("/");
    }

      if (application.status === "approved") {
        req.flash("success", "Bạn đã là Translator.");

        return res.redirect("/upload");
      }
    }

    res.render("translator/apply", {
      title: "Đăng ký Translator",
    });
  } catch (err) {
    console.log(err);

    req.flash("error", "Có lỗi xảy ra.");

    res.redirect("/");
  }
};

// ===============================
// Gửi đơn xin Translator
// ===============================

exports.submitApplication = async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      req.flash("error", "Vui lòng đăng nhập.");

      return res.redirect("/");
    }

    const { groupName, introduction, note } = req.body;

    // Chỉ chặn nếu còn đơn pending
    const existed = await TranslatorApplication.findOne({
      user: req.user._id,

      status: "pending",
    });

    if (existed) {

    req.flash(
        "toast",
        JSON.stringify({
            type:"warning",
            message:"⚠ Bạn đang có một đơn Translator đang chờ Admin xét duyệt."
        })
    );

    return res.redirect("/");

}

    // ==========================
    // Dự án
    // ==========================

    const projects = [];

    if (req.body.projectTitle) {
      const titles = Array.isArray(req.body.projectTitle)
        ? req.body.projectTitle
        : [req.body.projectTitle];

      const websites = Array.isArray(req.body.projectWebsite)
        ? req.body.projectWebsite
        : [req.body.projectWebsite];

      const links = Array.isArray(req.body.projectLink)
        ? req.body.projectLink
        : [req.body.projectLink];

      titles.forEach((title, index) => {
        if (title.trim() !== "") {
          projects.push({
            title,

            website: websites[index],

            link: links[index],
          });
        }
      });
    }

    // ==========================
    // Profile
    // ==========================

    const profiles = [];

    if (req.body.profileWebsite) {
      const websites = Array.isArray(req.body.profileWebsite)
        ? req.body.profileWebsite
        : [req.body.profileWebsite];

      const links = Array.isArray(req.body.profileLink)
        ? req.body.profileLink
        : [req.body.profileLink];

      websites.forEach((website, index) => {
        if (website.trim() !== "") {
          profiles.push({
            website,

            link: links[index],
          });
        }
      });
    }

    // ==========================
    // Ảnh chap mẫu
    // ==========================

    const sampleImages = [];

    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        sampleImages.push(`/uploads/applications/${file.filename}`);
      });
    }

    const application = new TranslatorApplication({
      user: req.user._id,

      groupName,

      introduction,

      projects,

      profiles,

      sampleImages,

      note,

      status: "pending",
    });

    await application.save();

    // ==========================
// Thông báo cho Admin
// ==========================

const admins = await User.find({
  role: "admin",
});

for (const admin of admins) {
  await Notification.create({
    user: admin._id,

    title: "📩 Đơn Translator mới",

    message: `${req.user.username} vừa gửi đơn xin Translator.`,

    link: "/admin",
  });
}

    req.flash("success", "Đã gửi đơn xin cấp quyền Translator.");

    res.redirect("/translator/application");
  } catch (err) {
    console.log(err);

    req.flash("error", "Có lỗi xảy ra.");

    res.redirect("/translator/apply");
  }
};

// ===============================
// Xem đơn Translator của tôi
// ===============================

exports.myApplication = async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      req.flash("error", "Vui lòng đăng nhập.");

      return res.redirect("/");
    }

    // Luôn lấy đơn mới nhất
    const application = await TranslatorApplication.findOne({
      user: req.user._id,
    }).sort({
      createdAt: -1,
    });

    res.render("translator/application", {
      title: "Đơn Translator",

      application,
    });
  } catch (err) {
    console.log(err);

    req.flash("error", "Có lỗi xảy ra.");

    res.redirect("/");
  }
};

exports.showProfile = async (req,res)=>{

    const translator = await User.findOne({
        username:req.params.username
    });

    if(!translator){

        return res.status(404).render("404");
    }

    const mangas = await Manga.find({
        translator:translator._id
    }).sort({
        createdAt:-1
    });

    res.render(
        "translator/profile",
        {
            title:translator.displayName,
            translator,
            mangas
        }
    );
};
