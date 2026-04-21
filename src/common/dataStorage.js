const { load } = window.__TAURI__.store;
const { fetch } = window.__TAURI__.http;
const Database = window.__TAURI__.sql;

const sessionStorage = await load("session.json", { autoSave: false });
const store = {
  init: async () => {
    if (!store?.db) {
      store.db = await Database.load("sqlite:data.db");

      const tableCreationSQL = `
        CREATE TABLE IF NOT EXISTS 
          feeds( key unique, content text)
      `;

      await store.db.execute(tableCreationSQL);
    }
  },
  get: async (key) => {
    const selectQuery = `
      SELECT 
        key, content
      FROM
        feeds
      WHERE
        key LIKE $1
    `;

    const result = await store.db.select(selectQuery, [key]);
    const data = result.map((r) => JSON.parse(r.content));
    // console.log(`SQLITE QUERY ${key}`, data);
    return data;
  },
  has: async (key) => {
    const selectQuery = `
      SELECT 
        key, content
      FROM
        feeds
      WHERE
        key = $1
      LIMIT
        1
    `;

    const result = await store.db.select(selectQuery, [key]);
    console.log(`SQLITE HAS`, result);
    return result;
  },
  keys: async () => {
    const selectQuery = `
      SELECT 
        key
      FROM
        feeds
    `;

    const result = await store.db.select(selectQuery);
    const keys = result.map((r) => r.key);
    // console.log("SQLITE KEYS", keys);
    return keys;
  },
  entries: async () => {
    const selectQuery = `
      SELECT 
        key, content
      FROM
        feeds
    `;

    const result = await store.db.select(selectQuery);
    const data = result.map((r) => {
      return JSON.parse(r.content);
    });
    // console.log("SQLITE ENTRIES", data);
    return data;
  },
  set: async (key, value) => {
    const insertSQL = `
       INSERT OR REPLACE INTO
        feeds (key, content)
       VALUES
        ($1, $2)
    `;

    const result = await store.db.execute(insertSQL, [key, value]);
    // console.log("SQLITE INSERT", result);
    return result;
  },
  remove: async (key) => {
    const deleteSQL = `
      DELETE FROM
        feeds
      WHERE
        key = $1
      LIMIT
        1
    `;

    const result = await store.db.execute(deleteSQL, [key]);
    // console.log("SQLITE DELETE", result);
    return result;
  },
};

await store.init();

// This script is released to the public domain and may be used, modified and
// distributed without restrictions. Attribution not necessary but appreciated.
// Source: https://weeknumber.com/how-to/javascript

// Returns the ISO week of the date.
Date.prototype.getWeek = function () {
  var date = new Date(this.getTime());
  date.setHours(0, 0, 0, 0);
  // Thursday in current week decides the year.
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  // January 4 is always in week 1.
  var week1 = new Date(date.getFullYear(), 0, 4);
  // Adjust to Thursday in week 1 and count number of weeks from date to week1.
  return (
    1 +
    Math.round(
      ((date.getTime() - week1.getTime()) / 86400000 -
        3 + ((week1.getDay() + 6) % 7)) /
        7,
    )
  );
};

function evaluateXPath(node, expr) {
  const xpe = new XPathEvaluator();
  const nsResolver = node.ownerDocument === null
    ? node.documentElement
    : node.ownerDocument.documentElement;
  const result = xpe.evaluate(expr, node, nsResolver, 0, null);
  const found = [];
  let res;
  while ((res = result.iterateNext())) found.push(res);
  return found;
}

const defaultSettings = {
  postsPerBlog: 3,
  openPostsIn: "newtab",
  postViewer: "reader",
  maxFetchErrors: 3,
  openEditorIn: "sidebar",
  openYoutubeIn: "youtube",
  youtubeCustomURL: "",
  splitPost: false,
};

const reservedKeys = ["settings", "account@"];

function removeReservedKeys(obj) {
  reservedKeys.forEach((k) => delete obj[k]);
}

export async function saveFeed(feed) {
  if (!feed.url.includes("://")) {
    feed.url = `https://${feed.url}`;
  }

  if (!feed?.frequency) {
    feed.frequency = "daily";
  }

  let key = `feed@${feed.url}`;

  delete feed.selected;

  if (!feed.tags) {
    feed.tags = [];
  }

  if (!feed.frequency) {
    if (feed.tags) {
      let s = new Set(feed.tags);
      let a = Array.from(s);
      feed.tags = a;
    }
  }

  return store.set(key, feed);
}

export async function getFeedWithURL(url) {
  let key = `feed@${url}`;

  let obj = await store.get(key);

  if (obj) {
    return obj[0];
  } else {
    return {};
  }
}

export function deleteFeed(feed) {
  console.log("removing feed", feed.url);
  return store.delete(`feed@${feed.url}`);
}

export function deletePostingAccount(account) {
  console.log("removing account", account.name);
  return store.delete(`account@${account.name}`);
}

export function saveFeeds(newFeeds) {
  const ps = newFeeds.map((f) => saveFeed(f));

  return ps;
}

export async function getAllFeeds() {
  const result = await store.db.select(`
    SELECT
      key, content
    FROM
      feeds
    WHERE
      key LIKE "feed@%"
  `);

  const feeds = result.map((r) => JSON.parse(r.content));
  console.log("ALL FEEDS", feeds);
  return feeds;
}

export async function getAllSettings() {
  let obj = await store.get("settings");

  if (obj.length == 0) {
    return defaultSettings;
  } else {
    return obj.settings;
  }
}

export async function getAllPostingAccounts() {
  const result = await store.db.select(`
    SELECT
      key, content
    FROM
      feeds
    WHERE
      key LIKE "account@%"
  `);

  const accounts = result.map((r) => JSON.parse(r.content));
  console.log("ALL ACCOUNTS", accounts);
  return accounts;
}

export async function savePostingAccount(account) {
  let key = `account@${account.name}`;

  return store.set(key, account);
}

export async function valueForSetting(key) {
  let settings = await getAllSettings();

  if (Object.hasOwn(settings, key)) {
    return settings[key];
  } else {
    return defaultSettings[key];
  }
}

export async function saveSettings(settings) {
  for (const k in settings) {
    await store.set(k, settings[k]);
  }
}

export async function loadFeedFromURL(url) {
  try {
    const parser = new RSSParser({
      timeout: 6000,
    });

    const response = await fetch(url);
    const data = await response.text();
    const feed = await parser.parseString(data);
    console.log(url, feed);

    return feed;
  } catch (e) {
    // console.error("error parsing feed", e);
    console.log("attempting fix...");
    const response = await fetch(url);
    const headers = response.headers;

    if (!response.ok) {
      throw "error with feed.";
    }

    const mimeType = headers.get("Content-Type");

    if (
      mimeType.startsWith("application/xml") ||
      mimeType.startsWith("application/atom+xml") ||
      mimeType.startsWith("text/xml")
    ) {
      // looks like atom.

      const text = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, "text/xml");
      const xml = doc.documentElement;

      const rootElementTagName = xml.tagName;

      if (rootElementTagName == "feed") {
        console.log(`${url}: looks like an atom feed.`);

        let feed = {};

        feed["feedUrl"] = url;
        feed["title"] = xml.querySelector("title")?.innerHTML ??
          "Untitled Feed";
        feed["description"] = xml.querySelector("description")?.innerHTML ?? "";
        feed["link"] =
          xml.querySelector("link[rel=alternate]")?.getAttribute("href") ?? url;

        feed["lastBuildDate"] = xml.querySelector("updated")?.innerHTML ??
          new Date();

        feed["items"] = [];

        const entries = xml.querySelectorAll("entry");

        for (const entry of entries) {
          const item = {};

          item["title"] = entry.querySelector("title")?.innerHTML;
          item["link"] = entry.querySelector("link")
            ?.getAttribute("href");
          item["pubDate"] = entry.querySelector("updated")?.innerHTML ??
            entry.querySelector("published")?.innerHTML;

          feed["items"].push(item);
        }

        console.log(`${url}`, feed);
        return feed;
      }
    }
  }
}

export async function getAllTags() {
  const tags = new Set();

  const result = await store.db.select(
    `SELECT  DISTINCT json_extract(content, "$.tags") as tags from feeds`,
  );

  for (const r of result) {
    const p = JSON.parse(r.tags);
    for (const t of p) {
      tags.add(t);
    }
  }

  console.log("GET ALL TAGS", tags);

  return tags;
}

export async function loadFeed(feed, ticker) {
  let data;
  let lastFetchDate = new Date(feed.lastFetch) || new Date(70, 1, 1);
  let today = new Date();
  let ellapsedTime = today - lastFetchDate;
  let d_today = today.getDay();
  let d_lastFetch = lastFetchDate.getDay();
  let w_today = today.getWeek();
  let w_lastFetch = lastFetchDate.getWeek();
  let m_today = today.getMonth();
  let m_lastFetch = lastFetchDate.getMonth();
  let maxFetchErrors = await valueForSetting("maxFetchErrors");

  try {
    if (!navigator.onLine) {
      data = feed.data;
    } else if (
      Number.isInteger(feed.errorCount) &&
      feed.errorFetching &&
      feed.errorCount >= maxFetchErrors
    ) {
      console.log("too many errors, not fetching", feed.url);
      ticker();
      return false;
    } else if (feed.frequency == "always" || m_today !== m_lastFetch) {
      data = await loadFeedFromURL(feed.url);
      feed.lastFetch = today;
      feed.errorFetching = false;
      feed.errorCount = 0;
      console.log(`fetch: ${feed.url}`, data);
    } else if (feed.frequency == "daily" || m_today !== m_lastFetch) {
      if (d_today !== d_lastFetch) {
        data = await loadFeedFromURL(feed.url);
        feed.errorFetching = false;
        feed.lastFetch = today;
        feed.errorCount = 0;
      } else {
        // console.log("already fetch daily", feed.url);
        data = feed.data;
      }
    } else if (feed.frequency == "weekly") {
      if (w_today !== w_lastFetch) {
        data = await loadFeedFromURL(feed.url);
        feed.errorFetching = false;
        feed.lastFetch = today;
        feed.errorCount = 0;
      } else {
        // console.log("already fetch weekly", feed.url);
        data = feed.data;
      }
    } else if (feed.frequency == "monthly") {
      if (m_today !== m_lastFetch) {
        data = await loadFeedFromURL(feed.url);
        feed.errorFetching = false;
        feed.lastFetch = today;
        feed.errorCount = 0;
      } else {
        // console.log("already fetch monthly", feed.url);
        data = feed.data;
      }
    } else {
      data = feed.data;
    }

    if (!data || !data.items) {
      console.log("feed broken", feed.title);
      feed.errorFetching = true;
      if (!Number.isInteger(feed.errorCount)) {
        feed.errorCount = 1;
      } else {
        feed.errorCount += 1;
      }
      ticker();
      saveFeed(feed);
      return false;
    }

    feed.data = data;

    feed.data.items.sort((a, b) => {
      let d1 = new Date(a.isoDate || a.pubDate);
      let d2 = new Date(b.isoDate || b.pubDate);

      return d1 < d2;
    });

    if (feed.data.items[0].hasOwnProperty("isoDate")) {
      feed.lastBuildDate = new Date(feed.data.items[0].isoDate);
    } else if (feed.data.items[0].hasOwnProperty("pubDate")) {
      feed.lastBuildDate = new Date(feed.data.items[0].pubDate);
    } else {
      feed.lastBuildDate = today;
    }

    if (!feed.data.link) {
      feed.data.link = feed.url;

      feed.data.link = feed.data.link.substring(
        0,
        feed.data.link.lastIndexOf("/"),
      );

      feed.data.link = `${feed.data.link}/`;
    }
    if (feed.data.link && !feed.data.link.includes("://")) {
      feed.data.link = `https://${feed.data.link}`;
    }

    // let items = feed.data.items;

    // feed.data.items = items.map((i) => {
    //   if (!i.link) {
    //     return i
    //   }

    //   if (!i.link.includes("://")) {
    //     if (!i.link.startsWith("/")) {
    //       i.link = `/${i.link}`;
    //     }
    //     i.link = new URL(i.link, feed.data.link);
    //   }
    //   return i;
    // });

    ticker();

    saveFeed(feed);

    return feed;
  } catch (e) {
    console.log("offending feed");
    console.dir(feed);
    console.error(`thrown from feed ${feed.url}`, e);
    feed.errorFetching = true;
    if (!Number.isInteger(feed.errorCount)) {
      feed.errorCount = 1;
    } else {
      feed.errorCount += 1;
    }
    ticker();
    saveFeed(feed);
    return false;
  }
}

export const FeedLoader = {
  queue: [],
  feeds: [],
  total: 0,
  progress: 0,
  initialiseQueue: async () => {
    let obj = await getAllFeeds();
    FeedLoader.total = obj.length;
    FeedLoader.progress = 0;
    FeedLoader.queue = obj;
    console.log("FL initialiseQueue");
  },
  processQueue: (callback) => {
    console.log("FL processQueue");
    const ticker = () => {
      // console.log(`${FeedLoader.progress}/${FeedLoader.total}`);
      FeedLoader.progress += 1;
      m.redraw();
    };

    let ps = FeedLoader.queue.map((f) => {
      let p = loadFeed(f, ticker);

      return p;
    });

    const done = (feeds) => {
      let fs = feeds
        .filter((f) => {
          if (f.status == "fulfilled" && f.value.hasOwnProperty("data")) {
            return true;
          } else {
            return false;
          }
        })
        .map((f) => f.value);

      callback(fs);
    };

    Promise.allSettled(ps).then(done).catch(done);
  },
};

export async function removeAllEmptyTags() {
  let feeds = await getAllFeeds();
  let keys = Object.keys(feeds);

  let ps = [];

  keys.forEach((k) => {
    let f = feeds[k];
  });
}

export async function updateLinkGraph() {
  const feeds = await getAllFeeds();
  const parser = new DOMParser();
  const links = {};

  for (const prop in feeds) {
    const feed = feeds[prop];

    if (Array.isArray(feed?.data?.items)) {
      const items = feed.data.items;

      for (const item of items) {
        try {
          const text = `<html><body>${item.content}</body></html>`;
          const doc = parser.parseFromString(text, "text/html");

          for (const link of doc.links) {
            if (link.href && link.href.startsWith("http")) {
              if (!links[link.href]) {
                links[link.href] = [item.link];
              } else {
                links[link.href].push(item.link);
              }
            }
          }
        } catch (_e) {
          console.error("Error updating linkgraph", item.link);
        }
      }
    }
  }

  const obj = {};
  for (const link in links) {
    const set = new Set(links[link]);
    await sessionStorage.set(link, Array.from(set));
  }
}

export async function getLinksForURL(link) {
  let obj = await sessionStorage.get(link);

  if (obj[link]) {
    return obj[link];
  } else {
    return [];
  }
}
