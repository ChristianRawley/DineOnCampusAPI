import express from "express";
const router = express.Router();

const SITE_ID = "5ed1791f1ca48e085a7b9a4d";
const LIONS_DEN_ID = "5f4936c257e0d8184670a220";

// Correct meal period IDs
const PERIOD_IDS = {
    breakfast: "6944ea653db2d23518c26d9d",
    lunch: "6944ea653db2d23518c26d9f",
    dinner: "6944ea653db2d23518c26d9e"
};

const FETCH_HEADERS = {
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    Origin: "https://dineoncampus.com",
    Referer: "https://dineoncampus.com/",
    "X-Requested-With": "XMLHttpRequest"
};

// Helper to fetch JSON
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
        const date = "2025-11-26";

        // Fetch all locations
        const siteData = await fetchJson(
            `https://apiv4.dineoncampus.com/sites/${SITE_ID}/locations-public?for_menus=true`
        );

        const allLocations = [
            ...siteData.buildings.flatMap(b => b.locations),
            ...siteData.standaloneLocations
        ];

        const locationsWithMenus = await Promise.all(
            allLocations.map(async (loc) => {
                const statusMessage = loc.status?.message || "Unknown";

                if (loc.id === LIONS_DEN_ID) {
                    // Fetch menus for The Lion's Den in parallel
                    const mealsEntries = await Promise.all(
                        Object.entries(PERIOD_IDS).map(async ([meal, periodId]) => {
                            const menuData = await fetchJson(
                                `https://apiv4.dineoncampus.com/locations/${loc.id}/menu?date=${date}&period=${periodId}`
                            );
                            return [meal, simplifyMenu(menuData)];
                        })
                    );

                    const meals = Object.fromEntries(mealsEntries);

                    return {
                        id: loc.id,
                        name: loc.name,
                        building: loc.buildingName,
                        statusMessage,
                        meals
                    };
                } else {
                    // Other locations: just basic info
                    return {
                        id: loc.id,
                        name: loc.name,
                        building: loc.buildingName,
                        statusMessage
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
