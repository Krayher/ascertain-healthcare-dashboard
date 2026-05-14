def test_health_returns_ok(simple_client) -> None:
    response = simple_client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
