import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { useEffect } from 'react'
import { AuthProvider } from '../components/AuthGate'
import Footer from '../components/Footer'
import Header from '../components/Header'
import { uiStore, useUiStore } from '../stores/uiStore'

import appCss from '../styles.css?url'

const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem('theme');var mode=stored==='dark'?'dark':'light';var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(mode);root.setAttribute('data-theme',mode);root.style.colorScheme=mode;}catch(e){}})();`
const VITE_HMR_SAFE_SCRIPT = `var process=window.process||{env:{}};process.env=process.env||{};window.process=process;var $RefreshReg$=function(){};var $RefreshSig$=function(){return function(type){return type}};window.__vite_plugin_react_preamble_installed__=true;`

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Pokemon Battle Rooms',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: VITE_HMR_SAFE_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body className="font-sans antialiased [overflow-wrap:anywhere] selection:bg-[rgba(79,184,178,0.24)]">
        <AuthProvider>
          <Header />
          <NoticeCenter />
          {children}
          <Footer />
        </AuthProvider>
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}

function NoticeCenter() {
  const notices = useUiStore((state) => state.notices)

  useEffect(() => {
    if (notices.length === 0) {
      return
    }

    const timer = setTimeout(() => {
      uiStore.removeNotice(notices[0].id)
    }, 3500)

    return () => clearTimeout(timer)
  }, [notices])

  return (
    <aside className="pointer-events-none fixed right-4 top-20 z-50 flex w-[min(360px,calc(100%-2rem))] flex-col gap-2">
      {notices.map((notice) => (
        <div
          key={notice.id}
          className={`pointer-events-auto rounded-xl border px-3 py-2 text-sm shadow-md ${
            notice.type === 'error'
              ? 'border-rose-400/60 bg-rose-50 text-rose-800'
              : notice.type === 'success'
                ? 'border-emerald-400/60 bg-emerald-50 text-emerald-800'
                : 'border-sky-400/60 bg-sky-50 text-sky-800'
          }`}
        >
          {notice.text}
        </div>
      ))}
    </aside>
  )
}
