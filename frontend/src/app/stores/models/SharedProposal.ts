
export class SharedProposal {
  id: number;
  version: number;
  title: string;
  coverImageUrl: string;
  createdAt: number;
  signed: boolean;

  constructor(json: any) {
    Object.assign(this, json);
  }
}
