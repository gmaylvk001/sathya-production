"use client";

import React, { useMemo, useState } from "react";
import {
  getSuperOfferContactForState,
  SUPER_OFFER_CONTACT_EMAIL,
  SUPER_OFFER_CONTACT_SOCIAL,
} from "@/lib/superOfferContactConfig";

const MESSAGE_MAX = 180;
const LEAD_TITLE_PREFIX = "Deals Offer Enquiry";

function getCookie(name) {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : "";
}

function buildFullName(firstName, lastName) {
  return `${String(firstName || "").trim()} ${String(lastName || "").trim()}`.trim();
}

function PhoneIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
      />
    </svg>
  );
}

function EmailIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  );
}

function ThumbsUpIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path d="M2 20h2c.55 0 1-.45 1-1v-9c0-.55-.45-1-1-1H2v11zm19.83-7.12c.11-.25.17-.52.17-.8V11c0-1.1-.9-2-2-2h-5.5l.92-4.65c.05-.22.02-.46-.08-.66a1.99 1.99 0 00-1.39-1.04c-.34-.08-.69.02-.95.25l-5.18 5.18A2.01 2.01 0 006 9.83V18c0 1.1.9 2 2 2h7.55c.74 0 1.41-.41 1.75-1.06l3.53-7.06z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z" />
    </svg>
  );
}

function TwitterIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 01-1.93.07 4.28 4.28 0 004 2.98 8.521 8.521 0 01-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 01-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 017.8 2m-.2 2A3.6 3.6 0 004 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 003.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6m9.65 1.5a1.25 1.25 0 110 2.5 1.25 1.25 0 010-2.5M12 7a5 5 0 110 10 5 5 0 010-10m0 2a3 3 0 100 6 3 3 0 000-6z" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

/**
 * Contact Us panel for Super Offers pages.
 * Phone: lib/superOfferContactConfig (state → TN default).
 * Submit: same as Exist #offer-enquire → POST /api/connect-store-location
 * (Eywa CRM → insert `leads` on Success).
 */
export default function SuperOfferContactSection({
  stateSlug,
  offerName = "this offer",
}) {
  const contact = useMemo(
    () => getSuperOfferContactForState(stateSlug),
    [stateSlug]
  );

  const offerLabel = String(offerName || "this offer").trim() || "this offer";
  const leadTitle = `${LEAD_TITLE_PREFIX} - ${offerLabel}`;
  const whatsappHref = `https://wa.me/${contact.phoneTel.replace(/\D/g, "")}`;

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const onChange = (e) => {
    const { name, value } = e.target;
    if (name === "message" && value.length > MESSAGE_MAX) return;
    if (name === "phone") {
      const digits = value.replace(/\D/g, "").slice(0, 10);
      setForm((prev) => ({ ...prev, phone: digits }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
    if (formError) setFormError("");
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    setFormError("");
    setSuccessMessage("");

    const name = buildFullName(form.firstName, form.lastName);
    const email = String(form.email || "").trim();
    const mobile = String(form.phone || "").replace(/\D/g, "");
    const message = String(form.message || "").trim();

    if (!name || !/^[a-zA-Z0-9\s.,/]*$/.test(name)) {
      setFormError("Please enter a valid first and last name.");
      return;
    }
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setFormError("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFormError("Please enter a valid email address.");
      return;
    }
    if (!message) {
      setFormError("Please enter your message.");
      return;
    }
    if (message.length > MESSAGE_MAX) {
      setFormError(`Message must be ${MESSAGE_MAX} characters or less.`);
      return;
    }

    const referrel_url =
      typeof window !== "undefined" ? window.location.href : "";

    let utm_source = "";
    let utm_campaign = "";
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      utm_source = params.get("utm_source") || "";
      utm_campaign = params.get("utm_campaign") || "";
    }
    // Exist #offer-enquire: empty utm_source → "Website"
    if (!utm_source.trim()) utm_source = "Website";

    setSubmitting(true);
    try {
      const res = await fetch("/api/connect-store-location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          mobile,
          message,
          lead_title: leadTitle,
          product: offerLabel,
          referrel_url,
          utm_source,
          utm_campaign,
          doc: getCookie("emaduuid") || "",
          cookie_id: getCookie("emaduuid") || "",
        }),
      });
      const data = await res.json().catch(() => null);

      if (res.ok && data?.success) {
        setSuccessMessage(
          "Thank you! Your enquiry has been submitted successfully."
        );
        setForm({
          firstName: "",
          lastName: "",
          phone: "",
          email: "",
          message: "",
        });
        return;
      }

      setFormError(
        data?.message ||
          "Unable to submit your enquiry. Please try again."
      );
    } catch (err) {
      console.error("Super offer enquiry submit error:", err);
      setFormError("Something went wrong. Please try again later.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full rounded-md border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 outline-none transition focus:border-[#d72828] focus:ring-1 focus:ring-[#d72828]/50 disabled:bg-gray-50 disabled:text-gray-500";

  return (
    <section className="w-full py-10 sm:py-14" aria-labelledby="super-offer-contact-heading">
      <div className="overflow-hidden rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-gray-100 bg-white">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          {/* Left — contact info */}
          <div className="relative overflow-hidden bg-[#d72828] px-7 py-9 sm:px-10 sm:py-11 text-white">
            {/* decorative circles */}
            <div
              className="pointer-events-none absolute -bottom-16 -right-10 h-56 w-56 rounded-full border-[40px] border-white/10"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-28 right-16 h-48 w-48 rounded-full border-[36px] border-white/10"
              aria-hidden
            />

            <div className="relative z-10 flex h-full flex-col">
              <span className="inline-flex w-fit items-center rounded-full border border-white/70 px-3.5 py-1 text-[11px] font-semibold tracking-[0.12em] uppercase">
                Get in Touch
              </span>

              <h2
                id="super-offer-contact-heading"
                className="mt-5 text-2xl sm:text-3xl md:text-[2rem] font-extrabold tracking-wide uppercase leading-tight"
              >
                Let&apos;s Stay Connected
              </h2>

              <p className="mt-3 text-sm sm:text-[15px] text-white/90 leading-relaxed max-w-md">
                Have a question about{" "}
                <span className="font-bold text-white">{offerLabel}</span>? Our team
                is happy to help.
              </p>

              <ul className="mt-8 space-y-5 text-sm sm:text-[15px]">
                <li className="flex items-center gap-3.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#d72828]">
                    <PhoneIcon />
                  </span>
                  <div>
                    <span className="font-semibold tracking-wide">CALL :</span>{" "}
                    <a
                      href={`tel:${contact.phoneTel}`}
                      className="hover:underline underline-offset-2"
                    >
                      {contact.phoneDisplay}
                    </a>
                  </div>
                </li>
                <li className="flex items-center gap-3.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#d72828]">
                    <EmailIcon />
                  </span>
                  <div>
                    <span className="font-semibold tracking-wide">EMAIL :</span>{" "}
                    <a
                      href={`mailto:${SUPER_OFFER_CONTACT_EMAIL}`}
                      className="hover:underline underline-offset-2"
                    >
                      {SUPER_OFFER_CONTACT_EMAIL}
                    </a>
                  </div>
                </li>
                <li className="flex items-center gap-3.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#d72828]">
                    <ThumbsUpIcon />
                  </span>
                  <span className="font-semibold tracking-wide">FOLLOW US</span>
                </li>
              </ul>

              <div className="mt-5 flex items-center gap-2.5">
                {[
                  {
                    href: SUPER_OFFER_CONTACT_SOCIAL.facebook,
                    label: "Facebook",
                    Icon: FacebookIcon,
                  },
                  {
                    href: SUPER_OFFER_CONTACT_SOCIAL.twitter,
                    label: "Twitter",
                    Icon: TwitterIcon,
                  },
                  {
                    href: SUPER_OFFER_CONTACT_SOCIAL.instagram,
                    label: "Instagram",
                    Icon: InstagramIcon,
                  },
                  {
                    href: whatsappHref,
                    label: "WhatsApp",
                    Icon: WhatsAppIcon,
                  },
                ].map(({ href, label, Icon }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-white/80 text-white transition hover:bg-white hover:text-[#d72828]"
                  >
                    <Icon />
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Right — message form (view only) */}
          <div className="bg-white px-6 py-8 sm:px-9 sm:py-10">
            <div className="flex items-start gap-3">
              <span className="mt-1 h-6 w-1 shrink-0 rounded-full bg-[#d72828]" aria-hidden />
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                  Send us a message
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Fill in your details and our team will get back to you shortly.
                </p>
              </div>
            </div>

            {successMessage ? (
              <div
                role="status"
                className="mt-6 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800"
              >
                {successMessage}
              </div>
            ) : null}

            <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <input
                  type="text"
                  name="firstName"
                  value={form.firstName}
                  onChange={onChange}
                  placeholder="First Name"
                  autoComplete="given-name"
                  disabled={submitting}
                  className={inputClass}
                />
                <input
                  type="text"
                  name="lastName"
                  value={form.lastName}
                  onChange={onChange}
                  placeholder="Last Name"
                  autoComplete="family-name"
                  disabled={submitting}
                  className={inputClass}
                />
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={onChange}
                  placeholder="Phone No"
                  autoComplete="tel"
                  inputMode="numeric"
                  disabled={submitting}
                  className={inputClass}
                />
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={onChange}
                  placeholder="Email Id"
                  autoComplete="email"
                  disabled={submitting}
                  className={inputClass}
                />
              </div>

              <div className="relative">
                <textarea
                  name="message"
                  value={form.message}
                  onChange={onChange}
                  placeholder="Enter your message..."
                  rows={5}
                  maxLength={MESSAGE_MAX}
                  disabled={submitting}
                  className={`${inputClass} resize-none pb-8`}
                />
                <span className="pointer-events-none absolute bottom-2.5 right-3 text-[11px] text-gray-400 tabular-nums">
                  {form.message.length} / {MESSAGE_MAX}
                </span>
              </div>

              {formError ? (
                <p role="alert" className="text-sm text-red-600">
                  {formError}
                </p>
              ) : null}

              <div className="flex justify-center pt-1">
                <button
                  type="submit"
                  disabled={submitting}
                  className="min-w-[140px] rounded-md bg-[#d72828] px-8 py-2.5 text-sm font-bold tracking-wider text-white uppercase transition hover:bg-[#b91f1f] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d72828] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {submitting ? "Submitting..." : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
