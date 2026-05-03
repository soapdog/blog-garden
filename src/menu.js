const Menu = {
  view: (vnode) => {
    return [
      m("div.box", [
        m("img", {
          src: "../icons/gardening.png",
          class: "cat-icon",
        }),
        m("h2", { style: { display: "inline" } }, "BlogGarden"),
      ]),
      m(m.route.Link, { href: "/" }, "Home"),
      m(m.route.Link, { href: "/feed-manager" }, "Manage Feeds"),
      m(m.route.Link, { href: "/import-opml" }, "Import OPML"),
    ];
  },
};

export default Menu;
