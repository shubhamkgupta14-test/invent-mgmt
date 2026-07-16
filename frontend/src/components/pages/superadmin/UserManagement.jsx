import { useCallback, useEffect, useState } from "react";
import {
  FaPen,
  FaPowerOff,
  FaTrash,
  FaUserPlus,
} from "react-icons/fa";
import {
  activateUser,
  createUser,
  deleteUser,
  getUsers,
  updateUserRole,
} from "../../../api/userApi";
import { useToast } from "../../../context/useToast";
import { formatDateTimeIST } from "../../../utils/formatters";
import { defaultPagination, listParams, parseListResponse } from "../../../utils/tableQuery";
import Button from "../../common/Button";
import Card from "../../common/Card";
import DetailModal from "../../common/DetailModal";
import Input from "../../common/Input";
import Modal from "../../common/Modal";
import RoleBadge from "../../common/RoleBadge";
import SearchBar from "../../common/SearchBar";
import Select from "../../common/Select";
import SortableHeader from "../../common/SortableHeader";
import TablePagination from "../../common/TablePagination";

const emptyForm = {
  firstname: "",
  lastname: "",
  username: "",
  email: "",
  password: "",
};

const roleOptions = [
  { label: "User", value: "user" },
  { label: "Admin", value: "admin" },
  { label: "Super Admin", value: "superadmin" },
];

const statusOptions = [
  { label: "Active", value: "true" },
  { label: "Inactive", value: "false" },
];

function UserManagement({ currentUsername }) {
  const { addToast } = useToast();
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortConfig, setSortConfig] = useState({ field: "created_at", order: "desc" });
  const [pagination, setPagination] = useState(defaultPagination);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [editRole, setEditRole] = useState("user");
  const [savingRole, setSavingRole] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [acting, setActing] = useState(false);
  const { page, limit } = pagination;

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getUsers({
        ...listParams({ search, sortConfig, pagination: { page, limit } }),
        role: roleFilter || undefined,
        active: statusFilter || undefined,
      });
      const result = parseListResponse(response);
      setUsers(result.items);
      setPagination((current) => ({ ...current, ...result.pagination }));
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to load users", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast, limit, page, roleFilter, search, sortConfig, statusFilter]);

  useEffect(() => {
    const timer = window.setTimeout(loadUsers, 250);
    return () => window.clearTimeout(timer);
  }, [loadUsers]);

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    try {
      setCreating(true);
      await createUser({ ...form, role: "user", active: true });
      setForm(emptyForm);
      addToast("User created successfully", "success");
      await loadUsers();
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to create user", "error");
    } finally {
      setCreating(false);
    }
  };

  const handleSearch = (value) => {
    setSearch(value);
    setPagination((current) => ({ ...current, page: 1 }));
  };

  const handleSort = (field) => {
    setSortConfig((current) => ({
      field,
      order: current.field === field && current.order === "asc" ? "desc" : "asc",
    }));
    setPagination((current) => ({ ...current, page: 1 }));
  };

  const openRoleModal = (user) => {
    setEditingUser(user);
    setEditRole(user.role || "user");
  };

  const handleRoleUpdate = async (event) => {
    event.preventDefault();
    try {
      setSavingRole(true);
      await updateUserRole(editingUser.username, editRole);
      addToast("User role updated successfully", "success");
      setEditingUser(null);
      await loadUsers();
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to update role", "error");
    } finally {
      setSavingRole(false);
    }
  };

  const confirmAction = async () => {
    if (!pendingAction) return;
    const { type, user } = pendingAction;
    try {
      setActing(true);
      if (type === "activate") {
        await activateUser(user.username);
        addToast("User reactivated successfully", "success");
      } else {
        await deleteUser(user.username, !user.active);
        addToast(
          user.active ? "User deactivated successfully" : "User permanently deleted successfully",
          "success",
        );
      }
      setPendingAction(null);
      setSelectedUser(null);
      await loadUsers();
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to update user", "error");
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="space-y-5">
      <Card title="Create User">
        <form onSubmit={handleCreate} className="grid gap-3 lg:grid-cols-6 lg:items-end">
          <Input label="First Name" value={form.firstname} onChange={(value) => updateForm("firstname", value)} required />
          <Input label="Last Name" value={form.lastname} onChange={(value) => updateForm("lastname", value)} />
          <Input label="Username" value={form.username} onChange={(value) => updateForm("username", value)} required />
          <Input label="Email" type="email" value={form.email} onChange={(value) => updateForm("email", value)} required />
          <Input label="Password" type="password" value={form.password} onChange={(value) => updateForm("password", value)} required />
          <Button type="submit" variant="primary" icon={FaUserPlus} loading={creating} className="w-full">
            Create User
          </Button>
        </form>
        <p className="mt-2 text-xs text-slate-500">New accounts are active with the User role. Passwords require 8+ characters, one letter, one number, and one special character.</p>
      </Card>

      <Card>
        <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px]">
          <SearchBar value={search} onChange={handleSearch} placeholder="Search name, username, email or role" />
          <Select value={roleFilter} onChange={(value) => { setRoleFilter(value); setPagination((current) => ({ ...current, page: 1 })); }} options={roleOptions} placeholder="All roles" />
          <Select value={statusFilter} onChange={(value) => { setStatusFilter(value); setPagination((current) => ({ ...current, page: 1 })); }} options={statusOptions} placeholder="All statuses" />
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-slate-50/70">
                  <SortableHeader label="Name" field="firstname" sortConfig={sortConfig} onSort={handleSort} className="!px-3 !py-2.5" />
                  <SortableHeader label="Username" field="username" sortConfig={sortConfig} onSort={handleSort} className="!px-3 !py-2.5" />
                  <SortableHeader label="Email" field="email" sortConfig={sortConfig} onSort={handleSort} className="!px-3 !py-2.5" />
                  <SortableHeader label="Role" field="role" sortConfig={sortConfig} onSort={handleSort} className="!px-3 !py-2.5" />
                  <SortableHeader label="Status" field="active" sortConfig={sortConfig} onSort={handleSort} className="!px-3 !py-2.5" />
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {!loading && users.map((user) => {
                  const isSelf = user.username === currentUsername;
                  return (
                    <tr key={user.id || user.username} onClick={() => setSelectedUser(user)} className="cursor-pointer border-b border-border transition last:border-0 hover:bg-slate-50/70">
                      <td className="px-3 py-2.5 font-medium text-slate-900">{[user.firstname, user.lastname].filter(Boolean).join(" ") || "-"}</td>
                      <td className="px-3 py-2.5 text-slate-700">{user.username}</td>
                      <td className="max-w-56 truncate px-3 py-2.5 text-slate-700" title={user.email}>{user.email || "-"}</td>
                      <td className="px-3 py-2.5"><RoleBadge role={user.role} /></td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${user.active ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-slate-100 text-slate-600 ring-slate-200"}`}>
                          {user.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-3 py-2" onClick={(event) => event.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => openRoleModal(user)} disabled={isSelf || !user.active} className="rounded-lg p-2 text-indigo-700 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-35" title="Update role"><FaPen size={11} /></button>
                          {!user.active && <button type="button" onClick={() => setPendingAction({ type: "activate", user })} className="rounded-lg p-2 text-emerald-700 hover:bg-emerald-50" title="Reactivate user"><FaPowerOff size={12} /></button>}
                          <button type="button" onClick={() => setPendingAction({ type: "delete", user })} disabled={isSelf || user.role === "superadmin"} className="rounded-lg p-2 text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-35" title={user.active ? "Deactivate user" : "Delete permanently"}><FaTrash size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {loading && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Loading users...</td></tr>}
                {!loading && !users.length && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No users found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <TablePagination pagination={pagination} label="users" onPageChange={(page) => setPagination((current) => ({ ...current, page }))} onLimitChange={(limit) => setPagination((current) => ({ ...current, page: 1, limit }))} disabled={loading} />
      </Card>

      <DetailModal
        isOpen={Boolean(selectedUser)}
        onClose={() => setSelectedUser(null)}
        title={selectedUser?.username || "User Details"}
        sections={[{ title: "User", fields: [
          { label: "Name", value: [selectedUser?.firstname, selectedUser?.lastname].filter(Boolean).join(" ") },
          { label: "Username", value: selectedUser?.username },
          { label: "Email", value: selectedUser?.email },
          { label: "Role", value: selectedUser?.role, render: (value) => <RoleBadge role={value} /> },
          { label: "Status", value: selectedUser?.active ? "Active" : "Inactive" },
          { label: "Created", value: selectedUser?.created_at ? formatDateTimeIST(selectedUser.created_at) : "-" },
        ]}]}
      />

      <Modal isOpen={Boolean(editingUser)} onClose={() => setEditingUser(null)} title="Update User Role">
        <form onSubmit={handleRoleUpdate} className="space-y-5">
          <p className="text-sm text-slate-600">Update the role for <span className="font-semibold text-slate-900">{editingUser?.username}</span>. No other account details will change.</p>
          <Select label="Role" value={editRole} onChange={setEditRole} options={roleOptions} required />
          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <Button variant="ghost" onClick={() => setEditingUser(null)} disabled={savingRole}>Cancel</Button>
            <Button type="submit" loading={savingRole}>Update Role</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={Boolean(pendingAction)} onClose={() => setPendingAction(null)} title={pendingAction?.type === "activate" ? "Confirm Reactivation" : pendingAction?.user.active ? "Confirm Deactivation" : "Confirm Permanent Delete"}>
        <div className="space-y-5">
          <p className="text-sm text-slate-700">
            {pendingAction?.type === "activate" ? "Reactivate" : pendingAction?.user.active ? "Deactivate" : "Permanently delete"} user <span className="font-semibold text-slate-900">{pendingAction?.user.username}</span>?
          </p>
          {pendingAction?.type === "delete" && !pendingAction?.user.active && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-800">This user is already inactive. This action permanently removes the account and cannot be undone.</p>}
          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <Button variant="ghost" onClick={() => setPendingAction(null)} disabled={acting}>Cancel</Button>
            <Button variant={pendingAction?.type === "activate" ? "success" : "danger"} onClick={confirmAction} loading={acting}>{pendingAction?.type === "activate" ? "Reactivate" : pendingAction?.user.active ? "Deactivate" : "Delete Permanently"}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default UserManagement;
