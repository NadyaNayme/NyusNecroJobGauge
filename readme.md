# (Nyu's) Necro Job Gauge

Track your Residual Souls, Necrosis stacks, summoned Conjures, and Bloat all in one consistent place. Inspired by FFXIV's Job Gauges - to make tracking your resources as easy as can be!

## Installation

To install NecroJobGauge copy & paste this link into your browser:
alt1://addapp/https://nadyanayme.github.io/NyusNecroJobGauge/dist/appconfig.json

**Currently only works with Small Buff icons**

## Settings

Click the cog wheel in the bottom right to change between 3 and 5 Residual Souls.

## Known Issues

- Conjures flicker in/out in the final 10s. There is a setting to force them to apper as active but if the player unsummons during this time they will not appear as inactive until 12s has passed.
- Residual Souls do the same thing when you've dropped combat for too long. There is no fix/override for this - but your souls will track properly again once you resume combat.
- Bloat needs a lot of work to better track early re-applications. I'm brainstorming ideas but since the ability itself doesn't have a cooldown and both Finger of Death and Spectral Scythe can take 20% adrenaline, and the player might proc Ruthless, there is a lot of additional tracking to be done to tell if the player re-applied Bloat to reset the timer. For now if Bloat is re-applied the timer will reset to the full 18s once it is meant to expire and sees that it is still active. If Bloat drops off the target the timer will instantly set itself to 0s.

If you encounter any other bugs - please submit an issue and I'll investigate it.
