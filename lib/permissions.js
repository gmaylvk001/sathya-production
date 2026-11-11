import dbConnect from "@/lib/db";
import User from "@/models/User";
import "@/models/Role";
import "@/models/Permission";

export async function getUserAccess(userId) {
  const empty = {
    unrestricted: false,
    hasRole: false,
    roleSlug: "",
    permissions: [],
    modules: [],
  };

  if (!userId) {
    return empty;
  }

  await dbConnect();

  const user = await User.findById(userId).populate({
    path: "role",
    populate: {
      path: "permissions",
      select: "name slug module",
    },
  });

  if (!user || user.status !== "Active" || user.user_type !== "admin") {
    return empty;
  }

  if (!user.role) {
    return {
      unrestricted: true,
      hasRole: false,
      roleSlug: "",
      permissions: [],
      modules: [],
    };
  }

  const permissions = user.role.permissions || [];

  return {
    unrestricted: false,
    hasRole: true,
    roleSlug: user.role?.slug || "",
    permissions: permissions.map((permission) => permission?.slug).filter(Boolean),
    modules: [...new Set(permissions.map((permission) => permission?.module).filter(Boolean))],
  };
}

export async function getUserPermissions(userId) {
  const access = await getUserAccess(userId);
  return access.permissions;
}

export async function hasPermission(userId, permissionSlug) {
  if (!permissionSlug) {
    return false;
  }

  const access = await getUserAccess(userId);
  if (access.unrestricted) {
    return true;
  }

  return access.permissions.includes(permissionSlug) || access.modules.includes(permissionSlug);
}

export async function hasAnyPermission(userId, permissionSlugs = []) {
  if (!Array.isArray(permissionSlugs) || permissionSlugs.length === 0) {
    return false;
  }

  const access = await getUserAccess(userId);
  if (access.unrestricted) {
    return true;
  }

  return permissionSlugs.some(
    (slug) => access.permissions.includes(slug) || access.modules.includes(slug)
  );
}

export async function hasAllPermissions(userId, permissionSlugs = []) {
  if (!Array.isArray(permissionSlugs) || permissionSlugs.length === 0) {
    return false;
  }

  const access = await getUserAccess(userId);
  if (access.unrestricted) {
    return true;
  }

  return permissionSlugs.every(
    (slug) => access.permissions.includes(slug) || access.modules.includes(slug)
  );
}
