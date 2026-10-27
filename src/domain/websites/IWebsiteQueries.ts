import type { WebsiteListItemView } from './WebsiteListItemView';

export interface IWebsiteQueries {
  listWithStats(): Promise<WebsiteListItemView[]>;
}
