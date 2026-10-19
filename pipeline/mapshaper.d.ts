declare module 'mapshaper' {
  interface Mapshaper {
    applyCommands(
      commands: string,
      input: Record<string, unknown>,
    ): Promise<Record<string, Uint8Array | string>>;
  }
  const mapshaper: Mapshaper;
  export default mapshaper;
}
