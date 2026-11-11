"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Home, AlertTriangle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-white to-gray-100 px-6 text-center">
      {/* Icon Animation */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-center bg-orange-100 text-orange-600 rounded-full p-5 shadow-md"
      >
        <AlertTriangle size={60} />
      </motion.div>

      {/* Title */}
      <h1 className="mt-6 text-5xl font-bold text-gray-800">
        404 - Page Not Found
      </h1>

      {/* Description */}
      <p className="mt-3 text-gray-600 max-w-md">
        The page you’re looking for doesn’t exist, was moved, or might be inactive.
      </p>

      {/* Buttons */}
      <div className="mt-8 flex flex-wrap gap-4 justify-center">
        <Link
          href="/"
          className="flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg shadow transition"
        >
          <Home size={18} />
          Go to Home
        </Link>

      </div>

      {/* Footer */}
      <p className="mt-10 text-sm text-gray-500">Error code: 404</p>
    </div>
  );
}
