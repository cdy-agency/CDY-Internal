import { ClientType } from '@prisma/client';

export function getClientDisplayName(client: {
  companyName?: string | null;
  contactName: string;
  clientType: ClientType;
}): string {
  if (client.clientType === ClientType.INDIVIDUAL || !client.companyName) {
    return client.contactName;
  }
  return client.companyName;
}
