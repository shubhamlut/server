const reusableFunctions = require("../reuseableFunctions/functions");

const handleMessageFromClient = (senderUserId, data, ws, connections) => {
  let connectionType = JSON.parse(data).messageType;
  if (connectionType === "directMessage") {
    sendDirectMessage(senderUserId, data, ws, connections);
  }
};

const sendDirectMessage = (senderUserId, data, ws, connections) => {
  const targetUserId = JSON.parse(data).targetUser;
  console.log("message");
  if (connections.has(targetUserId)) {
    const targetWebsocket = connections.get(targetUserId);
    const requestPayload = {
      message: JSON.parse(data).message,
      senderUserid: senderUserId,
      senderUserName: reusableFunctions.getUserName(senderUserId),
      type: "message",
    };
    console.log("sending message");
    targetWebsocket.send(JSON.stringify(requestPayload));
  } else {
    ws.send(
      JSON.stringify({
        message: "User is offline. Your message is not delivered",
        targetUserId: targetUserId,
        targetUserName:reusableFunctions.getUserName(targetUserId)
      })
    );
  }
};

module.exports = {
  handleMessageFromClient,
  sendDirectMessage,
};
