<template>
  <div>
    <div v-if="!playerId">
      <FloatLabelInput v-model="pseudo" label="pseudo"/>
      <button class="button-start" @click="startGame">Start</button>
    </div>

    <div v-else>
      <div v-for="(player, id) in players" :key="id"
           :style="{ top: `${player.position.y}px`, left: `${player.position.x}px` }"
           class="player">
        <div class="player-name">
          {{ player.pseudo }}
        </div>
      </div>
    </div>
  </div>
</template>


<script lang="ts" setup>
import SockJS from 'sockjs-client';
import Stomp from 'stompjs';
import {onBeforeUnmount, onMounted, ref} from 'vue';
import FloatLabelInput from "./components/FloatLabelInput.vue";
import Position from "./models/position.ts";
import Player from "./models/Player.ts";

const pseudo = ref();
const playerId = ref<string>('');
const players = ref<{ [key: string]: Player }>({});
let socket: any;
let stompClient: any;
const movementSpeed = 5;
let isMoving = false;
let movementDirection: Position = {x: 0, y: 0};
let keysPressed: Set<string> = new Set();

function startGame() {
  console.log(pseudoNotUse())
  if (pseudo.value.trim() && pseudoNotUse()) {
    playerId.value = pseudo.value.trim();

    socket = new SockJS("http://localhost:8082/ws");
    stompClient = Stomp.over(socket);

    stompClient.connect({}, () => {
      stompClient.subscribe("/topic/connect", (message: any) => {
        players.value = JSON.parse(message.body);
      });

      stompClient.subscribe("/topic/disconnect", (message: any) => {
        const disconnectedPlayerId = message.body;
        delete players.value[disconnectedPlayerId];
      });

      stompClient.subscribe("/topic/movements", (message: any) => {
        players.value = JSON.parse(message.body);
      });

      stompClient.send("/app/connect", {}, JSON.stringify({ pseudo: playerId.value }));

      window.addEventListener('keydown', movePlayer);
      window.addEventListener('keyup', stopMovement);
    });
  } else {
    alert('Pseudo déjà utilisé');
  }
}

function pseudoNotUse(): boolean {
  return !players.value[pseudo.value.trim()];
}

function movePlayer(event: KeyboardEvent) {
  const player = players.value[playerId.value];
  if (!player || keysPressed.has(event.key)) return;
  keysPressed.add(event.key);

  let translateX = 0;
  let translateY = 0;

  if (event.key === 'ArrowUp') {
    translateY = -movementSpeed;
  }
  if (event.key === 'ArrowDown') {
    translateY = movementSpeed;
  }
  if (event.key === 'ArrowLeft') {
    translateX = -movementSpeed;
  }
  if (event.key === 'ArrowRight') {
    translateX = movementSpeed;
  }

  movementDirection.x += translateX;
  movementDirection.y += translateY;

  if (!isMoving) {
    isMoving = true;
    movePlayerContinuously(player);
  }
}

function stopMovement(event: KeyboardEvent) {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
    keysPressed.delete(event.key);

    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      movementDirection.y = 0;
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      movementDirection.x = 0;
    }

    if (movementDirection.x === 0 && movementDirection.y === 0) {
      isMoving = false;
    }
  }
}

function movePlayerContinuously(player: Player) {
  function updatePosition() {
    if (!isMoving) return;

    player.position.x += movementDirection.x;
    player.position.y += movementDirection.y;

    stompClient.send("/app/move", {}, JSON.stringify(player));

    requestAnimationFrame(updatePosition);
  }

  updatePosition();
}

onBeforeUnmount(() => {
  window.removeEventListener('keydown', movePlayer);
  window.removeEventListener('keyup', stopMovement);
});

onMounted(() => {
  getAllPlayers()
  window.addEventListener('keydown', handleEnterPress);
});

function getAllPlayers() {
  // Connexion au WebSocket
  socket = new SockJS("http://localhost:8082/ws");
  stompClient = Stomp.over(socket);

  // Connexion et abonnement au canal /topic/getAll
  stompClient.connect({}, () => {
    // S'abonner à /topic/getAll pour recevoir les joueurs
    stompClient.subscribe("/topic/getAll", (message: any) => {
      players.value = JSON.parse(message.body);
      console.log(players.value); // Affiche les joueurs reçus
    });

    // Envoyer un message pour demander la liste des joueurs
    stompClient.send("/app/getAll", {}, JSON.stringify({}));
  });
}

function handleEnterPress(event: KeyboardEvent) {
  if (event.key === 'Enter' && !playerId.value) {
    startGame();
  }
}
</script>

<style scoped>
.button-start {
  margin-top: 1.5rem;
}

.player {
  position: absolute;
  width: 40px;
  height: 40px;
  background-color: #4CAF50;
  border-radius: 50%;
  color: white;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  text-shadow: 0 0 5px rgba(0, 0, 0, 0.7);
}

.player-name {
  margin-bottom: 4rem;
  text-align: center;
  font-size: 14px;
  color: black;
  font-weight: bold;
}
</style>
