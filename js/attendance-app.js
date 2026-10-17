/* =========================================================
   attendance-app.js
   Dashboard logic: login guard, fetch() of the JSON data,
   percentage calculations, stat cards, smart alert,
   Chart.js charts, sortable/searchable table and CSV export.
   ========================================================= */

// ---------- 1. Login guard (runs first) ----------
const loggedInUser = sessionStorage.getItem("loggedInUser");
if (!loggedInUser) {
  window.location.replace("login.html");
}

// If the page is restored from the back/forward cache after logout, send the user away
window.addEventListener("pageshow", () => {
  if (!sessionStorage.getItem("loggedInUser")) {
    window.location.replace("login.html");
  }
});

// ---------- 2. App state ----------
let student = null;        // the logged-in student object from the JSON
let subjectRows = [];      // subjects with calculated values
let selected = "all";      // "all" or a subject index as text
let sortKey = "";          // active table column
let sortAsc = true;        // sort direction
let barChart = null;
let trendChart = null;
let donutChart = null;
const countTimers = {};    // running count-up animations, by element id
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------- 3. Calculation rules (Section 7) ----------

// Percentage = attended / total x 100, rounded to 1 decimal place
function calcPercent(attended, total) {
  if (total === 0) return 0;
  return Math.round((attended / total) * 100 * 10) / 10;
}

// Status: 75+ Safe, 65 to 74.9 Warning, below 65 Short
function getStatus(percent) {
  if (percent >= 75) return "Safe";
  if (percent >= 65) return "Warning";
  return "Short";
}

// Lectures needed in a row to reach 75%: ceil((0.75 x total - attended) / 0.25)
function lecturesNeeded(attended, total) {
  return Math.ceil((0.75 * total - attended) / 0.25);
}

// Builds one table/chart row with every calculated value for a subject
function buildRow(subject, index) {
  const percent = calcPercent(subject.attended, subject.total);
  const status = getStatus(percent);
  const isSafe = percent >= 75;
  const count = isSafe ? 0 : lecturesNeeded(subject.attended, subject.total);
  return {
    index: index,
    name: subject.name,
    attended: subject.attended,
    total: subject.total,
    missed: subject.total - subject.attended,
    percent: percent,
    status: status,
    isSafe: isSafe,
    count: count,
    needed: count, // lectures needed to reach 75% (0 when already safe)
    note: isSafe ? "On track - keep attending" : `Attend next ${count} lectures`
  };
}

// Overall percentage = sum(attended) / sum(total) x 100 across all subjects
function calcOverall(rows) {
  const attended = rows.reduce((sum, r) => sum + r.attended, 0);
  const total = rows.reduce((sum, r) => sum + r.total, 0);
  return { attended: attended, total: total, percent: calcPercent(attended, total) };
}

// ---------- 4. Small helpers ----------

// Reads a CSS variable from the current theme (used for chart colours)
function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// Returns the theme colour that matches a status
function statusColor(status) {
  if (status === "Safe") return cssVar("--success");
  if (status === "Warning") return cssVar("--warning");
  return cssVar("--danger");
}

// Escapes text before putting it inside innerHTML
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Returns "morning", "afternoon" or "evening" from the current hour
function timeOfDay() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

// Animates a number from 0 up to its target in about 800ms
function countUp(id, target, decimals, suffix) {
  const el = document.getElementById(id);
  cancelAnimationFrame(countTimers[id]);
  if (reduceMotion) {
    el.textContent = target.toFixed(decimals) + suffix;
    return;
  }
  const start = performance.now();
  // One animation frame: work out progress and update the text
  function step(now) {
    const progress = Math.min((now - start) / 800, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = (target * eased).toFixed(decimals) + suffix;
    if (progress < 1) countTimers[id] = requestAnimationFrame(step);
  }
  countTimers[id] = requestAnimationFrame(step);
}

// ---------- 5. Loading data ----------

// Fetches the JSON file and returns the student object for the logged-in user
async function loadStudent() {
  const response = await fetch("data/attendance-records.json");
  if (!response.ok) throw new Error("HTTP " + response.status);
  const data = await response.json();
  return data.students.find((s) => s.username === loggedInUser);
}

// Hides the full-screen loader
function hideLoader() {
  document.getElementById("loader").classList.add("hide");
}

// ---------- 6. Header (hero) ----------

// Fills the hero banner with the student's name, initial, roll no and class
function renderHero() {
  const firstName = student.name.split(" ")[0];
  document.getElementById("avatar").textContent = student.name.charAt(0).toUpperCase();
  document.getElementById("greeting").textContent = `Good ${timeOfDay()}, ${firstName}`;
  document.getElementById("rollNo").textContent = student.rollNo;
  document.getElementById("className").textContent = student.class;
  document.title = `${student.name} | Attendance Summary`;
}

// Adds "All Subjects" plus one option per subject to the dropdown
function renderSelector() {
  const select = document.getElementById("subjectSelect");
  subjectRows.forEach((row) => {
    const option = document.createElement("option");
    option.value = String(row.index);
    option.textContent = row.name;
    select.appendChild(option);
  });
}

// ---------- 7. Stat cards ----------

// Sets the icon, colour tile and label of one stat card
function setCard(num, icon, tileClass, label) {
  const iconEl = document.getElementById("icon" + num);
  iconEl.className = "bi " + icon;
  iconEl.parentElement.className = "stat-icon " + tileClass;
  document.getElementById("label" + num).textContent = label;
}

// Fills the four stat cards for View A (all subjects)
function renderCardsAll() {
  const overall = calcOverall(subjectRows);
  const safe = subjectRows.filter((r) => r.percent >= 75).length;
  setCard(1, "bi-graph-up-arrow", "icon-primary", "Overall Attendance");
  setCard(2, "bi-journals", "icon-violet", "Total Subjects");
  setCard(3, "bi-shield-check", "icon-success", "Safe Subjects");
  setCard(4, "bi-exclamation-triangle", "icon-danger", "Below 75%");
  countUp("stat1", overall.percent, 1, "%");
  countUp("stat2", subjectRows.length, 0, "");
  countUp("stat3", safe, 0, "");
  countUp("stat4", subjectRows.length - safe, 0, "");
}

// Fills the four stat cards for View B (one subject)
function renderCardsOne(row) {
  const tiles = { Safe: "icon-success", Warning: "icon-warning", Short: "icon-danger" };
  setCard(1, "bi-percent", "icon-primary", "Attendance");
  setCard(2, "bi-check2-circle", "icon-success", "Lectures Attended");
  setCard(3, "bi-x-circle", "icon-danger", "Lectures Missed");
  setCard(4, "bi-flag-fill", tiles[row.status], "Status");
  countUp("stat1", row.percent, 1, "%");
  countUp("stat2", row.attended, 0, "");
  countUp("stat3", row.missed, 0, "");
  cancelAnimationFrame(countTimers.stat4);
  document.getElementById("stat4").textContent = row.status;
}

// ---------- 8. Smart alert ----------

// Changes the alert colour, icon and text
function setAlert(type, icon, text) {
  document.getElementById("smartAlert").className = `alert smart-alert alert-${type} mt-4 mb-0`;
  document.getElementById("alertIcon").className = "bi " + icon;
  document.getElementById("alertText").textContent = text;
}

// Shows the alert for View A: all safe, or the list of low subjects
function renderAlertAll() {
  const low = subjectRows.filter((r) => r.percent < 75).map((r) => r.name);
  if (low.length === 0) {
    setAlert("success", "bi-check-circle-fill", "All subjects are above 75%");
  } else {
    setAlert("warning", "bi-exclamation-triangle-fill", "Low attendance in: " + low.join(", "));
  }
}

// Shows the alert for View B using the subject's status and note
function renderAlertOne(row) {
  const types = { Safe: "success", Warning: "warning", Short: "danger" };
  const icons = { Safe: "bi-check-circle-fill", Warning: "bi-exclamation-triangle-fill", Short: "bi-x-octagon-fill" };
  const text = row.isSafe ? `${row.name}: You are above 75%. Keep attending every lecture!` : `${row.name}: ${row.note} to reach 75%`;
  setAlert(types[row.status], icons[row.status], text);
}

// ---------- 9. Charts ----------

// Destroys every chart so a canvas never holds two charts
function destroyCharts() {
  if (barChart) { barChart.destroy(); barChart = null; }
  if (trendChart) { trendChart.destroy(); trendChart = null; }
  if (donutChart) { donutChart.destroy(); donutChart = null; }
}

// Sets Chart.js default text/grid colours from the active theme
function applyChartTheme() {
  Chart.defaults.font.family = "Poppins, sans-serif";
  Chart.defaults.color = cssVar("--muted");
  Chart.defaults.borderColor = cssVar("--border");
  Chart.defaults.animation.duration = reduceMotion ? 0 : 700;
}

// Inline plugin: draws a dashed "Required 75%" line on the bar chart
const targetLinePlugin = {
  id: "targetLine",
  afterDatasetsDraw(chart) {
    const { ctx, chartArea, scales } = chart;
    const y = scales.y.getPixelForValue(75);
    ctx.save();
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = cssVar("--danger");
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(chartArea.left, y);
    ctx.lineTo(chartArea.right, y);
    ctx.stroke();
    ctx.fillStyle = cssVar("--danger");
    ctx.font = "600 11px Poppins, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("Required 75%", chartArea.right - 4, y - 6);
    ctx.restore();
  }
};

// Inline plugin: writes the percentage in the centre of the doughnut
const centerTextPlugin = {
  id: "centerText",
  afterDraw(chart) {
    const text = chart.options.plugins.centerText.text;
    const { ctx, chartArea } = chart;
    const x = (chartArea.left + chartArea.right) / 2;
    const y = (chartArea.top + chartArea.bottom) / 2;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = cssVar("--text");
    ctx.font = "700 28px Poppins, sans-serif";
    ctx.fillText(text, x, y - 8);
    ctx.fillStyle = cssVar("--muted");
    ctx.font = "500 12px Poppins, sans-serif";
    ctx.fillText("attendance", x, y + 18);
    ctx.restore();
  }
};

// Draws the bar chart: one rounded bar per subject coloured by status
function drawBarChart() {
  barChart = new Chart(document.getElementById("barChart"), {
    type: "bar",
    data: {
      labels: subjectRows.map((r) => r.name),
      datasets: [{
        label: "Attendance %",
        data: subjectRows.map((r) => r.percent),
        backgroundColor: subjectRows.map((r) => statusColor(r.status)),
        borderRadius: 10,
        maxBarThickness: 46
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (item) => ` ${item.raw}%` } }
      },
      scales: {
        y: { min: 0, max: 100, ticks: { stepSize: 25, callback: (v) => v + "%" } },
        x: { grid: { display: false }, ticks: { autoSkip: false, maxRotation: 40, minRotation: 0 } }
      }
    },
    plugins: [targetLinePlugin]
  });
}

// Creates the soft gradient fill under the trend line
function trendGradient(context) {
  const { ctx, chartArea } = context.chart;
  if (!chartArea) return "transparent";
  const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
  gradient.addColorStop(0, "rgba(124, 58, 237, 0.35)");
  gradient.addColorStop(1, "rgba(124, 58, 237, 0)");
  return gradient;
}

// Draws the smooth monthly trend line chart with a filled area
function drawTrendChart() {
  const trend = student.trend || [];
  trendChart = new Chart(document.getElementById("trendChart"), {
    type: "line",
    data: {
      labels: trend.map((t) => t.month),
      datasets: [{
        label: "Attendance %",
        data: trend.map((t) => t.percent),
        borderColor: cssVar("--violet"),
        backgroundColor: trendGradient,
        fill: true,
        tension: 0.4,
        borderWidth: 3,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: cssVar("--surface"),
        pointBorderColor: cssVar("--violet"),
        pointBorderWidth: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (item) => ` ${item.raw}%` } } },
      scales: {
        y: { suggestedMin: 50, max: 100, ticks: { callback: (v) => v + "%" } },
        x: { grid: { display: false } }
      }
    }
  });
}

// Draws the doughnut chart (Attended vs Missed) for one subject
function drawDonutChart(row) {
  donutChart = new Chart(document.getElementById("donutChart"), {
    type: "doughnut",
    data: {
      labels: ["Attended", "Missed"],
      datasets: [{
        data: [row.attended, row.missed],
        backgroundColor: [cssVar("--success"), cssVar("--danger")],
        borderColor: cssVar("--surface"),
        borderWidth: 4,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "70%",
      plugins: {
        legend: { position: "bottom", labels: { usePointStyle: true, padding: 18 } },
        centerText: { text: row.percent.toFixed(1) + "%" }
      }
    },
    plugins: [centerTextPlugin]
  });
}

// Shows the right chart row for the current view and (re)draws its charts
function renderCharts() {
  destroyCharts();
  applyChartTheme();
  const isAll = selected === "all";
  document.getElementById("chartsAll").classList.toggle("d-none", !isAll);
  document.getElementById("chartsOne").classList.toggle("d-none", isAll);
  if (isAll) {
    drawBarChart();
    drawTrendChart();
  } else {
    drawDonutChart(subjectRows[Number(selected)]);
  }
}

// ---------- 10. Insight card ----------

// Writes the big insight sentence for one subject
function renderInsight(row) {
  const text = document.getElementById("insightText");
  const sub = document.getElementById("insightSub");
  if (row.isSafe) {
    text.innerHTML = `You are <span class="hl">on track</span> at ${row.percent.toFixed(1)}%. Keep attending every lecture!`;
    sub.textContent = `Great work! You have attended ${row.attended} of ${row.total} lectures in ${row.name}.`;
  } else {
    text.innerHTML = `You need <span class="hl">${row.count}</span> more lectures in a row to reach 75%`;
    sub.textContent = `You have attended ${row.attended} of ${row.total} lectures in ${row.name}. Do not skip the next ones.`;
  }
}

// ---------- 11. Records table ----------

// Returns the rows to show: selected subject, search filter and sorting applied
function getTableRows() {
  let rows = selected === "all" ? subjectRows.slice() : [subjectRows[Number(selected)]];
  const search = document.getElementById("searchInput").value.trim().toLowerCase();
  if (selected === "all" && search !== "") {
    rows = rows.filter((r) => r.name.toLowerCase().includes(search));
  }
  if (sortKey !== "") {
    rows.sort((a, b) => compareRows(a, b));
  }
  return rows;
}

// Compares two rows by the active sort column and direction
function compareRows(a, b) {
  const order = { Short: 0, Warning: 1, Safe: 2 };
  let x = a[sortKey];
  let y = b[sortKey];
  if (sortKey === "status") { x = order[x]; y = order[y]; }
  let result = typeof x === "string" ? x.localeCompare(y) : x - y;
  return sortAsc ? result : -result;
}

// Builds the HTML for one table row
function rowHtml(r) {
  const badge = { Safe: "badge-safe", Warning: "badge-warning", Short: "badge-short" }[r.status];
  const bar = { Safe: "bg-safe", Warning: "bg-warning-c", Short: "bg-short" }[r.status];
  const noteClass = r.isSafe ? "needed-good" : "needed-more";
  const noteIcon = r.isSafe ? "bi-check-circle" : "bi-arrow-up-circle";
  return `<tr>
    <td class="subject-name">${escapeHtml(r.name)}</td>
    <td>${r.attended}</td>
    <td>${r.total}</td>
    <td><div class="pct-cell">
      <div class="progress" role="progressbar" aria-label="${escapeHtml(r.name)} attendance" aria-valuenow="${r.percent}" aria-valuemin="0" aria-valuemax="100">
        <div class="progress-bar ${bar}" style="width: ${r.percent}%"></div>
      </div><span class="pct-value">${r.percent.toFixed(1)}%</span></div></td>
    <td><span class="status-badge ${badge}">${r.status}</span></td>
    <td class="${noteClass}"><i class="bi ${noteIcon} me-1"></i>${r.note}</td>
  </tr>`;
}

// Renders the table body (or "No subjects found") and the sort arrows
function renderTable() {
  const rows = getTableRows();
  const body = document.getElementById("tableBody");
  body.innerHTML = rows.length === 0
    ? '<tr><td colspan="6" class="empty-row"><i class="bi bi-search me-2"></i>No subjects found</td></tr>'
    : rows.map(rowHtml).join("");
  document.querySelectorAll(".records-table th").forEach((th) => {
    const isActive = th.dataset.key === sortKey;
    th.classList.toggle("active", isActive);
    th.setAttribute("aria-sort", isActive ? (sortAsc ? "ascending" : "descending") : "none");
    th.querySelector(".sort-icon").className = "bi sort-icon " + (isActive ? (sortAsc ? "bi-arrow-up" : "bi-arrow-down") : "");
  });
  document.getElementById("searchWrap").classList.toggle("d-none", selected !== "all");
}

// Handles a click on a column header: ascending first, then descending
function handleSort(event) {
  const key = event.currentTarget.dataset.key;
  if (sortKey === key) {
    sortAsc = !sortAsc;
  } else {
    sortKey = key;
    sortAsc = true;
  }
  renderTable();
}

// ---------- 12. Main render ----------

// Updates every block on the page for the current dropdown choice
function renderView() {
  if (selected === "all") {
    renderCardsAll();
    renderAlertAll();
  } else {
    const row = subjectRows[Number(selected)];
    renderCardsOne(row);
    renderAlertOne(row);
    renderInsight(row);
  }
  renderCharts();
  renderTable();
}

// Shows a friendly empty state when the student has no subjects
function showEmptyState() {
  document.getElementById("dashboardContent").classList.add("d-none");
  document.getElementById("emptyState").classList.remove("d-none");
  document.getElementById("subjectSelect").disabled = true;
}

// ---------- 13. CSV download ----------

// Turns one value into a safe CSV cell (quotes text with commas)
function csvCell(value) {
  const text = String(value).replace(/"/g, '""');
  return `"${text}"`;
}

// Exports the student's rows as attendance_<rollNo>.csv using a Blob
function downloadReport() {
  if (!student) return;
  const lines = [
    ["Student", student.name], ["Roll No", student.rollNo], ["Class", student.class], [],
    ["Subject", "Attended", "Total", "Percentage", "Status", "Lectures Needed"]
  ];
  subjectRows.forEach((r) => lines.push([r.name, r.attended, r.total, r.percent + "%", r.status, r.note]));
  if (subjectRows.length > 0) {
    const o = calcOverall(subjectRows);
    lines.push(["Overall", o.attended, o.total, o.percent + "%", getStatus(o.percent), ""]);
  }
  const csv = lines.map((line) => line.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `attendance_${student.rollNo}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

// ---------- 14. Logout ----------

// Clears the session and goes back to the login page
function logout() {
  sessionStorage.clear();
  window.location.replace("login.html");
}

// ---------- 15. Start the app ----------

// Loads the data, fills the page and wires up all events
async function initDashboard() {
  if (!loggedInUser) return;
  try {
    student = await loadStudent();
    if (!student) { logout(); return; }
    subjectRows = (student.subjects || []).map(buildRow);
    renderHero();
    if (subjectRows.length === 0) {
      showEmptyState();
    } else {
      renderSelector();
      renderView();
    }
    hideLoader();
  } catch (error) {
    document.getElementById("loaderText").textContent = "Could not load data. Run the project using Live Server!";
    document.querySelector(".loader-spinner").classList.add("d-none");
  }
}

// Called when the dropdown changes: switches between View A and View B
function handleSubjectChange(event) {
  selected = event.target.value;
  document.getElementById("searchInput").value = "";
  renderView();
}

document.getElementById("subjectSelect").addEventListener("change", handleSubjectChange);
document.getElementById("searchInput").addEventListener("input", renderTable);
document.getElementById("downloadBtn").addEventListener("click", downloadReport);
document.getElementById("logoutBtn").addEventListener("click", logout);
document.querySelectorAll(".records-table th").forEach((th) => th.addEventListener("click", handleSort));
// Redraw charts in the new colours when the theme changes
document.addEventListener("themechange", () => { if (subjectRows.length > 0) renderCharts(); });

initDashboard();
