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


def format_agent_output(output: str) -> str:
    """Format output of AI agent.

    Agent likes to format output as markdown string.

    It wraps the string with ```python``` or ```json```.

    Remove markdown wrapping from string
    """
    # remove potential markdown prefixes
    output = output.removeprefix("```python")
    output = output.removeprefix("```json")
    # remove trailing markdown tag
    output = output.removesuffix("```")
    return output
