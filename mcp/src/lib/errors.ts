export class ContractError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(`${code}: ${message}`);
    this.name = "ContractError";
  }
}
