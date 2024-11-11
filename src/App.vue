<template>
  <div>
    <div v-if="!playerId">
      <FloatLabelInput v-model="pseudo" label="Pseudo"/>
      <button class="button-start" @click="startGame">Start</button>
      <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
    </div>

    <div v-else>
      <div
          v-for="(player, id) in players"
          :key="id"
          :style="{ top: `${player.position.y}px`, left: `${player.position.x}px` }"
          class="player"
      >
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
import playerService from "./services/playerService.ts";

const pseudo = ref<string>('');
const playerId = ref<string>('');
const players = ref<Record<string, Player>>({});
const movementDirection = ref<Position>({x: 0, y: 0});
const keysPressed = ref<Set<string>>(new Set());
const isMoving = ref(false);
const errorMessage = ref<string | null>(null);
const movementSpeed = 3;

let socket: WebSocket | null = null;
let stompClient: Stomp.Client | null = null;

async function startGame() {
  if (pseudo.value && await pseudoNotInUse()) {
    playerId.value = pseudo.value;
    connectToWebSocket();
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
  } else {
    showErrorMessage('Pseudo déjà utilisé');
  }
}

async function pseudoNotInUse() {
  const response = await playerService.getAll();
  return response.data ? !response.data.includes(pseudo.value) : false;
}

function showErrorMessage(message: string) {
  errorMessage.value = message;
  setTimeout(() => {
    errorMessage.value = null;
  }, 3000);
}

function connectToWebSocket() {
  socket = new SockJS("ws");
  stompClient = Stomp.over(socket);

  stompClient.connect({}, () => {
    initializePlayerSubscriptions();
    stompClient!.send("/app/connect", {}, JSON.stringify({pseudo: playerId.value}));
  });
}

function initializePlayerSubscriptions() {
  stompClient!.subscribe("/topic/connect", (message) => {
    players.value = JSON.parse(message.body);
  });
  stompClient!.subscribe("/topic/disconnect", (message) => {
    const disconnectedPlayerId = message.body;
    delete players.value[disconnectedPlayerId];
  });
  stompClient!.subscribe("/topic/movements", (message) => {
    players.value = JSON.parse(message.body);
  });
}

function updatePlayerPosition(player: Player) {
  if (!isMoving.value) return;

  player.position.x += movementDirection.value.x;
  player.position.y += movementDirection.value.y;
  stompClient!.send("/app/move", {}, JSON.stringify(player));

  requestAnimationFrame(() => updatePlayerPosition(player));
}

function handleKeyDown(event: KeyboardEvent) {
  const player = players.value[playerId.value];
  if (!player || keysPressed.value.has(event.key)) return;

  keysPressed.value.add(event.key);
  updateDirection(event.key, movementSpeed);

  if (!isMoving.value) {
    isMoving.value = true;
    updatePlayerPosition(player);
  }
}

function handleKeyUp(event: KeyboardEvent) {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
    keysPressed.value.delete(event.key);
    updateDirection(event.key, 0);

    if (movementDirection.value.x === 0 && movementDirection.value.y === 0) {
      isMoving.value = false;
    }
  }
}

function updateDirection(key: string, speed: number) {
  if (key === 'ArrowUp') movementDirection.value.y = -speed;
  if (key === 'ArrowDown') movementDirection.value.y = speed;
  if (key === 'ArrowLeft') movementDirection.value.x = -speed;
  if (key === 'ArrowRight') movementDirection.value.x = speed;
}

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('keyup', handleKeyUp);
});

onMounted(() => {
  window.addEventListener('keydown', handleEnterPress);
});

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

.error-message {
  color: red;
  font-size: 0.9rem;
  margin-top: 1rem;
}
</style>
