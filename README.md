# :game_die: :robot: Secret Agents (Next 2025)

Team up with an AI agent to compete at this popular board game! Discover how
Vertex AI, Memorystore and Cloud SQL with different Gemini models and tools can
ultimately lead to victory!

![Secret Agents Board Game](docs/game.png)

## Backend

```sh
cd backend
```

To build the backend container:

```sh
gcloud builds submit --region=us-central1 --tag us-central1-docker.pkg.dev/data-connect-demo7/backend-image/backend:latest
```

To deploy the Cloud Run service:

```sh
gcloud run deploy backend-service \
    --image us-central1-docker.pkg.dev/data-connect-demo7/backend-image/backend:latest \
    --service-account backend-sa \
    --update-secrets INSTANCE_CONNECTION_NAME=INSTANCE_CONNECTION_NAME:latest,DB_USER=DB_USER:latest,DB_PASSWORD=DB_PASSWORD:latest,DB_NAME=DB_NAME:latest,REDISHOST=REDISHOST:latest,REDISPORT=REDISPORT:latest,MERRIAM_WEBSTER_API_KEY=MERRIAM_WEBSTER_API_KEY:latest \
    --network=default \
    --subnet=default \
    --vpc-egress=private-ranges-only \
    --allow-unauthenticated
```

### Generating a new Game

To generate a new game make a POST request to the `/game` endpoint.

It will return a JSON object for a new game board:

```json
{
  "game_id": "f05fe8bd-edf3-4086-82e3-e4d6512a0cde",
  "words": [
    "HOLE",
    "LIFE",
    "WATER",
    "QUEEN",
    "DINOSAUR",
    "TRUNK",
    "DEATH",
    "TUBE",
    "LAP",
    "TOOTH",
    "SHIP",
    "JET",
    "SPRING",
    "POISON",
    "PIRATE",
    "TURKEY",
    "DISEASE",
    "ANTARCTICA",
    "STRIKE",
    "HORN",
    "TRAIN",
    "PLATE",
    "NUT",
    "RAY",
    "SLIP"
  ],
  "tiles": {
    "HOLE": {
      "id": "4525603e-65c0-4d21-ade1-39191ca3798f",
      "word": "HOLE",
      "color": "orange",
      "guessed": false
    },
    "LIFE": {
      "id": "4c70d3e9-c25c-40bd-b7f7-86f2f5884db8",
      "word": "LIFE",
      "color": "orange",
      "guessed": false
    },
    "WATER": {
      "id": "c8a07c41-4d31-414c-b6f8-b2179475f0bf",
      "word": "WATER",
      "color": "orange",
      "guessed": false
    },
    "QUEEN": {
      "id": "93284512-d7f6-40db-a6ca-470e4c083a99",
      "word": "QUEEN",
      "color": "orange",
      "guessed": false
    },
    "DINOSAUR": {
      "id": "444dfcb4-d53f-4126-826b-2f39c1cb1d3d",
      "word": "DINOSAUR",
      "color": "orange",
      "guessed": false
    },
    "TRUNK": {
      "id": "30d56731-2d8a-4991-8007-d3b696d5e8cf",
      "word": "TRUNK",
      "color": "orange",
      "guessed": false
    },
    "DEATH": {
      "id": "b0b3fdfc-3618-4e6a-a5ee-67c36294c094",
      "word": "DEATH",
      "color": "orange",
      "guessed": false
    },
    "TUBE": {
      "id": "297c297d-2b9c-4e52-ac6d-c95e54981580",
      "word": "TUBE",
      "color": "orange",
      "guessed": false
    },
    "LAP": {
      "id": "6f79b941-a030-4538-b103-c4d1fd6bdc1f",
      "word": "LAP",
      "color": "orange",
      "guessed": false
    },
    "TOOTH": {
      "id": "aa3ef739-6376-4789-b36e-43d0487ae7e6",
      "word": "TOOTH",
      "color": "green",
      "guessed": false
    },
    "SHIP": {
      "id": "08f119b4-0600-4dd0-9e65-ecc2bca241a0",
      "word": "SHIP",
      "color": "green",
      "guessed": false
    },
    "JET": {
      "id": "781dfdd0-a55d-42a3-ac96-7323e5ec2b2a",
      "word": "JET",
      "color": "green",
      "guessed": false
    },
    "SPRING": {
      "id": "1fdd7366-3cbf-4022-aac6-9e1e15988ac2",
      "word": "SPRING",
      "color": "green",
      "guessed": false
    },
    "POISON": {
      "id": "9d0253cc-46ee-413d-843c-30fd5fdcb89f",
      "word": "POISON",
      "color": "green",
      "guessed": false
    },
    "PIRATE": {
      "id": "e8c871a7-f5d9-4e90-8e64-5ad34575a0c9",
      "word": "PIRATE",
      "color": "green",
      "guessed": false
    },
    "TURKEY": {
      "id": "53e5915e-ac66-4d4a-9f89-ce5d33d74d0f",
      "word": "TURKEY",
      "color": "green",
      "guessed": false
    },
    "DISEASE": {
      "id": "b318046e-b671-48a2-9c11-619005ebe5b4",
      "word": "DISEASE",
      "color": "green",
      "guessed": false
    },
    "ANTARCTICA": {
      "id": "37288a7a-6b0d-4556-9442-caaad9f1fdfa",
      "word": "ANTARCTICA",
      "color": "beige",
      "guessed": false
    },
    "STRIKE": {
      "id": "cd420938-bf71-4e13-903c-830a22ef07d2",
      "word": "STRIKE",
      "color": "beige",
      "guessed": false
    },
    "HORN": {
      "id": "cf47bad4-233d-4d94-91fd-13a57ae62849",
      "word": "HORN",
      "color": "beige",
      "guessed": false
    },
    "TRAIN": {
      "id": "21e77c79-1bb5-46a6-9398-f8ad289232b2",
      "word": "TRAIN",
      "color": "beige",
      "guessed": false
    },
    "PLATE": {
      "id": "61d4eb46-99f3-49ec-a4cb-67524c195fd9",
      "word": "PLATE",
      "color": "beige",
      "guessed": false
    },
    "NUT": {
      "id": "99b8f82f-72ae-41e2-aa30-41f6d4209d5d",
      "word": "NUT",
      "color": "beige",
      "guessed": false
    },
    "RAY": {
      "id": "85e86858-1bb5-45c5-995e-d3fcb7f7d8a7",
      "word": "RAY",
      "color": "beige",
      "guessed": false
    },
    "SLIP": {
      "id": "5a6f8048-466e-4ea4-b8cb-e8ef8bbeb0d8",
      "word": "SLIP",
      "color": "red",
      "guessed": false
    }
  }
}
```
