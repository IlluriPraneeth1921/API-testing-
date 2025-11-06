class LoginPage:
    def __init__(self, page, browser_helper=None):
        self.page = page
        self.browser_helper = browser_helper

        
        
        # Common login page selectors - update these based on your screenshot
        #self.username_field = "#signInFormUsername"
        #self.password_field = "#signInFormPassword"
        #self.username_field = "input[name='username']"
        #self.password_field = "input[name='password']"
        #self.login_button = "input[name='signInSubmitButton']"
        self.username_field = "input[id*='Username']"
        self.password_field = "input[id*='Password']"
        self.login_button = "input[name*='Submit']"
        self.error_message = ".error-message"
        
    def wait_for_login_form(self, timeout=15000):
        """Wait for login form to be ready - handle hidden elements"""
        print("Waiting for login form to load...")               
        
        # Wait for login action to complete
        print("Waiting for page to load after login...")
        self.page.wait_for_load_state('networkidle', timeout=15000)       
          
        print("Login form is ready")
        
    def enter_username(self, username):
        """Enter username in the username field"""
        print(f"Entering username: {username}")     
       
        self.page.locator(self.username_field).last.click(force=True)
        self.page.locator(self.username_field).last.fill(username,force=True)        
        self.page.wait_for_timeout(500)   # 0.5 second delay
        
    def enter_password(self, password):
        """Enter password in the password field"""
        print("Entering password")
   
        self.page.locator(self.password_field).last.click(force=True)
        self.page.locator(self.password_field).last.fill(password, force=True)
        self.page.wait_for_timeout(500)  # 0.5 second delay
        
    def click_login(self):
        """Click the login button using JavaScript"""
        print("Clicking login button")
      
        self.page.locator(self.login_button).last.click()
       
        self.page.wait_for_timeout(1000)  # 0.5 second delay
        
    def login(self, username, password, wait_time):
        """Complete login process with waits"""
       # self.wait_for_login_form()
        self.enter_username(username)
        self.enter_password(password)
        self.click_login()
        self.page.wait_for_timeout(wait_time)
        
      
        
    def get_error_message(self):
        """Get error message text if present"""
        if self.page.is_visible(self.error_message):
            return self.page.text_content(self.error_message)
        return None
        
    def is_login_successful(self):
        """Check if login was successful by checking URL or page elements"""
        # Update this logic based on your application
        print("self.page.is_visible(self.login_button) : "+str(self.page.is_visible(self.login_button)))
        return not self.page.is_visible(self.login_button)