export interface IHTTPError extends Error {
  response: Response;
  errors: string;
}

// Used by pretty much all the forms when logged out
export interface ILoggedOutFormState {
  submitted?: boolean;
  disabledForSubmit?: boolean;
  error?: string;
  errors?: any;
}

export enum SearchDirection {
  FORWARD,
  BACKWARD,
}

export enum HoverKind {
  NONE,
  CONTENT,
  ACTIONS,
  DELETE,
  // block and actions container
  CONTAINERS,
}

export enum SearchTermType {
  PLAIN,
  STATUS,
  CLIENT,
  TAG,
}

export enum UIError {
  NONE,
  NOT_FOUND,
  UNAUTHORIZED,
  NETWORK_PROBLEM,
  INTERNAL_ERROR,
}

export enum SaveStatus {
  STANDBY,
  SAVING,
  SAVED,
  FAILED,
}

export type UploadPurpose = "company-logo" | "cover-image" | "proposal-image";

export enum RenderContext {
  Editor,
  Preview,
  Share,
}

export enum InsertWhere {
  Above,
  Below,
}
