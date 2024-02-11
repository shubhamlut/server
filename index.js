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
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const connectedUser = parsedUrl.query.userName;

  //Store the newly connected user if not already joined
  if (connections.has(connectedUser)) {
    console.log(connections.has(connectedUser));
    ws.send(
      JSON.stringify({
        type: "Connection Check",
        message: "Connection already exists",
      })
    );
  } else {
    storeConnection(ws, req);
    broastcastStatus(ws, connectedUser, true);
  }

  //Event Handler to handle the incoming messages from client
  ws.on("message", function message(data) {
    console.log("Incoming Message from client side received.");
    handleMessageFromClient(data, ws);
  });

  //On Error
  ws.on("error", console.error);

  //Event handler to handle the closing of connection
  ws.on("close", (code, reason) => {
    if (path === "/newConnection") {
      broastcastStatus(ws, "", false);
      removeUserFromRoom(ws);
    }
  });
});

const handleMessageFromClient = (data, ws) => {
  let connectionType = JSON.parse(data).connectionType;
  if (connectionType === "directMessage") {
    sendDirectMessage(data, ws);
  }
  if (connectionType === "joinRoom") {
    let roomId = JSON.parse(data).room;
    let roomName = JSON.parse(data).roomName;
    let userName = JSON.parse(data).userName;

    addUserToRoom(ws, userName, roomId, roomName);
    notifyOthersInRoom(ws, roomId);
  }

  if (connectionType === "leaveRoom") {
    let roomId = JSON.parse(data).room;
    let roomName = JSON.parse(data).roomName;
    let userName = JSON.parse(data).userName;

    removeUserFromRoom(ws, userName, roomId, roomName);
  }
  if (connectionType === "broadcastMessage") {
    console.log(connectionType);
    createBroadcastList(data, ws, connectionType);
  }
};
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
// This function is called once user is authenticated
const storeConnection = (ws, req) => {
  const query = url.parse(req.url, true).query;
  console.log("New User Joined the connection...");
  connections.set(query.userName, ws);
  sendListOfOnlineUsers(ws);
  getAllRooms(ws);
 
};

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
//#2
const sendDirectMessage = (data, ws) => {
  const senderUsername = JSON.parse(data).userName;
  const targetUsername = JSON.parse(data).targetUser;
  console.log(connections)
  if (connections.has(targetUsername)) {
    const targetWs = connections.get(targetUsername);
    const requestPayload = {
      message: JSON.parse(data).message,
      fromUser: senderUsername,
      type: "message",
    };
    console.log("sending message")
    targetWs.send(JSON.stringify(requestPayload));
  } else {
    ws.send(
      JSON.stringify({
        message: "User is offline. Your message is not delivered",
        fromUser: targetUsername,
      })
    );
  }
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

const broastcastStatus = (ws, connectedUser, status) => {
  const sendUpdate = (status, connectedUser) => {
    wss.clients.forEach(function each(client) {
      if (client.websocket !== ws && client.readyState === WebSocket.OPEN) {
        client.send(
          JSON.stringify({
            user: connectedUser,
            online: status,
            type: "status",
          })
        );
      }
    });
  };
  if (status) {
    sendUpdate(status, connectedUser);
  } else {
    sendUpdate(status, getMapKeyByValue(ws));
    // removing the user from connection once user is disconnected
    connections.delete(getMapKeyByValue(ws));
  }
};
const getMapKeyByValue = (value) => {
  let mapKey;
  for (const [key, val] of connections.entries()) {
    if (val === value) {
      mapKey = key;
      break;
    }
  }
  return mapKey;
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
