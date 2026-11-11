"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

const faqData = [
  {
    category: "Ordering",
    faqs: [
      {
        q: "How do I place an order on sathya.store?",
        a: <>Browse products by category, add items to your cart, enter your delivery pincode, and proceed to checkout. You can pay online or choose available payment options at checkout. You will receive an order confirmation once your order is placed successfully.</>
      },
      {
        q: "Do I need an account to shop online?",
        a: <>You can browse products without an account. To place an order and track it, you will need to register or log in with your mobile number. Creating an account also lets you save addresses and view your order history.</>
      }
    ]
  },
  {
    category: "Delivery",
    faqs: [
      {
        q: "How do I check if delivery is available in my area?",
        a: <>Enter your 6-digit pincode in the header or on the product page before adding to cart. The site will confirm whether delivery is available in your location and show applicable delivery options.</>
      },
      {
        q: "How long does delivery take?",
        a: <>Delivery timelines vary by product and location. Estimated delivery dates are shown at checkout. Some products may qualify for faster or same-day delivery where available — same-day delivery orders cannot be cancelled once placed.</>
      }
    ]
  },
  {
    category: "Returns & Cancellations",
    faqs: [
      {
        q: "Can I cancel my order?",
        a: <>Yes — cancellations are accepted before the product is delivered. If you cancel before shipment, the full amount will be refunded. Orders under Same Day Delivery cannot be cancelled. If your order has shipped but not yet been delivered, please contact <a href="/contact" className="text-[#d72828] hover:underline">Customer Support</a>.</>
      },
      {
        q: "What is your return and exchange policy?",
        a: <>Products can be returned or exchanged within <strong>30 days</strong> from the date of in-store purchase or online delivery. Defective or damaged products are eligible for replacement. For full details, see our <a href="/cancellation-policy" className="text-[#d72828] hover:underline">Cancellation Policy</a>.</>
      }
    ]
  },
  {
    category: "Contact & Support",
    faqs: [
      {
        q: "How can I contact customer support?",
        a: <>Visit our <a href="/contact" className="text-[#d72828] hover:underline">Contact Us</a> page to send a message, or call / visit your nearest <a href="https://sathya.adtarbo.com/stores" target="_blank" rel="noopener noreferrer" className="text-[#d72828] hover:underline">SATHYA showroom</a>. For escalations regarding product defects or service complaints, reach our grievance officer:
          <br /><br />
          <strong>Name:</strong> Mr. Francis Prabhu<br />
          <strong>Email:</strong> <a href="mailto:crm@sathya.email" className="text-[#d72828] hover:underline">crm@sathya.email</a><br />
          <strong>Phone:</strong> <a href="tel:9894024985" className="text-[#d72828] hover:underline">9894024985</a></>
      },
      {
        q: "Can I shop at a physical SATHYA store?",
        a: <>Yes. SATHYA has 100+ showrooms across Tamil Nadu, Pondicherry, and Andhra Pradesh. Use our <a href="https://sathya.adtarbo.com/stores" target="_blank" rel="noopener noreferrer" className="text-[#d72828] hover:underline">Store Locator</a> to find the nearest branch, view timings, and get directions.</>
      }
    ]
  }
];

export default function FAQComponent() {
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <section className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
      <div className="bg-white border border-gray-200 rounded-xl p-5 md:p-8 shadow-sm">

        {/* Title Area */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h2 className="text-2xl font-bold text-[#d72828]">
            Frequently Asked Questions
          </h2>
          <button
            type="button"
            className="hidden text-white bg-[#d72828] hover:bg-red-700 px-4 py-2 text-sm font-semibold rounded-md shadow-sm transition-colors whitespace-nowrap"
            data-toggle="modal"
            data-target="#myModal"
          >
            Enquire Now
          </button>
        </div>

        {/* Intro */}
        <div className="text-[14px] text-gray-600 mb-8 leading-relaxed">
          <p>Find quick answers to common questions about shopping at SATHYA. For detailed policies, visit our <a href="/cancellation-policy" className="text-[#d72828] hover:underline font-medium">Cancellation Policy</a> or <a href="/contact" className="text-[#d72828] hover:underline font-medium">Contact Us</a> page.</p>
        </div>

        {/* 2-Column Grid for Categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          {faqData.map((categoryData, catIndex) => (
            <div key={catIndex}>
              <h3 className="font-bold text-xl text-gray-900 mb-4 px-1 border-b border-gray-100 pb-2">
                {categoryData.category}
              </h3>

              <div className="space-y-3">
                {categoryData.faqs.map((faq, faqIndex) => {
                  const uniqueId = `${catIndex}-${faqIndex}`;
                  const isOpen = openFaq === uniqueId;

                  return (
                    <div
                      key={uniqueId}
                      className="border border-gray-200 rounded-md overflow-hidden transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      <button
                        onClick={() => setOpenFaq(isOpen ? null : uniqueId)}
                        className="w-full flex items-center justify-between px-4 py-3.5 bg-gray-50 hover:bg-gray-100 text-left focus:outline-none transition-colors"
                      >
                        <span className="font-semibold text-[15px] text-gray-800 pr-4">
                          {faq.q}
                        </span>
                        {isOpen ? (
                          <ChevronUp className="w-5 h-5 text-[#d72828] shrink-0" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />
                        )}
                      </button>

                      {isOpen && (
                        <div className="px-4 py-4 bg-white text-[14px] text-gray-700 whitespace-pre-line leading-relaxed border-t border-gray-200">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}