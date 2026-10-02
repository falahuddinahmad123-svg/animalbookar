"use strict";
// Target indexes follow compiler order.
const BOOK_CONFIG = {
  "target": "./assets/markers/animals.mind",
  "tracking": {
    "filterMinCF": 0.001,
    "filterBeta": 100,
    "warmupTolerance": 2,
    "missTolerance": 3,
    "smoothingRate": 28
  },
  "animals": [
    {
      "id": "elephant",
      "name": "Gajah",
      "targetIndex": 0,
      "marker": "./assets/markers/elephant.png",
      "model": "./assets/models/elephant3d.glb?v=2",
      "sound": "./assets/sounds/elephant.mp3",
      "position": [
        0,
        -0.25,
        0.03
      ],
      "height": 0.6,
      "faceCamera": true,
      "rotation": [
        0,
        0,
        0
      ],
      "color": 9681374,
      "labelName": "Elephant / Gajah",
      "subtitleEn": "The Gentle Giant",
      "subtitleId": "Raksasa yang Lembut"
    },
    {
      "id": "frog",
      "name": "Katak",
      "targetIndex": 1,
      "marker": "./assets/markers/frog.png",
      "model": "./assets/models/frog3d.glb?v=2",
      "sound": "./assets/sounds/frog.mp3",
      "position": [
        0,
        -0.25,
        0.03
      ],
      "height": 0.6,
      "faceCamera": true,
      "rotation": [
        0,
        0,
        0
      ],
      "color": 9681374,
      "labelName": "Frog / Katak",
      "subtitleEn": "The Bouncy Jumper",
      "subtitleId": "Si Pelompat"
    },
    {
      "id": "kitten",
      "name": "Anak kucing",
      "targetIndex": 2,
      "marker": "./assets/markers/kitten.png",
      "model": "./assets/models/kitten3d.glb?v=2",
      "sound": "./assets/sounds/kitten.mp3",
      "position": [
        0,
        -0.25,
        0.03
      ],
      "height": 0.6,
      "faceCamera": true,
      "rotation": [
        0,
        0,
        0
      ],
      "color": 9681374,
      "labelName": "Cat / Kucing",
      "subtitleEn": "The Curious Companion",
      "subtitleId": "Teman yang Penasaran"
    },
    {
      "id": "lion",
      "name": "Singa",
      "targetIndex": 3,
      "marker": "./assets/markers/lion.png",
      "model": "./assets/models/lion3d.glb?v=2",
      "sound": "./assets/sounds/lion.mp3",
      "position": [
        0,
        -0.25,
        0.03
      ],
      "height": 0.6,
      "faceCamera": true,
      "rotation": [
        0,
        0,
        0
      ],
      "color": 9681374,
      "labelName": "Lion / Singa",
      "subtitleEn": "The King of the Jungle",
      "subtitleId": "Raja Rimba"
    },
    {
      "id": "monkey",
      "name": "Monyet",
      "targetIndex": 4,
      "marker": "./assets/markers/monkey.png",
      "model": "./assets/models/monkey3d.glb?v=2",
      "sound": "./assets/sounds/monkey.mp3",
      "position": [
        0,
        -0.25,
        0.03
      ],
      "height": 0.6,
      "faceCamera": true,
      "rotation": [
        0,
        0,
        0
      ],
      "color": 9681374,
      "labelName": "Monkey / Monyet",
      "subtitleEn": "The Playful One",
      "subtitleId": "Si Suka Bermain"
    },
    {
      "id": "rooster",
      "name": "Ayam jantan",
      "targetIndex": 5,
      "marker": "./assets/markers/rooster.png",
      "model": "./assets/models/rooster3d.glb?v=2",
      "sound": "./assets/sounds/rooster.mp3",
      "position": [
        0,
        -0.25,
        0.03
      ],
      "height": 0.6,
      "faceCamera": true,
      "rotation": [
        0,
        0,
        0
      ],
      "color": 9681374,
      "labelName": "Rooster / Ayam Jantan",
      "subtitleEn": "The Early Riser",
      "subtitleId": "Si Bangun Pagi"
    },
    {
      "id": "tiger",
      "name": "Harimau",
      "targetIndex": 6,
      "marker": "./assets/markers/tiger.png",
      "model": "./assets/models/tiger3d.glb?v=2",
      "sound": "./assets/sounds/tiger.mp3",
      "position": [
        0,
        -0.25,
        0.03
      ],
      "height": 0.6,
      "faceCamera": true,
      "rotation": [
        0,
        0,
        0
      ],
      "color": 9681374,
      "labelName": "Tiger / Harimau",
      "subtitleEn": "The Striped Hunter",
      "subtitleId": "Pemburu Bergaris"
    },
    {
      "id": "wolf",
      "name": "Serigala",
      "targetIndex": 7,
      "marker": "./assets/markers/wolf.png",
      "model": "./assets/models/wolf3d.glb?v=2",
      "sound": "./assets/sounds/wolf.mp3",
      "position": [
        0,
        -0.25,
        0.03
      ],
      "height": 0.6,
      "faceCamera": true,
      "rotation": [
        0,
        0,
        0
      ],
      "color": 9681374,
      "labelName": "Wolf / Serigala",
      "subtitleEn": "The Wild Pack Animal",
      "subtitleId": "Hewan Kawanan Liar"
    }
  ]
};
