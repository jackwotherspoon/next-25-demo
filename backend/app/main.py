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
from typing import Any, Optional

import asyncpg
import firebase_admin
import redis.asyncio as redis
from fastapi import Depends, FastAPI, Header, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from firebase_admin import auth
from langchain_core.messages.ai import AIMessage

from .agents import create_agent
from .cache import init_cache
from .database import init_db_pool
from .models import AgentResponse, ExtendedHint, Game, Guess, Hint
from .tools import thesaurus_tool
from .utils import format_agent_output

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

# --- Firebase Admin SDK Initialization ---
try:
    logger.info("Initializing Firebase Admin SDK...")
    # Try using Application Default Credentials first (recommended for Cloud Run/GCP)
    firebase_admin.initialize_app()
    logger.info("Firebase Admin SDK initialized using Application Default Credentials.")
except Exception as e_adc:
    logger.error(
        f"Failed to initialize Firebase Admin with ADC: {e_adc}", exc_info=True
    )
    raise RuntimeError("Could not initialize Firebase Admin SDK.") from e_adc


# --- Authentication Dependency ---
async def get_current_user(
    authorization: Optional[str] = Header(None),
) -> dict[str, Any]:
    """
    Dependency function to verify Firebase ID token from Authorization header.
    Returns the decoded token payload (user information) upon successful verification.
    Raises HTTPException for authentication errors.
    """
    if authorization is None:
        logger.warning("Authorization header missing")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header is missing",
            headers={"WWW-Authenticate": "Bearer"},
        )

    parts = authorization.split()

    if len(parts) != 2 or parts[0].lower() != "bearer":
        logger.warning("Invalid Authorization header format")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Authorization header format. Must be 'Bearer <token>'",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = parts[1]
    try:
        # Verify the ID token using Firebase Admin SDK.
        decoded_token = auth.verify_id_token(token, check_revoked=False)
        logger.debug(f"Token verified successfully for UID: {decoded_token.get('uid')}")
        return decoded_token
    except auth.ExpiredIdTokenError:
        logger.warning("Expired ID token received.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token has expired. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except auth.RevokedIdTokenError:
        logger.warning("Revoked ID token received.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token has been revoked. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except auth.InvalidIdTokenError as e:
        logger.warning(f"Invalid ID token received: {e}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,  # 403 Forbidden - token exists but is invalid
            detail=f"Invalid authentication token: {e}",
            headers={"WWW-Authenticate": 'Bearer error="invalid_token"'},
        )
    except auth.CertificateFetchError as e:
        logger.error(f"Failed to fetch Firebase certificates: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error: Could not fetch verification certificates.",
        )
    except Exception as e:  # Catch any other unexpected errors during verification
        logger.error(
            f"An unexpected error occurred during token verification: {e}",
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during token verification.",
        )


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


app = FastAPI(title="Secret Agents Game API", lifespan=lifespan)

origins = [
    # "https://<YOUR_FRONTEND_SERVICE_URL>",
    "http://localhost",
    "http://localhost:8080",
    "http://localhost:5173",
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
    """Public root endpoint providing a welcome message."""
    return {"message": "Welcome to the Secret Agents API!", "status": "OK"}


# --- Protected Game Endpoints ---
# All subsequent endpoints will require authentication via the Depends(get_current_user)


@app.post("/game", response_model=Game)
async def new_game(
    request: Request,
    theme: str = "regular",
    current_user: dict[str, Any] = Depends(get_current_user),
):
    """Creates a new game session."""
    user_uid = current_user.get("uid")
    logger.debug(f"User {user_uid} creating new game with theme: {theme}")
    game = await Game.create(request.app.state.pool, theme)
    # add game to Redis cache
    await request.app.state.cache.set(
        f"game:{game.id}", game.model_dump_json(), ex=CACHE_TIMEOUT_SECONDS
    )
    logger.debug(f"Caching game with ID, {game.id}")
    return game


@app.patch("/game/{game_id}")
async def update_game(
    request: Request,
    game_id: uuid.UUID,
    game: Game,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    """Updates an existing game state."""
    user_uid = current_user.get("uid")
    logger.debug(f"User {user_uid} updating game {game_id}")
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
async def get_game_by_id(
    request: Request,
    game_id: uuid.UUID,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    """Retrieves a specific game state."""
    user_uid = current_user.get("uid")
    logger.debug(f"User {user_uid} retrieving game {game_id}")
    game_data = await request.app.state.cache.get(f"game:{game_id}")
    if game_data:
        game = Game.model_validate_json(game_data)
        logger.debug(f"Retrieved Game with ID, {game_id} from cache.")
        return game
    else:
        raise HTTPException(status_code=404, detail="Game not found")


@app.delete("/game/{game_id}")
async def delete_game(
    request: Request,
    game_id: uuid.UUID,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    """Deletes a game session."""
    user_uid = current_user.get("uid")
    logger.debug(f"User {user_uid} deleting game {game_id}")
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
async def new_guess(
    request: Request,
    game_id: uuid.UUID,
    hint: ExtendedHint,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    """Processes a hint and generates AI guesses."""
    user_uid = current_user.get("uid")
    logger.debug(f"User {user_uid} submitting hint for game {game_id}")
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
        # have agent make guesses
        agent_response = agent.query(input={"messages": [("user", formatted_guess)]})
        try:
            # get agent response into list format
            for message in agent_response["messages"]:
                if type(message) is AIMessage:
                    formatted_output = format_agent_output(message.content)
                    logger.debug(formatted_output)
                    guesses = AgentResponse(guesses=eval(formatted_output))
                    break
        except:
            raise HTTPException(
                status_code=500,
                detail="Agent did not return properly formatted response!",
            )
        logger.debug(
            f"[{hint.team}]: Agent returned {guesses} for hint, '{hint.number} {hint.clue}'"
        )
        # list for response object
        guess_responses = []
        for guess in guesses.guesses:
            # validate that guessed word is in game board
            if guess.guess.upper() not in game.words:
                logger.debug(
                    f"[{hint.team} team]: Unable to make guess, '{guess.guess}' is not in game."
                )
                continue

            logger.debug(
                f"[{hint.team} team]: Agent is guessing the word, '{guess.guess}' with reasoning of '{guess.reasoning}'."
            )

            # save guess to game state and update tile guessed
            correct, color = game.guess_tile(
                Guess(team=hint.team, word=guess.guess, reasoning=guess.reasoning)
            )
            guess_responses.append(
                {
                    "word": guess.guess,
                    "reasoning": guess.reasoning,
                    "correct": correct,
                    "color": color,
                }
            )
            if not correct:
                logger.debug(
                    f"[{hint.team} team]: Incorrect guess! The '{guess.guess}' tile is a {color} tile."
                )
                # if guess is incorect then turn is over
                break
            logger.debug(
                f"[{hint.team} team]: Correct guess! The '{guess.guess}' tile is a {color} tile."
            )

        # update game in Redis cache
        await request.app.state.cache.set(
            f"game:{game_id}", game.model_dump_json(), ex=CACHE_TIMEOUT_SECONDS
        )
        return {"guesses": guess_responses}

    else:
        raise HTTPException(status_code=404, detail="Game not found")


@app.get("/thesaurus")
async def get_synonyms(
    word: str, current_user: dict[str, Any] = Depends(get_current_user)
):
    return thesaurus_tool(word)
