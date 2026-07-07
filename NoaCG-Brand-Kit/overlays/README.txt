NoaCG Studio — On-air overlay templates
========================================

7 HTML overlays, each 1920x1080 with a TRANSPARENT background
(except title-card-fullframe.html, which is a full opaque frame).

Files
-----
lower-third-name.html        Name / title
lower-third-breaking.html    Breaking topic banner + LIVE badge
lower-third-interview.html   Interview: name, org, location
bug-clock.html               Corner logo bug + live-ticking clock
ticker-news.html             Animated news crawl + category chip
ticker-markets.html          Markets strip
title-card-fullframe.html    Full-frame title card (opaque bg)

How to use
----------
Drop any file into vMix / OBS / CasparCG / Singular as a BROWSER SOURCE
at 1920x1080. The transparent background composites straight over video.

Edit the text directly in the HTML (open in any editor). Colors, fonts
and glow follow the NoaCG brand system:
  amber  #F6A623   live/rec #E5484D   paper #E8EDF2   void #0A0C10
  fonts  Space Grotesk (display) + JetBrains Mono (labels)

Note: fonts load from Google Fonts, so the playout machine needs internet
on first load. Ask if you'd like fully offline (font-embedded) versions.
