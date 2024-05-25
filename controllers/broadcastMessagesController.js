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
