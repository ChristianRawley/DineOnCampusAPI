import express from "express";
const router = express.Router();

const SITE_ID = "5ed1791f1ca48e085a7b9a4d";
const LOCATION_ID = "5f4936c257e0d8184670a220";

const PERIODS = {
    breakfast: "693d55d4b4e411d4d52f13d1",
    lunch: "693d55d4b4e411d4d52f13d3",
    dinner: "693d55d4b4e411d4d52f13d2",
};

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

async function fetchJson(url) {
    const res = await fetch(url, { headers: FETCH_HEADERS });
    const text = await res.text();
    return JSON.parse(text);
}

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
        const date = new Date().toISOString().split("T")[0];
        const statusData = await fetchJson(`https://apiv4.dineoncampus.com/locations/status_by_site?siteId=${SITE_ID}`);
        const location = statusData?.locations?.find(loc => loc.id === LOCATION_ID);

        const meals = Object.fromEntries(
            await Promise.all(
                Object.entries(PERIODS).map(async ([meal, periodId]) => {
                    const menu = await fetchJson(`https://apiv4.dineoncampus.com/locations/${LOCATION_ID}/menu?date=${date}&period=${periodId}`);
                    return [meal, simplifyMenu(menu)];
                })
            )
        );

        res.json({
            date,
            location: {
                id: LOCATION_ID,
                name: location?.name || "Dining Hall",
                isOpen: location?.isOpen ?? false
            },
            meals
        });
    } catch (err) {
        console.error("Dining API error:", err);
        res.status(500).json({ error: "Failed to fetch dining data" });
    }
});

export default router;
