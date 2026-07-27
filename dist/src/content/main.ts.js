import { createApp } from "/vendor/.vite-deps-vue.js__v--7dbd0ee5.js";
import App from "/src/content/views/App.vue.js";
let app = null;
let container = null;
function mountApp() {
	if (app) return;
	container = document.createElement("div");
	container.id = "crxjs-app";
	document.body.appendChild(container);
	app = createApp(App);
	app.mount(container);
}
function unmountApp() {
	app?.unmount();
	container?.remove();
	app = null;
	container = null;
}
function isShortsPage() {
	return location.pathname === "/shorts" || location.pathname.startsWith("/shorts/");
}
function syncAppWithRoute() {
	if (isShortsPage()) {
		mountApp();
	} else {
		unmountApp();
	}
}
syncAppWithRoute();
// yt-navigate-finish — YouTube finished an in-app navigation (clicking a link, etc.).
// popstate — fallback for back/forward and other history changes that might not go through YouTube’s navigation flow the same way.
document.addEventListener("yt-navigate-finish", syncAppWithRoute);
window.addEventListener("popstate", syncAppWithRoute);
