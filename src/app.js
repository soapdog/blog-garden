import Reader from "./reader.js";
import FeedManager from "./feedManagement.js";
import OpmlImporter from "./importOpml.js";
import PodcastViewer from "./podcast.js";
import Menu from "./menu.js";

const appRoot = document.getElementById("app");
const menuEl = document.getElementById("menu");

m.mount(menuEl, Menu);

m.route(appRoot, "/reader", {
  "/reader": Reader,
  "/feed-manager": FeedManager,
  "/import-opml": OpmlImporter,
  "/podcast": PodcastViewer,
});
