"""Standalone τ²-bench mock server for integration testing.

A lightweight FastAPI application simulating airline and retail API endpoints
used by the τ²-bench verifier family. Can be run standalone or spun up as a
pytest fixture for integration tests.

Usage (standalone)::

    uvicorn mock_tau2.app:app --port 8080

Usage (pytest fixture)::

    from mock_tau2.app import create_fixture
    # The ``mock_tau2_app`` fixture is auto-registered via conftest.py
"""
