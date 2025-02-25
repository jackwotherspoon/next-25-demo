# Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import logging
import uuid
from contextlib import asynccontextmanager

import asyncpg
import redis.asyncio as redis
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

from .cache import init_cache
from .database import init_db_pool
from .models import Game
from .tools import thesaurus_tool

# turn on logging
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# default cache expiry is 1 hour
CACHE_TIMEOUT_SECONDS = 3600


@asynccontextmanager
async def lifespan(app: FastAPI):
    # setup Postgres connection pool
    connector, pool = await init_db_pool()
    app.state.pool: asyncpg.Pool = pool
    # setup Redis cache
    cache = init_cache()
    app.state.cache: redis.Redis = cache
    yield
    # gracefully close Redis client
    await cache.close()
    # gracefully close pool and connector on app close
    await pool.close()
    await connector.close_async()


app = FastAPI(lifespan=lifespan)

origins = [
    "https://storied-gelato-660ed7.netlify.app",
    "https://frontend-service-670180168258.us-central1.run.app",
    "http://localhost",
    "http://localhost:8080",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"message": "Hello World"}


@app.post("/game")
async def new_game(request: Request, theme: str = "regular"):
    game = await Game.create(request.app.state.pool, theme)
    # add game to Redis cache
    await request.app.state.cache.set(
        f"game:{game.id}", game.model_dump_json(), ex=CACHE_TIMEOUT_SECONDS
    )
    logger.debug(f"Caching game with ID, {game.id}")
    return {"game_id": game.id, "words": game.words, "tiles": game.tiles}


@app.patch("/game/{game_id}")
async def update_game(request: Request, game_id: uuid.UUID, game: Game):
    game_data = await request.app.state.cache.get(f"game:{game_id}")
    if game_data:
        stored_game = Game.model_validate_json(game_data)
        logger.debug(f"Retrieved Game with ID, {game_id} from cache.")
        update_data = game.dict(exclude_unset=True)
        updated_game = stored_game.copy(update=update_data)
        # update game in Redis cache
        await request.app.state.cache.set(
            f"game:{game_id}", updated_game.model_dump_json(), ex=CACHE_TIMEOUT_SECONDS
        )
        logger.debug(f"Cache updated for game with ID, {game_id}")
        return {
            "game_id": updated_game.id,
            "words": updated_game.words,
            "tiles": updated_game.tiles,
        }
    else:
        raise HTTPException(status_code=404, detail="Game not found")


@app.get("/game/{game_id}")
async def get_game_by_id(request: Request, game_id: uuid.UUID):
    game_data = await request.app.state.cache.get(f"game:{game_id}")
    if game_data:
        game = Game.model_validate_json(game_data)
        logger.debug(f"Retrieved Game with ID, {game_id} from cache.")
        return {"game_id": game.id, "words": game.words, "tiles": game.tiles}
    else:
        raise HTTPException(status_code=404, detail="Game not found")


@app.delete("/game/{game_id}")
async def delete_game(request: Request, game_id: uuid.UUID):
    # check that game is in cache
    game_data = await request.app.state.cache.get(f"game:{game_id}")
    if game_data:
        # delete game from cache
        await request.app.state.cache.delete(f"game:{game_id}")
        logger.debug(f"Deleted Game with ID, {game_id} from cache.")
        return {"detail": "Successfully deleted Game."}
    else:
        raise HTTPException(status_code=404, detail="Game not found")


@app.get("/thesaurus")
async def get_synonyms(word: str):
    return thesaurus_tool(word)
