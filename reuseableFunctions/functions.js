/* This js file is having all the functions which are used for handling direct messages from the connected User */
const User = require("../models/Users");
const WebSocket = require("ws");
const { use } = require("../routes/auth");
const { connections } = require("mongoose");
const ACTIVE = true;
const INACTIVE = false;

const checkUserExists = (connectedUser, connections) => {
  /* Check if user is already connected to the server */
  if (connections.has(connectedUser)) {
    return true;
  } else {
    return false;
  }
};

const getUserName = async (userId) => {
  let userName = await User.findOne({ _id: userId });
  userName = userName.name;
  return userName;
};

// Used to store the connected user in 'connections' map
/* Parameter required 
  ws= websocket
  req= Request payload send by client */
const storeConnection = (ws, wss, connectedUser, connections) => {
  /* Store the new connected user */
  console.log(`${connectedUser} Joined the connection...`);
  connections.set(connectedUser, ws);
  //Once user is disconnected notify all the active users about it
  broastcastStatus(ws, wss, connectedUser, ACTIVE, connections);
};

//remove connection if user logouts or disconnects
const removeConnection = (connections, ws, wss) => {
  const disconnectedUser = getMapKeyByValue(ws, connections);
  if (connections.has(disconnectedUser)) {
    connections.delete(disconnectedUser);
    console.log("removing older connection");
    broastcastStatus(ws, wss, disconnectedUser, INACTIVE, connections);
  }
  //Once user is disconnected notify all the active users about it
};
const handleMessageFromClient = () => {
  /* Handle incoming messages from logged in user */
};

const broastcastStatus = async (ws, wss, user, status, connections) => {
  console.log("broadcasting status");
  const requestPayload = {
    message: `${await getUserName(user)} is ${
      status ? "now available" : "offline"
    }`,
    senderUserid: user,
    senderUserName: await getUserName(user),
    type: "status",
    status: status,
  };
  wss.clients.forEach((client) => {
    if (client !== ws && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(requestPayload));
    }
  });
  const onlineUsers = listOfOnlineUsers(connections);
  let payloadObject = {
    type: "onlineUsers",
    onlineUsers: onlineUsers,
  };
  ws.send(JSON.stringify(payloadObject));
};
const sendMessageToClient = () => {};

const listOfOnlineUsers = (connections) => {
  const activeUsers = connections.keys();
  return (onlineUsers = Array.from(activeUsers));
};

const broadcastMessage = () => {};

const getMapKeyByValue = (value, connections) => {
  let mapKey;
  for (const [key, val] of connections.entries()) {
    if (val === value) {
      mapKey = key;
      break;
    }
  }
  return mapKey;
};

module.exports = {
  checkUserExists,
  storeConnection,
  removeConnection,
  handleMessageFromClient,
  sendMessageToClient,
  listOfOnlineUsers,
  broadcastMessage,
  broastcastStatus,
  getUserName,
};
