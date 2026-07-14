const Manga = require("../models/Manga");
const Chapter = require("../models/Chapter");
const slugify = require("slugify");
const fs = require("fs-extra");
const path = require("path");
const AdmZip = require("adm-zip");
const User = require("../models/User");
const Notification = require("../models/Notification");
const ReadingHistory = require("../models/ReadingHistory");
const webpush = require("web-push");

// =========================
// Trang tạo truyện
// =========================

exports.showCreate = async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      req.flash("error", "Vui lòng đăng nhập.");
      return res.redirect("/");
    }

    if (req.user.role !== "translator") {
      req.flash("error", "Bạn không có quyền.");
      return res.redirect("/");
    }

    res.render("manga/create", {
      title: "Đăng truyện",
    });
  } catch (err) {
    console.log(err);
    req.flash("error", "Có lỗi xảy ra.");
    res.redirect("/");
  }
};

// =========================
// Tạo truyện
// =========================

exports.create = async (req, res) => {
  try {
    const {
      title,
      alternativeTitles,
      author,
      artist,
      description,
      status,
      ageRating,
    } = req.body;

    let slug = slugify(title, {
      lower: true,
      strict: true,
      locale: "vi",
    });

    let count = 1;

    while (await Manga.findOne({ slug })) {
      slug =
        slugify(title, {
          lower: true,
          strict: true,
          locale: "vi",
        }) +
        "-" +
        count;
      count++;
    }

    const cover = req.files?.cover
      ? "/uploads/covers/" + req.files.cover[0].filename
      : "";

    const banner = req.files?.banner
      ? "/uploads/banners/" + req.files.banner[0].filename
      : "";

    const genres = req.body.genres
      ? Array.isArray(req.body.genres)
        ? req.body.genres
        : [req.body.genres]
      : [];

    const manga = new Manga({
      title,
      alternativeTitles: alternativeTitles
        ? alternativeTitles
            .split(",")
            .map((i) => i.trim())
            .filter((i) => i !== "")
        : [],
      slug,
      cover,
      banner,
      author,
      artist,
      description,
      genres,
      publishStatus: status,
      status: "pending",
      ageRating,
      translator: req.user._id,
    });
    await manga.save();

    // ==========================
    // Thông báo cho Admin
    // ==========================

    const admins = await User.find({
        role: "admin"
    });

    for (const admin of admins) {
        await Notification.create({
            user: admin._id,
            title: "📖 Truyện mới chờ duyệt",
            message: `${req.user.username} vừa upload truyện "${manga.title}".`,
            link: "/admin"
        });
    }

    req.flash("success", "Đăng truyện thành công.");
    res.redirect(`/upload/${slug}/chapter`);
  } catch (err) {
    console.log(err);
    req.flash("error", "Có lỗi xảy ra.");
    res.redirect("/upload");
  }
};

// =========================
// Trang upload chapter
// =========================

exports.showUploadChapter = async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.redirect("/");
    }

    const manga = await Manga.findOne({
      slug: req.params.slug,
    });

    if (!manga) {
      req.flash("error", "Không tìm thấy truyện.");
      return res.redirect("/upload");
    }

    res.render("manga/uploadChapter", {
      title: "Upload Chapter",
      manga,
    });
  } catch (err) {
    console.log(err);
    req.flash("error", "Có lỗi xảy ra.");
    res.redirect("/upload");
  }
};

// =========================
// Upload chapter
// =========================

exports.uploadChapter = async (req, res) => {
  try {
    console.log("1. Tìm manga");

    const manga = await Manga.findOne({
      slug: req.params.slug,
    });

    if (!manga) {
      req.flash("error", "Không tìm thấy truyện.");
      return res.redirect("/upload");
    }

    console.log("2. Đã tìm thấy manga:", manga.title);

    const rawChapterInput = req.body.chapterNumber?.trim();
    const title = req.body.title?.trim() || "Không có tiêu đề";

    if (!rawChapterInput) {
      req.flash("error", "Số chapter không hợp lệ.");
      return res.redirect(`/upload/${manga.slug}/chapter`);
    }

    const existed = await Chapter.findOne({
      manga: manga._id,
      chapterNumber: rawChapterInput,
    });

    if (existed) {
      req.flash("error", "Chapter này đã tồn tại.");
      return res.redirect(`/upload/${manga.slug}/chapter`);
    }

    if (!req.file) {
      req.flash("error", "Vui lòng chọn file ZIP.");
      return res.redirect(`/upload/${manga.slug}/chapter`);
    }

    console.log("3. Chuẩn bị tạo thư mục");

    const folderName = `chapter-${rawChapterInput}`;
    const chapterFolder = path.join(
      "public",
      "uploads",
      "manga",
      manga.slug,
      folderName
    );

    await fs.ensureDir(chapterFolder);

    console.log("4. Đã tạo thư mục");

    const zip = new AdmZip(req.file.path);
    let entries = zip.getEntries();

    entries = entries.filter((entry) => {
      if (entry.isDirectory) return false;
      const ext = path.extname(entry.entryName).toLowerCase();
      return [".jpg", ".jpeg", ".png", ".webp", ".jfif"].includes(ext);
    });

    entries.sort((a, b) =>
      a.entryName.localeCompare(b.entryName, undefined, {
        numeric: true,
        sensitivity: "base",
      })
    );

    let totalPages = 0;
    let index = 1;

    for (const entry of entries) {
      const ext = path.extname(entry.entryName).toLowerCase();
      const fileName = index + ext;
      const savePath = path.join(chapterFolder, fileName);

      fs.writeFileSync(savePath, entry.getData());
      totalPages++;
      index++;
    }

    console.log("7. Đã giải nén");

    const chapter = await Chapter.create({
      manga: manga._id,
      chapterNumber: rawChapterInput,
      title,
      folder: folderName,
      totalPages,
      uploadedBy: req.user._id,
    });

    console.log("8. Đã tạo Chapter");

    manga.totalChapters = (manga.totalChapters || 0) + 1;
    const parsedNum = parseFloat(rawChapterInput);

    if (!isNaN(parsedNum)) {
      manga.lastChapter = Math.max(manga.lastChapter || 0, parsedNum);
    }

    manga.lastUpdated = new Date();
    await manga.save();

    console.log("9. Đã cập nhật Manga");

    // =========================
    // GỬI THÔNG BÁO (IN-APP)
    // =========================

    const followers = await User.find({
      followedManga: manga._id
    });

    for (const follower of followers) {
      await Notification.create({
        user: follower._id,
        title: "📚 Chương mới",
        message: `${manga.title} vừa cập nhật Chương ${rawChapterInput}`,
        link: `/manga/${manga.slug}/chapter/${rawChapterInput}`,
        isRead: false
      });
    }

    // =========================
    // GỬI WEB PUSH NOTIFICATION
    // =========================

    const pushFollowers = await User.find({
      followedManga: manga._id,
      pushSubscription: { $ne: null }
    });

    const baseUrl = `${req.protocol}://${req.get("host")}`;

    for (const follower of pushFollowers) {
      const payload = JSON.stringify({
        title: "📚 Truyện bạn theo dõi có chương mới!",
        body: `${manga.title} vừa mới được đăng chapter ${rawChapterInput}!`,
        icon: manga.cover ? `${baseUrl}${manga.cover}` : `${baseUrl}/images/logo.png`,
        image: manga.banner ? `${baseUrl}${manga.banner}` : "",
        url: `/manga/${manga.slug}/chapter/${rawChapterInput}`
      });

      webpush.sendNotification(follower.pushSubscription, payload)
        .catch(err => console.error("Lỗi gửi push notification:", err));
    }

    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    console.log("10. Thành công");
    req.flash("success", "Upload chapter thành công.");
    return res.redirect(`/my-manga/${manga.slug}`);
  } catch (err) {
    console.error("========== ERROR ==========");
    console.error(err);
    req.flash("error", err.message);
    return res.redirect(`/upload/${req.params.slug}/chapter`);
  }
};

// =========================
// Danh sách truyện của tôi
// =========================

exports.myManga = async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      req.flash("error", "Vui lòng đăng nhập.");
      return res.redirect("/");
    }

    const mangas = await Manga.find({
      translator: req.user._id,
    }).sort({
      updatedAt: -1,
    });

    const pending = mangas.filter((m) => m.status === "pending");
    const approved = mangas.filter((m) => m.status === "approved");
    const rejected = mangas.filter((m) => m.status === "rejected");
    const hidden = mangas.filter((m) => m.status === "hidden");

    const totalManga = mangas.length;
    const totalChapter = mangas.reduce((sum, manga) => sum + (manga.totalChapters || 0), 0);
    const totalViews = mangas.reduce((sum, manga) => sum + (manga.views || 0), 0);
    const totalFollowers = mangas.reduce((sum, manga) => sum + (manga.follows || 0), 0);

    res.render("manga/myManga", {
      title: "Truyện của tôi",
      pending,
      approved,
      rejected,
      hidden,
      totalManga,
      totalChapter,
      totalViews,
      totalFollowers,
    });
  } catch (err) {
    console.log(err);
    req.flash("error", "Có lỗi xảy ra.");
    res.redirect("/");
  }
};

// =========================
// Quản lý 1 truyện
// =========================

exports.manageManga = async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.redirect("/");
    }

    const manga = await Manga.findOne({
      slug: req.params.slug,
      translator: req.user._id,
    });

    if (!manga) {
      req.flash("error", "Không tìm thấy truyện.");
      return res.redirect("/my-manga");
    }

    const chapters = await Chapter.find({
      manga: manga._id,
    }).sort({
      chapterNumber: -1,
    });

    res.render("manga/manage", {
      title: manga.title,
      manga,
      chapters,
    });
  } catch (err) {
    console.log(err);
    req.flash("error", "Có lỗi xảy ra.");
    res.redirect("/my-manga");
  }
};

// =========================
// Trang sửa truyện
// =========================

exports.showEdit = async (req, res) => {
  try {
    const manga = await Manga.findOne({
      slug: req.params.slug,
      translator: req.user._id,
    });

    if (!manga) {
      req.flash("error", "Không tìm thấy truyện.");
      return res.redirect("/my-manga");
    }

    res.render("manga/edit", {
      title: "Sửa truyện",
      manga,
    });
  } catch (err) {
    console.log(err);
    req.flash("error", "Có lỗi xảy ra.");
    res.redirect("/my-manga");
  }
};

// =========================
// Update truyện
// =========================

exports.updateManga = async (req, res) => {
  try {
    const manga = await Manga.findOne({
      slug: req.params.slug,
      translator: req.user._id,
    });

    if (!manga) {
      req.flash("error", "Không tìm thấy truyện.");
      return res.redirect("/my-manga");
    }

    manga.title = req.body.title;
    manga.alternativeTitles = req.body.alternativeTitles
      ? req.body.alternativeTitles
          .split(",")
          .map((i) => i.trim())
          .filter((i) => i !== "")
      : [];
    manga.author = req.body.author;
    manga.artist = req.body.artist;
    manga.description = req.body.description;
    manga.publishStatus = req.body.publishStatus;
    manga.ageRating = req.body.ageRating;
    manga.genres = req.body.genres
      ? Array.isArray(req.body.genres)
        ? req.body.genres
        : [req.body.genres]
      : [];
    manga.lastUpdated = new Date();

    await manga.save();
    req.flash("success", "Đã cập nhật truyện.");
    res.redirect("/my-manga/" + manga.slug);
  } catch (err) {
    console.log(err);
    req.flash("error", "Cập nhật thất bại.");
    res.redirect("back");
  }
};

// =========================
// Trang đổi cover
// =========================

exports.showChangeCover = async (req, res) => {
  try {
    const manga = await Manga.findOne({
      slug: req.params.slug,
      translator: req.user._id,
    });

    if (!manga) {
      req.flash("error", "Không tìm thấy truyện.");
      return res.redirect("/my-manga");
    }

    res.render("manga/changeCover", {
      title: "Đổi Cover",
      manga,
    });
  } catch (err) {
    console.log(err);
    req.flash("error", "Có lỗi.");
    res.redirect("/my-manga");
  }
};

// =========================
// Đổi cover
// =========================

exports.changeCover = async (req, res) => {
  try {
    const manga = await Manga.findOne({
      slug: req.params.slug,
      translator: req.user._id,
    });

    if (!manga) {
      req.flash("error", "Không tìm thấy truyện.");
      return res.redirect("/my-manga");
    }

    if (!req.file) {
      req.flash("error", "Chưa chọn ảnh.");
      return res.redirect(`/my-manga/${manga.slug}/cover`);
    }

    if (manga.cover) {
      const old = path.join("public", manga.cover);
      if (fs.existsSync(old)) {
        fs.unlinkSync(old);
      }
    }

    manga.cover = "/uploads/covers/" + req.file.filename;
    await manga.save();

    req.flash("success", "Đổi Cover thành công.");
    res.redirect("/my-manga/" + manga.slug);
  } catch (err) {
    console.log(err);
    req.flash("error", "Không thể đổi Cover.");
    res.redirect("back");
  }
};

// =========================
// Trang đổi Banner
// =========================

exports.showChangeBanner = async (req, res) => {
  try {
    const manga = await Manga.findOne({
      slug: req.params.slug,
      translator: req.user._id,
    });

    if (!manga) {
      req.flash("error", "Không tìm thấy truyện.");
      return res.redirect("/my-manga");
    }

    res.render("manga/changeBanner", {
      title: "Đổi Banner",
      manga,
    });
  } catch (err) {
    console.log(err);
    req.flash("error", "Có lỗi xảy ra.");
    res.redirect("/my-manga");
  }
};

// =========================
// Đổi Banner
// =========================

exports.changeBanner = async (req, res) => {
  try {
    const manga = await Manga.findOne({
      slug: req.params.slug,
      translator: req.user._id,
    });

    if (!manga) {
      req.flash("error", "Không tìm thấy truyện.");
      return res.redirect("/my-manga");
    }

    if (!req.file) {
      req.flash("error", "Vui lòng chọn Banner.");
      return res.redirect(`/my-manga/${manga.slug}/banner`);
    }

    if (manga.banner) {
      const oldPath = path.join("public", manga.banner);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    manga.banner = "/uploads/banners/" + req.file.filename;
    await manga.save();

    req.flash("success", "Đổi Banner thành công.");
    res.redirect("/my-manga/" + manga.slug);
  } catch (err) {
    console.log(err);
    req.flash("error", "Không thể đổi Banner.");
    res.redirect("back");
  }
};

// =========================
// Xóa truyện
// =========================

exports.deleteManga = async (req, res) => {
  try {
    const manga = await Manga.findOne({
      slug: req.params.slug,
      translator: req.user._id,
    });

    if (!manga) {
      req.flash("error", "Không tìm thấy truyện.");
      return res.redirect("/my-manga");
    }

    const totalChapter = await Chapter.countDocuments({
      manga: manga._id,
    });

    if (totalChapter > 0) {
      req.flash("error", "Không thể xóa truyện khi vẫn còn Chapter.");
      return res.redirect("/my-manga/" + manga.slug);
    }

    if (manga.cover) {
      const coverPath = path.join("public", manga.cover);
      if (fs.existsSync(coverPath)) {
        fs.unlinkSync(coverPath);
      }
    }

    if (manga.banner) {
      const bannerPath = path.join("public", manga.banner);
      if (fs.existsSync(bannerPath)) {
        fs.unlinkSync(bannerPath);
      }
    }

    const mangaFolder = path.join("public", "uploads", "manga", manga.slug);
    if (fs.existsSync(mangaFolder)) {
      await fs.remove(mangaFolder);
    }

    await Manga.deleteOne({ _id: manga._id });
    req.flash("success", "Đã xóa truyện.");
    res.redirect("/my-manga");
  } catch (err) {
    console.log(err);
    req.flash("error", "Không thể xóa truyện.");
    res.redirect("back");
  }
};

// =========================
// Xóa Chapter
// =========================

exports.deleteChapter = async (req, res) => {
  try {
    const manga = await Manga.findOne({
      slug: req.params.slug,
      translator: req.user._id,
    });

    if (!manga) {
      req.flash("error", "Không tìm thấy truyện.");
      return res.redirect("/my-manga");
    }

    const chapter = await Chapter.findOne({
      _id: req.params.id,
      manga: manga._id,
    });

    if (!chapter) {
      req.flash("error", "Không tìm thấy Chapter.");
      return res.redirect("/my-manga/" + manga.slug);
    }

    const folder = path.join("public", "uploads", "manga", manga.slug, chapter.folder);
    if (await fs.pathExists(folder)) {
      await fs.remove(folder);
    }

    await Chapter.deleteOne({ _id: chapter._id });

    const lastChapter = await Chapter.find({ manga: manga._id }).sort({ chapterNumber: -1 }).limit(1);

    manga.totalChapters = await Chapter.countDocuments({ manga: manga._id });
    manga.lastChapter = lastChapter.length > 0 ? lastChapter[0].chapterNumber : 0;
    manga.lastUpdated = new Date();
    await manga.save();

    req.flash("success", "Đã xóa Chapter.");
    res.redirect("/my-manga/" + manga.slug);
  } catch (err) {
    console.log(err);
    req.flash("error", "Không thể xóa Chapter.");
    res.redirect("back");
  }
};

// =========================
// Trang sửa Chapter
// =========================

exports.showEditChapter = async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.redirect("/");
    }

    const manga = await Manga.findOne({
      slug: req.params.slug,
      translator: req.user._id,
    });

    if (!manga) {
      req.flash("error", "Không tìm thấy truyện.");
      return res.redirect("/my-manga");
    }

    const chapter = await Chapter.findOne({
      _id: req.params.id,
      manga: manga._id,
    });

    if (!chapter) {
      req.flash("error", "Không tìm thấy Chapter.");
      return res.redirect("/my-manga/" + manga.slug);
    }

    res.render("manga/editChapter", {
      title: "Sửa Chapter",
      manga,
      chapter,
    });
  } catch (err) {
    console.log(err);
    req.flash("error", "Có lỗi xảy ra.");
    res.redirect("/my-manga");
  }
};

// =========================
// Cập nhật Chapter (Hỗ trợ thay đổi title và ghi đè ảnh ZIP mới)
// =========================

exports.updateChapter = async (req, res) => {
  try {
    const manga = await Manga.findOne({
      slug: req.params.slug,
      translator: req.user._id,
    });

    if (!manga) {
      req.flash("error", "Không tìm thấy truyện.");
      return res.redirect("/my-manga");
    }

    const chapter = await Chapter.findOne({
      _id: req.params.id,
      manga: manga._id,
    });

    if (!chapter) {
      req.flash("error", "Không tìm thấy Chapter.");
      return res.redirect("/my-manga/" + manga.slug);
    }

    if (req.body.title) {
      chapter.title = req.body.title.trim();
    }

    // Nếu có upload file ZIP mới khi sửa chapter
    if (req.file) {
      const chapterFolder = path.join(
        "public",
        "uploads",
        "manga",
        manga.slug,
        chapter.folder
      );

      if (await fs.pathExists(chapterFolder)) {
        await fs.remove(chapterFolder);
      }
      await fs.ensureDir(chapterFolder);

      const zip = new AdmZip(req.file.path);
      let entries = zip.getEntries();

      entries = entries.filter((entry) => {
        if (entry.isDirectory) return false;
        const ext = path.extname(entry.entryName).toLowerCase();
        return [".jpg", ".jpeg", ".png", ".webp", ".jfif"].includes(ext);
      });

      entries.sort((a, b) =>
        a.entryName.localeCompare(b.entryName, undefined, {
          numeric: true,
          sensitivity: "base",
        })
      );

      let totalPages = 0;
      let index = 1;

      for (const entry of entries) {
        const ext = path.extname(entry.entryName).toLowerCase();
        const fileName = index + ext;
        const savePath = path.join(chapterFolder, fileName);

        fs.writeFileSync(savePath, entry.getData());
        totalPages++;
        index++;
      }

      chapter.totalPages = totalPages;

      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    }

    await chapter.save();
    manga.lastUpdated = new Date();
    await manga.save();

    req.flash("success", "Đã cập nhật Chapter thành công.");
    res.redirect("/my-manga/" + manga.slug);
  } catch (err) {
    console.error("========== UPDATE CHAPTER ERROR ==========");
    console.error(err);
    req.flash("error", "Không thể cập nhật Chapter: " + err.message);
    res.redirect("back");
  }
};

// =========================
// Chi tiết truyện
// =========================

exports.showManga = async (req, res) => {
    try {
        const manga = await Manga.findOne({
            slug: req.params.slug,
            status: "approved"
        }).populate("translator", "username displayName avatar followedManga");

        if (!manga) {
            return res.redirect("/");
        }

        if (manga.translator) {
            const mangaCount = await Manga.countDocuments({
                translator: manga.translator._id,
                status: "approved"
            });
            manga.translator = manga.translator.toObject();
            manga.translator.mangaCount = mangaCount;
        }

        const chapters = await Chapter.find({ manga: manga._id }).sort({ chapterNumber: -1 });

        const viewedKey = `viewed_${manga._id}`;
        if (!req.session[viewedKey]) {
            manga.views += 1;
            await manga.save();
            req.session[viewedKey] = true;
        }

        let isFollowing = false;
        if (req.isAuthenticated() && req.user && req.user.followedManga) {
            isFollowing = req.user.followedManga.some(id => id.toString() === manga._id.toString());
        }

        const isOwner = req.isAuthenticated() && manga.translator && manga.translator._id.toString() === req.user._id.toString();

        res.render("manga/detail", {
            title: manga.title,
            manga,
            chapters,
            isFollowing,
            isOwner
        });
    } catch (err) {
        console.error(err);
        res.redirect("/");
    }
};

// =========================
// Theo dõi / Bỏ theo dõi truyện
// =========================

exports.toggleFollow = async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            req.flash("error", "Vui lòng đăng nhập để theo dõi truyện.");
            return res.redirect("/manga/" + req.params.slug);
        }

        const manga = await Manga.findOne({ slug: req.params.slug });
        if (!manga) {
            req.flash("error", "Không tìm thấy truyện.");
            return res.redirect("/");
        }

        if (manga.translator && manga.translator.toString() === req.user._id.toString()) {
            req.flash("error", "Bạn không thể theo dõi truyện của chính mình.");
            return res.redirect("/manga/" + manga.slug);
        }

        const mangaId = manga._id.toString();
        const index = req.user.followedManga.findIndex(id => id.toString() === mangaId);

        if (index === -1) {
            req.user.followedManga.push(manga._id);
            manga.follows = (manga.follows || 0) + 1;
            req.flash("success", "Đã theo dõi truyện.");
        } else {
            req.user.followedManga.splice(index, 1);
            manga.follows = Math.max((manga.follows || 0) - 1, 0);
            req.flash("success", "Đã bỏ theo dõi truyện.");
        }

        await req.user.save();
        await manga.save();

        res.redirect("/manga/" + manga.slug);
    } catch (err) {
        console.error(err);
        req.flash("error", "Có lỗi xảy ra.");
        res.redirect("/manga/" + req.params.slug);
    }
};

// =========================
// Đọc Chapter
// =========================

exports.readChapter = async (req, res) => {
    try {
        const manga = await Manga.findOne({
            slug: req.params.slug,
            status: "approved"
        });

        if (!manga) {
            return res.redirect("/");
        }

        const chapter = await Chapter.findOne({
            manga: manga._id,
            chapterNumber: req.params.number
        });

        if (!chapter) {
            return res.redirect("/manga/" + manga.slug);
        }

        const chapterFolder = path.join(
            __dirname,
            "..",
            "public",
            "uploads",
            "manga",
            manga.slug,
            chapter.folder
        );

        let pages = [];
        if (fs.existsSync(chapterFolder)) {
            pages = fs.readdirSync(chapterFolder)
                .filter(file => {
                    return [".jpg", ".jpeg", ".png", ".jfif", ".webp"].some(ext => file.toLowerCase().endsWith(ext));
                })
                .sort((a, b) => parseInt(a) - parseInt(b))
                .map(file => `/uploads/manga/${manga.slug}/${chapter.folder}/${file}`);
        }

        const allChapters = await Chapter.find({ manga: manga._id }).sort({ chapterNumber: 1 });
        const currentIndex = allChapters.findIndex(c => c._id.toString() === chapter._id.toString());
        const prevChapter = currentIndex > 0 ? allChapters[currentIndex - 1] : null;
        const nextChapter = currentIndex < allChapters.length - 1 ? allChapters[currentIndex + 1] : null;

        if (!req.session.viewedChapters) {
            req.session.viewedChapters = [];
        }

        const viewKey = `${manga._id}_${chapter._id}`;
        if (!req.session.viewedChapters.includes(viewKey)) {
            manga.views += 1;
            manga.weeklyViews += 1;
            manga.monthlyViews += 1;
            await manga.save();
            req.session.viewedChapters.push(viewKey);
        }

        let savedScroll = 0;
        let savedProgress = 0;
        if (req.user) {
            const history = await ReadingHistory.findOne({
                user: req.user._id,
                manga: manga._id,
                chapterNumber: chapter.chapterNumber
            });
            if (history) {
                savedScroll = history.scrollPosition || 0;
                savedProgress = history.progress || 0;
            }
        }

        res.render("manga/read", {
            title: manga.title + " - Chapter " + chapter.chapterNumber,
            manga,
            chapter,
            pages,
            allChapters,
            prevChapter,
            nextChapter,
            savedScroll,
            savedProgress
        });
    } catch (err) {
        console.log(err);
        res.redirect("/");
    }
};

exports.saveHistory = async (req, res) => {
    try {
        if (!req.user) {
            return res.json({ success: false });
        }

        const {
            mangaId,
            mangaTitle,
            mangaSlug,
            cover,
            chapterTitle,
            chapterNumber,
            progress,
            scrollPosition
        } = req.body;

        const oldHistory = await ReadingHistory.findOne({
            user: req.user._id,
            manga: mangaId,
            chapterNumber
        });

        let finalProgress = progress;
        let finalScroll = scrollPosition;

        if (oldHistory) {
            finalProgress = Math.max(oldHistory.progress || 0, progress || 0);
            if (progress < oldHistory.progress) {
                finalScroll = oldHistory.scrollPosition || 0;
            }
        }

        await ReadingHistory.findOneAndUpdate(
            { user: req.user._id, manga: mangaId, chapterNumber },
            {
                manga: mangaId,
                mangaTitle,
                mangaSlug,
                cover,
                chapterNumber,
                chapterTitle,
                progress: finalProgress,
                scrollPosition: finalScroll,
                updatedAt: new Date()
            },
            { upsert: true, new: true }
        );

        res.json({ success: true });
    } catch (err) {
        console.log(err);
        res.status(500).json({ success: false });
    }
};

exports.searchAjax = async (req, res) => {
    const keyword = req.query.q || "";
    if (!keyword.trim()) {
        return res.json([]);
    }

    const mangas = await Manga.find({
        title: { $regex: keyword, $options: "i" }
    }).select("title slug cover").limit(8);

    res.json(mangas);
};

exports.history = async (req, res) => {
    try {
        if (!req.user) {
            return res.redirect("/login");
        }

        const histories = await ReadingHistory.find({
            user: req.user._id
        }).sort({ updatedAt: -1 }).lean();

        const grouped = {};
        for (const item of histories) {
            const mangaId = item.manga.toString();

            if (!grouped[mangaId]) {
                grouped[mangaId] = {
                    manga: item.manga,
                    mangaTitle: item.mangaTitle,
                    mangaSlug: item.mangaSlug,
                    cover: item.cover,
                    timeAgo: item.timeAgo || 'Vừa xong',
                    chapters: []
                };
            }

            if (grouped[mangaId].chapters.length < 3) {
                let chapterTitle = item.chapterTitle || item.title || '';
                if (!chapterTitle) {
                    const foundChap = await Chapter.findOne({
                        manga: item.manga,
                        chapterNumber: item.chapterNumber
                    }).lean();
                    if (foundChap && foundChap.title && foundChap.title !== 'Không có tiêu đề') {
                        chapterTitle = foundChap.title;
                    }
                }

                grouped[mangaId].chapters.push({
                    chapterNumber: item.chapterNumber,
                    title: chapterTitle,
                    progress: item.progress || 0
                });
            }
        }

        const historyList = Object.values(grouped);
        res.render("manga/history", {
            title: "Lịch sử đọc",
            histories: historyList
        });
    } catch (err) {
        console.log(err);
        res.redirect("/");
    }
};