/* =========================================================
   "Opportunity, up close": her life in 14 moments, and the parts of the rover.
   Adapted from the mission history and rover parts in "Abandoned, But Not Forgotten"
   (Chetan Kumar G), checked against NASA/JPL Mars Exploration Rover records.
   km = total distance driven at that moment (her odometer).
   Translations live in i18n/<lang>/oppy.json.
   ========================================================= */
const OPPY = {
  moments: [
    { year: 2003, km: 0, date: "7 July 2003", title: "Launch",
      text: "Opportunity lifts off at night from Cape Canaveral, Florida, on a Delta II ‘Heavy’ rocket with nine solid boosters around its core. Her twin, Spirit, had left four weeks earlier.",
      memory: "I remember the noise first. Then the ground let go of me." },
    { year: 2003, km: 0, date: "July 2003 – January 2004", title: "Cruise to Mars",
      text: "About six and a half months and roughly 456 million km. The cruise stage spun slowly to stay steady, while small engine firings steered it towards a plain called Meridiani Planum.",
      memory: "Months folded up in the dark, spinning slowly, with a red dot growing ahead." },
    { year: 2004, km: 0, date: "25 January 2004", title: "Six minutes of terror",
      text: "She hits the air of Mars at about 19,000 km/h. A heat shield slows her, a parachute opens, rockets fire and airbags inflate. She bounces and rolls straight into tiny Eagle crater: a hole-in-one.",
      memory: "Fire, then a jolt, then bouncing, again and again. When I stopped rolling, I was inside a small crater. They called it a hole-in-one." },
    { year: 2004, km: 0.15, date: "2 March 2004", title: "Mars was once wet",
      text: "In Eagle crater's layered rocks she finds hematite ‘blueberries’ and a mineral called jarosite, which forms in water. NASA announces that this part of Mars was once soaked in liquid water.",
      memory: "Little grey spheres in the rock, everywhere I looked. They told my makers this place was once wet." },
    { year: 2004, km: 1.8, date: "June – December 2004", title: "Endurance crater",
      text: "She drives down into Endurance crater, about 130 m wide, and reads its rock layers like the pages of a history book.",
      memory: "I drove down into a crater and read its walls like the pages of a book." },
    { year: 2005, km: 2.6, date: "January 2005", title: "A meteorite on Mars",
      text: "Next to her own discarded heat shield, she finds ‘Heat Shield Rock’: the first meteorite ever identified on another planet.",
      memory: "Beside my own heat shield, I found a rock that had also fallen from the sky." },
    { year: 2005, km: 5.4, date: "April – June 2005", title: "Stuck in Purgatory",
      text: "Her wheels dig into a sand ripple nicknamed Purgatory Dune. Engineers practise escape moves with a test rover on Earth, and after about five weeks she inches free.",
      memory: "My wheels spun and I sank. For five weeks I moved a few centimetres at a time. I got out." },
    { year: 2006, km: 9.3, date: "September 2006 – August 2008", title: "Victoria crater",
      text: "After a long drive south she reaches Victoria crater, about 750 m wide, and spends about a year inside it, studying its cliffs.",
      memory: "A crater 750 metres across. I spent about a year inside it, close to the cliffs." },
    { year: 2007, km: 11.5, date: "July 2007", title: "Surviving the dark",
      text: "A huge dust storm cuts her solar power to a trickle. The team keeps her in a low-power mode and she pulls through. It would not be the last storm.",
      memory: "The sky went dark and my power fell to a trickle. I slept as much as I could, and I waited." },
    { year: 2011, km: 33.5, date: "9 August 2011", title: "Endeavour crater",
      text: "After a three-year trek she reaches the rim of Endeavour crater, 22 km wide, where the rocks are far older than anything she has seen before.",
      memory: "Three years of driving to reach this rim. The rocks here were older than any I had touched." },
    { year: 2014, km: 40.25, date: "July 2014", title: "Off-world record",
      text: "Passing 40 km, she beats the Soviet Lunokhod 2 rover's 1973 record for the longest drive on another world.",
      memory: "Forty kilometres. No machine had ever driven this far on another world." },
    { year: 2015, km: 42.2, date: "24 March 2015", title: "A Martian marathon",
      text: "She completes 42.195 km: the first marathon distance ever driven on another planet.",
      memory: "42.195 kilometres. It took me eleven years and two months. My team ran a marathon too." },
    { year: 2018, km: 45.16, date: "10 June 2018", title: "Last transmission",
      text: "A dust storm wraps the whole planet and blots out the Sun. With no power to charge her batteries, she falls silent on sol 5,111. (“My battery is low and it's getting dark” was a reporter's summary of her last data, not a real message.)",
      memory: "The dust came again, thicker than ever. I sent home my power level and how dark the sky was. Then I had to sleep." },
    { year: 2019, km: 45.16, date: "13 February 2019", title: "Mission complete",
      text: "After more than 1,000 recovery commands, the last sent on 12 February while the team played “I'll Be Seeing You”, NASA declares the mission over. Planned for 90 sols, she gave more than 14 years.",
      memory: "They called to me more than a thousand times. I could not answer. But they did not forget me. And now, neither will you." }
  ],
  // stops shown along the odometer
  stops: [{ km: 0, name: "Eagle crater" }, { km: 1.8, name: "Endurance" }, { km: 9.3, name: "Victoria" }, { km: 33.5, name: "Endeavour" }, { km: 45.16, name: "Perseverance Valley" }],
  // x, y = position on the 800 × 420 diagram; inside = shown with the X-ray goggles on
  parts: [
    { id: "pancam", x: 336, y: 74, inside: false, name: "Pancam & Navcam", text: "Her eyes, about 1.5 m above the ground on the mast. Pancam's twin colour cameras, with 14 filters, took her famous panoramas. Navcam's wide stereo cameras helped her drivers plan each day's route." },
    { id: "hga", x: 476, y: 186, inside: false, name: "High-gain antenna", text: "A steerable dish for talking straight to NASA's Deep Space Network on Earth." },
    { id: "uhf", x: 578, y: 150, inside: false, name: "UHF and low-gain antennas", text: "Most of her data went home through orbiters, Mars Odyssey and later Mars Reconnaissance Orbiter, over a UHF radio. The low-gain antenna was her always-on backup line." },
    { id: "solar", x: 176, y: 214, inside: false, name: "Solar arrays", text: "About 1.3 m² of solar cells. Dust slowly covered them, but Martian winds kept ‘cleaning’ the panels: one reason she outlived her 90-sol plan by years." },
    { id: "arm", x: 624, y: 268, inside: false, name: "Robotic arm", text: "The Instrument Deployment Device: a five-jointed arm that held her tools against rocks, like a geologist's hand lens and hammer." },
    { id: "turret", x: 700, y: 316, inside: false, name: "Tool turret", text: "Four tools on the end of the arm: a microscopic camera, two spectrometers that measured what rocks are made of, and the RAT, a Rock Abrasion Tool that ground away a 45 mm patch to see inside." },
    { id: "hazcam", x: 572, y: 296, inside: false, name: "Hazard cameras", text: "Hazcams on the front and back. Their 3D pictures let her steer herself around rocks and holes." },
    { id: "wheels", x: 398, y: 352, inside: false, name: "Rocker-bogie and wheels", text: "Six aluminium wheels about 25 cm across, each with its own motor, on a rocker-bogie suspension that keeps all six on the ground over rocks. The front and back wheels steer." },
    { id: "web", x: 272, y: 276, inside: true, name: "Warm Electronics Box", text: "Her insulated body. Gold paint and aerogel, one of the lightest solids ever made, kept her electronics alive through nights colder than −100 °C." },
    { id: "battery", x: 360, y: 282, inside: true, name: "Batteries", text: "Two rechargeable lithium-ion batteries carried her through each night. In June 2018 the dust storm blocked the Sun so completely that they could no longer be charged." },
    { id: "computer", x: 481, y: 252, inside: true, name: "Flight computer", text: "A radiation-hardened RAD6000 computer: 20 MHz, 128 MB of memory and 256 MB of flash storage. When the flash wore out, the team ran her in ‘amnesia’ mode, keeping each day's data only in short-term memory." },
    { id: "rhu", x: 532, y: 278, inside: true, name: "Radioisotope heater units", text: "Eight tiny heaters, each a pellet of plutonium giving off about 1 watt of warmth, kept vital parts from freezing." },
    { id: "imu", x: 400, y: 249, inside: true, name: "Inertial measurement unit", text: "Gyroscopes and accelerometers that tracked her tilt and direction on steep slopes." },
    { id: "minites", x: 320, y: 248, inside: true, name: "Mini-TES", text: "A thermal-infrared spectrometer inside her body. It looked out through mirrors in the mast and identified minerals from far away by the heat they give off." }
  ]
};
