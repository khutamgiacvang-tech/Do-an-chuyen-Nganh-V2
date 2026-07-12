const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    console.log("Đang kết nối MongoDB...");

    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log("✅ MongoDB Atlas Connected");
  } catch (err) {
    console.log("❌ Mongo Error");

    console.log(err);
  }
};

module.exports = connectDB;
