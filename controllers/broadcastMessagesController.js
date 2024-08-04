let roomId = 1;

const { connections } = require("mongoose");
const serverFunctions = require("../reuseableFunctions/functions");

const createRoom = (data, ws, senderUserId, rooms, connections) => {
  let roomData = JSON.parse(data);
  newRoom = {
    roomId: roomId,
    roomName: roomData.roomName,
    roomAdmin: roomData.roomAdmin,
    participants: new Set(),
  };
  rooms.push(newRoom);
  const StringifedParticipantData = JSON.stringify({
    roomId: roomId,
    newParticipants: roomData.participants,
  });
  addParticipantInRoom(StringifedParticipantData, rooms, connections);
  roomId++;
};
const getRoomsByUser = (userId, rooms) => {
  const userRooms = rooms.filter((room) => {
    return room.participants.has(userId);
  });
  console.log(userRooms);
};

const addParticipantInRoom = (data, rooms, connections) => {
  try {
    const parsedData = JSON.parse(data);
    const roomId = parsedData.roomId;
    const newParticipants = parsedData.newParticipants;
    const room = rooms.find((r) => r.roomId === roomId);

    let notificationObject = "";

    if (room) {
      newParticipants.forEach((newParticipant) => {
        room.participants.add(newParticipant);
        console.log(rooms);
        serverFunctions.pushNotificationToClients(
          {
            userId: newParticipant,
            type: "room",
            subType: "1",
            roomId: roomId,
            message: `${newParticipant} joined the room`,
          },
          connections,
          rooms
        );
      });
    } else {
      console.log("Room not found");
    }
  } catch (error) {
    console.log(error);
  }
};
const removeParticipantFromRoom = (data, rooms) => {
  const parsedData = JSON.parse(data);
  const roomId = parsedData.roomId;
  const removeParticipant = parsedData.newParticipant;
  const room = rooms.find((r) => r.roomId === roomId);
  if (room) {
    room.participants.delete(removeParticipant);
    serverFunctions.pushNotificationToClients(
      {
        userId: removeParticipant,
        type: "room",
        subType: "-1",
        roomId: roomId,
        message: `${removeParticipant} left the room`,
      },
      connections,
      rooms
    );
  } else {
    console.log("Room not found");
  }
};

const sendMessageToRoom = (roomId, sender, message, connections, rooms) => {
  try {
    //Get all the participants of room

    const roomParticipants = rooms.filter((room) => {
      return room.roomId === roomId;
    })[0].participants;

    //Get ws objects of all participants

    const roomParticipantsWS = [...roomParticipants].map((participant) => {
      return {
        participant: participant,
        ws: connections.get(participant),
      };
    });

    //sending message structure - will be modified as per FE requirment
    const messagePayload = {
      message: message,
      sender: sender,
      roomId: roomId,
    };
    //send message to all the participants
    roomParticipantsWS.forEach((participant) => {
      if (participant.participant !== sender)
        participant.ws.send(JSON.stringify(messagePayload));
    });
  } catch (error) {
    console.log(error);
  }
};

const broadcastMessage = (rooms, data, ws, senderUserId) => {};

module.exports = {
  createRoom,
  addParticipantInRoom,
  removeParticipantFromRoom,
  broadcastMessage,
  getRoomsByUser,
  sendMessageToRoom,
};
