import { createStore } from './createStore'

type UiNotice = {
  id: string
  text: string
  type: 'info' | 'success' | 'error'
}

type UiStoreState = {
  isBusy: boolean
  notices: UiNotice[]
}

const uiStoreBase = createStore<UiStoreState>({
  isBusy: false,
  notices: [],
})

const makeNotice = (type: UiNotice['type'], text: string): UiNotice => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  type,
  text,
})

export const uiStore = {
  ...uiStoreBase,
  setBusy: (isBusy: boolean) => {
    uiStoreBase.setState((prev) => ({ ...prev, isBusy }))
  },
  pushNotice: (type: UiNotice['type'], text: string) => {
    uiStoreBase.setState((prev) => ({
      ...prev,
      notices: [...prev.notices.slice(-3), makeNotice(type, text)],
    }))
  },
  removeNotice: (id: string) => {
    uiStoreBase.setState((prev) => ({
      ...prev,
      notices: prev.notices.filter((notice) => notice.id !== id),
    }))
  },
  clearNotices: () => {
    uiStoreBase.setState((prev) => ({ ...prev, notices: [] }))
  },
}

export const useUiStore = uiStore.useStore
