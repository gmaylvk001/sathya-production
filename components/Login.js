"use client";

import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useState } from "react";
import { useRouter } from "next/navigation";
const schema = yup.object().shape({
  email: yup.string().required("Email is required").email("Invalid email format"),
  password: yup.string().required("Password is required").min(6, "Password must be at least 6 characters"),
});

export default function Login() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter()

  const onSubmit = async (data) => {
    setLoading(true);
    setMessage("");

    try {
      console.log(data);
      const res = await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: data && JSON.stringify(data),
        });
        console.log(res);

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Login failed");
      }

      setMessage("Login successful! ✅");
      setTimeout(()=>{
        router.push('/admin/dashboard')
      },2000)
    } catch (error) {
      console.log(error);
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center text-gray-700 mb-6">Login</h2>

        {message && <p className="text-center text-red-500">{message}</p>}

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="mb-4">
            <label className="block text-gray-700">Email</label>
            <input {...register("email")} type="email" className="w-full px-4 py-2 border rounded-lg" placeholder="Enter your email" />
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
          </div>

          <div className="mb-4 relative">
            <label className="block text-gray-700">Password</label>
            <input
              {...register("password")}
              type={showPassword ? "text" : "password"}
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="Enter your password"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-9 text-gray-500">
              {showPassword ? "🙈" : "👁️"}
            </button>
            {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
          </div>

          <button type="submit" disabled={loading} className="w-full px-4 py-2 text-white bg-[#d72828] rounded-lg">
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="mt-4 text-sm text-center text-gray-600">
          Don't have an account? <a href="/admin" className="text-[#d72828] hover:underline">Register</a>
        </p>
      </div>
    </div>
  );
}
