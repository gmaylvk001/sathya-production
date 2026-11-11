"use client";

import React, { useState, useEffect } from "react";
import styles from "./WhatsAppWidget.module.css";

const DEFAULT_PHONE = "919164698985";
const DEFAULT_MESSAGE =
  "Hello Sathya Team! 👋 I'm browsing your online store and would like to know more about the latest offers and product details.";
const DEFAULT_CURVED_TEXT = "How may we assist you?";

/**
 * WhatsApp Floating Chatbot / Widget Component
 *
 * Designed with Strict Isolation:
 * - Scoped styling via CSS Modules (no global leak)
 * - Self-contained SVG curved text and official WhatsApp vector icon
 * - Configurable via props or NEXT_PUBLIC_* env vars
 * - Accessible, responsive, and production-ready
 */
export default function WhatsAppWidget({
  phoneNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || DEFAULT_PHONE,
  message = process.env.NEXT_PUBLIC_WHATSAPP_MESSAGE || DEFAULT_MESSAGE,
  curvedText = DEFAULT_CURVED_TEXT,
  showCurvedText = true,
  className = "",
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const arcPathId = "whatsapp_curved_path";

  // Sanitize phone number (keeps digits only, India code 91)
  const cleanPhone = String(phoneNumber || DEFAULT_PHONE).replace(/[^0-9]/g, "");
  const encodedMsg = encodeURIComponent(message || DEFAULT_MESSAGE);
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMsg}`;

  if (!mounted) {
    return null;
  }

  return (
    <aside
      className={`${styles.widgetWrapper} ${className}`.trim()}
      aria-label="WhatsApp customer support assistance"
    >
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.widgetLink}
        aria-label="Chat with Sathya customer support on WhatsApp"
        title="Chat with Sathya on WhatsApp"
      >
        {/* Animated radar pulse ring */}
        <span className={styles.pulseRing} aria-hidden="true" />

        {/* Circular WhatsApp green button */}
        <div className={styles.buttonCore}>
          <svg
            viewBox="0 0 24 24"
            className={styles.whatsappIcon}
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path d="M12.031 2C6.495 2 2 6.495 2 12.031c0 1.97.57 3.864 1.644 5.485L2 22l4.636-1.597a10.02 10.02 0 0 0 5.395 1.558h.005c5.533 0 10.029-4.496 10.029-10.03C22.065 6.495 17.568 2 12.031 2zm5.864 14.218c-.246.689-1.427 1.324-1.968 1.365-.49.037-1.127.18-3.666-.867-2.613-1.077-4.305-3.738-4.436-3.913-.131-.174-1.059-1.408-1.059-2.685 0-1.277.671-1.905.91-2.164.24-.258.523-.323.698-.323.175 0 .349.002.502.01.162.008.38-.061.594.453.22.527.75 1.83.815 1.962.066.131.109.285.022.459-.087.174-.131.283-.262.436-.131.153-.275.342-.393.459-.131.131-.268.273-.116.535.153.262.68 1.121 1.458 1.815 1.002.894 1.846 1.171 2.108 1.302.262.131.415.11.568-.066.153-.174.654-.764.829-1.026.174-.262.349-.218.59-.131.24.087 1.528.72 1.79.851.262.131.436.196.502.305.066.109.066.633-.18 1.322z" />
          </svg>
        </div>

        {/* Curved upper badge text: 'How may we assist you?' */}
        {showCurvedText && (
          <svg
            viewBox="0 0 96 96"
            className={styles.curvedTextSvg}
            aria-hidden="true"
          >
            <defs>
              <path
                id={arcPathId}
                d="M 10.5,48 A 37.5,37.5 0 0,1 85.5,48"
                fill="none"
              />
            </defs>
            <text className={styles.curvedText}>
              <textPath
                href={`#${arcPathId}`}
                startOffset="50%"
                textAnchor="middle"
              >
                {curvedText}
              </textPath>
            </text>
          </svg>
        )}

        {/* Desktop hover assistance card */}
        <div className={styles.tooltip} role="tooltip">
          <span className={styles.tooltipTitle}>Chat with Sathya Support</span>
          <span className={styles.tooltipSub}>Offers, discounts & product help</span>
          <span className={styles.tooltipArrow} aria-hidden="true" />
        </div>
      </a>
    </aside>
  );
}

