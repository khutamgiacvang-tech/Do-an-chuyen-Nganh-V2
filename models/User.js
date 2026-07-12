const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
{
    username: {
        type: String,
        required: true,
        trim: true,
    },

    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },

    password: {
        type: String,
        default: null,
    },

    avatar: {
        type: String,
        default: "/images/default-avatar.png",
    },

    bio: {
        type: String,
        default: "",
    },

    // =========================
    // Thông tin nhóm dịch
    // =========================

    displayName: {
        type: String,
        default: "",
    },

    facebook: {
        type: String,
        default: "",
    },

    discord: {
        type: String,
        default: "",
    },

    description: {
        type: String,
        default: "",
    },

    // =========================
    // Đăng nhập
    // =========================

    provider: {
        type: String,
        enum: ["local", "google", "discord"],
        default: "local",
    },

    googleId: {
        type: String,
        default: null,
        index: true,
    },

    discordId: {
        type: String,
        default: null,
        index: true,
    },

    role: {
        type: String,
        enum: ["user", "translator", "admin"],
        default: "user",
    },

    status: {
        type: String,
        enum: ["active", "banned"],
        default: "active",
    },
},
{
    timestamps: true,
}
);

// ==============================
// Hash password
// ==============================

userSchema.pre("save", async function () {

    if (!this.isModified("password") || !this.password) {
        return;
    }

    this.password = await bcrypt.hash(
        this.password,
        10
    );

});

// ==============================
// Compare password
// ==============================

userSchema.methods.comparePassword =
function (password) {

    if (!this.password) {
        return false;
    }

    return bcrypt.compare(
        password,
        this.password
    );

};

module.exports =
mongoose.model("User", userSchema);