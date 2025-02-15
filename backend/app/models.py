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


class Tile:
    """Class for individual game tile."""

    id: uuid.UUID  # tile id
    word: str  # word on the tile
    color: str  # color of the tile
    guessed: bool  # True if tile has been guessed, False otherwise

    def __init__(self, word: str, color: str):
        self.id: uuid.UUID = uuid.uuid4()
        self.word = word
        self.color = color
        self.guessed = False


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
        tiles[word] = Tile(word, "orange")

    # 8 words for green team
    green = words[9:17]
    # generate tiles for green team
    for word in green:
        tiles[word] = Tile(word, "green")

    # 7 neutral words (beige)
    beige = words[17:24]
    # generate neutral tiles
    for word in beige:
        tiles[word] = Tile(word, "beige")

    # 1 "game ending" word (red)
    red = words[-1]
    # generate single "game ending" tile
    tiles[red] = Tile(red, "red")

    return tiles


class Game:
    """Class for game board."""

    id: uuid.UUID  # game id
    words: list[str]  # words for game board
    tiles: dict[str, Tile]  # word --> tile info

    @classmethod
    async def create(cls, pool: asyncpg.Pool, theme: str):
        self = cls()
        self.id = uuid.uuid4()
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                f'SELECT "word" FROM "{theme}" ORDER BY RANDOM() LIMIT 25;'
            )
            self.words = [row["word"] for row in rows]
        self.tiles = generate_tiles(self.words)
        return self
