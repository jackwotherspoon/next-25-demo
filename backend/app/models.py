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


class Tile:
    """Class for individual game tile."""

    id: uuid.UUID  # tile id
    game_id: uuid.UUID  # game id for game tile belongs to
    word: str  # word on the tile
    color: str  # color of the tile
    guessed: bool  # True if tile has been guessed, False otherwise


class Game:
    """Class for game board."""

    id: uuid.UUID  # game id
    words: list[str]  # words for game board
    word_mappings: dict[str, Tile]  # word --> tile info
