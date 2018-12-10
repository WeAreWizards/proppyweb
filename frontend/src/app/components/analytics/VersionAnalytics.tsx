import * as React from "react";

import { ProposalAnalytics } from "../../stores/models/Analytics";
import { formatIsoDatetime } from "../../utils/dates";


interface IVersionAnalytics {
  data: ProposalAnalytics;
  current: boolean;
  url: string;
}

// formats a length in seconds into a HH:MM:SS format
function formatTime(time: number): string {
  const hours = Math.round(time / 3600) % 24;
  const minutes = Math.round(time / 60) % 60;
  const seconds = Math.round(time % 60);

  return (hours < 10 ? "0" + hours : hours) + ":"
    + (minutes < 10 ? "0" + minutes : minutes) + ":"
    + (seconds  < 10 ? "0" + seconds : seconds);
}

class VersionAnalytics extends React.Component<IVersionAnalytics, {}> {
  renderSessions() {
    const sessions = this.props.data.analytics.sessions;
    if (sessions.length === 0) {
      return <div className="empty">No sessions</div>;
    }

    const rows = sessions.map((sess: any, i: number) => {
      // Location can be 3 things: Unknown, with a city and a country or just a country
      let location = "Unknown";
      if (sess.data.country) {
        if (sess.data.city) {
          location = `${sess.data.city}, ${sess.data.country}`;
        } else {
          // Don't display a city with a name of null if we don't have it
          location = sess.data.country;
        }
      }

      return (
        <tr key={i}>
          <td>{formatIsoDatetime(sess.start)} UTC</td>
          <td>{sess.data.username || "Anonymous"}</td>
          <td>{formatTime(sess.length)}</td>
          <td>{location}</td>
        </tr>
      );
    });

    return (
      <div>
        <table>
          <thead>
            <tr>
              <th>Started on</th>
              <th>Username</th>
              <th>Duration</th>
              <th>Location</th>
            </tr>
          </thead>
          <tbody>{rows}</tbody>
        </table>
        <span className="note">Note: We only have usernames for your clients when they post comments.</span>
      </div>
    );
  }

  renderOutbound() {
    const clicks = this.props.data.analytics.outboundClicks;
    if (clicks.length === 0) {
      return <div className="empty">No outbound clicks</div>;
    }

    const rows = clicks.map((click: any, i: number) => {
      return (
        <tr key={i}>
          <td>{click.url}</td>
          <td>{click.count}</td>
        </tr>
      );
    });

    return (
      <table>
        <tbody>
          {rows}
        </tbody>
      </table>
    );
  }

  render() {
    const { data, current, url } = this.props;

    return (
      <div className="proposal-analytics">
        <h3>Version {data.version} {current ? "(current)" : null}</h3>
        <p>
          Published on the <b>{formatIsoDatetime(data.createdAt)}</b> —
          <a href={url}>View published proposal at this version</a>
        </p>

        <h4>Quick view</h4>

        <table className="quick-view-table">
          <tbody>
            <tr>
              <td>Total views</td>
              <td>{data.analytics.numberViews}</td>
            </tr>
            <tr>
              <td>Last viewed on</td>
              <td>{formatIsoDatetime(data.createdAt)} UTC</td>
            </tr>
            <tr>
              <td>Average session time</td>
              <td>{formatTime(data.analytics.averageSessionLength)}</td>
            </tr>
            <tr>
              <td>Total comments (including yours)</td>
              <td>{data.commentsCount}</td>
            </tr>
          </tbody>
        </table>

        <h4>Sessions</h4>
        {this.renderSessions()}

        <h4>Outbound clicks</h4>
        {this.renderOutbound()}

      </div>
    );
  }
}

export default VersionAnalytics;
