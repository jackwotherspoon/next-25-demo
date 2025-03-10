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

import vertexai
from langchain_core.output_parsers import JsonOutputParser
from vertexai.preview import reasoning_engines

from .models import AgentResponse

# initialize Vertex AI in current project
vertexai.init()

# create template for agent system instructions

SYSTEM_INSTRUCTION_TEMPLATE = """
You are playing a board game, which is very similar to the CodeNames board game.
You will be instructed to be either the one guessing words based on a given hint, or the one creating the hint for others to guess the words.
If you are creating the hint, you will be given a selection of words you can create a hint for.
===
Hints can be given in the following format:

[number] [word]

Where [number] is the number of words your hint pertains to and [word] is the hint you give.
You are only allowed to provide 1 word as the [word].
===
If you are guessing based on a hint, you will be given a hint in the following format:

[number] [word]

You must output a python list of dict objects with [number] of objects. Each dict object
must have a "guess" and "reasoning" field. The "guess" field should contain
the word being guessed while the "reasoning" field should contain the reasoning
for the guess. Both fields must be strings and surrounded by double-quotes.
<EXAMPLE 1>

INPUT: The hint is: '2 superhero' The list of words available are as follows: ["UNDERTAKER","GROUND","FAN","BOND","LAP","WAKE","ROBIN","ORANGE","BRIDGE","GAS","STRIKE","ANGEL","LEPRECHAUN","MAPLE","HEAD","BRUSH","FLUTE","WIND","PAN","GREEN","MINE","SKYSCRAPER","ROBOT","OCTOPUS","NEEDLE"]
 
OUTPUT:
[
  {{"guess": "ROBIN", "reasoning": "Sidekick to batman."}},
  {{"guess": "GREEN", "reasoning": "Green could refer to the Green Lantern or Green Goblin from Spiderman."}}
]
</EXAMPLE 1>

<EXAMPLE 2>
INPUT: The hint is: '3 city' The list of words available are as follows: ["TRAIN","ORGAN","PAPER","CHOCOLATE","VET","HORSE","CARD","TRUNK","SCALE","NEW YORK","GREECE","HAM","TORONTO","BELT","SCHOOL","FLY","ROME","CROWN","PLASTIC","STRING","VAN","WALL","WHIP","TABLET","SPY"]
 
OUTPUT:
[
  {{"guess": "NEW YORK", "reasoning": "One of the largest cities in the USA, New York city."}},
  {{"guess": "ROME", "reasoning": "Rome is the capital city of Italy."}},
  {{"guess": "TORONTO", "reasoning": "Toronto is the largest city in Canada."}}
]
</EXAMPLE 2>
"""


def create_agent(
    model: str = "gemini-2.0-flash-lite",
    temperature: float = 0.8,
) -> reasoning_engines.LangchainAgent:
    # parse output as JSON using output parser
    # parser = JsonOutputParser(pydantic_object=AgentResponse)

    # create LangChain Agent using Agent Engine
    agent = reasoning_engines.LangchainAgent(
        model=model,
        tools=[],
        # output_parser=parser,
        agent_executor_kwargs={"return_intermediate_steps": False},
        system_instruction=SYSTEM_INSTRUCTION_TEMPLATE,
        model_kwargs={"temperature": temperature},
    )
    return agent
