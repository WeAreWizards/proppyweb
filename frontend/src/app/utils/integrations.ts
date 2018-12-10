
export function prettyIntegrationName(name: string): string {
  let integrationName = name;

  if (name === "zohocrm") {
    integrationName = "ZohoCRM";
  } else if (name === "insightly") {
    integrationName = "Insightly";
  } else if (name === "pipedrive") {
    integrationName = "Pipedrive";
  }

  return integrationName;
}
