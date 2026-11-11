import {
  ShoppingCart,
  Gift,
  Wallet,
  Star,
  Crown,
  DollarSign,
  RefreshCw,
  Smartphone,
  User,
  CreditCard,
  Headset,
  MapPin,
  Zap,
  Smile,
  ChevronDown,
} from "lucide-react";

export const metadata = {
  title: "Loyalty",
};

const rewardCards = [
  {
    icon: ShoppingCart,
    title: "Shop with joy",
    text: "Buy top electronics and gadgets in-store or online.",
  },
  {
    icon: Gift,
    title: "Earn Happiness Points",
    text: "Reward points on every purchase.",
  },
  {
    icon: Wallet,
    title: "Redeem & Rejoice.",
    text: "Use your points anytime – ₹1 for every point.",
  },
  {
    icon: Star,
    title: "Celebrate Moments",
    text: "Enjoy bonus points and festive special offers.",
  },
  {
    icon: Crown,
    title: "Enjoy Rewards",
    text: "Get priority service and early product access.",
  },
];

const leftBenefits = [
  {
    icon: Gift,
    title: "Exclusive Loyalty Privileges",
    text: "Unlock member-only offers, early access to sales, and festive special promotions.",
  },
  {
    icon: DollarSign,
    title: "Shop More, Earn More",
    text: "The more you shop, the more points you earn — with no upper limit.",
  },
  {
    icon: RefreshCw,
    title: "Seamless Redemption",
    text: "Redeem points easily on your next purchase, online or in-store.",
  },
];

const rightBenefits = [
  {
    icon: Smartphone,
    title: "Instant Reward Tracking",
    text: "Check your loyalty points and rewards anytime using your registered mobile number.",
  },
  {
    icon: ShoppingCart,
    title: "Redeem Anywhere",
    text: "Redeem and earn points at any Sathya Showroom outlet or on sathya.store.",
  },
  {
    icon: Star,
    title: "Birthday & Anniversary Rewards",
    text: "Celebrate your special occasions with exclusive bonus points and surprise gifts from Sathya!",
  },
];

const onlinePoints = [
  {
    icon: User,
    title: "Quick Sign-Up",
    text: "Create your account in seconds using your mobile number or email ID.",
  },
  {
    icon: CreditCard,
    title: "Earn With Every Order",
    text: "Automatically earn reward points each time you shop online at SATHYA.",
  },
  {
    icon: Gift,
    title: "Redeem Anytime",
    text: "Use your collected points for instant discounts or future purchases.",
  },
  {
    icon: Headset,
    title: "24×7 Assistance",
    text: "Need help? Our dedicated online support team is always ready to assist.",
  },
];

const storePoints = [
  {
    icon: MapPin,
    title: "Find Nearest Store",
    text: "Locate your closest Sathya outlet and sign up easily at the billing counter.",
  },
  {
    icon: Zap,
    title: "Earn Instantly",
    text: "Start collecting reward points with your first purchase after registration.",
  },
  {
    icon: Star,
    title: "Exclusive Benefits",
    text: "Enjoy special discounts, cashback, and member-only offers all year long.",
  },
  {
    icon: Smile,
    title: "Friendly Assistance",
    text: "Our staff will help you register and explain how to track your rewards.",
  },
];

function StoreLink() {
  return (
    <a
      href="https://sathya.store"
      className="inline-flex items-center gap-1 font-semibold text-[#2563eb]"
    >
      <img src="/uploads/sathya-header-logo.webp" alt="" className="h-4 w-auto" />
      sathya.store
    </a>
  );
}

const faqs = [
  {
    q: "How can I join the SATHYA Rewards Programme?",
    a: (
      <>
        Enroll at any <strong className="font-bold text-gray-800">SATHYA Showroom</strong> billing
        counter using your mobile number, or join online at <StoreLink /> to start earning reward
        points instantly.
      </>
    ),
  },
  {
    q: "How do I earn reward points?",
    a: (
      <>
        Earn reward points on every purchase. You&apos;ll also get extra points during festivals
        and special events.
      </>
    ),
  },
  {
    q: "How do I redeem my reward points?",
    a: (
      <>
        Provide your registered mobile number at checkout — online or in-store — and redeem points
        instantly. <strong className="font-bold text-gray-800">Each point equals ₹1.</strong>
      </>
    ),
  },
  {
    q: "Do my reward points expire?",
    a: (
      <>
        Reward points are valid for <strong className="font-bold text-gray-800">12 months</strong>{" "}
        from the date of earning. You&apos;ll get reminders before expiry so you can use them in
        time.
      </>
    ),
  },
  {
    q: "How can I check my points balance?",
    a: (
      <>
        Check your balance anytime by logging into your account on <StoreLink /> or by visiting your
        nearest Sathya Showroom.
      </>
    ),
  },
];

function BenefitItem({ icon: Icon, title, text }) {
  return (
    <div className="flex gap-3 border-b border-gray-200 py-5">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[#e10600]" strokeWidth={1.75} />
      <div>
        <p className="text-sm font-bold text-gray-900">{title}</p>
        <p className="mt-1 text-[13px] leading-5 text-gray-500">{text}</p>
      </div>
    </div>
  );
}

function EnrollPoint({ icon: Icon, title, text }) {
  return (
    <div className="flex gap-3 border-b border-gray-200 py-4">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-gray-800" strokeWidth={1.75} />
      <div>
        <p className="text-sm font-bold text-gray-900">{title}</p>
        <p className="mt-1 text-[13px] leading-5 text-gray-500">{text}</p>
      </div>
    </div>
  );
}

export default function LoyaltyPage() {
  return (
    <section>
      <div className="bg-white">
        <div className="relative mx-auto grid max-w-6xl items-center gap-6 px-4 pb-8 pt-8 sm:px-6 md:grid-cols-[170px_minmax(0,1fr)] lg:grid-cols-[190px_minmax(0,1fr)_230px] lg:pb-4 lg:pt-10">
          <img
            src="/loyalty/loyalty.png"
            alt="SATHYA Loyalty Rewards"
            className="mx-auto w-36 sm:w-40 lg:w-44"
          />
          <div className="text-center md:text-left">
            <h1 className="text-2xl font-semibold leading-tight text-gray-900 sm:text-3xl lg:text-[2rem]">
              You Don&apos;t Just Shop With SATHYA,
              <br className="hidden sm:block" /> You Spread Happiness!
            </h1>
            <p className="mt-3 text-sm leading-6 text-gray-700">
              Shop at SATHYA and earn rewards every time! Join the{" "}
              <span className="font-semibold text-[#e10600]">SATHYA Rewards Programme</span> for
              exclusive benefits and cashback.
            </p>
            <p className="mt-3 text-sm font-semibold text-[#e10600]">
              Start your rewarding journey today!
            </p>
            <a
              href="https://sathyaagencies.casarewards.com/customer-verify/ct67tNe165"
              className="mt-4 inline-block rounded-md bg-[#e11d48] px-5 py-2 text-xs font-bold tracking-wide text-white"
            >
              UNLOCK REWARDS
            </a>
          </div>
          <img
            src="/loyalty/rounded-image.png"
            alt="Family shopping at a SATHYA store"
            className="mx-auto w-44 rounded-full sm:w-52 lg:absolute lg:bottom-[-6rem] lg:right-8 lg:top-auto lg:z-10 lg:mx-0 lg:w-60"
          />
        </div>
      </div>

      <div className="bg-[#cfcfcf]">
        <div className="mx-auto max-w-6xl px-4 pb-6 pt-10 sm:px-6 lg:pr-80 lg:pt-12">
          <h2 className="max-w-xl text-2xl font-semibold leading-tight text-white sm:text-3xl">
            Your Shopping, Your Rewards – SATHYA Loyalty Points.
          </h2>
          <p className="mt-4 max-w-xl text-sm text-white/90">
            Shopping at SATHYA is now more rewarding than ever.
          </p>
          <p className="mt-3 max-w-xl text-sm text-white/90">
            Be a part of our exclusive loyalty family and enjoy the benefits of smarter shopping.
          </p>
        </div>
        <div className="mx-auto flex max-w-6xl flex-wrap justify-center gap-4 px-4 pb-12 sm:px-6">
          {rewardCards.map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="flex w-full items-center gap-3 rounded-lg bg-white px-4 py-4 shadow-sm sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.75rem)]"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#e10600] text-white">
                <Icon className="h-5 w-5" strokeWidth={2} />
              </span>
              <div>
                <p className="text-sm font-bold text-gray-900">{title}</p>
                <p className="mt-0.5 text-xs leading-5 text-gray-600">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
          <h2 className="text-center text-2xl font-bold text-gray-900 sm:text-3xl">
            Benefits Of The <span className="text-[#e10600]">SATHYA Rewards Programme</span>
          </h2>
          <div className="mt-8 grid items-center gap-8 lg:mt-12 lg:grid-cols-[minmax(0,1fr)_280px_minmax(0,1fr)] lg:gap-12">
            <div>
              {leftBenefits.map((item) => (
                <BenefitItem key={item.title} {...item} />
              ))}
            </div>
            <img
              src="/loyalty/mobile.png"
              alt="SATHYA rewards on a phone, with gifts and loyalty cards"
              className="mx-auto w-full max-w-xs"
            />
            <div>
              {rightBenefits.map((item) => (
                <BenefitItem key={item.title} {...item} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#fff6dc]">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
          <h2 className="text-center text-2xl font-bold text-gray-900 sm:text-3xl">
            Two Easy Ways To Enroll
          </h2>

          <div className="mt-8 rounded-xl bg-white p-4 shadow-sm sm:p-6 lg:mt-10">
            <div className="grid items-center gap-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-8">
              <img
                src="/loyalty/women-ad.png"
                alt="Woman joining the SATHYA Rewards Programme on her phone"
                className="mx-auto w-full max-w-sm rounded-md lg:max-w-none"
              />
              <div>
                <h3 className="text-lg font-bold text-gray-900">Online Enrollment</h3>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  Join the SATHYA Rewards Programme instantly on sathya.store — just log in and
                  start collecting points with every purchase. Enjoy exclusive rewards, cashback,
                  and personalized offers online!
                </p>
                <div className="mt-2 grid sm:grid-cols-2 sm:gap-x-8">
                  {onlinePoints.map((item) => (
                    <EnrollPoint key={item.title} {...item} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-xl bg-white p-4 shadow-sm sm:p-6">
            <div className="grid items-stretch gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
              <div>
                <h3 className="text-lg font-bold text-gray-900">In-Store Enrollment</h3>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  Visit your nearest Sathya Showroom and register at the billing counter with your
                  mobile number to start earning instantly. Enjoy exclusive member rewards every
                  time you shop in-store!
                </p>
                <div className="mt-2 grid sm:grid-cols-2 sm:gap-x-8">
                  {storePoints.map((item) => (
                    <EnrollPoint key={item.title} {...item} />
                  ))}
                </div>
              </div>
              <img
                src="/loyalty/family-ad.png"
                alt="Family shopping with a SATHYA store associate"
                className="mx-auto h-64 w-full max-w-md rounded-md object-cover sm:h-72 lg:h-full lg:max-w-none lg:min-h-[280px]"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:py-16">
          <h2 className="text-center text-2xl font-bold text-gray-900 sm:text-3xl">
            Frequently Asked Questions
          </h2>
          <p className="mt-2 text-center text-sm text-gray-500">
            All you need to know about the SATHYA Rewards Programme
          </p>
          <div className="mt-8 space-y-3">
            {faqs.map((item, index) => (
              <details
                key={item.q}
                open={index === 1}
                className="group overflow-hidden rounded-md border-l-4 border-[#e10600] bg-white shadow-sm open:bg-[#fff4f4]"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm font-semibold text-gray-900 marker:content-none group-open:text-[#e10600] [&::-webkit-details-marker]:hidden">
                  <span>{item.q}</span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-[#e10600] transition group-open:rotate-180" />
                </summary>
                <p className="px-5 pb-4 text-sm leading-6 text-gray-600">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
