const User = require("../models/User");
const fs = require("fs");
const path = require("path");

// Hiển thị hồ sơ
exports.showProfile = (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect("/");
  }

  res.render("profile", {
    title: "Hồ sơ",
  });
};

// Cập nhật hồ sơ
exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      req.flash("error", "Không tìm thấy tài khoản.");

      return res.redirect("/profile");
    }

    const { username, bio } = req.body;

    user.username = username;
    user.bio = bio;

    // Có upload avatar
    if (req.file) {
      // Xóa avatar cũ (không xóa avatar mặc định)
      if (
        user.avatar &&
        user.avatar !== "default-avatar.png" &&
        user.avatar.startsWith("/uploads/avatar/")
      ) {
        const oldPath = path.join(__dirname, "../public", user.avatar);

        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      user.avatar = "/uploads/avatar/" + req.file.filename;
    }

    await user.save();

    req.flash("success", "Cập nhật hồ sơ thành công.");

    res.redirect("/profile");
  } catch (err) {
    console.log(err);

    req.flash("error", "Có lỗi xảy ra.");

    res.redirect("/profile");
  }
};
