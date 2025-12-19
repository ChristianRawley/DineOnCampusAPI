import express from "express";
const router = express.Router();

const SITE_ID = "5ed1791f1ca48e085a7b9a4d";
const LIONS_DEN_ID = "5f4936c257e0d8184670a220";

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
        const date = "2025-11-26"; // new Date().toISOString().split("T")[0];

        // Fetch locations with status
        const statusData = await fetchJson(
            `https://apiv4.dineoncampus.com/locations/status_by_site?siteId=${SITE_ID}`
        );

        const allLocations = statusData.locations || [];

        const locationsWithMenus = await Promise.all(
            allLocations.map(async (loc) => {
                const statusMessage = loc.status?.message || "Unknown";

                if (loc.id === LIONS_DEN_ID) {
                    // Fetch period IDs for the date
                    const periodsData = await fetchJson(
                        `https://apiv4.dineoncampus.com/locations/${loc.id}/periods/?date=${date}`
                    );

                    const periodMap = {};
                    periodsData.periods.forEach(period => {
                        periodMap[period.slug] = period.id;
                    });

                    // Fetch menus dynamically using period IDs
                    const mealsEntries = await Promise.all(
                        Object.entries(periodMap).map(async ([mealSlug, periodId]) => {
                            const menuData = await fetchJson(
                                `https://apiv4.dineoncampus.com/locations/${loc.id}/menu?date=${date}&period=${periodId}`
                            );
                            return [mealSlug, simplifyMenu(menuData)];
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
