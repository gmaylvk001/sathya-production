"use client";

import { use } from "react";
import RoleForm from "../../../components/roles/RoleForm";

export default function EditRolePage({ params }) {
  const { roleId } = use(params);
  return <RoleForm roleId={roleId} />;
}
