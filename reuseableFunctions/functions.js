/* This js file is having all the functions which are used for handling direct messages from the connected User */
const User = require("../models/Users");
const WebSocket = require("ws");
const { use } = require("../routes/auth");
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
  let userName = await User.findOne({ userId });
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
  broastcastStatus(ws, wss, connectedUser, ACTIVE);
};

//remove connection if user logouts or disconnects
const removeConnection = (connections, ws, wss) => {
  const disconnectedUser = getMapKeyByValue(ws, connections);
  if (connections.has(disconnectedUser)) {
    connections.delete(disconnectedUser);
  }
  //Once user is disconnected notify all the active users about it
  broastcastStatus(ws, wss, disconnectedUser, INACTIVE);
};
const handleMessageFromClient = () => {
  /* Handle incoming messages from logged in user */
};

const sendMessageToClient = () => {};

const listOfOnlineUsers = () => {};

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

const broastcastStatus = (ws, wss, user, status) => {
  wss.clients.forEach(function each(client) {
    if (client.websocket !== ws && client.readyState === WebSocket.OPEN) {
      client.send(
        JSON.stringify({
          userId: user,
          userName: getUserName(user),
          online: status,
          type: "status",
        })
      );
    }
  });
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
