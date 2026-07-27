import { createApp } from 'vue'
import App from './views/App.vue'

let app: ReturnType<typeof createApp> | null = null
let container: HTMLDivElement | null = null

function mountApp() {
  if (app) return

  container = document.createElement('div')
  container.id = 'crxjs-app'
  document.body.appendChild(container)
  app = createApp(App)
  app.mount(container)
}

function unmountApp() {
  app?.unmount()
  container?.remove()
  app = null
  container = null
}

function isShortsPage() {
  return location.pathname === '/shorts' || location.pathname.startsWith('/shorts/')
}

function syncAppWithRoute() {
  if (isShortsPage()) {
    mountApp()
  } else {
    unmountApp()
  }
}

syncAppWithRoute()

document.addEventListener('yt-navigate-finish', syncAppWithRoute)
window.addEventListener('popstate', syncAppWithRoute)
