/** A reason to keep the published data as it is: nothing is written. */
export class UpdateRefusedError extends Error {
  override name = "UpdateRefusedError";
}
