const connectToMongo = require("./db");
const express = require("express");
const cors = require("cors");
const url = require("url");
const WebSocketServer = require("ws");
const WebSocket = require("ws");
const config = require("./config");
const path = require("path");
const directMessageController = require("./controllers/directMessagesController");
const broadcastMessageController = require("./controllers/broadcastMessagesController");
const serverFunctions = require("./reuseableFunctions/functions");

//Connect to mongoDB
connectToMongo();

const app = express();
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ limit: "25mb" }));
app.use(cors());

//Creating the server
const server = app.listen(config.port, () => {
  console.log(`LowCodeLounge listening on port ${config.port}`);
});

//Available Routes
// Step 1
app.use("/api/auth", require("./routes/auth"));

//WEBSOCKET SERVER CREATION
/* To store all the connections.If any new user joins and its authenticated then adding the user to the 'connections' Map 
which would be associated with its correponding websocket */

const connections = new Map();
let rooms = [];

let notificationObject = "";

const wss = new WebSocketServer.WebSocketServer({ server });

// Step 2
/* Triggered when client hits the websocket server with wss URL */
wss.on("connection", function connection(ws, req) {
  try {
    const parsedUrl = url.parse(req.url, true);
    const type = parsedUrl.pathname;
    userId = parsedUrl.query.userId;

    console.log("User joined after succesfully login:", userId);

    //Store the newly connected user if not already joined
    if (serverFunctions.checkUserExists(userId, connections)) {
      console.log("Already exists");
      ws.send(
        JSON.stringify({
          type: "connection",
          connectionAlreadyExists: true,
          message: "Connection already exists",
        })
      );
    } else {
      serverFunctions.storeConnection(ws, wss, userId, connections);
    }
  } catch (error) {
    console.log(error);
  }

  //Event Handler to handle the incoming messages from client
  /* Sample message payload
  
    {
      "messageType": "directMessage",
      "targetUser":"targetUserId",
      "message":"Hey hi!"
    } */

  // Sample create room payload from client

  /*{
  "messageType": "createRoom",
  "roomName": "Cohort Room",
  "roomAdmin": "someUserId",
  "participants": []
}*/

  ws.on("message", function message(data) {
    //Check message type (directMessage or broadcastMessage)
    const messageType = JSON.parse(data).messageType;
    console.log("Incoming message");
    const senderUserId = url.parse(req.url, true).query.userId;
    switch (messageType) {
      case "directMessage":
        directMessageController.sendDirectMessage(
          senderUserId,
          data,
          ws,
          connections
        );
        break;

      case "createRoom":
        console.log("Create Room Requested");
        broadcastMessageController.createRoom(
          data,
          ws,
          senderUserId,
          rooms,
          connections
        );
        break;
      case "getRooms":
        broadcastMessageController.getRoomsByUser(senderUserId, rooms);
        break;
      case "broadcastMessage":
        console.log("Broadcast Message");
        broadcastMessageController.broadcastMessage(
          rooms,
          data,
          ws,
          senderUserId
        );
        break;

      case "joinRoom":
        broadcastMessageController.addParticipantInRoom(
          data,
          rooms,
          connections
        );
        console.log("Join Room");
        break;
      case "leaveRoom":
        broadcastMessageController.removeParticipantFromRoom(data, rooms);
        console.log("Leave Room");
        break;
      case "roomMessage":
        const parsedData = JSON.parse(data);
        const roomId = parsedData.roomId;
        const sender = parsedData.sender;
        const message = parsedData.message;
        broadcastMessageController.sendMessageToRoom(
          roomId,
          sender,
          message,
          connections,
          rooms
        );
      case "userTyping":
        notificationObject = {
          type: "typing", // 'room', 'directMessage', or 'typing'
          subType: "D", // 'joined', 'left', 'added', 'sent', 'received', 'R', 'D'
          userId: senderUserId,
          message: `typing...`,
        };

        serverFunctions.pushNotificationToClients(
          notificationObject,
          connections,
          null
        );
        break;
      case "userTypingInRoom":
        notificationObject = {
          type: "typing", // 'room', 'directMessage', or 'typing'
          subType: "R", // 'joined', 'left', 'added', 'sent', 'received', 'R', 'D'
          userId: senderUserId,
          roomId: "",
          message: `${senderUserId} is typing...`,
        };

        serverFunctions.pushNotificationToClients(
          notificationObject,
          connections,
          rooms
        );
        break;
    }
  });

  //On Error
  ws.on("error", console.error);

  //Event handler to handle the closing of connection
  ws.on("close", (code, reason) => {
    console.log("Connection close");
    serverFunctions.removeConnection(connections, ws, wss);
  });
});

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
