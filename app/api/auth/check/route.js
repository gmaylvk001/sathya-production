// app/api/auth/check/route.js
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { getUserAccess } from '@/lib/permissions';

export async function GET(req) {
  const token = req.headers.get('Authorization')?.split(' ')[1]; // Extract token from Authorization header

  if (!token) {
    return Response.json({ loggedIn: false }, { status: 200 });
  }

  try {
    // Implement your token verification logic
    const decoded = verifyToken(token);
    await connectDB();
    const userRole = await User.findOne({ _id: decoded.userId }, { name: 1, last_name: 1, email: 1, mobile: 1, user_type: 1, store_id: 1, admin_store_view: 1 });
    if (!userRole) {
      return Response.json({ loggedIn: false }, { status: 200 });
    }

    let access = {
      unrestricted: true,
      hasRole: false,
      permissions: [],
      modules: [],
    };
    if (userRole.user_type === 'admin') {
      try {
        access = await getUserAccess(decoded.userId);
      } catch {
        // keep unrestricted fallback if access lookup fails
      }
    }

    return Response.json({
      loggedIn: true,
      user: decoded, // optional
      userId: decoded.userId,
      role: userRole.user_type,
      phone: userRole.mobile || "",
      name: userRole.name || "",
      last_name: userRole.last_name || "",
      email: userRole.email || decoded.email || "",
      store_id: userRole.store_id || "",
      admin_store_view: userRole.admin_store_view || "sathya",
      // Used by AdminSider (Sathya mode) for role-based menu show/hide
      unrestricted: Boolean(access.unrestricted),
      hasRole: Boolean(access.hasRole),
      roleSlug: access.roleSlug || "",
      permissions: access.permissions || [],
      modules: access.modules || [],
    }, { status: 200 });
  } catch (error) {
    return Response.json({ loggedIn: false }, { status: 200 });
  }
}

// Simple JWT verification example (implement properly)
function verifyToken(token) {
//   return jwt.verify(token, process.env.JWT_SECRET);
// }
// const verifyToken = (token) => {
  if (!token) throw new Error("Authorization token required");
   const jwt = require('jsonwebtoken');
   try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      throw new Error("Token has expired");
    } else {
      throw new Error("Invalid token");
    }
  }
};