const reusableFunctions = require("../reuseableFunctions/functions");

// const handleMessageFromClient = (senderUserId, data, ws, connections) => {
//   console.log(senderUserId);
//   let connectionType = JSON.parse(data).messageType;
//   if (connectionType === "directMessage") {
//     sendDirectMessage(senderUserId, data, ws, connections);
//   }
// };

const sendDirectMessage = async (senderUserId, data, ws, connections) => {
  const targetUserId = JSON.parse(data).targetUser;

  console.log(targetUserId);
  if (connections.has(targetUserId)) {
    const targetWebsocket = connections.get(targetUserId);
    const requestPayload = {
      message: JSON.parse(data).message,
      senderUserid: senderUserId,
      senderUserName: await reusableFunctions.getUserName(senderUserId),
      type: "message",
    };
    targetWebsocket.send(JSON.stringify(requestPayload));
  } else {
    ws.send(
      JSON.stringify({
        message: "User is offline. Your message is not delivered",
        targetUserId: targetUserId,
        targetUserName: reusableFunctions.getUserName(targetUserId),
      })
    );
  }
};

module.exports = {
  sendDirectMessage,
};
