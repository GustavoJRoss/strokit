export const site = {
  name: "strokit",
  author: "Gustavo Ross",
  /** Anchors of the home page; labels live in the dictionaries (home.nav). */
  nav: [
    { href: "#como-funciona", key: "how" },
    { href: "#exemplos", key: "examples" },
    { href: "#codigo", key: "code" },
    { href: "#apoie", key: "support" },
  ],
  /** Donation link. `null` keeps the button inert until a method is chosen. */
  donationUrl: null as string | null,
} as const;
