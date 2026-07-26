import { createApp } from "/vendor/.vite-deps-vue.js__v--7dbd0ee5.js";
import App from "/src/content/views/App.vue.js";
console.log("[CRXJS] Hello world from content script!");
/**
* Mount the Vue app to the DOM.
*/
function mountApp() {
	const container = document.createElement("div");
	container.id = "crxjs-app";
	document.body.appendChild(container);
	const app = createApp(App);
	app.mount(container);
}
mountApp();
