const connectToMongo = require("./db");
const express = require("express");
const cors = require("cors");
const url = require("url");
const WebSocketServer = require("ws");
const WebSocket = require("ws");
const config = require("./config");
const path = require("path");
connectToMongo();

const app = express();
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ limit: "25mb" }));
app.use(cors());

//Available Routes
// Step 1
app.use("/api/auth", require("./routes/auth"));

const server = app.listen(config.port, () => {
  console.log(`LowCodeLounge listening on port ${config.port}`);
});

//Websocket

// To store all the connections.If any new user joins and its authenticated then adding the user to the 'connections' Map which would be associated with its correponding websocket
const connections = new Map();
const rooms = new Map();
const roomCandidates = [];
const wss = new WebSocketServer.WebSocketServer({ server });

// Step 2
wss.on("connection", function connection(ws, req) {
  //Authentication logic (once user is authenticated fetch from the query what username connection was to connect to)
  //   authenticateUser(ws, req);
  storeConnection(ws, req);
  ws.on("error", console.error);

  ws.on("message", function message(data) {
    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;
    console.log(path);
    if (path === "/directMessage") {
      sendDirectMessage(ws, req, data);
    }
    if (path === "/broadcastMessage") {
      broadcastMessage(ws, req, data);
    }
  });

  ws.send("Welcome to beastThatsCode-Websocket");
});

// Step 3
// This function is called once user is authenticated
const storeConnection = (ws, req) => {
  const query = url.parse(req.url, true).query;

  if (query.room) {
    console.log("Entering room: ", query.room);
    let candidate = { userId: query.userName, websocket: ws };
    roomCandidates.push(candidate);
    rooms.set(query.room, roomCandidates);
    ws.send(`You joined Room ${query.room}`);
  } else {
    console.log("Direct Message Chat");
    connections.set(query.userName, ws);
  }
};

//helper functions

// #1
const parseQuery = (req) => {
  return url.parse(req.url, true).query;
};

const parseData = (data) => {
  const bufferData = Buffer.from(data);
  const parsedString = bufferData.toString("utf-8");
  return parsedString;
};
//#2
const sendDirectMessage = (ws, req, data) => {
  const senderUsername = parseQuery(req).userName;
  const targetUsername = parseQuery(req).targetUser;
  if (connections.has(targetUsername)) {
    const targetWs = connections.get(targetUsername);
    targetWs.send(`Message from ${senderUsername}: ${data}`);
  } else {
    ws.send("User is offline. Your message is not delivered");
  }
};

const broadcastMessage = (ws, req, data) => {
  const targetRoom = parseQuery(req).room;
  const broadcastList = rooms.get(targetRoom);
  const senderUser = broadcastList.filter((user) => {
    return user.userId === parseQuery(req).userName;
  });

  broadcastList.forEach(function each(client) {
    if (client.websocket === ws) {
      sender = client.userId;
    }
    if (
      client.websocket !== ws &&
      client.websocket.readyState === WebSocket.OPEN
    ) {
      // This needs to be fixed
      client.websocket.send(
        `Message from ${senderUser[0].userId}: ${parseData(data)}`
      );
    }
  });
};

// *******Not Used**********
// Step 2
// This function can be removed as the authentication part is handled by the first http request while login
// const authenticateUser = (ws, req) => {
//   //If user is valid post authentication storing it to "Connections" Map
//   storeConnection(ws, req);
// };
