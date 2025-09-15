// Authentication and UI management
document.addEventListener('DOMContentLoaded', () => {
    updateNavUI();

    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }
});

function updateNavUI() {
    const navMenu = document.querySelector('.nav-menu');
    const user = getLoggedInUser();

    if (!navMenu) return;

    let navLinks = `
        <li class="nav-item"><a href="index.html" class="nav-link">Discover</a></li>
        <li class="nav-item"><a href="create.html" class="nav-link">Start Campaign</a></li>
    `;

    if (user && user.user_id) {
        navLinks += `
            <li class="nav-item"><a href="profile.html" class="nav-link">Profile</a></li>
            <li class="nav-item"><a href="#" id="logout-link" class="nav-button">Logout</a></li>
        `;
    } else {
        navLinks += `
            <li class="nav-item"><a href="login.html" class="nav-link">Login</a></li>
            <li class="nav-item"><a href="signup.html" class="nav-button">Sign Up</a></li>
        `;
    }
    navMenu.innerHTML = navLinks;

    // Add event listener for the logout link if it exists
    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', handleLogout);
    }
}


async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const messageDiv = document.getElementById('login-message');

    try {
        const data = await apiRequest('/api/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        if (data.user) {
            localStorage.setItem('loggedInUser', JSON.stringify(data.user));
            messageDiv.textContent = 'Login successful! Redirecting...';
            messageDiv.style.color = 'green';
            window.location.href = 'profile.html';
        } else {
            messageDiv.textContent = data.error || 'Login failed.';
            messageDiv.style.color = 'red';
        }
    } catch (error) {
        messageDiv.textContent = 'An error occurred during login.';
        messageDiv.style.color = 'red';
    }
}

async function handleSignup(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const first_name = document.getElementById('first_name').value;
    const last_name = document.getElementById('last_name').value;
    const password = document.getElementById('password').value;
    const messageDiv = document.getElementById('signup-message');

    try {
        const data = await apiRequest('/api/signup', {
            method: 'POST',
            body: JSON.stringify({ username, email, first_name, last_name, password })
        });
        if (data.success) {
            messageDiv.textContent = 'Signup successful! Please log in.';
            messageDiv.style.color = 'green';
            setTimeout(() => { window.location.href = 'login.html'; }, 1500);
        } else {
            messageDiv.textContent = data.error || 'Signup failed.';
            messageDiv.style.color = 'red';
        }
    } catch (error) {
        messageDiv.textContent = 'An error occurred during signup.';
        messageDiv.style.color = 'red';
    }
}

function handleLogout(e) {
    e.preventDefault();
    localStorage.removeItem('loggedInUser');
    updateNavUI(); // Re-render the nav bar
    window.location.href = 'index.html';
}

function getLoggedInUser() {
    try {
        return JSON.parse(localStorage.getItem('loggedInUser'));
    } catch (e) {
        return null;
    }
}