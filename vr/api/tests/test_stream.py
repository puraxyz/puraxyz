"""Tests for the SSE streaming verification endpoint and new Phase B endpoints."""




class TestStreamVerify:
    def test_emits_sse_events(self, client):
        resp = client.post(
            "/v1/verify/stream",
            json={
                "verifier_ids": ["vr/document.json.valid"],
                "steps": [
                    {
                        "step_index": 0,
                        "completions": ['{"a": 1}'],
                        "ground_truth": {},
                        "is_terminal": True,
                    }
                ],
            },
            headers={"Accept": "text/event-stream"},
        )
        assert resp.status_code == 200
        assert "text/event-stream" in resp.headers.get("content-type", "")
        body = resp.text
        assert "data:" in body

    def test_empty_steps(self, client):
        resp = client.post(
            "/v1/verify/stream",
            json={
                "verifier_ids": ["vr/document.json.valid"],
                "steps": [],
            },
        )
        assert resp.status_code == 200
        body = resp.text
        assert "done" in body

    def test_unknown_verifier(self, client):
        resp = client.post(
            "/v1/verify/stream",
            json={
                "verifier_ids": ["nonexistent.verifier.xyz"],
                "steps": [
                    {
                        "step_index": 0,
                        "completions": ["test"],
                        "ground_truth": {},
                    }
                ],
            },
        )
        assert resp.status_code == 422


class TestKeysEndpoint:
    def test_returns_keys_list(self, client):
        resp = client.get("/v1/keys")
        assert resp.status_code == 200
        data = resp.json()
        assert "keys" in data


class TestProofEndpoint:
    def test_not_found(self, client):
        resp = client.get("/v1/evidence/abc123/proof")
        assert resp.status_code == 404
