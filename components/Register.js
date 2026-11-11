"use client";

import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useState } from "react";
import { useRouter } from "next/navigation";

const schema = yup.object().shape({
  mobile: yup
    .string()
    .required("Mobile number is required")
    .matches(/^[0-9]{10}$/, "Mobile number must be 10 digits"),
  name: yup.string().required("Name is required").min(3, "Name must be at least 3 characters"),
  email: yup.string().required("Email is required").email("Invalid email format"),
  password: yup.string().required("Password is required").min(6, "Password must be at least 6 characters"),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref("password"), null], "Passwords must match")
    .required("Confirm password is required"),
});

export default function Register() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  const onSubmit = async (data) => {
    setLoading(true);
    setMessage("");

    try {
      const { confirmPassword, ...userData } = data; // Remove confirmPassword before sending

      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Registration failed");
      }

      setMessage("User registered successfully! ✅");

      setTimeout(() => {
        router.push("/admin/login");
      }, 2000);
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
        <h2 className="text-2xl font-bold text-center text-gray-700 mb-6">Register</h2>

        {message && <p className="text-center text-red-500">{message}</p>}

        <form onSubmit={handleSubmit(onSubmit)}>
          

          <div className="mb-4">
            <label className="block text-gray-700">Name</label>
            <input {...register("name")} type="text" className="w-full px-4 py-2 border rounded-lg" placeholder="Enter your name" />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
          </div>
          <div className="mb-4">
            <label className="block text-gray-700">Mobile Number</label>
            <input {...register("mobile")} type="text" className="w-full px-4 py-2 border rounded-lg" placeholder="Enter your mobile number" />
            {errors.mobile && <p className="text-red-500 text-sm mt-1">{errors.mobile.message}</p>}
          </div>
          <div className="mb-4">
            <label className="block text-gray-700">Email</label>
            <input {...register("email")} type="email" className="w-full px-4 py-2 border rounded-lg" placeholder="Enter your email" />
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
          </div>

          <div className="mb-4">
            <label className="block text-gray-700">Password</label>
            <input {...register("password")} type="password" className="w-full px-4 py-2 border rounded-lg" placeholder="Enter your password" />
            {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
          </div>

          <div className="mb-4">
            <label className="block text-gray-700">Confirm Password</label>
            <input {...register("confirmPassword")} type="password" className="w-full px-4 py-2 border rounded-lg" placeholder="Confirm your password" />
            {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword.message}</p>}
          </div>

          <button type="submit" disabled={loading} className="w-full px-4 py-2 text-white bg-[#d72828] rounded-lg">
            {loading ? "Registering..." : "Register"}
          </button>
        </form>

        <p className="mt-4 text-sm text-center text-gray-600">
          Already have an account? <a href="admin/login" className="text-[#d72828] hover:underline">Login</a>
        </p>
      </div>
    </div>
  );
}
