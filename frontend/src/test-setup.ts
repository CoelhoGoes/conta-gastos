import '@testing-library/jest-dom/vitest'

// o jsdom não tem matchMedia, e a Sidebar do shadcn (use-mobile) o lê ao montar. Os testes
// que dependem do tema do sistema trocam este por um próprio (theme.test.ts)
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      addEventListener() {},
      removeEventListener() {},
    }) as unknown as MediaQueryList
}
