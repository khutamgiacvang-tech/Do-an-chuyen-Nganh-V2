const passport = require("passport");
const User = require("../models/User");

// =======================
// Đăng ký
// =======================
exports.register = async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body;

    if (!username || !email || !password || !confirmPassword) {
      req.flash("error", "Vui lòng nhập đầy đủ thông tin.");

      return res.redirect("/");
    }

    if (password !== confirmPassword) {
      req.flash("error", "Mật khẩu xác nhận không khớp.");

      return res.redirect("/");
    }

    const existed = await User.findOne({ email });

    if (existed) {
      req.flash("error", "Email đã tồn tại.");

      return res.redirect("/");
    }

    const user = new User({
      username,
      email,
      password,
      provider: "local",
    });

    await user.save();

    req.flash("success", "Đăng ký thành công.");

    return res.redirect("/");
  } catch (err) {
    console.log(err);

    req.flash("error", "Có lỗi xảy ra.");

    return res.redirect("/");
  }
};

// =======================
// Đăng nhập
// =======================

exports.login = (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) {
      console.log(err);

      return next(err);
    }

    if (!user) {
      console.log(info);

      req.flash("error", info.message);

      return res.redirect("/");
    }

    req.logIn(user, function (err) {
      if (err) {
        return next(err);
      }

      console.log("LOGIN SUCCESS:", user.email);

      return res.redirect("/");
    });
  })(req, res, next);
};

// =======================
// Đăng xuất
// =======================

exports.logout = (req, res, next) => {
  req.logout(function (err) {
    if (err) return next(err);

    res.redirect("/");
  });
};
