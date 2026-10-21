window.I18N_EN = {
  ui: {
    docTitle: "Merchant journey",
    headline: "From first click to a published campaign",
    intro: "Ten steps, one bar. Each step shows the product screen, what starts it, the external services it calls, what those calls decide, and how far along it is. The bar is Penn & Pour, two blocks from Madison Square Garden, with five offers. The night is Harry Styles at the Garden.",
    views: { journey: "Journey", work: "Workstreams", calls: "Call budget" },
    phases: { arrive: "Getting started", night: "Event night", week: "Every week", loop: "Closing the loop" },
    stepOf: "Step {n} of {total}",
    prev: "Back",
    next: "Next",
    hint: "Click the highlighted button, or use the arrow keys.",
    realShot: "Real screen, captured from the running app. Scroll inside it.",
    fullscreen: "Full screen",
    exitFullscreen: "Exit full screen",
    discovery: {
      title: "How the merchant finds out about a crowd",
      today: "Built, push: every hour the server scans each bar, drafts the campaign for the strongest new moment and alerts the merchant with a link to approve. The radar is the place to look further, not the way in.",
      target: "Next: the alert reaches the merchant's phone on WhatsApp as soon as Twilio is connected. Until then it is recorded on the alerts page, word for word."
    },
    screensNote: "",
    hood: "Under the hood",
    trigger: "What starts it",
    sees: "What the merchant sees",
    calls: "External calls",
    decides: "What it decides",
    code: "Where in the code",
    nextUp: "Next up",
    noCalls: "No external calls.",
    status: { done: "Built", wip: "In progress", todo: "To build" },
    trig: { pull: "Pull", push: "Push" },
    legend: { pull: "the merchant starts it", push: "a schedule or a crowd threshold starts it", qloo: "a call to Qloo" },
    svc: { storefront: "Storefront", screen: "Screen" },
    now: [
      { k: "Today", v: "Push every hour", d: "The server scans every bar, drafts the campaign for the strongest new moment and alerts the merchant. One alert per scan, never twice for the same moment." },
      { k: "Target for the judges", v: "The alert on the phone", d: "Connect Twilio and the same message lands on WhatsApp. Today it is recorded on the alerts page." },
      { k: "Qloo calls per crowd", v: "5 + 1 per offer", d: "10 calls for Penn & Pour, cached for 7 days. A TV game adds 2 (team brand, local fandom), a street theme adds up to 3." },
      { k: "What counts as a crowd", v: "Relative to the room", d: "A moment worth a quarter of your seats: a stadium, a Broadway let-out, the Knicks on TV, a parade, Halloween night." }
    ],
    work: {
      title: "Workstreams",
      intro: "Who owns what, and which journey steps depend on it. Updated as work moves.",
      cols: ["Workstream", "Owner", "Status", "Steps"],
      rows: [
        { item: "Connect the Twilio and Snapchat Ads accounts", who: "Jacobo", status: "wip", steps: ["8"] },
        { item: "Put the server live on Railway with the Anthropic key, before October 24", who: "Jacobo", status: "todo", steps: ["7", "8"] },
        { item: "Swing logo, S1 weight and color palette", who: "Design", status: "wip", label: "Waiting for Jacobo's pick", steps: ["1"] },
        { item: "Landing page that leads with what a bar gains", who: "Marketing", status: "done", steps: ["1"] },
        { item: "Push: the hourly scan and the merchant alert", who: "Backend", status: "done", steps: ["5"] },
        { item: "Push for the weekly pulse: the Monday brief sent on its own", who: "Backend", status: "todo", steps: ["9"] },
        { item: "Save each crowd profile once instead of rebuilding it", who: "Backend", status: "todo", steps: ["6", "7"] },
        { item: "A code per campaign to count who came", who: "Not assigned yet", status: "todo", steps: ["10"] }
      ]
    },
    budget: {
      title: "Calls per moment",
      intro: "How many external calls each moment makes, for a bar with five offers.",
      cols: ["Moment", "Qloo", "Ticketmaster", "Open-Meteo", "Claude"],
      rows: [
        ["Sign-up (once)", "10", "0", "0", "0"],
        ["Radar, per bar per hour", "2 per team on TV", "1", "1 per hot moment", "0"],
        ["One crowd and its campaign", "10", "0", "1", "1"],
        ["Neighbourhood pulse, each week", "8", "0", "1", "1"]
      ],
      note: "A second bar near the same venue reuses the crowd calls, which stay cached for 7 days. Only the calls for its own offers are new. The radar also calls ESPN (one per league per day) and the city's open data (one per scan), both cached 3 h; the team brand and fandom calls to Qloo are cached 7 days.",
      unusedTitle: "Qloo endpoints we tested and left out",
      unused: [
        ["GET /entities", "Looks up an entity by its Qloo, Spotify, Resy or Michelin ID. /search already covers what we need."],
        ["GET /v2/trending", "Weekly trends. Flat for every entity we tested."],
        ["GET /v2/analysis/compare", "Returns two tag lists with no measured difference. Two demographics calls tell us more."],
        ["GET /v2/audiences", "Named audience segments. Useful to a brand, but a bar starts from tonight's headliner, not a segment."],
        ["qloo mcp", "The nine workflows from the hackathon kit. Good for testing, but they cannot search around a point within a radius."]
      ]
    },
    footer: "Source: docs/journey in the Turnout repository. Republished at this link as work moves. Qloo describes what groups tend to like, never one person. No personal data is sent to Qloo."
  },
  steps: {
    s1: {
      title: "Discover Turnout",
      who: "the merchant lands on the home page",
      sees: "The promise, plus a live card showing the next big crowd near a Midtown bar.",
      decides: "Nothing yet. The card proves Turnout sees a real crowd this week.",
      calls: [{ what: "upcoming events near Penn & Pour, for the live card", count: "1 · cached 1 h" }]
    },
    s2: {
      title: "Sign up in two minutes",
      who: "the merchant fills in a short form",
      sees: "Name, type of place, address, offers in plain words (one per line), tone of voice, and the channels the bar already has.",
      decides: "Where the radar is centered, and the 1.5 km radius it watches.",
      calls: [{ what: "turns the address into map coordinates and a time zone", count: "1" }]
    },
    s3: {
      title: "Confirm what Turnout understood",
      who: "the merchant keeps the right tags",
      sees: "Each offer turned into Qloo tags: “Happy hour cocktails 5 to 7” becomes Cocktail Bar and Happy hour. The merchant unchecks anything wrong.",
      decides: "The Qloo tag IDs behind each offer. Turnout reuses them for every crowd and every week, and never asks again.",
      calls: [{ what: "finds the Qloo tag for one phrase per call", count: "1 to 3 per offer · 10 here" }]
    },
    s4: {
      title: "The radar spots the crowd",
      who: "the merchant opens the radar",
      sees: "A timeline of the next three days showing how many people will be around the bar, with every moment on it, and a map. Drag the timeline to see who is around at any moment, drag the circle to widen the radius. Five kinds of crowd: a show at a venue (Harry Styles at the Garden, 20,000 people, 0.3 km), several small shows starting or letting out together (31 Broadway shows at 22:30, 32,000 people), the local team on TV (Knicks at Celtics on Friday), a street event (a parade, a block party) and a city night (Halloween).",
      decides: "Which moments are worth a campaign, relative to the room: a moment that could bring a quarter of the bar's seats. Seventy seats means eighteen guests, so a Tuesday Rangers game counts, not only a stadium. For TV games Qloo measures how much these streets love the team: Knicks around Penn & Pour 0.99, a home crowd.",
      next: "Run the same scan every hour for every bar, with no click needed. That is step 5.",
      calls: [
        { what: "events within 4.5 km, minus venue tours and add-on tickets", count: "1 · cached 1 h" },
        { what: "the local teams' games, league by league and day by day", count: "4 leagues × 5 days · cached 3 h" },
        { what: "permitted street events (parades, block parties, races) around the bar", count: "1 · cached 3 h" },
        { what: "matches each team to its Qloo brand", count: "1 per team · cached 7 days" },
        { what: "how much the streets around the bar love the team (Qloo heatmap, median within 800 m)", count: "1 per team · cached 7 days" },
        { what: "hourly weather forecast at the bar, for each moment worth a campaign", count: "1 per moment · cached 1 h" }
      ]
    },
    s5: {
      title: "Get alerted with the campaign ready",
      who: "the hourly scan finds a moment worth a campaign that nobody has been told about",
      sees: "A WhatsApp message: the moment, its size for the room, the offer the agent chose, and a link to approve. This morning for Penn & Pour: “Theatre crowd arriving, 16 shows at 12:00, about 19,200 people 1.2 km from you. Could bring about 96 guests, 100% of your 70 seats. Campaign ready.” One tap to review, one to approve.",
      decides: "When the merchant hears about the crowd, and which moment gets the campaign: the strongest new one, one per scan, so the agent never floods the merchant.",
      codeNote: "Built. The server runs the scan every hour and the alerts page runs it on demand. The WhatsApp send is live once Twilio is connected; until then the message is recorded on the alerts page.",
      next: "Connect the Twilio sandbox so the message reaches the merchant's phone.",
      calls: [
        { what: "the step 4 scan, every hour, for every bar", count: "1 per bar per hour" },
        { what: "steps 6 and 7 for the chosen moment, before the merchant opens the app", count: "same as steps 6 and 7" },
        { what: "the alert to the merchant", count: "1 · WhatsApp once connected" }
      ]
    },
    s6: {
      title: "Who is coming, and which offer fits",
      who: "the merchant opens a crowd from the radar",
      sees: "Who the crowd is, what they like, the nearby bars they already go to, and the merchant's offers ranked for them. For Harry Styles: women 25 to 29, rooftop cocktail bars, Gucci and Dior. For the Broadway let-out: Schmigadoon!, Aladdin and The Lion King read through their screen versions plus the Musical Theatre tag, a young and female crowd. For the Knicks on TV: men 30 to 34, and the big-screen offer wins at 0.98.",
      decides: "Who the crowd is and how each offer ranks for it. A show has one headliner; a moment made of several shows, a team or a theme is read by Qloo as one crowd. If a headliner's name is ambiguous, the merchant picks the match, never the AI.",
      next: "The profile is rebuilt on every page load. The cache makes that free, but it should be saved once per crowd.",
      calls: [
        { what: "matches the headliner's name to a Qloo ID; for a moment, the three biggest shows, the team, or the entities that stand for the theme", count: "1 to 4" },
        { what: "age and gender groups overrepresented in the crowd", count: "1" },
        { what: "the crowd's taste tags, for places only", count: "1" },
        { what: "bars within 1.5 km the crowd already likes", count: "1" },
        { what: "brands this crowd likes more than average", count: "1" },
        { what: "nearby places with each offer's tags, scored for this crowd", count: "1 per offer · 5 here" }
      ]
    },
    s7: {
      title: "The agent writes the campaign",
      who: "the merchant clicks “Draft the campaign”",
      sees: "The chosen offer and why, backed by Qloo data. Two time windows with the weather, copy for five channels, and what the data does not show.",
      decides: "The offer and the copy: for Harry Styles, the cocktail happy hour beats the game-night pitcher deal, even though the pitcher had the higher raw score. Weather changes the offer only when it matters: rain after a Rangers game swaps the pitcher for a hot burger.",
      next: "Add the Anthropic key to the live server so the agent runs on its own for the judges. Locally, it runs in operator mode.",
      calls: [
        { what: "rereads the crowd profile from step 6", count: "0 new · cached" },
        { what: "weather before doors and after the show", count: "1 · cached 1 h" },
        { what: "picks the offer and writes the copy, as structured output", count: "1" }
      ]
    },
    s8: {
      title: "Approve, and Turnout publishes",
      who: "the merchant clicks “Approve and publish”",
      sees: "One line per channel the bar has, each with a status: sent, created and paused, ready, or simulated with exactly what would be sent.",
      decides: "Who hears about the offer: strangers near the venue through the ad, people searching Google for a bar, regulars on WhatsApp, and passers-by at the window.",
      next: "Connect the Twilio and Snapchat Ads accounts.",
      calls: [
        { what: "ad around the venue, created paused, targeted with Qloo interests", count: "live once connected" },
        { what: "message to regulars who opted in, via Twilio", count: "live once connected" },
        { what: "offer post on the bar's Google listing", count: "simulated" },
        { what: "chalkboard text and a line for the staff", count: "ready to use" },
        { what: "ad on an outdoor screen near the venue", count: "simulated" }
      ]
    },
    s9: {
      title: "Neighbourhood pulse: the everyday crowd",
      who: "the merchant opens the pulse. The automatic Monday alert is not built yet",
      sees: "Who walks past on a normal day, what they like, where they already go, the weather each evening, and the offer to feature. New: the rhythm of the street, read from the places Qloo knows around the door. For Le Quai 12: after work Monday to Friday 18:00 to 20:00 (Qloo's own descriptions say “after work” for four places next door, 14 of 31 bars run a happy hour), late nights on Friday and Saturday (9 places open past 2 am against 6 on a usual night), weekend brunch.",
      decides: "The default offer for the week, and the slots to push it: the board line for the after-work peak, the always-on ad on those hours, the regulars note for the weekend. Event nights override it.",
      calls: [
        { what: "taste tags for the street, based on the bar's location", count: "1" },
        { what: "the places around the door with their hours, tags and Qloo's descriptions, aggregated into the street's rhythm", count: "1 · cached 7 days" },
        { what: "brands and media the street likes more than average", count: "1" },
        { what: "competing places the street already likes", count: "1" },
        { what: "nearby places with each offer's tags, scored for the street", count: "1 per offer · 5 here" },
        { what: "weather for each evening this week, 5 to 9 pm", count: "1 · cached 1 h" },
        { what: "writes the weekly brief: chalkboard, Google post, regulars note, always-on ad", count: "1, on click" }
      ]
    },
    s10: {
      title: "Measure who came",
      who: "staff type a code at the counter",
      sees: "How many people each campaign brought in, and which crowds pay off most. Concept only: the figures on screen are examples.",
      decides: "Which offers to keep, and for which crowds, the following week.",
      codeNote: "Not built. It strengthens the impact story, but the demo does not need it.",
      next: "Decide whether it goes into the demo.",
      calls: []
    }
  }
};
