# The lighter side: more than a news reader

A proposal for opt-in, non-serious reading: questions, conversation, cute animals, odd and interesting
things, pictures and video, alongside the Memes & humour topic on `feat/memes-and-humour`. Nothing
here is built yet. Sources were checked on 12 November 2026; numbers are a snapshot, not a promise.

It has to keep the principles. Every topic here is followed in Explore, never pushed. None of it
joins Today or For you unless the reader follows it. Lists still end, and nothing is tuned for time
spent. What people post stays in their own accounts.

## 1. First: make "humour" a kind of topic, not one topic

On `feat/memes-and-humour` the id `'humour'` is checked in three places:

- `rank.ts`: engagement counts only score, not comments, and social posts skip the commentary discount.
- `StoryRow.tsx`: short posts show in full and pictures show uncropped in the list.
- `channelFeed.ts`: a curated Bluesky feed's posts are labelled with the feed's name, but only for
  feeds that belong to the humour topic.

Every topic below wants the same treatment. Give `Topic` one field, say `casual: true` (pick the
word in `GLOSSARY.md`), and have those three places read it. Make the feed-name lookup search every
topic's curated feeds, not only humour's. Do this before adding a second casual topic, so each
place keeps a single check.

## 2. New topics: a "Lighter side" cluster

Each source below answered on 12 November with recent posts. "Active/wk" is Lemmy's
`users_active_week`; Bluesky numbers are feed likes.

| Topic | For | Sources (checked) |
| --- | --- | --- |
| **Eye bleach** | Cute animals and kind things, a break from the news | `aww@lemmy.world` (30k subs, 668 active/wk), `dogs@lemmy.world` (7.7k, 965); Bluesky _Cats!_ (1,172), _Dogs of Bluesky_ (1,192), _Mammals! 🦊_ (596); Mastodon `#caturday`, `#dogsofmastodon`; PeerTube Animals (see §3) |
| **Ask** | Questions people actually want answered | `asklemmy@lemmy.world` (42k, 5.4k/wk), `nostupidquestions@lemmy.world` (51k, 2.5k/wk), `explainlikeimfive@lemmy.world` (23k, 251), `askscience@lemmy.world` (18k, 360), `whatisthisthing@lemmy.world` (8.7k, 147); Mastodon `#askfedi`. HN Ask stays with the tech topics. |
| **Conversation** | Chat, musings, hot takes | `casualconversation@piefed.social` (4.3k, 274/wk), `showerthoughts@lemmy.world` (45k, 2.7k/wk), `unpopularopinion@lemmy.world` (9.7k, 2k/wk) |
| **Oddly interesting** | Little facts and strange things | `mildlyinteresting@lemmy.world` (29k, 2.5k/wk), `til@lemmy.world` (32k, 3.1k/wk), `nottheonion@lemmy.world` (23k, 2.6k/wk), `mildlyinfuriating@lemmy.world` (48k, 813), `interestingasfuck@lemmy.world` (10k, 157), `dataisbeautiful@lemmy.world` (8.4k, 710) |
| **Pictures** | Photos people took, not photography news | `pics@lemmy.world` (30k, 1.3k/wk); Bluesky _Nature Photography 📷_ (574), _Art: What's Hot_ (11.9k); Pixelfed by way of Mastodon `#photography` (see §3). Related to Photography, which stays about the craft. |

Additions to topics that already exist:

- **Memes & humour**: `196@lemmy.blahaj.zone` (20k, 1.3k/wk), `me_irl@lemmy.world` (8.4k, 1.1k/wk),
  `shitposting@lemmy.ml` (2.6k, 212). These are rougher than `memes@`. They could be a separate
  _Shitposts_ topic for people who want that.
- **Birdwatching**: Bluesky _Birds! 🦉_ (14.6k likes) and Mastodon `#birds`.
- **Food**: Bluesky _What's Cooking 🍽️_ (4.3k) and _Food, glorious food!_ (1.8k).

Ruled out: these answered but are dead or near-dead (one active user a week, or under 60 posts ever):
`eyebleach@`, `wholesomememes@`, `animalsbeingderps@`, `rarepuppers@`, `oddlysatisfying@`,
`casualconversation@lemmy.world`, `todayilearned@` (use `til@`), `mapporn@`, `earthporn@`,
`wouldyourather@`, `crappydesign@`, `tifu@` (all on lemmy.world). `cats@lemmy.world`,
`wholesome@lemmy.world` and `damnthatsinteresting@lemmy.world` don't exist. Bluesky's _Comics_ feeds
are about the comics industry, not comic strips, and its _Eye Bleach_ and _Wholesome_ feeds have
single-digit likes.

Bluesky feed URIs are in the scratch notes below. A curated feed is its owner's choice of posts, so
moderation labels still decide what shows, quotes included, as on the current branch.

## 3. New sources

### Pixelfed (yes, the fediverse's Instagram)

- Pixelfed's Mastodon-compatible API (`/api/v1/timelines/tag/…`, `/public`) answers **401** on
  pixelfed.social without sign-in, so the browser can't read it anonymously.
- Its own web app's endpoints (`/api/pixelfed/v2/discover/posts/trending?range=daily`,
  `/api/v2/discover/tag?hashtag=cats`) answer anonymously but send **no CORS header**. They are also
  undocumented. They would have to go through `api/feed.ts` and could change without notice.
- Per-account Atom feeds (`/users/<name>.atom`) work and fit the existing `rss` kind.
- Pixelfed posts federate. Of the latest 40 posts in mastodon.social's tag timelines, 3 in
  `#caturday`, 7 in `#birds` and 8 in `#photography` came from Pixelfed.

Recommendation, in order:

1. **Now:** Mastodon tag feeds (already a feed kind) bring in Pixelfed pictures at no new cost.
2. **Soon:** check that a Pixelfed account's Atom feed can be added to a mix like any blog.
3. **Later, only if 1 is too thin:** add a `pixelfed` feed kind through the server for trending and
   tag discovery, marked as unofficial in code. Another option is a Pixelfed sign-in: the API is
   Mastodon-shaped, so `mastodon.ts` would mostly carry over. CORS on the signed-in API is
   unchecked.

Loops, the fediverse's short-video app from Pixelfed's developer, sends `/api/v1/feed/for-you` to a
login page. Leave it for now.

### PeerTube

PeerTube is the easiest of the three. Everything checked is public and sends
`access-control-allow-origin: *`, so it can be fetched from the browser like Lemmy and Mastodon:

- **Sepia Search** (`sepiasearch.org/api/v1/search/videos`) searches across servers with
  `categoryOneOf`, `nsfw=false` and `sort`. Animals (`categoryOneOf=16`) had 6,901 videos, the
  newest a day old.
- **Each server** has `/api/v1/videos?sort=-trending` (tilvids.com and framatube.org checked) and
  RSS at `/feeds/videos.xml`.
- **Comments** are public at `/api/v1/videos/{id}/comment-threads`, so a video can have a discussion
  like any other story.
- **Playback already works:** `videoEmbed.ts` (`peertubeVideo`) plays a PeerTube file inline, with
  no third-party frame.

Proposed feed kind: `{ kind: 'peertube'; search?: string; category?: number; host?: string }`, one
entry in `FEED_KINDS`. A video becomes a story with its title, `previewPath` thumbnail, likes as the
score and comment count. Categories map onto topics: Animals (16) → Eye bleach, Comedy (9) → Memes &
humour, Gaming (7), Food (18) and Science & Technology (15) → the existing topics.

Risks:

- Sepia Search only indexes servers that opt in, and it is one service, run by Framasoft. If it goes
  down, fall back to trending on a few named servers.
- `nsfw` is set by uploaders, so moderation still runs on every video.
- The long tail is uneven, so start with categories and named servers rather than open search.

The privacy page must name these hosts in the same change.

### Considered, not proposed

- **Reddit**: its API terms and closed network go against principle 4.
- **Tumblr**: per-blog RSS should fit the `rss` kind (unchecked). There is no tag feed.
- **Webcomics** (xkcd, SMBC and others) over RSS, for Memes & humour. Unchecked.
- **NASA APOD and Wikimedia Picture of the Day**: one calm picture a day, a natural fit for the
  Eye bleach ending in §4. Unchecked.

## 4. Features

Ordered by value for cost.

1. **Lighter side in Explore.** A new cluster for the topics above, all opt-in. Lighter-side
   stories never reach Today unless the reader follows the topic. This is mostly topic data.
2. **Eye bleach after heavy news.** At the end of Today, or after a story in world news or politics,
   offer "Something nice": one picture from Eye bleach, not a feed. One tap and it ends, which
   matches "a feed you can read, and switch off". It respects reduced motion and save-data. Eye
   bleach uses the strictest moderation: anything with a warning is hidden, not just covered.
3. **Picture grid.** An image-board grid for picture-led channels (Eye bleach, Pictures, Memes),
   switched per channel. It reuses `MediaGallery` and the image viewer, keeps `j`/`k` working, and
   falls back to the list with save-data or thumbnails off.
4. **Question rows.** Ask posts show the whole question, like humour's full posts, with an answered
   or unanswered mark from the comment count. An _Unanswered_ variant (Lemmy New, no comments yet)
   serves people who like helping. A top-answer preview costs a thread request per row, so load it
   only in the reader.
5. **Alt text first.** Pictures without a description get a quiet "No description" mark. The
   description shows under the picture on a tap. Picture topics could rank described pictures
   slightly higher.
6. **Picture posts to boards.** Today, listing is links only. Posting a picture with required alt
   text to a community board (a Bluesky blob) or a Lemmy community makes boards work like an image
   board, and the post stays in the reader's account. This needs compose work.
7. **Weekly best-of.** Top of the week for lighter-side channels as a fixed, edition-style list on
   Sundays, with an end. It reuses the Top sort and the edition snapshot.
8. **Merging reposted memes (spike first).** The same meme is uploaded separately to Lemmy, Bluesky
   and Mastodon, so "Also on" (matched by link) misses it. A perceptual hash of thumbnails could merge
   the copies and credit the earliest. The catch: reading pixels from another site's image needs that
   host to send CORS headers (unchecked for pict-rs and Bluesky's CDN). If they don't, the server
   would have to fetch the pictures, which cuts against principle 8.

Rejected: a random button or endless scroll (against principle 2), karma, streaks or badges,
anonymous posting (there are no PaperWing accounts, and boards live in Bluesky accounts), and hosting
uploads ourselves.

## 5. Suggested order

1. Make humour a `casual` kind of topic, once `feat/memes-and-humour` merges (small refactor with tests).
2. Eye bleach, Ask, Conversation and Oddly interesting from the sources checked above (topic data,
   `packs.test.ts` cases).
3. A PeerTube feed kind, with tests at the feed-kind interface and the privacy page updated.
4. The Eye bleach ending and the picture grid (stories and e2e).
5. Question rows.
6. After spikes: Pixelfed beyond Mastodon tags, picture posts, repost merging.

## Scratch: Bluesky feed URIs (from `app.bsky.unspecced.getPopularFeedGenerators`)

```
Cats!                  at://did:plc:jfhpnnst6flqway4eaeqzj2a/app.bsky.feed.generator/cats
Dogs of Bluesky        at://did:plc:plqr56q7y23it22h6txnhavh/app.bsky.feed.generator/aaaae2kpch3jg
Mammals! 🦊            at://did:plc:ffkgesg3jsv2j7aagkzrtcvt/app.bsky.feed.generator/aaan2gurxv3kk
Birds! 🦉              at://did:plc:ffkgesg3jsv2j7aagkzrtcvt/app.bsky.feed.generator/aaagllxbcbsje
Nature Photography 📷  at://did:plc:cngpbn4gngkf7oenuzysanng/app.bsky.feed.generator/aaaeu3w7ci7aw
Art: What's Hot        at://did:plc:odqmsar3ikz5ubokya4sempk/app.bsky.feed.generator/aaabfn4o34jdi
What's Cooking 🍽️      at://did:plc:geoqe3qls5mwezckxxsewys2/app.bsky.feed.generator/aaai43yetqshu
Food, glorious food!   at://did:plc:nmm26ltnxjx4oskwzdue4xvq/app.bsky.feed.generator/aaacoviie4ygo
```

Before adding one, read the feed's description and a page of its posts. A feed's name doesn't
say what its owner lets in.
