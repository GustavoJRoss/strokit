export const site = {
  name: "strokit",
  author: "Gustavo Ross",
  /** Anchors of the home page; labels live in the dictionaries (home.nav). */
  nav: [
    { href: "#como-funciona", key: "how" },
    { href: "#exemplos", key: "examples" },
    { href: "#codigo", key: "code" },
    { href: "#open-source", key: "openSource" },
    { href: "#apoie", key: "support" },
  ],
  repo: {
    url: "https://github.com/GustavoJRoss/strokit",
    issuesUrl: "https://github.com/GustavoJRoss/strokit/issues",
    licenseUrl: "https://github.com/GustavoJRoss/strokit/blob/main/LICENSE",
    contributingUrl: "https://github.com/GustavoJRoss/strokit#open-source",
  },
  /** Donation link. `null` keeps the button inert until a method is chosen. */
  donationUrl: null as string | null,
} as const;
