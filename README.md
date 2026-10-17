# Student Attendance Summary System (Problem 16)

**Group:** SBL_WT_grp10 | **Course:** Web Technology 2 (Mumbai University, SE Computer Science)

A simple web application that shows subject-wise attendance. Each student logs in and sees only their own attendance, with stat cards, a smart alert, Chart.js charts and a sortable, searchable table.

**Tech:** HTML5, CSS3 (CSS variables), Bootstrap 5.3.3, Bootstrap Icons 1.11.3, vanilla JavaScript (ES6), Chart.js 4.4.3, JSON. No build tools.

## Demo logins

| Student | Username | Password |
|---|---|---|
| Aarav Sharma (CS201) | `1111` | `1111` |
| Priya Patel (CS202) | `2222` | `2222` |

## File structure

```
SBL_WT_grp10/
|-- index.html                  tiny redirect page -> login.html (makes hosting work)
|-- login.html                  login page (start page)
|-- attendance-dashboard.html   student dashboard (protected)
|-- README.md                   how to run, host, and explain the project (viva notes)
|-- css/
|   |-- theme-colors.css        shared CSS variables for light + dark mode
|   |-- login-style.css         login page styles
|   `-- attendance-style.css    dashboard styles
|-- js/
|   |-- theme-toggle.js         shared dark/light toggle (used by both pages)
|   |-- login.js                login logic + validation
|   `-- attendance-app.js       dashboard logic, charts, table
`-- data/
    `-- attendance-records.json all students + subjects + monthly trend
```

## How to run

`fetch()` does not work from a `file://` address, so the project must be served by a local web server.

**Option 1: VS Code Live Server**
1. Open the `SBL_WT_grp10` folder in VS Code.
2. Install the **Live Server** extension (Ritwick Dey) if needed.
3. Right-click `login.html` and choose **Open with Live Server**.
4. Log in with `1111 / 1111` or `2222 / 2222`.

**Option 2: Python**
```
cd SBL_WT_grp10
python -m http.server 8000
```
Then open <http://localhost:8000/login.html> (or just <http://localhost:8000>, which redirects).

## How to deploy

- **Netlify:** go to <https://app.netlify.com/drop> and drag-and-drop the whole `SBL_WT_grp10` folder. Netlify gives you a public URL. `index.html` redirects visitors to the login page.
- **GitHub Pages:** push the folder contents to a GitHub repository, open *Settings > Pages*, choose *Deploy from a branch*, select `main` and `/ (root)`, and save. All paths are relative, so it works from a sub-path.

## How it works (the four objectives)

**1. JavaScript entry form, validation and percentage calculation.** The login form in `login.html` is handled by `js/login.js`. On submit it trims the username and shows *"Please enter both username and password"* if a field is empty. If no student matches it shows *"Invalid username or password"*, marks the inputs with Bootstrap's `is-invalid` class and shakes the card with a CSS keyframe animation. Error text is set with `textContent`, never `innerHTML`. On the dashboard, `js/attendance-app.js` calculates every percentage: `attended / total x 100` rounded to 1 decimal, the overall percentage `sum(attended) / sum(total) x 100`, the status (75+ Safe, 65 to 74.9 Warning, below 65 Short) and, for subjects below 75%, the lectures needed `ceil((0.75 x total - attended) / 0.25)`. Subjects at 75% or above simply show "On track - keep attending"; the app deliberately does not show how many lectures a student could skip.

**2. Client-server communication.** Both pages use `fetch("data/attendance-records.json")` with `async/await` to request the data file from the web server, then `response.json()` to turn it into a JavaScript object. No student data is hard-coded in the JavaScript. The logged-in username is kept in `sessionStorage` (key `loggedInUser`), and the dashboard picks that student's record and renders the cards, charts and table dynamically from it.

**3. Responsive Bootstrap front-end.** Bootstrap 5's grid places the stat cards 2 x 2 on phones and 4 in a row from 992px, and the bar chart and trend chart side by side (8 + 4 columns) on desktop. Bootstrap cards, input-groups, alerts, badges, progress bars and `.table-responsive` are used throughout. Custom CSS variables in `css/theme-colors.css` give a light and dark theme; the toggle stores the choice in `localStorage`.

**4. Chart.js visualisation and hosting.** View A (All Subjects) shows a bar chart coloured by status with a dashed *Required 75%* line drawn by a small inline Chart.js plugin, plus a smooth monthly trend line with a gradient fill. View B (one subject) shows a doughnut chart (Attended vs Missed) with the percentage in the centre. Every chart is destroyed before it is redrawn, and the charts are redrawn in the new colours when the theme changes. The folder uses only relative paths and a root `index.html`, so it can be hosted on Netlify or GitHub Pages as-is.

## Sanity check numbers

- Aarav, Database Management: 18 / 28 = **64.3%**, status **Short**, needs **12** lectures.
- Aarav overall: 116 / 149 = **77.9%**.
- Priya overall: 120 / 149 = **80.5%**.

## Honesty note about the login (important for the viva)

This login is a **client-side demo only**. The usernames and passwords sit in a public JSON file (`data/attendance-records.json`) that anyone can open in the browser, and the check happens in the browser's JavaScript. It is not secure. A real system would send the credentials to a **server** (for example Node.js + Express) which would check them against a **database** with hashed passwords, create a session or token, and return only that student's attendance.
