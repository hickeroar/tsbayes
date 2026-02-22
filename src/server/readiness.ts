export class Readiness {
  private ready = true;

  public isReady(): boolean {
    return this.ready;
  }

  public setReady(value: boolean): void {
    this.ready = value;
  }
}
