import express from "express";
const router = express.Router();

const SITE_ID = "5ed1791f1ca48e085a7b9a4d";
const LIONS_DEN_ID = "5f4936c257e0d8184670a220";

const PERIODS = ["breakfast", "lunch", "dinner"];

const FETCH_HEADERS = {
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    Origin: "https://dineoncampus.com",
    Referer: "https://dineoncampus.com/",
    "X-Requested-With": "XMLHttpRequest",
    "Sec-Fetch-Site": "cross-site",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Dest": "empty"
};

// Helper to fetch JSON from the API
async function fetchJson(url) {
    const res = await fetch(url, { headers: FETCH_HEADERS });
    const text = await res.text();
    return JSON.parse(text);
}

// Simplify menu items
function simplifyMenu(menu) {
    if (!menu?.period?.categories) return [];
    return menu.period.categories.flatMap(({ items }) =>
        items.map(({ name, calories, ingredients, filters }) => ({
            name,
            calories,
            ingredients: ingredients || null,
            dietaryTags: filters?.filter(f => f.icon).map(f => f.name) || []
        }))
    );
}

router.get("/", async (_req, res) => {
    try {
        const date = "2025-11-26"; // new Date().toISOString().split("T")[0];

        // Fetch all locations
        const siteData = await fetchJson(
            `https://apiv4.dineoncampus.com/sites/${SITE_ID}/locations-public?for_menus=true`
        );

        const allLocations = [
            ...siteData.buildings.flatMap(b => b.locations),
            ...siteData.standaloneLocations
        ];

        // Map over locations to fetch menu only for The Lion's Den
        const locationsWithMenus = await Promise.all(
            allLocations.map(async (loc) => {
                if (loc.id === LIONS_DEN_ID) {
                    const meals = {};
                    for (const period of PERIODS) {
                        const menuData = await fetchJson(
                            `https://apiv4.dineoncampus.com/locations/${loc.id}/menu?date=${date}&period=${period}`
                        );
                        meals[period] = simplifyMenu(menuData);
                    }
                    return {
                        id: loc.id,
                        name: loc.name,
                        building: loc.buildingName,
                        isOpen: loc.status?.label === "open",
                        meals
                    };
                } else {
                    // Other locations: only basic info
                    return {
                        id: loc.id,
                        name: loc.name,
                        building: loc.buildingName,
                        isOpen: loc.status?.label === "open"
                    };
                }
            })
        );

        res.json({
            date,
            locations: locationsWithMenus
        });
    } catch (err) {
        console.error("Dining API error:", err);
        res.status(500).json({ error: "Failed to fetch dining data" });
    }
});

export default router;
