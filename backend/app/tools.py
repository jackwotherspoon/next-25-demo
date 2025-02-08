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
import os

import requests
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

# load env vars
load_dotenv()


# TODO: use an async client like aiohttp
def thesaurus_tool(word: str) -> list[str]:
    """Tool to look for synonyms of a given word.

    Calls the Merriam-Webster thesaurus API to search for synonyms of a given
    word.

    Arg:
        word (str): The word to search within thesaurus for synonyms of.

    Returns:
        synonyms (list[str]): List of synonyms found for given word. Empty list
            will be returned if no synonyms exist or if given word is not in
            thesaurus.
    """
    api_key = os.getenv("MERRIAM_WEBSTER_API_KEY")
    if api_key:
        resp = requests.get(
            f"https://www.dictionaryapi.com/api/v3/references/thesaurus/json/{word}?key={api_key}"
        )
        if resp.status_code == 200:
            # check for direct synonyms of word (i.e. "dance", and not "sport and dance")
            for r in resp.json():
                if type(r) is dict:
                    meta = r.get("meta")
                    if meta.get("id") == word:
                        # flatten lists into single list
                        return [
                            item for sublist in meta.get("syns") for item in sublist
                        ]

        else:
            logger.info(
                f"Got {resp.status_code} response from 'www.dictionaryapi.com', returning empty list for 'thesaurus_tool'!"
            )
    else:
        logger.info(
            "MERRIAM_WEBSTER_API_KEY environment variable not found, returning empty list for 'thesaurus_tool'!"
        )
    # if api key is not present or no synonyms could be found, return empty list
    return list()
