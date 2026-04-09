const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

/* =========================
   🌍 WORLD STATE
========================= */
let world = {
  chaos: 0,
  players: {},
  events: [],
  bosses: []
};

/* =========================
   👑 GM SYSTEM
========================= */
const GM_CODE = "1234GMSECRET";

let gms = {};

/* =========================
   🧠 GAME MASTER AI (LOGIC)
========================= */
function gameMaster(input, playerId) {
  let msg = input.toLowerCase();

  if (msg.includes("attack")) {
    world.chaos += 10;
    return "⚔️ คุณโจมตีสำเร็จ โลกเริ่มวุ่นวายขึ้น!";
  }

  if (msg.includes("help")) {
    return "📜 ระบบ: ลองพิมพ์ attack / quest / status";
  }

  if (msg.includes("quest")) {
    let quest = "กำจัด Shadow Slime x3";
    world.events.push(quest);
    return "📜 เควสใหม่: " + quest;
  }

  if (msg.includes("status")) {
    return `🌍 Chaos: ${world.chaos}`;
  }

  return "❓ ไม่เข้าใจคำสั่ง";
}

/* =========================
   🚀 SOCKET IO
========================= */
io.on("connection", (socket) => {
  console.log("Player connected:", socket.id);

  world.players[socket.id] = {
    name: "Player_" + socket.id.slice(0, 5),
    hp: 100,
    level: 1
  };

  /* =========================
     💬 CHAT / COMMAND
  ========================= */
  socket.on("message", (data) => {
    let reply = gameMaster(data, socket.id);

    io.emit("chat", {
      id: socket.id,
      msg: data,
      reply
    });
  });

  /* =========================
     👑 GM LOGIN
  ========================= */
  socket.on("gm_login", (code) => {
    if (code === GM_CODE) {
      gms[socket.id] = true;
      socket.emit("gm_status", "GM LOGIN SUCCESS");
    } else {
      socket.emit("gm_status", "WRONG CODE");
    }
  });

  /* =========================
     👑 GM COMMANDS
  ========================= */
  socket.on("gm_command", (cmd) => {
    if (!gms[socket.id]) return;

    if (cmd.type === "boss") {
      world.bosses.push(cmd.name);

      io.emit("system", "👹 Boss Spawn: " + cmd.name);
    }

    if (cmd.type === "chaos") {
      world.chaos += cmd.value;

      io.emit("system", "🌍 GM เพิ่ม chaos: " + cmd.value);
    }

    if (cmd.type === "event") {
      world.events.push(cmd.text);

      io.emit("system", "📢 Event: " + cmd.text);
    }
  });

  /* =========================
     DISCONNECT
  ========================= */
  socket.on("disconnect", () => {
    delete world.players[socket.id];
    delete gms[socket.id];
  });
});

/* =========================
   🌐 FRONTEND (HTML GAME)
========================= */
app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
<title>MMO GAME</title>
<style>
body { font-family: Arial; background:#111; color:white; }
#chat { height:300px; overflow:auto; border:1px solid #444; padding:10px; }
input { width:70%; padding:10px; }
button { padding:10px; }
</style>
</head>
<body>

<h2>🌍 MMO GAME SYSTEM</h2>

<div id="chat"></div>

<input id="msg" placeholder="พิมพ์คำสั่ง..." />
<button onclick="send()">Send</button>

<br><br>

<h3>👑 GM PANEL</h3>
<input id="gmc" placeholder="GM CODE" />
<button onclick="loginGM()">Login GM</button>

<br><br>

<button onclick="spawnBoss()">Spawn Boss</button>
<button onclick="addChaos()">Add Chaos</button>

<script src="/socket.io/socket.io.js"></script>
<script>
const socket = io();

/* =========================
   CHAT
========================= */
function send(){
  let msg = document.getElementById("msg").value;
  socket.emit("message", msg);
}

/* =========================
   GM LOGIN
========================= */
function loginGM(){
  let code = document.getElementById("gmc").value;
  socket.emit("gm_login", code);
}

/* =========================
   GM COMMANDS
========================= */
function spawnBoss(){
  socket.emit("gm_command", {
    type: "boss",
    name: "Shadow Dragon"
  });
}

function addChaos(){
  socket.emit("gm_command", {
    type: "chaos",
    value: 50
  });
}

/* =========================
   RECEIVE DATA
========================= */
socket.on("chat", (data) => {
  let div = document.getElementById("chat");
  div.innerHTML += "<p><b>" + data.id + "</b>: " + data.msg +
  "<br>👉 " + data.reply + "</p>";
});

socket.on("system", (msg) => {
  let div = document.getElementById("chat");
  div.innerHTML += "<p style='color:yellow'>" + msg + "</p>";
});

socket.on("gm_status", (msg) => {
  alert(msg);
});
</script>

</body>
</html>
  `);
});

/* =========================
   START SERVER
========================= */
server.listen(3000, () => {
  console.log("🔥 Server running http://localhost:3000");
});
