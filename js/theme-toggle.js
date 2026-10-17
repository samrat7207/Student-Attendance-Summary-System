/* =========================================================
   theme-toggle.js
   Shared dark / light mode toggle used by both pages.
   Sets data-bs-theme on <html> and saves the choice in localStorage.
   ========================================================= */

// ---------- 1. Constants ----------
const THEME_KEY = "theme";

// ---------- 2. Helper functions ----------

// Returns the saved theme, or the OS preference if nothing is saved
function getPreferredTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "light" || saved === "dark") {
    return saved;
  }
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
}

// Applies a theme to the page and updates the toggle icon
function applyTheme(theme) {
  document.documentElement.setAttribute("data-bs-theme", theme);
  const button = document.getElementById("themeToggle");
  if (button) {
    const icon = button.querySelector("i");
    icon.className = theme === "dark" ? "bi bi-sun-fill" : "bi bi-moon-stars-fill";
    button.setAttribute("aria-label", theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
  }
}

// Switches between light and dark, saves it and tells other scripts
function toggleTheme() {
  const current = document.documentElement.getAttribute("data-bs-theme");
  const next = current === "dark" ? "light" : "dark";
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
  // Other scripts (the dashboard charts) listen for this event to redraw
  document.dispatchEvent(new CustomEvent("themechange", { detail: next }));
}

// ---------- 3. Start up ----------
applyTheme(getPreferredTheme());

const themeButton = document.getElementById("themeToggle");
if (themeButton) {
  themeButton.addEventListener("click", toggleTheme);
}
