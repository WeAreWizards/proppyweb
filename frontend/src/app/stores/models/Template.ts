
export class Template {
  public uid: string;
  public title: string;

  constructor(json: any) {
    Object.assign(this, json);
  }
}
