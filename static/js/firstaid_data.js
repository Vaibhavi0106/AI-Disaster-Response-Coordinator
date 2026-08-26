/**
 * Verified Red Cross / WHO First Aid & Survival Guide Data Bundle
 * Offline-first static asset — zero network calls.
 */

const FIRST_AID_GUIDE = {
    categories: [
        {
            id: "bleeding",
            label: "Severe Bleeding",
            icon: "bi-droplet-fill text-danger",
            steps: [
                "Apply firm, direct pressure over the wound using a clean cloth, sterile pad, or bare hands if nothing else is available.",
                "Maintain continuous pressure for at least 10 minutes without lifting the pad to check the bleeding.",
                "If blood soaks through, do NOT remove the original cloth — place another layer over it and keep pressing firmly.",
                "Elevate the injured limb above heart level if no fracture is suspected.",
                "If bleeding remains uncontrolled on an arm or leg, apply an arterial tourniquet 2-3 inches above the wound (never on a joint) and note the application time."
            ]
        },
        {
            id: "cpr",
            label: "CPR / Not Breathing",
            icon: "bi-heart-pulse-fill text-danger",
            steps: [
                "Check responsiveness — tap the person's shoulder firmly and shout 'Are you okay?'.",
                "Call 112 / Emergency Services immediately or assign a bystander to call.",
                "Place person flat on their back on a hard surface.",
                "Position your hands in the center of the chest (lower half of sternum), interlock fingers, and keep elbows straight.",
                "Push hard and fast at a rate of 100 to 120 compressions per minute (to the beat of 'Staying Alive'), pushing down at least 2 inches (5 cm).",
                "Perform 30 compressions followed by 2 rescue breaths (if trained) or continue continuous chest-only CPR until emergency responders arrive."
            ]
        },
        {
            id: "burns",
            label: "Burns & Scalds",
            icon: "bi-fire text-warning",
            steps: [
                "Immediately cool the burn under cool running tap water for 10 to 20 minutes.",
                "Do NOT apply ice, ice water, butter, grease, or ointments — ice worsens tissue damage.",
                "Remove restrictive clothing or jewelry near the burn before swelling occurs, unless stuck to the burn.",
                "Cover the burn loosely with clean cling wrap or sterile non-adherent dressing.",
                "Do NOT pop blister bubbles — intact skin protects against fatal infection."
            ]
        },
        {
            id: "choking",
            label: "Choking (Adult/Child)",
            icon: "bi-person-fill-exclamation text-warning",
            steps: [
                "Encourage the person to cough forcefully if they can speak or cough.",
                "If they cannot breathe, speak, or cough: stand behind them and lean them slightly forward.",
                "Deliver up to 5 sharp back blows between the shoulder blades using the heel of your hand.",
                "If unsuccessful, perform up to 5 abdominal thrusts (Heimlich maneuver): place fist above navel, grasp with other hand, pull inward and upward sharply.",
                "Alternate 5 back blows and 5 abdominal thrusts until object is dislodged or person loses consciousness."
            ]
        },
        {
            id: "fracture",
            label: "Suspected Fracture / Bone Injury",
            icon: "bi-bandaid-fill text-info",
            steps: [
                "Immobilize the injured area immediately — do NOT try to straighten or realign broken bones.",
                "Support the limb using a splint made of rolled newspapers, cardboard, or wooden sticks secured with cloth strips.",
                "Apply a cold pack wrapped in a cloth to reduce swelling and localized pain (15 min on, 15 min off).",
                "Check circulation below the injury site (pulse, skin temperature, fingernail color).",
                "Keep the patient calm and quiet until medical assistance arrives."
            ]
        },
        {
            id: "drowning",
            label: "Drowning / Near-Drowning",
            icon: "bi-water text-cyan",
            steps: [
                "Safely remove the person from water without endangering yourself.",
                "Place person on their back, open airway (head-tilt, chin-lift), and check for breathing.",
                "If NOT breathing, immediately give 5 initial rescue breaths before starting chest compressions.",
                "Perform CPR (30 compressions to 2 breaths) for 1 minute before leaving to call emergency services if alone.",
                "Remove wet clothes and wrap in warm blankets to treat hypothermia."
            ]
        },
        {
            id: "electric_shock",
            label: "Electric Shock",
            icon: "bi-lightning-charge-fill text-warning",
            steps: [
                "Do NOT touch the victim while they are still in contact with the electrical source.",
                "Turn off the main power supply or circuit breaker immediately.",
                "If power cannot be switched off, use a dry non-conductive object (wooden broom handle, plastic pipe) to push the source away.",
                "Check breathing and pulse once clear — begin CPR immediately if pulse is absent.",
                "Cover electrical entry and exit burn sites with clean sterile dressings."
            ]
        },
        {
            id: "snakebite",
            label: "Snakebite",
            icon: "bi-bug-fill text-success",
            steps: [
                "Remain calm and keep the victim still — movement spreads venom through lymphatic system faster.",
                "Keep the bitten limb immobilized and positioned below heart level.",
                "Remove rings, watches, or tight clothing near the bite area before tissue swelling begins.",
                "Do NOT cut the bite mark, do NOT suck venom out, do NOT apply tourniquets, ice, or electric shocks.",
                "Transport immediately to a hospital equipped with anti-snake venom (ASV)."
            ]
        }
    ],
    by_disaster: {
        flood: [
            "Move to higher ground or upper floors immediately. Never enter basement levels during active flooding.",
            "Avoid walking, wading, or driving through moving floodwaters — 6 inches (15 cm) of swift water can knock you down, and 2 feet (60 cm) will sweep cars away.",
            "Treat all floodwater as hazardous sewage contamination — wash hands thoroughly with soap if contact occurs.",
            "Turn off main gas line and electrical breakers before evacuating if safe to do so."
        ],
        earthquake: [
            "DROP to your hands and knees, COVER your head and neck under a sturdy table or desk, and HOLD ON until shaking stops.",
            "Stay AWAY from exterior glass windows, high bookcases, hanging light fixtures, and unanchored furniture.",
            "If outdoors, move away from tall buildings, power lines, overpasses, and brick chimneys.",
            "If driving, pull over safely clear of overpasses, trees, and power lines — remain inside the vehicle."
        ],
        wildfire: [
            "Evacuate early along designated routes — do not wait for official evacuation orders if you smell heavy smoke or see flames.",
            "Close all windows, interior doors, and roof vents to reduce draft embers inside homes.",
            "Cover your mouth and nose with a damp cloth or N95 mask to reduce toxic smoke particle inhalation.",
            "Wear long pants, heavy boots, and cotton/wool clothing to shield skin from radiant heat."
        ],
        cyclone: [
            "Shelter indoors in an interior windowless room (hallway, bathroom, or closet) on the lowest floor.",
            "Beware the 'Eye of the Storm' — temporary calm means winds will suddenly restart from the opposite direction with severe force.",
            "Keep emergency battery lights, radio, power banks, and bottled water readily accessible.",
            "Disconnect electrical appliances to shield against high-voltage lightning surges."
        ],
        earthquake_aftershock: [
            "Expect recurring aftershocks following major seismic shocks — each aftershock can collapse damaged structures.",
            "Do NOT enter damaged buildings until inspected and cleared by civil defense engineers.",
            "Use flashlights instead of open matches/lighters — undetected gas leaks pose immediate explosion risks."
        ]
    },
    survival_skills: [
        {
            label: "Starting a Fire Safely",
            steps: [
                "Choose a spot away from tents, dry grass, overhanging branches, and wind gusts; clear a ring down to bare soil if possible.",
                "Gather three sizes of material: tinder (dry grass, bark shavings, cotton), kindling (pencil-thin dry twigs), and fuel wood (finger- to wrist-thick branches).",
                "Build a small teepee or lean-to of kindling over a tinder bundle before lighting.",
                "Light the tinder at its base so flames climb upward into the kindling.",
                "Add fuel wood gradually once kindling is burning steadily — adding too much too soon smothers a young fire.",
                "Never use fuel/accelerants on an open flame. Keep water or dirt nearby to extinguish quickly.",
                "Fully extinguish before leaving: douse with water, stir ashes, douse again until cold to the touch."
            ]
        },
        {
            label: "Finding and Purifying Water",
            steps: [
                "Never drink untreated water from rivers, lakes, or floodwater — even if it looks clean.",
                "Boiling is the most reliable method: bring to a rolling boil for at least 1 minute (3 minutes above 2000m altitude).",
                "If boiling isn't possible, use water purification tablets per their instructions, or a rated portable filter (most fabric/cloth filtering alone does NOT remove pathogens).",
                "Let sediment settle and pre-filter through cloth before treating, to help purification work effectively.",
                "In a flood, water may also carry chemical contamination — treatment methods above do not remove chemical pollutants, only biological ones."
            ]
        },
        {
            label: "Emergency Shelter Basics",
            steps: [
                "Priority order: stop heat/cold loss first — get off wet ground and out of wind before worrying about anything elaborate.",
                "Insulate from the ground with leaves, branches, or a mat — you lose heat faster to cold ground than to cold air.",
                "A simple lean-to (a angled roof of branches/tarp against a fixed support) blocks wind and precipitation with minimal effort.",
                "Keep shelter small — less air space is easier for body heat to warm.",
                "In extreme heat, prioritize shade and airflow over enclosure; avoid direct sun during peak hours."
            ]
        },
        {
            label: "Signaling for Rescue",
            steps: [
                "The universal distress signal is three of anything: three whistle blasts, three fires/smoke columns, three flashes of light, spaced evenly.",
                "A signal mirror or any reflective surface aimed at aircraft/search vehicles is visible from very long distances in daylight.",
                "Bright clothing or ground markings (large X or SOS shapes made from rocks, logs, or trampled vegetation) are visible from the air.",
                "Stay near your last known location if you're lost and searchers know roughly where to look — moving further can make you harder to find.",
                "Conserve phone battery for periodic check-ins rather than continuous use if signal is weak."
            ]
        },
        {
            label: "Extreme Heat Safety",
            steps: [
                "Move to shade or air conditioning immediately at the first sign of heat exhaustion (heavy sweating, weakness, nausea, cool clammy skin).",
                "Sip water steadily — don't gulp large amounts at once.",
                "Heat stroke (hot dry skin, confusion, very high body temperature, no sweating) is a medical emergency — cool the person immediately with any available water/ice and call emergency services.",
                "Avoid strenuous activity during peak heat hours; loose, light-colored clothing helps."
            ]
        },
        {
            label: "Extreme Cold Safety",
            steps: [
                "Watch for hypothermia signs: uncontrollable shivering, slurred speech, confusion, drowsiness — this is an emergency.",
                "Get the person dry and insulated from the ground and wind immediately; wet clothing accelerates heat loss dramatically.",
                "Warm the body core first (torso) before extremities — direct heat to hands/feet first can cause dangerous blood-flow shifts.",
                "Do not give alcohol to someone with hypothermia; it worsens heat loss.",
                "Frostbite (white/waxy, numb skin) should be rewarmed gradually with body heat or warm (not hot) water — never rub the affected area."
            ]
        }
    ]
};

