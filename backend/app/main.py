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

from .agents import create_agent
from .cache import init_cache
from .database import init_db_pool
from .models import ExtendedHint, Game, Guess, Hint
from .tools import thesaurus_tool

# turn on logging
logging.basicConfig(format="%(asctime)s [%(levelname)s]: %(message)s")
logger = logging.getLogger(name="app")
logger.setLevel(logging.DEBUG)

# default cache expiry is 1 hour
CACHE_TIMEOUT_SECONDS = 3600

# supported LLM models
SUPPORTED_MODELS = [
    "gemini-1.5-pro",
    "gemini-1.5-flash",
    "gemini-2.0-flash-lite",
]

# global dictionary for storing agents
agents = {}

# template used for structuring hints to agent for it to guess
GUESS_TEMPLATE = "The hint is: {number} {clue}. The list of words available to guess are as follows: {words}. You can only guess words from this list, if a word is not in this list, it can not be guessed."


@asynccontextmanager
async def lifespan(app: FastAPI):
    global agents
    # setup Postgres connection pool
    connector, pool = await init_db_pool()
    app.state.pool: asyncpg.Pool = pool
    # setup Redis cache
    cache = init_cache()
    app.state.cache: redis.Redis = cache
    # setup LangChain agents with Agent Engine
    for model in SUPPORTED_MODELS:
        agent = create_agent(model=model)
        agents[model] = agent
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
    return game


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
        return updated_game
    else:
        raise HTTPException(status_code=404, detail="Game not found")


@app.get("/game/{game_id}")
async def get_game_by_id(request: Request, game_id: uuid.UUID):
    game_data = await request.app.state.cache.get(f"game:{game_id}")
    if game_data:
        game = Game.model_validate_json(game_data)
        logger.debug(f"Retrieved Game with ID, {game_id} from cache.")
        return game
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


@app.post("/game/{game_id}/guess")
async def new_guess(request: Request, game_id: uuid.UUID, hint: ExtendedHint):
    # get game from cache
    game_data = await request.app.state.cache.get(f"game:{game_id}")
    if game_data:
        game = Game.model_validate_json(game_data)
        logger.debug(f"Retrieved Game with ID, {game_id} from cache.")
        # save hint to game state
        game.hints.append(Hint(team=hint.team, clue=hint.clue, number=hint.number))
        logger.debug(
            f"[{hint.team} team]: Adding hint with clue '{hint.clue}' for {hint.number} to game state."
        )
        # if model passed is not supported, default to "gemini-2.0-flash-lite"
        if hint.model not in SUPPORTED_MODELS:
            logger.debug(
                f"[{hint.team} team]: Model {hint.model} is not supported, defaulting to agent with gemini-2.0-flash-lite model."
            )
            agent = agents["gemini-2.0-flash-lite"]
        else:
            # get agent from stored agents
            agent = agents[hint.model]
            logger.debug(f"[{hint.team} team]: Using agent with {hint.model} model.")

        formatted_guess = GUESS_TEMPLATE.format(
            number=hint.number, clue=hint.clue, words=game.get_unguessed_words()
        )
        logger.debug(formatted_guess)
        # have agent make guesses
        agent_response = agent.query(input=formatted_guess)
        # get agent response into list format
        guesses = eval(agent_response["output"])
        logger.debug(
            f"[{hint.team}]: Agent returned {guesses} for hint, '{hint.number} {hint.clue}'"
        )
        # list for response object
        guess_responses = []
        for guess in guesses:
            # validate that guessed word is in game board
            if guess.upper() not in game.words:
                logger.debug(
                    f"[{hint.team} team]: Unable to make guess, '{guess}' is not in game."
                )
                continue

            logger.debug(f"[{hint.team} team]: Agent is guessing the word, '{guess}'.")

            # save guess to game state and update tile guessed
            correct, color = game.guess_tile(Guess(team=hint.team, word=guess))
            guess_responses.append({"word": guess, "correct": correct, "color": color})
            if not correct:
                logger.debug(
                    f"[{hint.team} team]: Incorrect guess! The '{guess}' tile is a {color} tile."
                )
                # if guess is incorect then turn is over
                break
            logger.debug(
                f"[{hint.team} team]: Correct guess! The '{guess}' tile is a {color} tile."
            )

        # update game in Redis cache
        await request.app.state.cache.set(
            f"game:{game_id}", game.model_dump_json(), ex=CACHE_TIMEOUT_SECONDS
        )
        return {"guesses": guess_responses}

    else:
        raise HTTPException(status_code=404, detail="Game not found")


@app.get("/thesaurus")
async def get_synonyms(word: str):
    return thesaurus_tool(word)
