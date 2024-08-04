/* This js file is having all the functions which are used for handling direct messages from the connected User */
const { connections } = require("mongoose");
const User = require("../models/Users");
const WebSocket = require("ws");
// const {
//   broadcastMessage,
// } = require("../controllers/broadcastMessagesController");
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

  const notificationObject = {
    userId: connectedUser,
    type: "server",
    subType: "1", // joined
    roomId: null,
    message: `${connectedUser} is online`,
  };

  pushNotificationToClients(notificationObject, connections);
  //Once user is disconnected notify all the active users about it
  broastcastStatus(ws, wss, connectedUser, ACTIVE, connections);
};

//remove connection if user logouts or disconnects
const removeConnection = (connections, ws, wss) => {
  const disconnectedUser = getMapKeyByValue(ws, connections);
  if (connections.has(disconnectedUser)) {
    connections.delete(disconnectedUser);
    console.log("removing older connection");
    pushNotificationToClients(
      {
        userId: disconnectedUser,
        type: "server",
        subType: "-1",
        roomId: null,
        message: `${disconnectedUser} if offline`,
      },
      connections,
      null
    );
    broastcastStatus(ws, wss, disconnectedUser, INACTIVE, connections);
  }
  //Once user is disconnected notify all the active users about it
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

const listOfOnlineUsers = (connections) => {
  const activeUsers = connections.keys();
  return (onlineUsers = Array.from(activeUsers));
};

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

let notificationObject = {
  type: "", // Type of notification: 'Room', 'DirectMessage', or 'Typing'

  subType: "", // Specific type within the main type
  // For 'Room':
  //   'joined' (1), 'left' (-1), 'added' (2)
  // For 'DirectMessage':
  //   'joined' (1), 'left' (-1)
  // For 'Typing':
  //   'Room' ('R') or 'Direct' ('D')

  userId: "", // Identifier of the user sending or receiving the notification

  roomId: "", // Identifier of the room (if applicable)

  message: "", // Message or status update (e.g., 'Online', 'Offline', 'Joined the room', 'Left the room')
};

const pushNotificationToClients = (notification, connections, rooms) => {
  //Room based notification
  //Server joined/left based notification
  //Typing activity notification

  try {
    console.log(notification);
    switch (notification.type) {
      case "room":
        const roomParticipants = rooms.filter((room) => {
          return room.roomId === notification.roomId;
        })[0].participants;

        const roomParticipantsWS = [...roomParticipants].map((participant) => {
          return {
            participant: participant,
            ws: connections.get(participant),
          };
        });
        sendBroadcast(roomParticipantsWS, { msg: notification.message });

        break;
      case "server":
        console.log("Server based notification");
        let clients = "";
        let status = "";
        //Joined Server
        if (notification.subType === "1") {
          clients = Array.from(connections)

            .filter((client) => {
              return client[0] !== notification.userId;
            })
            .map((client) => {
              return {
                user: client[0],
                ws: client[1],
              };
            });
          status = ACTIVE;
          console.log(clients);
        }
        //Left Server
        if (notification.subType === "-1") {
          clients = Array.from(connections)
            .filter((client) => {
              return client[0] !== notification.userId;
            })
            .map((client) => {
              return {
                user: client[0],
                ws: client[1],
              };
            });
          status = INACTIVE;
        }
        console.log("sd");
        sendBroadcast(clients, { msg: notification.message, status });

        break;

      case "typing":
        console.log("typing notification");
        if (notification.subType === "D") {
          const clients = Array.from(connections)
            .filter((client) => {
              return client[0] !== notification.userId;
            })
            .map((client) => {
              return {
                ws: client[1],
              };
            });
          console.log("ws clients", clients);
          sendBroadcast(clients, { msg: "typing..." });
        }
        if (notification.subType === "R") {
          const roomParticipants = rooms.filter((room) => {
            return room.id === notification.roomId;
          }).participants;

          const roomParticipantsWS = roomParticipants.map((participant) => {
            return {
              participant: participant,
              ws: connections(participant),
            };
          });

          sendBroadcast(roomParticipantsWS, {
            msg: `${notification.userId} is typing...`,
          });
        }
        break;
    }
  } catch (error) {
    console.log(error);
  }
};

const sendBroadcast = (clients, message) => {
  clients.forEach((client) => {
    client.ws.send(JSON.stringify(message));
  });
};

module.exports = {
  checkUserExists,
  storeConnection,
  removeConnection,
  listOfOnlineUsers,
  broastcastStatus,
  getUserName,
  pushNotificationToClients,
};
