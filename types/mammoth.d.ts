declare module 'mammoth/mammoth.browser.js' {
  interface ConversionResult {
    value: string
    messages: unknown[]
  }
  export function extractRawText(input: { arrayBuffer: ArrayBuffer }): Promise<ConversionResult>
}
