import * as React from "react";
import * as classnames from "classnames";

import { MISSING_URL_VARIABLE } from "../../../constants/errors";
import TextInput from "./TextInput";
import TextArea from "./TextArea";


interface IEmailFormProps extends React.Props<{}> {
  url: string;
  title: string;
  writerEmail: string; // the email of the current user
  emails: Array<string>;
  subject: string;
  from: string;
  body: string;
  onSubmit: (data: any) => void;
}

interface IEmailFormState {
  emails: string;
  subject: string;
  from: string;
  body: string;
  emailing: boolean;
}

// A split view of an email form and a preview
export class EmailForm extends React.Component<IEmailFormProps, IEmailFormState> {
  constructor(props) {
    super(props);

    this.state = {
      emails: props.emails.join(","),
      subject: props.subject,
      from: props.from,
      body: props.body,
      emailing: false,
    };
  }

  getEmailValues(emails: string): Array<string> {
    return emails.split(/\s*,\s*/).map(val => {
      if (/^.+@.+\..+$/.test(val)) {
        return val;
      }
    }).filter(email => email !== undefined);
  }

  isValidBody(): boolean {
    return this.state.body.indexOf("{url}") > -1;
  }

  canSendEmail(): boolean {
    if (!this.isValidBody() || this.state.emailing) {
      return false;
    }

    const { from, emails, subject, body } = this.state;
    if (from === "" || !emails || this.getEmailValues(emails).length === 0 || subject === "" || body === "") {
      return false;
    }

    return true;
  }

  replaceVariables(body: string): string {
    body = body.replace(/\{url}/g, this.props.url);
    body = body.replace(/\{title}/g, this.props.title);
    return body;
  }

  // kind of a copy of Textform but different context
  onFieldChanged(event: React.SyntheticEvent<any>) {
    const target = event.target as HTMLInputElement;
    const value = target.value.trim();
    this.setState({[target.name]: value} as any);
  }

  submit() {
    // Note that this approach doesn't allow re-enabling the submit button in
    // case of failure which, in theory, can only really happen if mailjet fails
    // so it might be ok
    this.setState({emailing: true} as any);
    // Poor shallow cloning to avoid the body having an error since we
    // replace the URL below
    let { emails, subject, from, body } = this.state; // tslint:disable-line
    body = this.replaceVariables(body);
    this.props.onSubmit({emails: this.getEmailValues(emails), subject, from, body});
  }

  render() {
    const { from, emails, subject, body } = this.state;

    const sendButtonClasses = classnames("button", {
      "button--disabled": !this.canSendEmail(),
    });

    return (
      <div className="email-form">
        <div className="email-form__form">
          <form onChange={this.onFieldChanged.bind(this)}>
            <TextInput
              label="To"
              note="Comma-separated if more than one"
              type="text"
              name="emails"
              value={emails} />
            <TextInput
              label="From name"
              type="text"
              name="from"
              value={from} />
            <TextInput
              label="Subject"
              type="text"
              name="subject"
              value={subject} />
            <TextArea
              label="Body"
              rows={10}
              name="body"
              value={body}
              error={this.isValidBody() ? undefined : MISSING_URL_VARIABLE}
              canResize={false} />
          </form>
        </div>
        <div className="email-form__preview">
          <table>
            <tbody>
              <tr className="title">
                <td colSpan={2}>Email preview</td>
              </tr>
              <tr className="greyed">
                <td>To</td>
                <td>{this.getEmailValues(emails).join(",")}</td>
              </tr>
              <tr className="greyed">
                <td>Cc</td>
                <td>{this.props.writerEmail}</td>
              </tr>
              <tr className="greyed">
                <td>From</td>
                <td>{from}</td>
              </tr>
              <tr className="subject">
                <td colSpan={2}>{subject}</td>
              </tr>
              <tr>
                <td colSpan={2}>
                  <pre>{this.replaceVariables(body)}</pre>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <button
            className={sendButtonClasses}
            onClick={this.submit.bind(this)}
            disabled={!this.canSendEmail()}>
          Send email
        </button>
      </div>
    );
  }
}

export default EmailForm;
