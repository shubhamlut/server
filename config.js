const mongoURI =
  "mongodb+srv://shubhamlutade131:980598@cluster0.aq2kcai.mongodb.net/?retryWrites=true&w=majority";

const port = 8080;
const websocketBaseURL = "ws://localhost";
const secretKey = "beastThatCodes";

module.exports = {
  mongoURI,
  port,
  secretKey,
  websocketBaseURL,
};
