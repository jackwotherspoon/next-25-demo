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

import asyncio
import os

import asyncpg
from dotenv import load_dotenv
from google.cloud.sql.connector import Connector

# load env vars
load_dotenv()


async def init_db_pool():
    # initialize Cloud SQL Python Connector
    connector = Connector(loop=asyncio.get_running_loop(), refresh_strategy="LAZY")

    # creation function to generate asyncpg connections as the 'connect' arg
    async def getconn(
        instance_connection_name, **kwargs
    ) -> tuple[Connector, asyncpg.Pool]:
        return await connector.connect_async(
            instance_connection_name,
            "asyncpg",
            user=os.environ["DB_USER"],
            password=os.environ["DB_PASSWORD"],
            db=os.environ["DB_NAME"],
            **kwargs,  # ... additional asyncpg args
        )

    # create connection pool
    pool = await asyncpg.create_pool(
        os.environ["INSTANCE_CONNECTION_NAME"], connect=getconn
    )

    return connector, pool
