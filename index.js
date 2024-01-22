const connectToMongo = require("./db");
const express = require("express");
const cors = require("cors");
const url = require("url");
const WebSocketServer = require("ws");
const config = require("./config");
connectToMongo();

const app = express();
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ limit: "25mb" }));
app.use(cors());

//Available Routes

app.use("/api/auth", require("./routes/auth"));

const server = app.listen(config.port, () => {
  console.log(`LowCodeLounge listening on port ${config.port}`);
});

//Websocket

// To store all the connections.If any new user joins and its authenticated then adding the user to the 'connections' Map which would be associated with its correponding websocket
const connections = new Map();
const wss = new WebSocketServer.WebSocketServer({ server });

// Step 1
wss.on("connection", function connection(ws, req) {
  //Authentication logic (once user is authenticated fetch from the query what username connection was to connect to)
  authenticateUser(ws, req);
  ws.on("error", console.error);

  ws.on("message", function message(data) {
    const senderUsername = parseQuery(req).userName;
    const targetUsername = "anaysha";

    if (connections.has(targetUsername)) {
      const targetWs = connections.get(targetUsername);
      targetWs.send(`Message from ${senderUsername}: ${data}`);
    } else {
      console.log(`Target user ${targetUsername} not found.`);
    }
  });

  ws.send("Welcome to beastThatsCode-Websocket");
});

// Step 2
const authenticateUser = (ws, req) => {
  //If user is valid post authentication storing it to "Connections" Map
  storeConnection(ws, req);
};

// Step 3
// This function is called once user is authenticated
const storeConnection = (ws, req) => {
  const query = url.parse(req.url, true).query;
  connections.set(query.userName, ws);
  console.log(connections);
};

//helper functions

// #1
const parseQuery = (req) => {
  return url.parse(req.url, true).query;
};
