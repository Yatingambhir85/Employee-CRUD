import {
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  Copy,
  Edit,
  KeyRound,
  LogIn,
  LogOut,
  Mail,
  MapPin,
  Moon,
  Plus,
  Search,
  ShieldCheck,
  Sun,
  Trash2,
  UserPlus,
  Users,
  X
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";

const emptyForm = {
  name: "",
  email: "",
  role: "",
  department: "",
  location: "",
  status: "Active"
};

const emptyAuthForm = {
  name: "",
  email: "",
  password: ""
};

const emptyProfileForm = {
  name: "",
  email: "",
  employeeRole: "",
  department: "",
  location: "",
  status: "",
  currentPassword: "",
  newPassword: ""
};

const statuses = ["Active", "On Leave", "Inactive"];

function getTheme() {
  const saved = localStorage.getItem("employee-hub-theme");
  if (saved) return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getStoredSession() {
  try {
    return JSON.parse(localStorage.getItem("employee-hub-session")) || null;
  } catch {
    return null;
  }
}

export default function App() {
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [authForm, setAuthForm] = useState(emptyAuthForm);
  const [authMode, setAuthMode] = useState(null);
  const [profileForm, setProfileForm] = useState(emptyProfileForm);
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [session, setSession] = useState(getStoredSession);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [theme, setTheme] = useState(getTheme);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [temporaryCredentials, setTemporaryCredentials] = useState(null);

  const token = session?.token;
  const isAdmin = session?.user?.role === "Administrator";

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("employee-hub-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!session) {
      setEmployees([]);
      setAuthMode(null);
      return;
    }

    const timer = setTimeout(() => {
      loadEmployees(search);
      loadProfile();
    }, 250);

    return () => clearTimeout(timer);
  }, [search, session]);

  function saveSession(nextSession) {
    setSession(nextSession);
    localStorage.setItem("employee-hub-session", JSON.stringify(nextSession));
  }

  async function apiFetch(endpoint, options = {}) {
    const response = await fetch(endpoint, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers
      }
    });

    if (response.status === 401) {
      localStorage.removeItem("employee-hub-session");
      setSession(null);
    }

    return response;
  }

  async function loadEmployees(query = "") {
    setLoading(true);
    setError("");

    try {
      const response = await apiFetch(`/api/employees?search=${encodeURIComponent(query)}`);
      const payload = response.status === 204 ? null : await response.json();
      if (!response.ok) throw new Error(payload?.message || "Unable to load employees.");
      setEmployees(payload);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function updateAuthField(event) {
    const { name, value } = event.target;
    setAuthForm((current) => ({ ...current, [name]: value }));
  }

  function updateProfileField(event) {
    const { name, value } = event.target;
    setProfileForm((current) => ({ ...current, [name]: value }));
  }

  async function loadProfile() {
    try {
      const response = await apiFetch("/api/profile");
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.message || "Unable to load profile.");

      setProfileForm((current) => ({
        ...current,
        name: payload.profile.name || "",
        email: payload.profile.email || "",
        employeeRole: payload.profile.employee_role || payload.profile.account_role || "",
        department: payload.profile.department || "",
        location: payload.profile.location || "",
        status: payload.profile.status || "",
        currentPassword: "",
        newPassword: ""
      }));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function saveProfile(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await apiFetch("/api/profile", {
        method: "PUT",
        body: JSON.stringify({
          name: profileForm.name,
          location: profileForm.location,
          currentPassword: profileForm.currentPassword,
          newPassword: profileForm.newPassword
        })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.message || "Unable to update profile.");

      const nextSession = { ...session, user: payload.user };
      saveSession(nextSession);
      setProfileForm((current) => ({
        ...current,
        currentPassword: "",
        newPassword: ""
      }));
      setMessage(payload.message || "Profile updated successfully.");
      setProfileModalOpen(false);
      await loadEmployees(search);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function submitAuth(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    setTemporaryCredentials(null);

    const endpoint = authMode === "login" ? "/api/auth/login" : "/api/auth/signup";
    const body =
      authMode === "login"
        ? { email: authForm.email, password: authForm.password }
        : { name: authForm.name, email: authForm.email, password: authForm.password };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const payload = await response.json();

      if (!response.ok) throw new Error(payload?.message || "Unable to authenticate.");

      saveSession(payload);
      setAuthForm(emptyAuthForm);
      setMessage(authMode === "login" ? "Welcome back." : "Account created successfully.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    if (token) {
      await apiFetch("/api/auth/logout", { method: "POST" });
    }
    localStorage.removeItem("employee-hub-session");
    setSession(null);
    setMessage("");
    setError("");
  }

  function editEmployee(employee) {
    setEditingId(employee.id);
    setForm({
      name: employee.name,
      email: employee.email,
      role: employee.role,
      department: employee.department,
      location: employee.location || "",
      status: employee.status
    });
    setEmployeeModalOpen(true);
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setEmployeeModalOpen(false);
  }

  async function saveEmployee(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    const endpoint = editingId ? `/api/employees/${editingId}` : "/api/employees";
    const method = editingId ? "PUT" : "POST";

    try {
      const response = await apiFetch(endpoint, {
        method,
        body: JSON.stringify(form)
      });

      const payload = response.status === 204 ? null : await response.json();
      if (!response.ok) throw new Error(payload?.message || "Unable to save employee.");

      if (!editingId && payload?.credentials) {
        setTemporaryCredentials(payload.credentials);
        setMessage("Employee added and login account created.");
      } else {
        setMessage(
          editingId
            ? "Employee updated successfully."
            : "Employee added successfully. A login account already exists for this email."
        );
      }
      resetForm();
      await loadEmployees(search);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteEmployee(id) {
    const confirmed = window.confirm("Delete this employee?");
    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      const response = await apiFetch(`/api/employees/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Unable to delete employee.");
      setMessage("Employee deleted successfully.");
      await loadEmployees(search);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function copyTemporaryCredentials() {
    if (!temporaryCredentials) return;

    navigator.clipboard?.writeText(
      `Email: ${temporaryCredentials.email}\nPassword: ${temporaryCredentials.temporaryPassword}`
    );
  }

  const stats = useMemo(() => {
    const active = employees.filter((employee) => employee.status === "Active").length;
    const departments = new Set(employees.map((employee) => employee.department)).size;
    return { total: employees.length, active, departments };
  }, [employees]);

  return (
    <main className="app-shell">
      <section className="topbar">
        <div>
          <p className="eyebrow">Three-tier CRUD application</p>
          <h1>Employee Hub</h1>
        </div>
        <div className="topbar-actions">
          {session && (
            <div className="user-chip">
              <span>{session.user.name.slice(0, 1).toUpperCase()}</span>
              <strong>{session.user.name}</strong>
            </div>
          )}
          {session && (
            <button className="secondary-button" type="button" onClick={logout}>
              <LogOut size={17} />
              Logout
            </button>
          )}
          <button
            className="icon-button"
            aria-label="Toggle theme"
            title="Toggle theme"
            onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
          >
            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </section>

      {!session ? (
        <AuthScreen
          authForm={authForm}
          authMode={authMode}
          error={error}
          message={message}
          saving={saving}
          setAuthMode={setAuthMode}
          submitAuth={submitAuth}
          updateAuthField={updateAuthField}
        />
      ) : (
        <>
          <section className="hero">
            <div className="hero-copy">
              <p className="eyebrow">{isAdmin ? "Admin workspace" : "Employee workspace"}</p>
              <h2>Manage employees with a clean, professional workflow.</h2>
              <p>
                {isAdmin
                  ? "Add, update, search, and remove employees through a protected admin workflow."
                  : "Search and view the employee directory. Record management is reserved for administrators."}
              </p>
            </div>
            <div className="metric-grid" aria-label="Employee summary">
              <Metric icon={<Users />} label="Employees" value={stats.total} />
              <Metric icon={<CheckCircle2 />} label="Active" value={stats.active} />
              <Metric icon={<Building2 />} label="Departments" value={stats.departments} />
            </div>
          </section>

          <section className="workspace single-workspace">
            <section className="panel employee-list">
              <div className="section-title directory-header">
                <div>
                  <p className="eyebrow">Directory</p>
                  <h3>Employees</h3>
                </div>
                <div className="directory-actions">
                  {isAdmin ? (
                    <button
                      className="primary-button action-button"
                      type="button"
                      onClick={() => {
                        resetForm();
                        setEmployeeModalOpen(true);
                      }}
                    >
                      <Plus size={18} />
                      Add employee
                    </button>
                  ) : (
                    <button
                      className="secondary-button action-button"
                      type="button"
                      onClick={() => setProfileModalOpen(true)}
                    >
                      <ShieldCheck size={17} />
                      My profile
                    </button>
                  )}
                  <label className="search-box">
                    <Search size={18} />
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search employees"
                    />
                  </label>
                </div>
              </div>

              {message && <div className="notice success">{message}</div>}
              {error && <div className="notice danger">{error}</div>}

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Role</th>
                      <th>Department</th>
                      <th>Status</th>
                      {isAdmin && <th aria-label="Actions" />}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={isAdmin ? 5 : 4} className="empty-state">Loading employees...</td>
                      </tr>
                    ) : employees.length === 0 ? (
                      <tr>
                        <td colSpan={isAdmin ? 5 : 4} className="empty-state">No employees found.</td>
                      </tr>
                    ) : (
                      employees.map((employee) => (
                        <tr key={employee.id}>
                          <td>
                            <div className="person">
                              <span className="avatar">{employee.name.slice(0, 1).toUpperCase()}</span>
                              <span>
                                <strong>{employee.name}</strong>
                                <small><Mail size={13} />{employee.email}</small>
                              </span>
                            </div>
                          </td>
                          <td>
                            <span className="cell-line"><BriefcaseBusiness size={15} />{employee.role}</span>
                          </td>
                          <td>
                            <span className="cell-line"><Building2 size={15} />{employee.department}</span>
                          </td>
                          <td>
                            <span className={`status ${employee.status.toLowerCase().replace(" ", "-")}`}>
                              {employee.status}
                            </span>
                            <small className="location"><MapPin size={13} />{employee.location || "Remote"}</small>
                          </td>
                          {isAdmin && (
                            <td>
                              <div className="row-actions">
                                <button
                                  className="icon-button compact"
                                  type="button"
                                  aria-label={`Edit ${employee.name}`}
                                  title="Edit"
                                  onClick={() => editEmployee(employee)}
                                >
                                  <Edit size={16} />
                                </button>
                                <button
                                  className="icon-button compact danger-icon"
                                  type="button"
                                  aria-label={`Delete ${employee.name}`}
                                  title="Delete"
                                  onClick={() => deleteEmployee(employee.id)}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </section>
        </>
      )}

      {isAdmin && employeeModalOpen && (
        <EmployeeModal
          editingId={editingId}
          form={form}
          saving={saving}
          onChange={updateField}
          onClose={resetForm}
          onSubmit={saveEmployee}
        />
      )}

      {!isAdmin && profileModalOpen && (
        <ProfileModal
          form={profileForm}
          saving={saving}
          onChange={updateProfileField}
          onClose={() => setProfileModalOpen(false)}
          onSubmit={saveProfile}
        />
      )}

      {temporaryCredentials && (
        <CredentialModal
          credentials={temporaryCredentials}
          onClose={() => setTemporaryCredentials(null)}
          onCopy={copyTemporaryCredentials}
        />
      )}
    </main>
  );
}

function EmployeeModal({ editingId, form, saving, onChange, onClose, onSubmit }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <form
        className="panel app-modal employee-modal"
        onSubmit={onSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="employee-modal-title"
      >
        <button
          className="icon-button close-button"
          type="button"
          aria-label="Close employee form"
          title="Close"
          onClick={onClose}
        >
          <X size={18} />
        </button>

        <div className="modal-heading">
          <span className="access-icon small-icon"><Users size={18} /></span>
          <div>
            <p className="eyebrow">{editingId ? "Update record" : "New record"}</p>
            <h3 id="employee-modal-title">{editingId ? "Edit employee" : "Add employee"}</h3>
          </div>
        </div>

        <div className="form-grid modal-form-grid">
          <label>
            Name
            <input name="name" value={form.name} onChange={onChange} required />
          </label>
          <label>
            Email
            <input name="email" type="email" value={form.email} onChange={onChange} required />
          </label>
          <label>
            Role
            <input name="role" value={form.role} onChange={onChange} required />
          </label>
          <label>
            Department
            <input name="department" value={form.department} onChange={onChange} required />
          </label>
          <label>
            Location
            <input name="location" value={form.location} onChange={onChange} placeholder="Remote" />
          </label>
          <label>
            Status
            <select name="status" value={form.status} onChange={onChange}>
              {statuses.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-button" type="submit" disabled={saving}>
            {saving ? "Saving..." : editingId ? "Save changes" : "Add employee"}
          </button>
        </div>
      </form>
    </div>
  );
}

function ProfileModal({ form, saving, onChange, onClose, onSubmit }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <form
        className="panel app-modal profile-modal"
        onSubmit={onSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
      >
        <button
          className="icon-button close-button"
          type="button"
          aria-label="Close profile form"
          title="Close"
          onClick={onClose}
        >
          <X size={18} />
        </button>

        <div className="modal-heading">
          <span className="access-icon small-icon"><ShieldCheck size={18} /></span>
          <div>
            <p className="eyebrow">My profile</p>
            <h3 id="profile-modal-title">Personal details</h3>
          </div>
        </div>

        <div className="form-grid modal-form-grid">
          <label>
            Name
            <input name="name" value={form.name} onChange={onChange} required />
          </label>
          <label>
            Email
            <input value={form.email} readOnly />
          </label>
          <label>
            Location
            <input name="location" value={form.location} onChange={onChange} />
          </label>
          <label>
            Role
            <input value={form.employeeRole} readOnly />
          </label>
          <label>
            Department
            <input value={form.department} readOnly />
          </label>
          <label>
            Status
            <input value={form.status} readOnly />
          </label>
          <label>
            Current password
            <input
              name="currentPassword"
              type="password"
              value={form.currentPassword}
              onChange={onChange}
            />
          </label>
          <label>
            New password
            <input
              name="newPassword"
              type="password"
              value={form.newPassword}
              onChange={onChange}
              minLength="8"
            />
          </label>
        </div>

        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-button" type="submit" disabled={saving}>
            <CheckCircle2 size={18} />
            {saving ? "Saving..." : "Save profile"}
          </button>
        </div>
      </form>
    </div>
  );
}

function CredentialModal({ credentials, onClose, onCopy }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="panel credential-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="credential-title"
      >
        <button
          className="icon-button close-button"
          type="button"
          aria-label="Close temporary credentials"
          title="Close"
          onClick={onClose}
        >
          <X size={18} />
        </button>

        <div className="credential-heading">
          <span className="access-icon small-icon"><KeyRound size={18} /></span>
          <div>
            <p className="eyebrow">Temporary login</p>
            <h3 id="credential-title">Share with employee</h3>
          </div>
        </div>

        <label>
          Email
          <input value={credentials.email} readOnly />
        </label>
        <label>
          Temporary password
          <input value={credentials.temporaryPassword} readOnly />
        </label>

        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={onCopy}>
            <Copy size={17} />
            Copy credentials
          </button>
          <button className="primary-button" type="button" onClick={onClose}>
            Done
          </button>
        </div>
      </section>
    </div>
  );
}

function AuthScreen({
  authForm,
  authMode,
  error,
  message,
  saving,
  setAuthMode,
  submitAuth,
  updateAuthField
}) {
  const isLogin = authMode === "login";

  return (
    <section className="auth-layout">
      <div className="auth-copy">
        <p className="eyebrow">Secure workspace</p>
        <h2>Sign in to manage your employee directory.</h2>
        <p>
          A focused internal dashboard for employee records, built with a clean
          three-tier architecture and ready for DevOps workflows.
        </p>
        <div className="auth-highlights">
          <span><ShieldCheck size={17} />Protected employee APIs</span>
          <span><Users size={17} />Database-backed accounts</span>
          <span><CheckCircle2 size={17} />Admin-only record changes</span>
        </div>
        <div className="home-actions">
          <button className="primary-button" type="button" onClick={() => setAuthMode("login")}>
            <LogIn size={18} />
            Sign in
          </button>
          <button className="secondary-button" type="button" onClick={() => setAuthMode("signup")}>
            <UserPlus size={18} />
            Sign up
          </button>
        </div>
      </div>

      {authMode && <form className="panel auth-panel" onSubmit={submitAuth}>
        <button
          className="icon-button close-button"
          type="button"
          aria-label="Close auth form"
          title="Close"
          onClick={() => setAuthMode(null)}
        >
          <X size={18} />
        </button>

        <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
          <button
            className={isLogin ? "active" : ""}
            type="button"
            onClick={() => setAuthMode("login")}
          >
            <LogIn size={17} />
            Login
          </button>
          <button
            className={!isLogin ? "active" : ""}
            type="button"
            onClick={() => setAuthMode("signup")}
          >
            <UserPlus size={17} />
            Sign up
          </button>
        </div>

        <div className="section-title compact-title">
          <div>
            <p className="eyebrow">{isLogin ? "Welcome back" : "Create account"}</p>
            <h3>{isLogin ? "Login" : "Sign up"}</h3>
          </div>
        </div>

        {!isLogin && (
          <>
            <label>
              Full name
              <input name="name" value={authForm.name} onChange={updateAuthField} required />
            </label>
          </>
        )}

        <label>
          Email
          <input name="email" type="email" value={authForm.email} onChange={updateAuthField} required />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            value={authForm.password}
            onChange={updateAuthField}
            minLength="8"
            required
          />
        </label>

        {message && <div className="notice success">{message}</div>}
        {error && <div className="notice danger">{error}</div>}

        <button className="primary-button" type="submit" disabled={saving}>
          {isLogin ? <LogIn size={18} /> : <UserPlus size={18} />}
          {saving ? "Please wait..." : isLogin ? "Login" : "Create account"}
        </button>
      </form>}
    </section>
  );
}

function Metric({ icon, label, value }) {
  return (
    <div className="metric">
      <span>{icon}</span>
      <strong>{value}</strong>
      <small>{label}</small>
    </div>
  );
}
