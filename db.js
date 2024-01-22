const mongoose = require("mongoose");
const config = require("./config")



const connectToMongo = () => {
  let a = mongoose.connect(
    config.mongoURI,
    { useNewUrlParser: true },
    { useUnifiedTopologu: true }
  );

  let db = mongoose.connection;
  db.on("error", console.error.bind(console, "connection error:"));
  db.once("open", function () {
    console.log("Connected Succesfully");
  });
};

//a.then(console.log('Success')).catch(err)
module.exports = connectToMongo;
