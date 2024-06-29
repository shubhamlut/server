const connectToMongo = require("./db");
const express = require("express");
const cors = require("cors");
const url = require("url");
const WebSocketServer = require("ws");
const WebSocket = require("ws");
const config = require("./config");
const path = require("path");
const directMessageController = require("./controllers/directMessagesController");
const reusableFunctions = require("./reuseableFunctions/functions");

//Connect to mongoDB
connectToMongo();

const app = express();
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ limit: "25mb" }));
app.use(cors());

//Available Routes
// Step 1
app.use("/api/auth", require("./routes/auth"));

//Creating the server
const server = app.listen(config.port, () => {
  console.log(`LowCodeLounge listening on port ${config.port}`);
});

//Websocket server creation
/* To store all the connections.If any new user joins and its authenticated then adding the user to the 'connections' Map 
which would be associated with its correponding websocket */

const connections = new Map();
const rooms = new Map();
const wss = new WebSocketServer.WebSocketServer({ server });

// Constants

let connectedUser = "";
// Step 2
/* This is used when user authenticated successfully in auth.js file and hits the websocketbaseURL */
wss.on("connection", function connection(ws, req) {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  connectedUser = parsedUrl.query.userId;
  console.log("User joined after succesfully login:", connectedUser);
  //Store the newly connected user if not already joined
  if (reusableFunctions.checkUserExists(connectedUser, connections)) {
    console.log("Already exists");
    ws.send(
      JSON.stringify({
        type: "connection",
        connectionAlreadyExists: true,
        message: "Connection already exists",
      })
    );
  } else {
    reusableFunctions.storeConnection(ws, wss, connectedUser, connections);
  }

  //Event Handler to handle the incoming messages from client
   /* Sample message payload
  
    {
      "messageType": "directMessage",
      "targetUser":"targetUserId",
      "message":"Hey hi!"
    } */
  
  ws.on("message", function message(data) {
    //Check message type (directMessage or broadcastMessage)
    const messageType = JSON.parse(data).messageType;
    console.log('Incoming message')
    const senderUserId = url.parse(req.url, true).query.userId
    switch (messageType) {
      case "directMessage":
        directMessageController.handleMessageFromClient(senderUserId,data, ws,connections);
        break;
      case "broadcastMessage":
        console.log("Broadcast Message");
        break;
    }
  });

  //On Error
  ws.on("error", console.error);

  //Event handler to handle the closing of connection
  ws.on("close", (code, reason) => {
    console.log("Connection close")
    reusableFunctions.removeConnection(connections,ws,wss)
  });
});

const removeUserFromRoom = (ws) => {
  if (rooms.get(ws)) {
    let disconnectedUser = Array.from(rooms.values()).filter((client) => {
      return client.websocket === ws;
    });
    let connectedUsers = Array.from(rooms.values()).filter((client) => {
      return (
        client.websocket !== ws && client.roomId === disconnectedUser[0].roomId
      );
    });
    let notifyMessage = `${disconnectedUser[0].userId} left the room`;
    console.log("Leaving the room");
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
  }
};
// Step 3

const addUserToRoom = (ws, userId, roomId, roomName) => {
  console.log("Entering room: ", roomId);
  rooms.set(ws, {
    userId: userId,
    roomId: roomId,
    roomName: roomName,
    websocket: ws,
  });
  //Send message to connected user that he/she have joined the room
  ws.send(`You joined ${roomName}`);
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

// Create broadcastlist
const createBroadcastList = (data, ws, connectionType) => {
  // Get the room where we need to send the message
  const targetRoom = JSON.parse(data).room;
  //Get the list of users present in "targetRoom"
  const broadcastList = Array.from(rooms.values()).filter((client) => {
    return client.roomId === targetRoom;
  });
  // Get the user who wants to send the message in "targetRoom"
  const senderUser = broadcastList.filter((user) => {
    return user.userId === JSON.parse(data).userName;
  });
  //   triggering the function to broadcastMessage
  broadcastMessage(broadcastList, ws, senderUser, data, connectionType);
};
//Sending broadcastmessage
const broadcastMessage = (
  broadcastList,
  ws,
  senderUser,
  message,
  connectionType
) => {
  broadcastList.forEach(function each(client) {
    if (
      client.websocket !== ws &&
      client.websocket.readyState === WebSocket.OPEN
    ) {
      if (connectionType === "broadcastMessage") {
        client.websocket.send(
          `Message from ${senderUser[0].userId}: ${parseData(message)}`
        );
      }
      if (connectionType === "notify") {
        client.websocket.send(parseData(message));
      }
    }
  });
};

//This function gets triggered when any user connects the room
const notifyOthersInRoom = (ws, roomId) => {
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



const sendListOfOnlineUsers = (ws) => {
  let onlineUsers = Array.from(connections.keys());
  let payload = {
    type: "status",
    online: true,
    user: onlineUsers,
  };
  ws.send(JSON.stringify(payload));
};

const getAllRooms = (ws) => {
  let allRooms = new Set();
  for (const [key, val] of rooms.entries()) {
    let room = { roomId: val.roomId, roomName: val.roomName };
    let roomString = JSON.stringify(room);
    if (!allRooms.has(roomString)) {
      allRooms.add(roomString);
    }
  }
  // Convert back to array of objects
  let uniqueRooms = Array.from(allRooms).map((roomString) =>
    JSON.parse(roomString)
  );
  console.log(uniqueRooms);
  ws.send(JSON.stringify({ type: "rooms", rooms: uniqueRooms }));
};
