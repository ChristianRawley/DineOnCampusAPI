import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = 3000;

app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const routesPath = path.join(__dirname, "routes");
fs.readdirSync(routesPath).forEach(async (file) => {
	if (!file.endsWith(".js")) return;
	const routeModule = await import(`./routes/${file}`);
	const route = routeModule.default;
	const routeName = file.replace(".js", "");
	app.use(`/${routeName}`, route);
});

app.get("/", (req, res) => res.send("Welcome to Numa API"));

app.listen(PORT, () =>
	console.log(`Server running on http://localhost:${PORT}`)
);
