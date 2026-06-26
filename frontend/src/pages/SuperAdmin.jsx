import { useEffect, useMemo, useState } from "react";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import Input from "../components/common/Input";
import Loader from "../components/common/Loader";
import Modal from "../components/common/Modal";
import Select from "../components/common/Select";
import {
  activateUser,
  cleanDatabase,
  createUser,
  deleteUser,
  getUserDetails,
  getMyDetails,
  getUsers,
  updateUserRole,
} from "../api/userApi";
import { useToast } from "../context/ToastContext";
import MainLayout from "../layouts/MainLayout";

const roleOptions = [
  { label: "User", value: "user" },
  { label: "Admin", value: "admin" },
  { label: "SuperAdmin", value: "superadmin" },
];

const cleanOptions = [
  { label: "Products", value: "products" },
  { label: "Purchases", value: "purchases" },
  { label: "Sales", value: "sales" },
  { label: "Stocks", value: "stocks" },
  { label: "Suppliers", value: "suppliers" },
  { label: "Audits", value: "audits" },
  { label: "Users", value: "users" },
];

const emptyUserForm = {
  username: "",
  password: "",
  firstname: "",
  lastname: "",
  email: "",
  role: "user",
  active: true,
};

function SuperAdmin() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingUser, setSavingUser] = useState(false);
  const [findingUser, setFindingUser] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [activatingUser, setActivatingUser] = useState(false);
  const [updatingRole, setUpdatingRole] = useState(false);
  const [deletingUser, setDeletingUser] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [userForm, setUserForm] = useState(emptyUserForm);
  const [lookupUsername, setLookupUsername] = useState("");
  const [foundUser, setFoundUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [activateUsername, setActivateUsername] = useState("");
  const [roleForm, setRoleForm] = useState({ username: "", role: "user" });
  const [deleteForm, setDeleteForm] = useState({
    username: "",
    permanent: false,
  });
  const [selectedCollections, setSelectedCollections] = useState([]);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmCleanOpen, setConfirmCleanOpen] = useState(false);
  const [usersModalOpen, setUsersModalOpen] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    let isActive = true;

    getMyDetails()
      .then((response) => {
        if (isActive) setCurrentUser(response.data.data);
      })
      .catch((error) => {
        addToast(error.response?.data?.message || "Failed to load user details", "error");
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [addToast]);

  const selectedCollectionLabels = useMemo(
    () =>
      cleanOptions
        .filter((option) => selectedCollections.includes(option.value))
        .map((option) => option.label)
        .join(", "),
    [selectedCollections],
  );

  const allCollectionsSelected = selectedCollections.length === cleanOptions.length;

  const updateUserForm = (key, value) => {
    setUserForm((current) => ({ ...current, [key]: value }));
  };

  const handleCreateUser = async (event) => {
    event.preventDefault();

    try {
      setSavingUser(true);
      await createUser(userForm);
      addToast("User created successfully", "success");
      setUserForm(emptyUserForm);
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to create user", "error");
    } finally {
      setSavingUser(false);
    }
  };

  const handleFindUser = async (event) => {
    event.preventDefault();

    try {
      setFindingUser(true);
      const response = await getUserDetails(lookupUsername.trim());
      setFoundUser(response.data.data);
    } catch (error) {
      setFoundUser(null);
      addToast(error.response?.data?.message || "Failed to fetch user", "error");
    } finally {
      setFindingUser(false);
    }
  };

  const handleGetAllUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await getUsers();
      setUsers(response.data.data || []);
      setUsersModalOpen(true);
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to fetch users", "error");
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleUpdateRole = async (event) => {
    event.preventDefault();

    try {
      setUpdatingRole(true);
      await updateUserRole(roleForm.username.trim(), roleForm.role);
      addToast("User role updated successfully", "success");
      setRoleForm({ username: "", role: "user" });
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to update role", "error");
    } finally {
      setUpdatingRole(false);
    }
  };

  const handleActivateUser = async (event) => {
    event.preventDefault();

    try {
      setActivatingUser(true);
      await activateUser(activateUsername.trim());
      addToast("User activated successfully", "success");
      setActivateUsername("");
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to activate user", "error");
    } finally {
      setActivatingUser(false);
    }
  };

  const handleDeleteUser = async () => {
    try {
      setDeletingUser(true);
      await deleteUser(deleteForm.username.trim(), deleteForm.permanent);
      addToast(
        deleteForm.permanent
          ? "User permanently deleted successfully"
          : "User deactivated successfully",
        "success",
      );
      setDeleteForm({ username: "", permanent: false });
      setConfirmDeleteOpen(false);
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to delete user", "error");
    } finally {
      setDeletingUser(false);
    }
  };

  const toggleCollection = (collection) => {
    setSelectedCollections((current) =>
      current.includes(collection)
        ? current.filter((item) => item !== collection)
        : [...current, collection],
    );
  };

  const toggleAllCollections = () => {
    setSelectedCollections((current) =>
      current.length === cleanOptions.length
        ? []
        : cleanOptions.map((option) => option.value),
    );
  };

  const handleCleanDatabase = async () => {
    try {
      setCleaning(true);
      await cleanDatabase(selectedCollections);
      addToast("Selected data cleaned successfully", "success");
      setSelectedCollections([]);
      setConfirmCleanOpen(false);
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to clean database", "error");
    } finally {
      setCleaning(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex min-h-[calc(100vh-88px)] items-center justify-center">
          <Loader message="Loading admin tools..." />
        </div>
      </MainLayout>
    );
  }

  if (currentUser?.role !== "superadmin") {
    return (
      <MainLayout>
        <Card>
          <p className="text-sm font-medium text-slate-700">
            Only superadmin users can access this page.
          </p>
        </Card>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">SuperAdmin</h1>
          <p className="mt-1 text-slate-600">Manage users, roles, and database tools.</p>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <div className="space-y-6">
            <Card title="Create User">
              <form onSubmit={handleCreateUser} className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label="First Name"
                    value={userForm.firstname}
                    onChange={(value) => updateUserForm("firstname", value)}
                    required
                  />
                  <Input
                    label="Last Name"
                    value={userForm.lastname}
                    onChange={(value) => updateUserForm("lastname", value)}
                  />
                  <Input
                    label="Username"
                    value={userForm.username}
                    onChange={(value) => updateUserForm("username", value)}
                    required
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={userForm.email}
                    onChange={(value) => updateUserForm("email", value)}
                    required
                  />
                  <Input
                    label="Password"
                    type="password"
                    value={userForm.password}
                    onChange={(value) => updateUserForm("password", value)}
                    required
                  />
                  <Select
                    label="Role"
                    value={userForm.role}
                    onChange={(value) => updateUserForm("role", value)}
                    options={roleOptions}
                    required
                  />
                </div>

                <label className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={userForm.active}
                    onChange={(event) => updateUserForm("active", event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)]"
                  />
                  Active
                </label>

                <Button type="submit" variant="primary" loading={savingUser}>
                  Create User
                </Button>
              </form>
            </Card>

            <Card title="Activate User">
              <form onSubmit={handleActivateUser} className="space-y-5">
                <Input
                  label="Username"
                  value={activateUsername}
                  onChange={setActivateUsername}
                  required
                />
                <Button
                  type="submit"
                  variant="success"
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                  loading={activatingUser}
                  disabled={!activateUsername.trim()}
                >
                  Activate User
                </Button>
              </form>
            </Card>

            <Card title="Delete User">
              <div className="space-y-5">
                <Input
                  label="Username"
                  value={deleteForm.username}
                  onChange={(value) =>
                    setDeleteForm((current) => ({ ...current, username: value }))
                  }
                  required
                />
                <label className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={deleteForm.permanent}
                    onChange={(event) =>
                      setDeleteForm((current) => ({
                        ...current,
                        permanent: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-600"
                  />
                  Permanent delete
                </label>
                <Button
                  type="button"
                  variant="danger"
                  className="bg-rose-600 text-white hover:bg-rose-700"
                  disabled={!deleteForm.username.trim()}
                  onClick={() => setConfirmDeleteOpen(true)}
                >
                  Delete User
                </Button>
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card title="Find User">
              <form onSubmit={handleFindUser} className="space-y-5">
                <Input
                  label="Username"
                  value={lookupUsername}
                  onChange={setLookupUsername}
                  required
                />
                <div className="flex flex-wrap gap-3">
                  <Button
                    type="submit"
                    variant="primary"
                    className="bg-indigo-600 text-white hover:bg-indigo-700"
                    loading={findingUser}
                    disabled={!lookupUsername.trim()}
                  >
                    Get User Info
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    className="bg-sky-600 text-white hover:bg-sky-700"
                    loading={loadingUsers}
                    onClick={handleGetAllUsers}
                  >
                    Get All Users
                  </Button>
                </div>
              </form>

              {foundUser && (
                <div className="mt-5 rounded-xl border border-border bg-slate-50 p-4">
                  <div className="grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-500">
                        Name
                      </p>
                      <p className="font-semibold text-slate-900">
                        {[foundUser.firstname, foundUser.lastname]
                          .filter(Boolean)
                          .join(" ") || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-500">
                        Username
                      </p>
                      <p className="font-semibold text-slate-900">
                        {foundUser.username}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-500">
                        Email
                      </p>
                      <p className="font-semibold text-slate-900">
                        {foundUser.email || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-500">
                        Role
                      </p>
                      <p className="font-semibold capitalize text-slate-900">
                        {foundUser.role}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-500">
                        Status
                      </p>
                      <p className="font-semibold text-slate-900">
                        {foundUser.active ? "Active" : "Inactive"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </Card>

            <Card title="Update Role">
              <form onSubmit={handleUpdateRole} className="space-y-5">
                <Input
                  label="Username"
                  value={roleForm.username}
                  onChange={(value) =>
                    setRoleForm((current) => ({ ...current, username: value }))
                  }
                  required
                />
                <Select
                  label="Role"
                  value={roleForm.role}
                  onChange={(value) =>
                    setRoleForm((current) => ({ ...current, role: value }))
                  }
                  options={roleOptions}
                  required
                />
                <Button
                  type="submit"
                  variant="primary"
                  loading={updatingRole}
                  disabled={!roleForm.username.trim()}
                >
                  Update Role
                </Button>
              </form>
            </Card>

            <Card title="Clean DB">
              <div className="space-y-5">
                <label className="flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-bold text-indigo-800">
                  <input
                    type="checkbox"
                    checked={allCollectionsSelected}
                    onChange={toggleAllCollections}
                    className="h-4 w-4 rounded border-indigo-300 text-[var(--primary)] focus:ring-[var(--primary)]"
                  />
                  Select All
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {cleanOptions.map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-3 rounded-xl border border-border bg-white px-4 py-3 text-sm font-semibold text-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCollections.includes(option.value)}
                        onChange={() => toggleCollection(option.value)}
                        className="h-4 w-4 rounded border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)]"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>

                <Button
                  type="button"
                  variant="danger"
                  className="bg-rose-600 text-white hover:bg-rose-700"
                  disabled={!selectedCollections.length}
                  onClick={() => setConfirmCleanOpen(true)}
                >
                  Clean Selected
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>

      <Modal
        isOpen={usersModalOpen}
        onClose={() => setUsersModalOpen(false)}
        title="All Users"
        size="4xl"
      >
        <div className="overflow-hidden rounded-2xl border border-border bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-slate-50/70">
                  <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Name
                  </th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Username
                  </th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Email
                  </th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Role
                  </th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id || user.username}
                    className="border-b border-border last:border-0"
                  >
                    <td className="px-5 py-4 font-semibold text-slate-900">
                      {[user.firstname, user.lastname].filter(Boolean).join(" ") || "-"}
                    </td>
                    <td className="px-5 py-4 text-slate-700">{user.username}</td>
                    <td className="px-5 py-4 text-slate-700">{user.email || "-"}</td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold capitalize text-indigo-700">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          user.active
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {user.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
                {!users.length && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-8 text-center text-sm text-slate-500"
                    >
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        title="Confirm Delete User"
      >
        <div className="space-y-5">
          <p className="text-sm text-slate-700">
            This will{" "}
            <span className="font-semibold text-slate-900">
              {deleteForm.permanent ? "permanently delete" : "deactivate"}
            </span>{" "}
            user{" "}
            <span className="font-semibold text-slate-900">
              {deleteForm.username}
            </span>
            .
          </p>
          {deleteForm.permanent && (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
              Permanent delete is only allowed after the user is already inactive.
            </p>
          )}
          <div className="flex justify-end gap-3 border-t border-border pt-5">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmDeleteOpen(false)}
              disabled={deletingUser}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              className="bg-rose-600 text-white hover:bg-rose-700"
              loading={deletingUser}
              onClick={handleDeleteUser}
            >
              Delete User
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={confirmCleanOpen}
        onClose={() => setConfirmCleanOpen(false)}
        title="Confirm Clean DB"
      >
        <div className="space-y-5">
          <p className="text-sm text-slate-700">
            This will permanently delete data from:{" "}
            <span className="font-semibold text-slate-900">
              {selectedCollectionLabels}
            </span>
            .
          </p>
          {selectedCollections.includes("users") && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
              Your current superadmin account will be kept.
            </p>
          )}
          <div className="flex justify-end gap-3 border-t border-border pt-5">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmCleanOpen(false)}
              disabled={cleaning}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              className="bg-rose-600 text-white hover:bg-rose-700"
              loading={cleaning}
              onClick={handleCleanDatabase}
            >
              Delete Permanently
            </Button>
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
}

export default SuperAdmin;
