import pytest
from helper.browser_helper import BrowserHelper

@pytest.fixture(scope="session")
def browser_session():
    """Session-scoped browser fixture"""
    browser_helper = BrowserHelper()
    yield browser_helper
    # Cleanup handled by individual tests

@pytest.fixture
def page_context(browser_session):
    """Page context for each test"""
    page = browser_session.launch_browser(headless=False)
    yield browser_session, page
    browser_session.close_browser()

def pytest_configure(config):
    """Configure pytest"""
    config.addinivalue_line("markers", "smoke: mark test as smoke test")
    config.addinivalue_line("markers", "regression: mark test as regression test")
    config.addinivalue_line("markers", "login: mark test as login related")
    config.addinivalue_line("markers", "forms: mark test as forms related")