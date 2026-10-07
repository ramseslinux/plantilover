const API_BASE = window.location.port === '8080'
  ? `${window.location.protocol}//${window.location.hostname}:3000`
  : '';

const loginForm = document.getElementById('loginForm');
const passwordInput = document.getElementById('password');
const togglePassword = document.getElementById('togglePassword');
const loginError = document.getElementById('loginError');
const submitButton = document.getElementById('submitLogin');

togglePassword.addEventListener('click', () => {
  const showPassword = passwordInput.type === 'password';
  passwordInput.type = showPassword ? 'text' : 'password';
  togglePassword.setAttribute('aria-label', showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña');
  togglePassword.title = showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña';
  togglePassword.querySelector('.material-symbols-outlined').textContent = showPassword
    ? 'visibility_off'
    : 'visibility';
});

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  loginError.textContent = '';

  if (!loginForm.reportValidity()) return;

  submitButton.disabled = true;
  submitButton.querySelector('.button-label').textContent = 'Verificando acceso...';

  try {
    const response = await fetch(`${API_BASE}/api/admin/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: document.getElementById('email').value.trim(),
        password: passwordInput.value,
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(response.status === 401
        ? 'Correo o contraseña incorrectos.'
        : result.error || 'No se pudo iniciar sesión.');
    }
    sessionStorage.setItem('plantiAdminEmail', result.user.email);
    window.location.assign('/admin/dashboard.html');
  } catch (error) {
    loginError.textContent = error.message || 'No se pudo conectar con el servidor.';
    passwordInput.focus();
  } finally {
    submitButton.disabled = false;
    submitButton.querySelector('.button-label').textContent = 'Entrar a operaciones';
  }
});