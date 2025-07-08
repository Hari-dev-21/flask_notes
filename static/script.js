const API_BASE = "/api";

// ------------------- AUTH -------------------

function register() {
  const username = document.getElementById("reg_username").value.trim();
  const password = document.getElementById("reg_password").value;
  const msg = document.getElementById("message");
  msg.innerText = "";
  msg.className = "";

  fetch(`${API_BASE}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  })
    .then(res => res.json())
    .then(data => {
      if (data.token) {
        localStorage.setItem("token", data.token);
        msg.className = "success";
        msg.innerText = "Registered successfully!";
        window.location.href = "/dashboard";
      } else {
        msg.className = "error";
        msg.innerText = data.error || data.message;
      }
    })
    .catch(() => {
      msg.className = "error";
      msg.innerText = "Registration failed. Try again.";
    });
}

function login() {
  const username = document.getElementById("login_username").value.trim();
  const password = document.getElementById("login_password").value;
  const msg = document.getElementById("message");
  msg.innerText = "";
  msg.className = "";

  fetch(`${API_BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  })
    .then(res => res.json())
    .then(data => {
      if (data.token) {
        localStorage.setItem("token", data.token);
        msg.className = "success";
        msg.innerText = "Login successful!";
        window.location.href = "/dashboard";
      } else {
        msg.className = "error";
        msg.innerText = data.error || data.message;
      }
    })
    .catch(() => {
      msg.className = "error";
      msg.innerText = "Login failed. Try again.";
    });
}

function logout() {
  localStorage.removeItem("token");
  window.location.href = "/";
}

// ------------------- NOTES -------------------

function createNote() {
  const content = document.getElementById("note_input").value.trim();
  const token = localStorage.getItem("token");
  const msg = document.getElementById("message");
  msg.innerText = "";
  msg.className = "";

  if (!content || !token) return;

  fetch(`${API_BASE}/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ content })
  })
    .then(res => res.json())
    .then(data => {
      msg.className = data.error ? "error" : "success";
      msg.innerText = data.message || data.error;
      document.getElementById("note_input").value = "";
      loadNotes();
    })
    .catch(() => {
      msg.className = "error";
      msg.innerText = "Note creation failed.";
    });
}

function loadNotes() {
  const token = localStorage.getItem("token");
  if (!token) return;

  fetch(`${API_BASE}/show`, {
    headers: { "Authorization": `Bearer ${token}` }
  })
    .then(res => res.json())
    .then(data => {
      const noteList = document.getElementById("note_list");
      noteList.innerHTML = "";
      data.forEach(note => {
        const li = document.createElement("li");
        li.innerHTML = `
  <span class="note-content" id="note-content-${note.id}">${note.content}</span>
  <input type="text" id="edit-input-${note.id}" value="${note.content}" style="display:none; margin-right: 8px;" />
  <button onclick="startEdit(${note.id})" id="edit-btn-${note.id}">Edit</button>
  <button onclick="confirmEdit(${note.id})" id="confirm-btn-${note.id}" style="display:none;">Update</button>
  <button onclick="cancelEdit(${note.id})" id="cancel-btn-${note.id}" style="display:none;">Cancel</button>
  <button onclick="deleteNote(${note.id})">Delete</button>
`;

        noteList.appendChild(li);
      });
    });
}

function startEdit(id) {
  document.getElementById(`note-content-${id}`).style.display = "none";
  document.getElementById(`edit-input-${id}`).style.display = "inline";
  document.getElementById(`confirm-btn-${id}`).style.display = "inline";
  document.getElementById(`cancel-btn-${id}`).style.display = "inline";
  document.getElementById(`edit-btn-${id}`).style.display = "none";  // ✅ hide Edit button
}


function cancelEdit(id) {
  document.getElementById(`note-content-${id}`).style.display = "inline";
  document.getElementById(`edit-input-${id}`).style.display = "none";
  document.getElementById(`confirm-btn-${id}`).style.display = "none";
  document.getElementById(`cancel-btn-${id}`).style.display = "none";
  document.getElementById(`edit-btn-${id}`).style.display = "inline"; // ✅ show Edit button back
}



function confirmEdit(id) {
  const newContent = document.getElementById(`edit-input-${id}`).value.trim();
  if (!newContent) return;

  fetch(`${API_BASE}/update/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${localStorage.getItem("token")}`
    },
    body: JSON.stringify({ content: newContent })
  })
    .then(res => res.json())
    .then(data => {
      document.getElementById("message").innerText = data.message || data.error;
      document.getElementById("message").className = data.error ? "error" : "success";
      loadNotes(); // Refresh notes
    });
}

function deleteNote(id) {
  const token = localStorage.getItem("token");
  fetch(`${API_BASE}/delete/${id}`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${token}` }
  })
    .then(res => res.json())
    .then(data => {
      document.getElementById("message").innerText = data.message || data.error;
      document.getElementById("message").className = data.error ? "error" : "success";
      loadNotes();
    })
    .catch(() => {
      document.getElementById("message").innerText = "Delete failed.";
    });
}

// ------------------- INIT -------------------

if (window.location.pathname === "/dashboard") {
  window.onload = loadNotes;
}
