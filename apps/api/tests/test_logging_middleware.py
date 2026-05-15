from __future__ import annotations

import logging
import re


def test_request_id_header_added(simple_client) -> None:
    r = simple_client.get("/health")
    assert r.status_code == 200
    rid = r.headers.get("x-request-id")
    assert rid and len(rid) >= 8


def test_request_id_honored_if_provided(simple_client) -> None:
    r = simple_client.get("/health", headers={"x-request-id": "test-rid-123"})
    assert r.headers["x-request-id"] == "test-rid-123"


def test_access_log_emitted(simple_client, caplog) -> None:
    with caplog.at_level(logging.INFO, logger="ascertain.access"):
        simple_client.get("/health")
    msgs = [r.message for r in caplog.records if r.name == "ascertain.access"]
    assert any(re.search(r"GET /health -> 200 in \d+\.\d+ms", m) for m in msgs)
