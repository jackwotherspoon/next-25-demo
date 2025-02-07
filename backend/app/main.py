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

from contextlib import asynccontextmanager

import asyncpg
from fastapi import FastAPI, Request

from .database import init_db_pool


@asynccontextmanager
async def lifespan(app: FastAPI):
    connector, pool = await init_db_pool()
    app.state.pool: asyncpg.Pool = pool
    yield
    # gracefully close pool and connector on app close
    await pool.close()
    await connector.close_async()


app = FastAPI(lifespan=lifespan)


@app.get("/")
async def root():
    return {"message": "Hello World"}


@app.get("/time")
async def get_time(request: Request):
    async with request.app.state.pool.acquire() as conn:
        time = await conn.fetchrow("SELECT NOW()")
    return str(time[0])
