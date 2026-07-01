from copy import deepcopy
from types import SimpleNamespace


class AsyncCursor:
    def __init__(self, docs):
        self.docs = list(docs)

    def sort(self, field, order=1):
        reverse = order == -1
        self.docs.sort(key=lambda doc: doc.get(field) or "", reverse=reverse)
        return self

    def skip(self, count):
        self.docs = self.docs[count:]
        return self

    def limit(self, count):
        self.docs = self.docs[:count]
        return self

    async def to_list(self, length=None):
        return self.docs if length is None else self.docs[:length]

    def __aiter__(self):
        self._index = 0
        return self

    async def __anext__(self):
        if self._index >= len(self.docs):
            raise StopAsyncIteration
        value = self.docs[self._index]
        self._index += 1
        return value


class FakeCollection:
    def __init__(self, docs=None):
        self.docs = [deepcopy(doc) for doc in (docs or [])]
        self.inserted = []

    def _matches(self, doc, query):
        for key, value in (query or {}).items():
            if key == "$or":
                if not any(self._matches(doc, item) for item in value):
                    return False
                continue
            if key == "$and":
                if not all(self._matches(doc, item) for item in value):
                    return False
                continue

            actual = doc.get(key)
            if isinstance(value, dict):
                if "$ne" in value and actual == value["$ne"]:
                    return False
                if "$nin" in value and actual in value["$nin"]:
                    return False
                if "$in" in value and actual not in value["$in"]:
                    return False
                if "$gte" in value and actual < value["$gte"]:
                    return False
                if "$gt" in value and actual <= value["$gt"]:
                    return False
                if "$lte" in value and actual > value["$lte"]:
                    return False
                if "$lt" in value and actual >= value["$lt"]:
                    return False
                if "$regex" in value:
                    import re

                    flags = re.IGNORECASE if value.get("$options") == "i" else 0
                    if not re.search(value["$regex"], str(actual or ""), flags):
                        return False
            elif isinstance(actual, list):
                if value not in actual:
                    return False
            elif actual != value:
                return False
        return True

    async def find_one(self, query):
        return next((doc for doc in self.docs if self._matches(doc, query)), None)

    def find(self, query=None, *args, **kwargs):
        return AsyncCursor([doc for doc in self.docs if self._matches(doc, query or {})])

    async def insert_one(self, doc):
        stored = deepcopy(doc)
        stored.setdefault("_id", f"id-{len(self.docs) + 1}")
        self.docs.append(stored)
        self.inserted.append(stored)
        return SimpleNamespace(inserted_id=stored["_id"])

    async def update_one(self, query, update, upsert=False):
        doc = await self.find_one(query)
        if doc and "$set" in update:
            doc.update(update["$set"])
        elif upsert and "$set" in update:
            doc = deepcopy(update["$set"])
            self.docs.append(doc)
            return SimpleNamespace(modified_count=0, upserted_id=doc.get("_id"))
        return SimpleNamespace(modified_count=1 if doc else 0)

    async def update_many(self, query, update):
        modified = 0
        for doc in self.docs:
            if self._matches(doc, query):
                if "$set" in update:
                    doc.update(update["$set"])
                modified += 1
        return SimpleNamespace(modified_count=modified)

    async def delete_one(self, query):
        before = len(self.docs)
        self.docs = [doc for doc in self.docs if not self._matches(doc, query)]
        return SimpleNamespace(deleted_count=before - len(self.docs))

    async def delete_many(self, query):
        before = len(self.docs)
        self.docs = [doc for doc in self.docs if not self._matches(doc, query or {})]
        return SimpleNamespace(deleted_count=before - len(self.docs))

    async def count_documents(self, query):
        return len([doc for doc in self.docs if self._matches(doc, query)])
