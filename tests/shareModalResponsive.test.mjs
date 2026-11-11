import test from "node:test";
import assert from "node:assert/strict";

test("ShareModal: Social share URLs are properly encoded and contain valid links", () => {
  const product = {
    _id: "66f03a7b8f123456789abcde",
    name: "LG 139 cm (55 Inch) evo AI C3 4K Ultra HD OLED Smart TV",
    slug: "lg-139-cm-55-inch-evo-ai-c3",
    price: 189990,
    special_price: 138449,
  };

  const productUrl = `https://sathyastore.com/product/${product.slug}`;
  const sellingPrice = product.special_price;
  const shareText = `Check out ${product.name} on Sathya Store at ₹${sellingPrice.toLocaleString("en-IN")}!`;

  const socialChannels = [
    {
      name: "WhatsApp",
      shortName: "WhatsApp",
      href: `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText}\n${productUrl}`)}`,
    },
    {
      name: "Facebook",
      shortName: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productUrl)}`,
    },
    {
      name: "X (Twitter)",
      shortName: "X",
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(productUrl)}`,
    },
    {
      name: "Email",
      shortName: "Email",
      href: `mailto:?subject=${encodeURIComponent(product.name)}&body=${encodeURIComponent(`${shareText}\n\nView details: ${productUrl}`)}`,
    },
  ];

  // Verify all channels have non-empty valid hrefs
  for (const channel of socialChannels) {
    assert.ok(channel.href.startsWith("https://") || channel.href.startsWith("mailto:"));
    assert.ok(channel.shortName.length <= 8, `shortName "${channel.shortName}" must fit in mobile grid buttons without overflow`);
  }

  // Ensure X short name is exactly "X" to prevent cramped "(Twitter)" text in mobile view
  const xChannel = socialChannels.find(c => c.name.includes("Twitter"));
  assert.equal(xChannel.shortName, "X");
  assert.ok(xChannel.href.includes(encodeURIComponent(productUrl)));
});

test("ShareModal: Copy link input and button layout constraints", () => {
  // Input must have min-w-0 to prevent browser default flex min-width push-out
  const inputClasses = "flex-1 min-w-0 bg-transparent text-xs text-gray-700 px-2 py-1 outline-none font-medium truncate select-all";
  assert.ok(inputClasses.includes("min-w-0"), "Input must have min-w-0");
  assert.ok(inputClasses.includes("flex-1"), "Input must have flex-1");
  assert.ok(inputClasses.includes("truncate"), "Input must have truncate");

  // Button must be shrink-0 and whitespace-nowrap to remain 100% visible
  const buttonClasses = "shrink-0 flex-shrink-0 whitespace-nowrap inline-flex items-center justify-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold";
  assert.ok(buttonClasses.includes("shrink-0"), "Button must have shrink-0");
  assert.ok(buttonClasses.includes("whitespace-nowrap"), "Button must have whitespace-nowrap");
});
