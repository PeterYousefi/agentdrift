"""Session-partitioned documents. SQLite locally; Azure Table Storage in cloud."""

import json
import os
import sqlite3
import threading
from hashlib import sha256
from pathlib import Path


def partition(token):
    return sha256(token.encode()).hexdigest()


class SQLiteStore:
    def __init__(self, path):
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        self.db = sqlite3.connect(path, check_same_thread=False)
        self.lock = threading.RLock()
        self.db.execute(
            "CREATE TABLE IF NOT EXISTS documents (session TEXT, key TEXT, value TEXT, PRIMARY KEY(session,key))"
        )
        self.db.commit()

    def get(self, session, key):
        with self.lock:
            row = self.db.execute(
                "SELECT value FROM documents WHERE session=? AND key=?", (session, key)
            ).fetchone()
            return json.loads(row[0]) if row else None

    def put(self, session, key, value):
        with self.lock:
            self.db.execute(
                "INSERT INTO documents VALUES (?,?,?) ON CONFLICT(session,key) DO UPDATE SET value=excluded.value",
                (session, key, json.dumps(value)),
            )
            self.db.commit()

    def list(self, session, prefix):
        with self.lock:
            rows = self.db.execute(
                "SELECT key,value FROM documents WHERE session=? ORDER BY key", (session,)
            ).fetchall()
            return [json.loads(value) for key, value in rows if key.startswith(prefix)]

    def delete_partition(self, session):
        with self.lock:
            self.db.execute("DELETE FROM documents WHERE session=?", (session,))
            self.db.commit()


class AzureTableStore:
    def __init__(self, endpoint):
        from azure.data.tables import TableServiceClient
        from azure.identity import DefaultAzureCredential

        self.client = TableServiceClient(endpoint, credential=DefaultAzureCredential()).get_table_client(
            "AgentDrift"
        )
        from azure.core.exceptions import ResourceExistsError
        try:
            self.client.create_table()
        except ResourceExistsError:
            pass

    def get(self, session, key):
        from azure.core.exceptions import ResourceNotFoundError

        try:
            return json.loads(self.client.get_entity(session, key)["document"])
        except ResourceNotFoundError:
            return None

    def put(self, session, key, value):
        self.client.upsert_entity({"PartitionKey": session, "RowKey": key, "document": json.dumps(value)})

    def list(self, session, prefix):
        rows = self.client.query_entities("PartitionKey eq @session", parameters={"session": session})
        return [json.loads(row["document"]) for row in rows if row["RowKey"].startswith(prefix)]

    def delete_partition(self, session):
        for row in self.client.query_entities("PartitionKey eq @session", parameters={"session": session}):
            self.client.delete_entity(session, row["RowKey"])


def create_store():
    endpoint = os.getenv("AZURE_TABLE_ENDPOINT")
    if endpoint:
        return AzureTableStore(endpoint)
    if os.getenv("ENVIRONMENT") == "production":
        raise RuntimeError("Production requires AZURE_TABLE_ENDPOINT; ephemeral SQLite is forbidden")
    return SQLiteStore(os.getenv("SQLITE_PATH", "data/agentdrift.sqlite"))
