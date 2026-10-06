import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader, Card, Th, Td, Empty } from "@/components/UI";

export default function Users() {
  const [users, setUsers] = useState([]);
  useEffect(() => { api.get("/users").then((r) => setUsers(r.data)); }, []);

  return (
    <div>
      <PageHeader testid="users-page" title="Users" subtitle="System accounts across all roles." />
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <Th>Name</Th><Th>Email</Th><Th>Role</Th><Th>Created</Th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={4}><Empty /></td></tr>
              ) : users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <Td className="font-medium text-gray-900">{u.name}</Td>
                  <Td className="text-gray-600 font-mono text-xs">{u.email}</Td>
                  <Td className="capitalize">{u.role}</Td>
                  <Td className="text-gray-500">{u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
