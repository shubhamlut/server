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
const wss = new WebSocketServer.WebSocketServer({ server });

// Step 2
wss.on("connection", function connection(ws, req) {
  //Authentication logic (once user is authenticated fetch from the query what username connection was to connect to)
  //   authenticateUser(ws, req);

  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  storeConnection(ws, req);
  if (path === "/broadcastMessage") {
    handleUserConnected(ws, url.parse(req.url, true).query.room);
  }
  ws.on("error", console.error);

  //ws://localhost:8080/broadcastMessage?userName=shubham&room=2

  //ws://localhost:8080/directMessage?userName=shubham&targetUser=anaysha

  ws.on("message", function message(data) {
    if (path === "/directMessage") {
      sendDirectMessage(ws, req, data);
    }
    if (path === "/broadcastMessage") {
      createBroadcastList(ws, req, data);
    }
  });
  ws.on("close", (code, reason) => {
    if (path === "/broadcastMessage") {
      handleUserDisconnect(ws, code, reason);
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
    // let candidate = {
    //   userId: query.userName,
    //   websocket: ws,
    //   roomId: query.room,
    // };
    // roomCandidates.push(candidate);
    rooms.set(ws, {
      userId: query.userName,
      roomId: query.room,
      websocket: ws,
    });
    // rooms.set(query.room, roomCandidates);
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
// Create broadcastlist
const createBroadcastList = (ws, req, data) => {
  const targetRoom = parseQuery(req).room;
  const broadcastList = Array.from(rooms.values()).filter((client) => {
    return client.roomId === targetRoom;
  });

  const senderUser = broadcastList.filter((user) => {
    return user.userId === parseQuery(req).userName;
  });
  //   triggering the function to broadcastMessage
  broadcastMessage(broadcastList, ws, senderUser, data, "message");
};
//Sending broadcastmessage
const broadcastMessage = (broadcastList, ws, senderUser, data, messageType) => {
  broadcastList.forEach(function each(client) {
    if (
      client.websocket !== ws &&
      client.websocket.readyState === WebSocket.OPEN
    ) {
      if (messageType === "message") {
        client.websocket.send(
          `Message from ${senderUser[0].userId}: ${parseData(data)}`
        );
      }
      if (messageType === "notify") {
        client.websocket.send(parseData(data));
      }
    }
  });
};
//This function gets triggered when any user disconnects from room
const handleUserDisconnect = (ws, code, reason) => {
  let disconnectedUser = Array.from(rooms.values()).filter((client) => {
    return client.websocket === ws;
  });
  let connectedUsers = Array.from(rooms.values()).filter((client) => {
    return (
      client.websocket !== ws && client.roomId === disconnectedUser[0].roomId
    );
  });
  let notifyMessage = `${disconnectedUser[0].userId} left the room`;
  //Clean up activity
  rooms.delete(ws);
  ws.close();
  broadcastMessage(
    connectedUsers,
    ws,
    disconnectedUser,
    notifyMessage,
    "notify"
  );
};

//This function gets triggered when any user connects the room
const handleUserConnected = (ws, roomId) => {
  let oldConnectedUsers = Array.from(rooms.values()).filter((client) => {
    return client.websocket !== ws && client.roomId === roomId;
  });
  let newConnectedUser = Array.from(rooms.values()).filter((client) => {
    return client.websocket === ws;
  });
  let notifyMessage = `${newConnectedUser[0].userId} joined the room`;
  broadcastMessage(
    oldConnectedUsers,
    ws,
    newConnectedUser,
    notifyMessage,
    "notify"
  );
};


