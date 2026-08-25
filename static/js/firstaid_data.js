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
    }
};
