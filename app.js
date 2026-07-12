const express = require("express");
const dotenv = require("dotenv");

// =====================
// ENV LOAD PHẢI LÊN ĐẦU
// =====================
dotenv.config();

const connectDB = require("./config/database");
const path = require("path");
const expressLayouts = require("express-ejs-layouts");
const session = require("express-session");
const { MongoStore } = require("connect-mongo");
const cookieParser = require("cookie-parser");
const flash = require("connect-flash");

const passport = require("./config/passport");

const Notification = require("./models/Notification");

// =====================
// INIT APP
// =====================
const app = express();


// =====================
// CONNECT DATABASE
// =====================
connectDB();


// =====================
// MIDDLEWARE BODY
// =====================
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// =====================
// SESSION
// =====================
app.use(
    session({
        secret: process.env.SESSION_SECRET || "manganest-secret",
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
            mongoUrl: process.env.MONGODB_URI
        }),
        cookie: {
            maxAge: 1000 * 60 * 60 * 24 * 7
        }
    })
);

// =====================
// FLASH + PASSPORT
// =====================

app.use(flash());

app.use(passport.initialize());

app.use(passport.session());

// =====================
// GLOBAL VARIABLES + NOTIFICATION
// =====================

app.use(async (req, res, next) => {

    const success = req.flash("success");
    const error = req.flash("error");

    res.locals.success = success;
    res.locals.error = error;

    res.locals.success_msg = success;
    res.locals.error_msg = error;

    res.locals.user = req.user || null;

    if (req.user) {

        const notifications = await Notification.find({
            user: req.user._id
        })
        .sort({ createdAt: -1 })
        .limit(8);

        res.locals.notifications = notifications;

        res.locals.unreadCount =
            notifications.filter(n => !n.isRead).length;

    } else {

        res.locals.notifications = [];

        res.locals.unreadCount = 0;

    }

    next();

});
// =====================
// STATIC + VIEW ENGINE
// =====================
app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(expressLayouts);
app.set("layout", "layouts/main");

// =====================
// ROUTES
// =====================
app.use("/", require("./routes/home"));
app.use("/", require("./routes/auth"));
app.use("/", require("./routes/profile"));
app.use("/", require("./routes/translator"));
app.use("/", require("./routes/admin"));
app.use("/",require("./routes/manga"));
app.use("/", require("./routes/notification"));

// =====================
// SERVER
// =====================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Server chạy tại http://localhost:${PORT}`);
});