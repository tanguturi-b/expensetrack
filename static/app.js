let token = localStorage.getItem("token");

const authSection = document.getElementById("auth-section");
const dashboardSection = document.getElementById("dashboard-section");
const authMessage = document.getElementById("auth-message");

function showDashboard() {
  authSection.style.display = "none";
  dashboardSection.style.display = "block";
  loadTransactions();
  loadSummary();
}

if (token) {
  showDashboard();
}

document.getElementById("register-btn").addEventListener("click", async () => {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  const res = await fetch("/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  authMessage.textContent = res.ok ? "Registered! Now log in." : data.error;
});

document.getElementById("login-btn").addEventListener("click", async () => {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();

  if (res.ok) {
    token = data.token;
    localStorage.setItem("token", token);
    showDashboard();
  } else {
    authMessage.textContent = data.error;
  }
});

document.getElementById("logout-btn").addEventListener("click", () => {
  localStorage.removeItem("token");
  token = null;
  dashboardSection.style.display = "none";
  authSection.style.display = "block";
});

async function getOrCreateCategory(name) {
  const res = await fetch("/api/categories", {
    headers: { Authorization: `Bearer ${token}` }
  });
  const categories = await res.json();
  const existing = categories.find(c => c.name.toLowerCase() === name.toLowerCase());
  if (existing) return existing.id;

  const createRes = await fetch("/api/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name })
  });
  const created = await createRes.json();
  return created.id;
}

document.getElementById("add-transaction-btn").addEventListener("click", async () => {
  const amount = parseFloat(document.getElementById("amount").value);
  const description = document.getElementById("description").value;
  const categoryName = document.getElementById("category").value;
  const date = document.getElementById("date").value;

  const categoryId = await getOrCreateCategory(categoryName);

  await fetch("/api/transactions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ amount, description, category_id: categoryId, date: date || undefined })
  });

  loadTransactions();
  loadSummary();
});

async function loadTransactions() {
  const res = await fetch("/api/transactions", {
    headers: { Authorization: `Bearer ${token}` }
  });
  const transactions = await res.json();

  const list = document.getElementById("transaction-list");
  list.innerHTML = "";
  transactions.forEach(t => {
    const li = document.createElement("li");
    li.textContent = `${t.date} — $${t.amount} — ${t.description || ""}`;
    list.appendChild(li);
  });
}

async function loadSummary() {
  const res = await fetch("/api/summary", {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();

  const container = document.getElementById("summary");
  container.innerHTML = "";
  data.by_category.forEach(row => {
    const div = document.createElement("div");
    div.textContent = `${row.category}: $${row.total.toFixed(2)}`;
    container.appendChild(div);
  });
}