const mongoose=require("mongoose");

const User=require("../models/User");

require("dotenv").config();

(async()=>{

    await mongoose.connect(process.env.MONGODB_URI);

    await User.updateOne(

        {

            email:"khutamgiacvang@gmail.com"

        },

        {

            role:"admin"

        }

    );

    console.log("Done");

    process.exit();

})();