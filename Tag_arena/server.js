const WebSocket = require("ws");
const wss = new WebSocket.Server({ port:8080 });

const rooms = {};

function powerUp() {
  return {
    x: Math.random()*800+50,
    y: Math.random()*400+50,
    type: Math.random()>0.5 ? "speed" : "shield"
  };
}

wss.on("connection", ws => {
  ws.id = Math.random().toString(36).slice(2);

  ws.on("message", msg => {
    const data = JSON.parse(msg);

    if (data.type==="join") {
      rooms[data.code] ??= {
        players:{},
        host: ws.id,
        powerUps:[powerUp()]
      };
      ws.room = data.code;
      rooms[data.code].players[ws.id] = {
        id: ws.id,
        x:100, y:100,
        it:false,
        host: rooms[data.code].host===ws.id,
        spectator:false,
        score:0,
        speedBoost:0
      };
      ws.send(JSON.stringify({
        type:"init",
        id: ws.id,
        host: rooms[data.code].host
      }));
    }

    if (data.type==="move") {
      const p = rooms[ws.room].players[ws.id];
      if (!p) return;
      p.x=data.x; p.y=data.y;
      p.score+=0.05;
    }

    if (data.type==="start") {
      broadcast(ws.room,{type:"start"});
    }

    if (data.type==="kick") {
      const ids = Object.keys(rooms[ws.room].players);
      if (ids[1]) delete rooms[ws.room].players[ids[1]];
    }
  });

  ws.on("close",()=>{
    if (ws.room && rooms[ws.room]) {
      delete rooms[ws.room].players[ws.id];
    }
  });
});

function broadcast(room,data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(c=>{
    if (c.room===room) c.send(msg);
  });
}

setInterval(()=>{
  Object.values(rooms).forEach(room=>{
    broadcast(room,{
      type:"state",
      players:Object.values(room.players),
      powerUps:room.powerUps
    });
  });
},50);

console.log("Server running on ws://localhost:8080");
