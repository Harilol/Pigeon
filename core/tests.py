import socket
from unittest.mock import patch

from django.core.cache import cache
from django.test import RequestFactory, TestCase, override_settings

from .views import (
    QueryValidationError,
    RequestValidationError,
    _acquire_active_request,
    _connect_database,
    _database_parameters,
    _provider_base_url,
    _release_active_request,
    _resolve_database_address,
    _validate_select,
)


class QueryValidationTests(TestCase):
    def test_accepts_single_select(self):
        self.assertEqual(_validate_select("SELECT 1;"), "SELECT 1")

    def test_rejects_non_select_and_multiple_statements(self):
        for sql in (
            "DELETE FROM users",
            "SELECT 1; SELECT 2",
            "SELECT 1 INTO new_table",
            "WITH removed AS (DELETE FROM users RETURNING *) SELECT * FROM removed",
            "SELECT pg_read_file('/etc/passwd')",
            "SELECT nextval('user_ids')",
        ):
            with self.subTest(sql=sql), self.assertRaises(QueryValidationError):
                _validate_select(sql)

    def test_rejects_invalid_or_oversized_sql(self):
        with self.assertRaises(QueryValidationError):
            _validate_select("SELECT * FROM")
        with self.assertRaises(QueryValidationError):
            _validate_select("SELECT " + ("1 " * 7_000))


class DatabaseTargetTests(TestCase):
    def test_database_password_whitespace_is_preserved(self):
        request = RequestFactory().post(
            "/",
            {
                "db_host": "database.example",
                "db_user": "reporting",
                "db_pass": " secret ",
                "db_name": "analytics",
                "db_port": "5432",
            },
        )

        self.assertEqual(_database_parameters(request)["password"], " secret ")

    @override_settings(
        ALLOW_PRIVATE_DATABASE_HOSTS=False,
        DATABASE_SSLMODE="require",
    )
    @patch("core.views._resolve_database_address", return_value="8.8.8.8")
    @patch("core.views.psycopg2.connect")
    def test_connection_is_pinned_and_read_only(
        self, connect, resolve_database_address
    ):
        parameters = {
            "host": "database.example",
            "user": "reporting",
            "password": "secret",
            "dbname": "analytics",
            "port": 5432,
        }

        _connect_database(parameters)

        resolve_database_address.assert_called_once_with("database.example", 5432)
        connect.assert_called_once_with(
            **parameters,
            hostaddr="8.8.8.8",
            connect_timeout=5,
            sslmode="require",
            application_name="pigeon",
            options="-c statement_timeout=5000 -c lock_timeout=1500",
        )
        connect.return_value.set_session.assert_called_once_with(readonly=True)

    @override_settings(ALLOW_PRIVATE_DATABASE_HOSTS=False)
    @patch("core.views.socket.getaddrinfo")
    def test_rejects_hostname_resolving_to_private_address(self, getaddrinfo):
        getaddrinfo.return_value = [
            (
                socket.AF_INET,
                socket.SOCK_STREAM,
                socket.IPPROTO_TCP,
                "",
                ("127.0.0.1", 5432),
            )
        ]
        with self.assertRaises(RequestValidationError):
            _resolve_database_address("database.example", 5432)

    @override_settings(ALLOW_PRIVATE_DATABASE_HOSTS=False)
    @patch("core.views.socket.getaddrinfo")
    def test_pins_hostname_to_resolved_public_address(self, getaddrinfo):
        getaddrinfo.return_value = [
            (
                socket.AF_INET,
                socket.SOCK_STREAM,
                socket.IPPROTO_TCP,
                "",
                ("8.8.8.8", 5432),
            )
        ]
        self.assertEqual(
            _resolve_database_address("database.example", 5432),
            "8.8.8.8",
        )

    @override_settings(ALLOW_PRIVATE_DATABASE_HOSTS=False)
    def test_rejects_private_ip_literal(self):
        with self.assertRaises(RequestValidationError):
            _resolve_database_address("127.0.0.1", 5432)


class ProviderValidationTests(TestCase):
    def test_provider_uses_backend_controlled_https_url(self):
        self.assertEqual(
            _provider_base_url("openai"),
            "https://api.openai.com/v1",
        )

    def test_rejects_unknown_provider(self):
        with self.assertRaises(RequestValidationError):
            _provider_base_url("https://attacker.example")


class AnonymousEndpointTests(TestCase):
    def setUp(self):
        cache.clear()

    @override_settings(SECURE_SSL_REDIRECT=False, ASK_REQUESTS_PER_MINUTE=2)
    @patch("core.views.OpenAI")
    def test_api_key_is_required_and_no_server_key_fallback_is_used(self, openai):
        with patch.dict("os.environ", {"GEMINI_API_KEY": "server-owned-key"}):
            response = self.client.post(
                "/api/ask/",
                {"provider": "openai", "model": "gpt-4o-mini", "q": "hello"},
                secure=True,
            )

        self.assertEqual(response.status_code, 400)
        self.assertIn("api key", response.json()["error"].lower())
        openai.assert_not_called()

    @override_settings(SECURE_SSL_REDIRECT=False, ASK_REQUESTS_PER_MINUTE=1)
    def test_chat_endpoint_throttles_repeated_requests(self):
        payload = {"provider": "openai"}
        first_response = self.client.post("/api/ask/", payload, secure=True)
        second_response = self.client.post("/api/ask/", payload, secure=True)

        self.assertEqual(first_response.status_code, 400)
        self.assertEqual(second_response.status_code, 429)
        self.assertEqual(second_response["Retry-After"], "60")

    @override_settings(SECURE_SSL_REDIRECT=False)
    def test_endpoint_rejects_non_post_methods(self):
        response = self.client.get("/api/connect/", secure=True)

        self.assertEqual(response.status_code, 405)
        self.assertEqual(response["Allow"], "POST")

    def test_only_one_active_request_per_client_is_allowed(self):
        request = RequestFactory().post("/", REMOTE_ADDR="192.0.2.10")

        first_lock = _acquire_active_request(request, "ask")
        second_lock = _acquire_active_request(request, "ask")
        self.assertIsNotNone(first_lock)
        self.assertIsNone(second_lock)

        _release_active_request(first_lock)
        final_lock = _acquire_active_request(request, "ask")
        self.assertIsNotNone(final_lock)
        _release_active_request(final_lock)
