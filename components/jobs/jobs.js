"use client";

import { useState, useEffect } from "react";
import {
  FaChartLine,
  FaStore,
  FaGraduationCap,
  FaArrowTrendUp,
  FaUserTie,
  FaUsersGear,
  FaHeadset,
  FaCalculator,
} from "react-icons/fa6";

export default function ContactBEA() {
  const [form, setForm] = useState({
    name: "",
    mobile_number: "",
    email: "",
    city: "",
    job_post: "",
    resume: null,
    _hp: "",
  });

  const whyWork = [
  {
    icon: FaChartLine,
    title: "Growth Opportunities",
    desc: "Learn, grow and build your career with a fast-growing retail brand.",
    color: "text-[#d72828]",
    bg: "bg-red-50",
  },
  {
    icon: FaStore,
    title: "47+ Store Network",
    desc: "Be part of one of Tamil Nadu's leading electronics retail chains.",
    color: "text-green-500",
    bg: "bg-green-50",
  },
  {
    icon: FaGraduationCap,
    title: "Training & Development",
    desc: "Regular product, sales and leadership training to help you excel.",
    color: "text-orange-500",
    bg: "bg-orange-50",
  },
  {
    icon: FaArrowTrendUp,
    title: "Career Progression",
    desc: "From sales executive to future leaders – we grow together.",
    color: "text-purple-500",
    bg: "bg-purple-50",
  },
];

const opportunities = [
  {
    icon: FaUserTie,
    title: "Sales Executive",
    dept: "Retail Sales",
    color: "text-[#d72828]",
  },
  {
    icon: FaUsersGear,
    title: "Store Manager",
    dept: "Store Operations",
    color: "text-green-600",
  },
  {
    icon: FaHeadset,
    title: "Customer Support",
    dept: "Service & Experience",
    color: "text-orange-600",
  },
  {
    icon: FaCalculator,
    title: "Accounts & Operations",
    dept: "Finance & Admin",
    color: "text-purple-600",
  },
];

  const [formLoadTime] = useState(() => Date.now());

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [responseMsg, setResponseMsg] = useState("");
  const [touched, setTouched] = useState({});
  const [fileKey, setFileKey] = useState(0);

  const [jobPositions, setJobPositions] = useState([]);

  useEffect(() => {
    const fetchJobPositions = async () => {
      const res = await fetch("/api/job-position");
      const data = await res.json();
      setJobPositions(data.data || []);
    };
    fetchJobPositions();
  }, []);

  const handleBlur = (e) => {
    setTouched({ ...touched, [e.target.name]: true });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "mobile_number") {
      const digits = value.replace(/\D/g, "").slice(0, 10);
      setForm({ ...form, mobile_number: digits });
      setTouched((prev) => ({ ...prev, mobile_number: true }));
      if (!digits) {
        setErrors((prev) => ({ ...prev, mobile_number: "" }));
      } else if (!/^[6-9]\d{9}$/.test(digits)) {
        setErrors((prev) => ({ ...prev, mobile_number: "Invalid Mobile Number" }));
      } else {
        setErrors((prev) => { const { mobile_number: _, ...rest } = prev; return rest; });
      }
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];

    if (file) {
      const allowed = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];

      if (!allowed.includes(file.type)) {
        setErrors({ ...errors, resume: "Only PDF or DOCX files are allowed" });
        setForm({ ...form, resume: null });
        return;
      }

      setErrors({ ...errors, resume: null });
      setForm({ ...form, resume: file });
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!form.name.trim()) newErrors.name = "Name is required";

    if (!form.mobile_number.trim()) {
      newErrors.mobile_number = "Contact number is required";
    } else if (!/^[6-9]\d{9}$/.test(form.mobile_number)) {
      newErrors.mobile_number = "Invalid Mobile Number";
    }

    if (!form.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      newErrors.email = "Enter a valid email";
    }

    if (!form.city.trim()) newErrors.city = "City is required";

    if (!form.job_post.trim()) newErrors.job_post = "Please select a job post";

    if (!form.resume) newErrors.resume = "Resume (PDF/DOCX) is required";

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const allTouched = Object.keys(form).reduce((acc, key) => ({ ...acc, [key]: true }), {});
    setTouched(allTouched);

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    // Honeypot check — bots fill hidden fields, humans don't
    if (form._hp) return;

    // Timing check — bots submit too fast
    if (Date.now() - formLoadTime < 3000) {
      setResponseMsg("Please take a moment before submitting.");
      return;
    }

    setLoading(true);

    try {
      const body = new FormData();
      body.append("name", form.name);
      body.append("mobile_number", form.mobile_number);
      body.append("email", form.email);
      body.append("city", form.city);
      body.append("job_post", form.job_post);
      body.append("resume", form.resume);

      const res = await fetch("/api/careers/add", {
        method: "POST",
        body,
      });

      const data = await res.json();

      if (res.ok) {
        setResponseMsg("Submitted successfully!");
        setForm({
          name: "",
          mobile_number: "",
          email: "",
          city: "",
          job_post: "",
          resume: null,
          _hp: "",
        });
        setTouched({});
        setFileKey((k) => k + 1);
      } else {
        setResponseMsg(data.message || "Failed to submit");
      }
    } catch (err) {
      setResponseMsg("Server error");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (field) =>
    `w-full border rounded-md px-3 py-2 focus:outline-none ${
      errors[field] ? "border-red-500" : "border-gray-300"
    }`;

  return (
    <>
     <section className="relative overflow-hidden bg-gradient-to-r from-[#001b5e] via-[#002b8f] to-[#003ccf]">
 <div className="w-full px-4 md:px-8 lg:px-12">

    <div className="grid lg:grid-cols-2 items-center min-h-[480px]">

      {/* LEFT CONTENT */}
      <div className="relative z-10 py-12 lg:py-0">

        <span className="inline-block px-4 py-1 text-xs font-semibold text-white border border-white/30 rounded-full mb-6">
          #Sathya Stores CAREERS
        </span>

        <h1 className="text-4xl md:text-5xl lg:text-5xl font-bold text-white leading-tight">
          Build Your Future
          <br />
          With
          <span className="text-[#2f7cff]"> Sathya Stores</span>
        </h1>

        <p className="mt-1 text-lg text-white/80 max-w-xl">
          Join Tamil Nadu's leading electronics retail chain and grow
          with a team that believes in innovation, customer service,
          and career development.
        </p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 mt-1">

          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full border border-white/30 flex items-center justify-center text-2xl">
              🏬
            </div>
            <div>
              <h4 className="text-3xl font-bold text-white">47+</h4>
              <p className="text-sm text-white/70">
                Stores Across
                <br />
                Tamil Nadu
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full border border-white/30 flex items-center justify-center text-2xl">
              🛡️
            </div>
            <div>
              <h4 className="text-3xl font-bold text-white">25+</h4>
              <p className="text-sm text-white/70">
                Years
                <br />
                Of Trust
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full border border-white/30 flex items-center justify-center text-2xl">
              👥
            </div>
            <div>
              <h4 className="text-3xl font-bold text-white">1000+</h4>
              <p className="text-sm text-white/70">
                Team Members
                <br />
                Growing
              </p>
            </div>
          </div>

        </div>

        <button className="mt-10 bg-[#2f7cff] hover:bg-[#2465db] text-white font-semibold px-8 py-4 rounded-xl transition">
          Apply Now →
        </button>

      </div>

      {/* RIGHT IMAGE */}
      <div className="relative flex justify-center lg:justify-end">

        {/* Curve Background */}
        <div className="absolute border border-[#d72828]/40"></div>

        <div className="relative flex justify-end">
  <img
    src="/uploads/career.png"
    alt="Sathya Stores Team"
    className="w-full max-w-[700px] h-auto object-cover"
    style={{
      clipPath: "ellipse(50% 48% at 50% 50%)",
    }}
  />
</div>

      </div>

    </div>

  </div>
</section>

   
    <div className="w-full max-w-full sm:max-w-[720px] md:max-w-[960px] lg:max-w-[1320px] xl:max-w-[1520px] 2xl:max-w-[1680px] mx-auto px-0 sm:px-3 md:px-6 lg:px-8">
     
<section className="py-3 bg-white">
<div className="max-w-12xl mx-auto px-4 md:px-6">

    <h2 className="text-center text-2xl font-bold text-[#001B5E]">
      Why Work With Sathya Stores?
    </h2>

    <div className="w-20 h-1 bg-[#d72828] mx-auto mt-3 mb-5 rounded-full"></div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

      {whyWork.map((item, index) => {
        const Icon = item.icon;

        return (
          <div
            key={index}
            className="bg-white border rounded-2xl p-8 text-center hover:shadow-xl transition"
          >
            <div
              className={`w-16 h-16 mx-auto mb-5 rounded-full flex items-center justify-center ${item.bg}`}
            >
              <Icon className={`${item.color} text-4xl`} />
            </div>

            <h3 className="font-bold text-md text-[#001B5E] mb-2">
              {item.title}
            </h3>

            <p className="text-gray-600 leading-7">
              {item.desc}
            </p>
          </div>
        );
      })}
    </div>
  </div>
</section>

<section className="py-3 bg-[#f8faff]">
  <div className="max-w-12xl mx-auto px-4 md:px-6">

    <h2 className="text-center text-2xl font-bold text-[#001B5E]">
      Explore Opportunities
    </h2>

    <div className="w-20 h-1 bg-[#d72828] mx-auto mt-3 mb-5 rounded-full"></div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

      {opportunities.map((job, index) => {
        const Icon = job.icon;

        return (
          <div
            key={index}
            className="bg-white rounded-2xl border p-8 text-center hover:shadow-xl transition"
          >
            <Icon
              className={`${job.color} text-6xl mx-auto mb-5`}
            />

            <h3 className="font-bold text-xl text-[#001B5E] mb-1">
              {job.title}
            </h3>

            <p className="text-gray-500 mb-3">
              {job.dept}
            </p>

            <div className="flex justify-center gap-2 mb-3 flex-wrap">
              <span className="bg-red-50 text-[#d72828] px-3 py-1 rounded-full text-xs font-medium">
                Full Time
              </span>

              <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-medium">
                Multiple Locations
              </span>
            </div>

            <button className="font-semibold text-[#d72828] hover:text-[#d72828]">
              Apply Now →
            </button>
          </div>
        );
      })}
    </div>
  </div>
</section>


<section className="py-5 bg-white">
 <div className="max-w-12xl mx-auto px-4 md:px-6">

    <div className="grid lg:grid-cols-2 gap-8">

      {/* LIFE AT Sathya Stores */}
      <div className="bg-white border rounded-2xl p-6">

        <h2 className="text-3xl font-bold text-[#001B5E] mb-2">
          Life at Sathya Stores
        </h2>

        <div className="w-16 h-1 bg-[#d72828] rounded-full mb-4"></div>

        <p className="text-gray-600 mb-6">
          More than a workplace — <br/>a team growing together.
        </p>

        <div className="mt-4">
  <img
    src="/uploads/aboutus-all-own-created-images.png"
    alt="Life at Sathya Stores"
    className="w-full rounded-xl object-cover"
  />
          {/* <img
            src="/uploads/life2.jpg"
            alt=""
            className="rounded-xl h-[180px] w-full object-cover"
          />

          <img
            src="/uploads/life3.jpg"
            alt=""
            className="rounded-xl h-[180px] w-full object-cover"
          />

          <img
            src="/uploads/life4.jpg"
            alt=""
            className="rounded-xl h-[180px] w-full object-cover"
          /> */}
        </div>

      </div>

      {/* START YOUR JOURNEY */}
      <div className="bg-white border rounded-2xl p-6 shadow-sm overflow-hidden">

        <h2 className="text-3xl font-bold text-center text-[#001B5E] mb-2">
          Start Your Sathya Stores Journey
        </h2>

        <div className="w-16 h-1 bg-[#d72828] rounded-full mx-auto mb-8"></div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Honeypot — hidden from humans, bots fill it */}
          <input type="text" name="_hp" value={form._hp} onChange={handleChange} style={{ display: "none" }} tabIndex={-1} autoComplete="off" />

          <div className="grid md:grid-cols-2 gap-4">

            {/* Full Name */}
            <div>
              <label className="text-sm font-medium">
                Full Name <span className="text-red-500">*</span>
              </label>

              <input type="text" name="name" value={form.name} onChange={handleChange} onBlur={handleBlur} className={inputClass("name")} />
              {errors.name && ( <p className="text-red-500 text-sm mt-1">{errors.name}</p>)}
            </div>

            {/* Mobile */}
            <div>
              <label className="text-sm font-medium">
                Mobile Number <span className="text-red-500">*</span>
              </label>

              <div className="flex gap-2">
                <select className="border rounded-lg px-2">
                  <option>+91</option>
                </select>
                 <input type="text" name="mobile_number" value={form.mobile_number} onChange={handleChange} onBlur={handleBlur} className={inputClass("mobile_number")}/>
              </div>
              {errors.mobile_number && (<p className="text-red-500 text-sm mt-1">{errors.mobile_number}</p>)}
            </div>

            {/* Email */}
            <div>
              <label className="text-sm font-medium">
                Email <span className="text-red-500">*</span>
              </label>
              <input type="email" name="email" value={form.email} onChange={handleChange} onBlur={handleBlur} className={inputClass("email")}/>
              {errors.email && (<p className="text-red-500 text-sm mt-1">{errors.email}</p>)}
            </div>

            {/* City */}
            <div>
              <label className="text-sm font-medium">
                City <span className="text-red-500">*</span>
              </label>

              <input
              type="text"
              name="city"
              value={form.city}
              onChange={handleChange}
              onBlur={handleBlur}
              className={inputClass("city")}
            />
            {errors.city && (
              <p className="text-red-500 text-sm mt-1">{errors.city}</p>
            )}
            </div>

            {/* Preferred Location
            <div>
              <label className="text-sm font-medium">
                Preferred Location
              </label>

              <select className="w-full border rounded-lg px-3 py-2">
                <option>-- Select Preferred Location --</option>
                <option>Chennai</option>
                <option>Coimbatore</option>
                <option>Madurai</option>
              </select>
            </div>

            Department
            <div>
              <label className="text-sm font-medium">
                Department
              </label>

              <select className="w-full border rounded-lg px-3 py-2">
                <option>-- Select Department --</option>
                <option>Sales</option>
                <option>Operations</option>
                <option>Support</option>
              </select>
            </div> */}

            {/* Job Position */}
            <div>
              <label className="text-sm font-medium">
                Job Position
                <span className="text-red-500">*</span>
              </label>

              <select
    name="job_post"
    value={form.job_post}
    onChange={handleChange}
    className={`${inputClass("job_post")} bg-white`}
  >
    <option value="">-- Select Job Position --</option>

    {jobPositions.length > 0 ? (
      jobPositions
        .filter((job) => job.status === "Active") // Optional: only show active ones
        .map((job) => (
          <option key={job._id} value={job.position_name}>
            {job.position_name}
          </option>
        ))
    ) : (
      <option disabled>Loading...</option>
    )}
  </select>

  {errors.job_post && (
    <p className="text-red-500 text-sm mt-1">{errors.job_post}</p>
  )}
            </div>

            <div>

            <label className="text-sm font-medium">
              Upload Resume (PDF/DOCX)
              <span className="text-red-500">*</span>
            </label>

            <input
              key={fileKey}
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFileChange}
              className="p-2"
            />


            {form.resume && (
              <p className="text-green-600 text-sm mt-1">
                {form.resume.name}
              </p>
            )}
          </div>

            {/* Experience */}
            {/* <div>
              <label className="text-sm font-medium">
                Experience
              </label>

              <select className="w-full border rounded-lg px-3 py-2">
                <option>-- Select Experience --</option>
                <option>Fresher</option>
                <option>1-3 Years</option>
                <option>3-5 Years</option>
                <option>5+ Years</option>
              </select>
            </div> */}

          </div>

          {/* Resume */}
          {/* <div className="mt-5">

            <label className="text-sm font-medium">
              Upload Resume (PDF/DOCX)
              <span className="text-red-500">*</span>
            </label>

            <input
              key={fileKey}
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFileChange}
              className="w-full mt-2 border rounded-lg p-2"
            />

            <p className="text-xs text-gray-500 mt-1">
              Max size: 5MB
            </p>

            {form.resume && (
              <p className="text-green-600 text-sm mt-1">
                {form.resume.name}
              </p>
            )}
          </div> */}

          {/* Declaration */}
          <div className="flex items-start gap-2 mt-5">

            <input type="checkbox" />

            <label className="text-sm text-gray-600">
              I hereby declare that the above information is
              true to the best of my knowledge.
            </label>

          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 bg-[#0A46D8] hover:bg-[#0839b2] text-white py-3 rounded-lg font-semibold"
          >
            {loading
              ? "Submitting..."
              : "Submit Application"}
          </button>

          {responseMsg && (
            <p className="text-center mt-3 text-green-600">
              {responseMsg}
            </p>
          )}

        </form>

      </div>

    </div>

  </div>
</section>
    </div>
     </>
  );
}
