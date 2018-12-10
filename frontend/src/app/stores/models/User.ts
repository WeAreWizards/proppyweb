import { Proposal } from "./Proposal";

export class User {
  public id: number;
  public username: string;
  public email: string;
  public isActive: boolean;
  public publishState: string;
  public isAdmin: boolean;
  public createdAt: number;
  public disabled: boolean;
  public onboarded: boolean;
  public companyId: number;

  constructor(json: any) {
    this.id = json.id;
    this.username = json.username;
    this.email = json.email;
    this.isActive = json.isActive;
    this.publishState = json.publishState;
    this.isAdmin = json.isAdmin;
    this.createdAt = json.createdAt;
    this.disabled = json.disabled;
    this.onboarded = json.onboarded;
    this.companyId = json.companyId;
  }

  isCurrentlyActive(): boolean {
    return this.isActive && !this.disabled;
  }

  // Invited users don't have a username
  getUsername(): string {
    return this.username ? this.username : "User";
  }

  // In notifications, we want to display a message when we enable/disable/etc
  // but since username can just be "User" we add the email to make it easy
  // to see which user we are referring to.
  getNameAndEmail(): string {
    return `${this.getUsername()} (${this.email})`;
  }

  // Whether we can publish a proposal that currently has the given status
  canPublish(proposal: Proposal): boolean {
    if (this.publishState === "can_publish") {
      return true;
    }

    // Inactive user can never publish anything
    if (this.publishState === "user_inactive_cannot_publish") {
      return false;
    }

    // So in theory we cannot publish anything except newer versions
    // of previously shared proposals
    return proposal.shares.length > 0;
  }
}
