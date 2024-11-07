<template>
  <div>
    <!-- Formulaire pour entrer le pseudo -->
    <div v-if="!playerId">
      <FloatLabelInput v-model="pseudo" label="pseudo"/>
      <button class="button-start" @click="startGame">Start</button>
    </div>

    <!-- Si un joueur a un pseudo, afficher les informations du jeu -->
    <div v-else>
      <div v-for="(player, id) in players" :key="id"
           :style="{ top: `${player.position.y}px`, left: `${player.position.x}px` }"
           class="player">
        <div class="player-name">
          {{ player.id }}
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
const movementSpeed = 5;  // Vitesse de déplacement du joueur
let isMoving = false; // Flag pour savoir si un joueur est en mouvement
let movementDirection: Position = {x: 0, y: 0}; // Direction actuelle du mouvement
let keysPressed: Set<string> = new Set(); // Ensemble des touches actuellement enfoncées

// Fonction pour démarrer la partie avec le pseudo
function startGame() {
  if (pseudo.value.trim()) {
    playerId.value = pseudo.value.trim();  // Utiliser le pseudo comme ID du joueur

    // Connexion WebSocket
    socket = new SockJS("http://localhost:8082/ws");
    stompClient = Stomp.over(socket);

    stompClient.connect({}, () => {
      console.log("WebSocket connected");

      // S'abonner à l'URL pour recevoir les positions des joueurs
      stompClient.subscribe("/topic/movements", (message: any) => {
        players.value = JSON.parse(message.body); // Mettre à jour la liste des joueurs
      });
    }, (error: any) => {
      console.error("Erreur lors de la connexion WebSocket : ", error);
    });

    // Ajouter le joueur avec sa position initiale
    players.value[playerId.value] = new Player(playerId.value, new Position(100, 100));

    // Commencer à écouter les touches du clavier pour déplacer le joueur
    window.addEventListener('keydown', movePlayer);
    window.addEventListener('keyup', stopMovement); // Ajout d'un écouteur pour arrêter le mouvement
  } else {
    alert('Veuillez entrer un pseudo valide');
  }
}

function movePlayer(event: KeyboardEvent) {
  const player = players.value[playerId.value]; // Utilisation du pseudo comme identifiant
  if (!player || keysPressed.has(event.key)) return; // Ignorer si la touche est déjà enfoncée

  keysPressed.add(event.key); // Ajouter la touche à l'ensemble des touches enfoncées

  let translateX = 0;
  let translateY = 0;

  // Déterminer la direction du mouvement pour chaque touche
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

  // Mettre à jour la direction du mouvement
  movementDirection.x += translateX;
  movementDirection.y += translateY;

  if (!isMoving) {
    isMoving = true; // Démarre l'animation de mouvement
    movePlayerContinuously(player); // Commencer à déplacer le joueur
  }
}

// Arrêter le mouvement lorsque la touche est relâchée
function stopMovement(event: KeyboardEvent) {
  // Vérifie si la touche relâchée correspond à une direction de mouvement
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
    keysPressed.delete(event.key); // Retirer la touche de l'ensemble des touches enfoncées

    // Réduire la direction du mouvement lorsque l'utilisateur relâche une touche
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      movementDirection.y = 0;
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      movementDirection.x = 0;
    }

    // Si plus aucun mouvement n'est en cours, arrêter l'animation
    if (movementDirection.x === 0 && movementDirection.y === 0) {
      isMoving = false;
    }
  }
}

// Déplacement continu avec requestAnimationFrame
function movePlayerContinuously(player: Player) {
  // Mise à jour continue de la position
  function updatePosition() {
    if (!isMoving) return; // Si le joueur n'est plus en mouvement, arrêter la mise à jour

    player.position.x += movementDirection.x;
    player.position.y += movementDirection.y;

    // Mise à jour de la position sur le serveur
    stompClient.send("/app/move", {}, JSON.stringify(player));

    // Rafraîchir l'animation
    requestAnimationFrame(updatePosition);
  }

  // Lancer l'animation de mise à jour de la position
  updatePosition();
}

// Nettoyage de l'écouteur d'événements avant le démontage du composant
onBeforeUnmount(() => {
  window.removeEventListener('keydown', movePlayer);
  window.removeEventListener('keyup', stopMovement); // Nettoyer l'écouteur d'événements 'keyup'
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
</style>
