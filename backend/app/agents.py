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
from vertexai.preview import reasoning_engines

# initialize Vertex AI in current project
vertexai.init()

# create template for agent system instructions

SYSTEM_INSTRUCTION_TEMPLATE = """
{prompt}
===
Hints can be given in the following format:

[number] [word]

Where [number] is the number of words your hint pertains to and [word] is the hint you give.
You are only allowed to provide 1 word as the [word].
===
If you are guessing based on a hint, you will be given a hint in the following format:

[number] [word]

Where [number] is the number of words the hint pertains to and [word] is the hint you are given.
You can guess words based on the hint given. You should output a list with the words you would like to guess.
"""

DEFAULT_PROMPT = """
You are playing a board game, which is very similar to the CodeNames board game.
You will be instructed to be either the one guessing words based on a given hint, or the one creating the hint for others to guess the words.
If you are creating the hint, you will be given a selection of words you can create a hint for.
"""


def create_agent(
    model: str = "gemini-2.0-flash-lite",
    prompt: str = DEFAULT_PROMPT,
    temperature: float = 0.8,
) -> reasoning_engines.LangchainAgent:
    # create agent for
    agent = reasoning_engines.LangchainAgent(
        model=model,
        tools=[],
        agent_executor_kwargs={"return_intermediate_steps": False},
        system_instruction=SYSTEM_INSTRUCTION_TEMPLATE.format(prompt=prompt),
        model_kwargs={"temperature": temperature},
    )
    return agent
