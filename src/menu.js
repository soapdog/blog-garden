const Menu = {
  view: (vnode) => {
    return [
      m(m.route.Link, { href: "/" }, "Home"),
      m(m.route.Link, { href: "/feed-manager" }, "Manage Feeds"),
      m(m.route.Link, { href: "/import-opml" }, "Import OPML"),
    ];
  },
};

export default Menu;
