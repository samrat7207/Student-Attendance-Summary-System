/* =========================================================
   login.js
   Login page logic: validation, fetch() of the JSON file,
   credential check, sessionStorage and redirect.
   ========================================================= */

// ---------- 1. Redirect if already logged in ----------
if (sessionStorage.getItem("loggedInUser")) {
  window.location.replace("attendance-dashboard.html");
}

// ---------- 2. Page elements ----------
const loginForm = document.getElementById("loginForm");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const loginError = document.getElementById("loginError");
const loginCard = document.getElementById("loginCard");
const togglePasswordBtn = document.getElementById("togglePassword");

// ---------- 3. Error helpers ----------

// Shows an error message safely (textContent, never innerHTML)
function showError(message) {
  loginError.textContent = message;
  loginError.classList.remove("d-none");
}

// Hides the error message and clears the red input borders
function clearError() {
  loginError.classList.add("d-none");
  usernameInput.classList.remove("is-invalid");
  passwordInput.classList.remove("is-invalid");
}

// Marks both inputs red and replays the shake animation on the card
function markInvalid() {
  usernameInput.classList.add("is-invalid");
  passwordInput.classList.add("is-invalid");
  loginCard.classList.remove("shake");
  void loginCard.offsetWidth; // forces reflow so the animation can restart
  loginCard.classList.add("shake");
}

// ---------- 4. Button loading state ----------

// Turns the spinner on or off inside the login button
function setLoading(isLoading) {
  loginBtn.disabled = isLoading;
  if (isLoading) {
    loginBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Checking...';
  } else {
    loginBtn.innerHTML = '<i class="bi bi-box-arrow-in-right me-1"></i> Login';
  }
}

// ---------- 5. Data + credential check ----------

// Loads the student list from the JSON file using fetch()
async function loadStudents() {
  const response = await fetch("data/attendance-records.json");
  if (!response.ok) {
    throw new Error("HTTP " + response.status);
  }
  const data = await response.json();
  return data.students;
}

// Returns the student whose username and password match, or undefined
function findStudent(students, username, password) {
  return students.find((s) => s.username === username && s.password === password);
}

// ---------- 6. Form submit ----------

// Validates the form, checks the credentials and redirects on success
async function handleLogin(event) {
  event.preventDefault();
  clearError();

  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  if (username === "" || password === "") {
    showError("Please enter both username and password");
    markInvalid();
    return;
  }

  setLoading(true);
  try {
    const students = await loadStudents();
    const student = findStudent(students, username, password);
    if (!student) {
      setLoading(false);
      showError("Invalid username or password");
      markInvalid();
      return;
    }
    sessionStorage.setItem("loggedInUser", student.username);
    window.location.href = "attendance-dashboard.html";
  } catch (error) {
    setLoading(false);
    showError("Could not load data. Run the project using Live Server!");
  }
}

// ---------- 7. Small extras ----------

// Shows or hides the password text and swaps the eye icon
function togglePassword() {
  const isHidden = passwordInput.type === "password";
  passwordInput.type = isHidden ? "text" : "password";
  togglePasswordBtn.querySelector("i").className = isHidden ? "bi bi-eye-slash" : "bi bi-eye";
  togglePasswordBtn.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");
}

// Fills the form from a clicked demo chip
function fillDemo(event) {
  const chip = event.currentTarget;
  usernameInput.value = chip.dataset.user;
  passwordInput.value = chip.dataset.pass;
  clearError();
  loginBtn.focus();
}

// ---------- 8. Event listeners ----------
loginForm.addEventListener("submit", handleLogin);
togglePasswordBtn.addEventListener("click", togglePassword);
usernameInput.addEventListener("input", clearError);
passwordInput.addEventListener("input", clearError);
// After any animation ends, remove the classes so fade-up does not replay after a shake
loginCard.addEventListener("animationend", () => loginCard.classList.remove("shake", "fade-up"));
document.querySelectorAll(".demo-chip").forEach((chip) => chip.addEventListener("click", fillDemo));
