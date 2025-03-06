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

import uuid

import asyncpg
from pydantic import BaseModel


class Hint(BaseModel):
    """Model for game hint."""

    team: str  # team giving the hint
    clue: str  # the word given as the clue
    number: int  # the number of tiles the hint pertains to


class Guess(BaseModel):
    """Model for game guess."""

    team: str  # the team to make the guess for
    word: str  # word being guessed


class Tile(BaseModel):
    """Model for individual game tile."""

    id: uuid.UUID = uuid.uuid4()  # tile id
    guessed: bool = False  # True if tile has been guessed, False otherwise
    word: str  # word on the tile
    color: str  # color of the tile


def generate_tiles(words: list[str]) -> dict[str, Tile]:
    """Generate tiles for game board.

    Assign each word an ID, a color, and set guessed to False.
    """
    tiles = dict()
    # verify 25 words were passed
    if len(words) != 25:
        raise ValueError(f"Expected 'words' to have a length of 25, got {len(words)}!")

    # 9 words for orange team
    orange = words[:9]
    # generate tiles for orange team
    for word in orange:
        tiles[word] = Tile(word=word, color="orange")

    # 8 words for green team
    green = words[9:17]
    # generate tiles for green team
    for word in green:
        tiles[word] = Tile(word=word, color="green")

    # 7 neutral words (beige)
    beige = words[17:24]
    # generate neutral tiles
    for word in beige:
        tiles[word] = Tile(word=word, color="beige")

    # 1 "game ending" word (red)
    red = words[-1]
    # generate single "game ending" tile
    tiles[red] = Tile(word=red, color="red")

    return tiles


class Game(BaseModel):
    """Model for game board."""

    id: uuid.UUID = uuid.uuid4()  # game id
    words: list[str] = []  # words for game board
    tiles: dict[str, Tile] = {}  # word --> tile info
    hints: list[Hint] = []  # list of game hints given
    guesses: list[Guess] = []  # list of guesses made

    @classmethod
    async def create(cls, pool: asyncpg.Pool, theme: str):
        self = cls()
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                f'SELECT "word" FROM "{theme}" ORDER BY RANDOM() LIMIT 25;'
            )
            self.words = [row["word"] for row in rows]
        self.tiles = generate_tiles(self.words)
        return self

    def guess_tile(self, guess: Guess) -> tuple[bool, str]:
        """Guess a tile from game board.

        Args:
            guess (Guess): The guess, contains team making guess and word being
                guessed.

        Returns:
            tuple[bool, str]: Tuple with boolean for if team guessed correctly
                and string for color of tile guessed. (to know if death tile was
                guessed)
        """
        # save guess to game state
        self.guesses.append(guess)
        # update guessed tile
        tile = self.tiles[guess.word.upper()]
        tile.guessed = True
        # check if team guessing was correct
        correct = True if tile.color == guess.team else False
        return correct, tile.color


class Agent(BaseModel):
    model: str
    prompt: str
    temperature: float
