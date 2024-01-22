//This is used to craete Schema

const mongoose = require("mongoose");
const { Schema } = mongoose;

const userSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  picture: {
    data: Buffer,
    contentType: String,
  },
  mimeType: {
    type: String,
  },

  email: {
    type: String,
    required: true,
    unique: true,
  },

  password: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  location: {
    type: String,
    default: "To Be Decided",
  },
  gender: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model("user", userSchema);
